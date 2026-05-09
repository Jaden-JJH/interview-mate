// Paddle 결제 웹훅을 수신해 트랜잭션 완료 시 유료 크레딧을 지급하는 라우트
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
import { credits, transactions, users } from "@/lib/db/schema";
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
  _eventId: string,
  txn: TransactionNotification
) {
  const customData = txn.customData as { clerkUserId?: string } | null;
  const clerkUserId = customData?.clerkUserId;
  if (!clerkUserId) {
    console.warn(`Paddle txn ${txn.id}: customData.clerkUserId 없음 — skip`);
    return;
  }

  // neon-http 드라이버는 db.transaction()을 지원하지 않음 → 트랜잭션 없이 처리.
  // 멱등성은 transactions.paddleTransactionId UNIQUE 제약이 보장.

  const [user] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.clerkUserId, clerkUserId))
    .limit(1);
  if (!user) {
    // 5xx 반환 → Paddle 재시도 (Clerk webhook 지연 대비).
    throw new Error(
      `USER_NOT_FOUND: clerkUserId=${clerkUserId} txn=${txn.id}`
    );
  }

  // credits 행이 누락된 케이스 방어 — 없으면 기본값으로 생성.
  await db.execute(sql`
    INSERT INTO ${credits} (user_id)
    VALUES (${user.id})
    ON CONFLICT (user_id) DO NOTHING
  `);

  const totalStr = txn.details?.totals?.total ?? "0";
  const total = Number.parseInt(String(totalStr), 10) || 0;
  const currency = String(txn.details?.totals?.currencyCode ?? "KRW");

  // 단일 SQL로 transaction insert + credits 적립을 원자적으로 처리.
  // 같은 paddle_transaction_id가 이미 있으면 CTE가 0행을 반환 → UPDATE도 0행 → 중복 적립 없음.
  await db.execute(sql`
    WITH inserted_txn AS (
      INSERT INTO ${transactions} (user_id, paddle_transaction_id, amount, currency, status)
      VALUES (${user.id}, ${txn.id}, ${total}, ${currency}, 'completed')
      ON CONFLICT (paddle_transaction_id) DO NOTHING
      RETURNING user_id
    )
    UPDATE ${credits}
    SET paid_remaining = paid_remaining + ${CREDITS_PER_PACKAGE},
        updated_at = NOW()
    FROM inserted_txn
    WHERE ${credits}.user_id = inserted_txn.user_id
  `);
}

async function handleAdjustmentCreated(
  _eventId: string,
  adj: AdjustmentNotification
) {
  // 환불 + approved 상태만 자동 처리. credit_note / chargeback은 수동.
  if (adj.action !== "refund" || adj.status !== "approved") return;

  const originalTxnId = adj.transactionId;
  if (!originalTxnId) return;

  // 멱등성: status='completed' 가드로 두 번째 호출은 0행 매칭 → 중복 차감 없음.
  await db.execute(sql`
    WITH refunded_txn AS (
      UPDATE ${transactions}
      SET status = 'refunded'
      WHERE paddle_transaction_id = ${originalTxnId}
        AND status = 'completed'
      RETURNING user_id
    )
    UPDATE ${credits}
    SET paid_remaining = GREATEST(paid_remaining - ${CREDITS_PER_PACKAGE}, 0),
        updated_at = NOW()
    FROM refunded_txn
    WHERE ${credits}.user_id = refunded_txn.user_id
  `);
}
