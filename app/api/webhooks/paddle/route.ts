import { NextRequest } from "next/server";
import {
  Environment,
  EventName,
  Paddle,
  type AdjustmentNotification,
  type TransactionNotification,
} from "@paddle/paddle-node-sdk";
import { eq, sql } from "drizzle-orm";

import { db } from "@/lib/db";
import {
  credits,
  processedWebhooks,
  transactions,
  users,
} from "@/lib/db/schema";
import { CREDITS_PER_PACKAGE } from "@/lib/billing/config";

export const runtime = "nodejs";

const paddleApiKey = process.env.PADDLE_API_KEY;
const webhookSecret = process.env.PADDLE_WEBHOOK_SECRET;

const paddle = paddleApiKey
  ? new Paddle(paddleApiKey, { environment: Environment.production })
  : null;

export async function POST(req: NextRequest) {
  if (!paddle || !webhookSecret) {
    console.error("Paddle 환경변수 누락 — webhook 처리 불가");
    return new Response("Server misconfigured", { status: 500 });
  }

  const signature = req.headers.get("paddle-signature") ?? "";
  const rawBody = await req.text();

  let event;
  try {
    event = await paddle.webhooks.unmarshal(rawBody, webhookSecret, signature);
  } catch (err) {
    console.error("Paddle 서명 검증 실패:", err);
    return new Response("Invalid signature", { status: 400 });
  }

  if (!event) {
    return new Response("Empty event", { status: 400 });
  }

  try {
    if (event.eventType === EventName.TransactionCompleted) {
      await handleTransactionCompleted(
        event.eventId,
        event.data as TransactionNotification
      );
    } else if (event.eventType === EventName.AdjustmentCreated) {
      await handleAdjustmentCreated(
        event.eventId,
        event.data as AdjustmentNotification
      );
    }
    return new Response("ok", { status: 200 });
  } catch (err) {
    console.error(`Paddle webhook 처리 실패 (${event.eventType}):`, err);
    // 5xx 반환 → Paddle이 재시도 (지수 백오프)
    return new Response("Processing failed", { status: 500 });
  }
}

async function handleTransactionCompleted(
  eventId: string,
  txn: TransactionNotification
) {
  const customData = txn.customData as { clerkUserId?: string } | null;
  const clerkUserId = customData?.clerkUserId;
  if (!clerkUserId) {
    console.warn(`Paddle txn ${txn.id}: customData.clerkUserId 없음 — skip`);
    return;
  }

  await db.transaction(async (tx) => {
    // 멱등성: paddle event_id로 1회만 처리되도록 claim. 충돌이면 이미 처리됨.
    const claimed = await tx
      .insert(processedWebhooks)
      .values({ paddleEventId: eventId })
      .onConflictDoNothing()
      .returning({ id: processedWebhooks.paddleEventId });
    if (claimed.length === 0) return;

    const [user] = await tx
      .select({ id: users.id })
      .from(users)
      .where(eq(users.clerkUserId, clerkUserId))
      .limit(1);
    if (!user) {
      // throw 시 transaction rollback → claim 무효 → Paddle 재시도로 회복 (Clerk webhook 지연 대비)
      throw new Error(
        `USER_NOT_FOUND: clerkUserId=${clerkUserId} txn=${txn.id}`
      );
    }

    await tx.execute(sql`
      UPDATE ${credits}
      SET paid_remaining = paid_remaining + ${CREDITS_PER_PACKAGE},
          updated_at = NOW()
      WHERE user_id = ${user.id}
    `);

    const totalStr = txn.details?.totals?.total ?? "0";
    const total = Number.parseInt(String(totalStr), 10) || 0;
    const currency = String(txn.details?.totals?.currencyCode ?? "KRW");

    // paddleTransactionId UNIQUE — 같은 txn 중복 시 무시.
    await tx
      .insert(transactions)
      .values({
        userId: user.id,
        paddleTransactionId: txn.id,
        amount: total,
        currency,
        status: "completed",
      })
      .onConflictDoNothing({ target: transactions.paddleTransactionId });
  });
}

async function handleAdjustmentCreated(
  eventId: string,
  adj: AdjustmentNotification
) {
  // 환불 + approved 상태만 자동 처리. credit_note / chargeback은 수동.
  if (adj.action !== "refund" || adj.status !== "approved") return;

  const originalTxnId = adj.transactionId;
  if (!originalTxnId) return;

  await db.transaction(async (tx) => {
    const claimed = await tx
      .insert(processedWebhooks)
      .values({ paddleEventId: eventId })
      .onConflictDoNothing()
      .returning({ id: processedWebhooks.paddleEventId });
    if (claimed.length === 0) return;

    const [originalTxn] = await tx
      .select({ userId: transactions.userId })
      .from(transactions)
      .where(eq(transactions.paddleTransactionId, originalTxnId))
      .limit(1);
    if (!originalTxn) {
      console.error(
        `Paddle adjustment ${adj.id}: 원본 transaction 없음 (${originalTxnId})`
      );
      return;
    }

    // 14일 무조건 환불 정책. 이미 사용한 크레딧은 차감 불가하므로 음수 방지.
    await tx.execute(sql`
      UPDATE ${credits}
      SET paid_remaining = GREATEST(paid_remaining - ${CREDITS_PER_PACKAGE}, 0),
          updated_at = NOW()
      WHERE user_id = ${originalTxn.userId}
    `);

    await tx
      .update(transactions)
      .set({ status: "refunded" })
      .where(eq(transactions.paddleTransactionId, originalTxnId));
  });
}
