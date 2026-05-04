import { headers } from "next/headers";
import { Webhook } from "svix";
import type { WebhookEvent } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { users, credits } from "@/lib/db/schema";

export async function POST(req: Request) {
  const secret = process.env.CLERK_WEBHOOK_SIGNING_SECRET;
  if (!secret) {
    console.error("CLERK_WEBHOOK_SIGNING_SECRET not set");
    return new Response("Server misconfigured", { status: 500 });
  }

  const h = headers();
  const svixId = h.get("svix-id");
  const svixTimestamp = h.get("svix-timestamp");
  const svixSignature = h.get("svix-signature");
  if (!svixId || !svixTimestamp || !svixSignature) {
    return new Response("Missing svix headers", { status: 400 });
  }

  const body = await req.text();
  let evt: WebhookEvent;
  try {
    evt = new Webhook(secret).verify(body, {
      "svix-id": svixId,
      "svix-timestamp": svixTimestamp,
      "svix-signature": svixSignature,
    }) as WebhookEvent;
  } catch (err) {
    console.error("Webhook signature verification failed:", err);
    return new Response("Invalid signature", { status: 400 });
  }

  if (evt.type === "user.created") {
    const data = evt.data;
    const primaryEmail = data.email_addresses?.find(
      (e) => e.id === data.primary_email_address_id
    )?.email_address;
    const email = primaryEmail ?? data.email_addresses?.[0]?.email_address;
    if (!email) {
      console.error("user.created without email", data.id);
      return new Response("ok", { status: 200 });
    }

    try {
      const [inserted] = await db
        .insert(users)
        .values({ clerkUserId: data.id, email })
        .onConflictDoNothing({ target: users.clerkUserId })
        .returning({ id: users.id });

      if (inserted) {
        await db
          .insert(credits)
          .values({ userId: inserted.id })
          .onConflictDoNothing({ target: credits.userId });
      }
    } catch (err) {
      console.error("Failed to provision user/credits:", err);
      return new Response("DB error", { status: 500 });
    }
  }

  return new Response("ok", { status: 200 });
}
