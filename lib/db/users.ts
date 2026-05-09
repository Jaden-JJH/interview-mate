// Clerk userId로 내부 users 행을 조회하거나 없으면 생성하는 유저 DB 헬퍼
import { auth, currentUser } from "@clerk/nextjs/server";
import { eq } from "drizzle-orm";
import { db } from "./index";
import { users, credits } from "./schema";

// Returns the internal users.id (UUID) for the current Clerk user. If the
// webhook never fired for this user (e.g. webhook misconfigured during dev,
// or the user existed before we set up provisioning), creates the row on
// the fly. Always seeds a credits row alongside.
export async function getOrCreateAppUserId(): Promise<string | null> {
  const { userId: clerkUserId } = await auth();
  if (!clerkUserId) return null;

  const existing = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.clerkUserId, clerkUserId))
    .limit(1);
  if (existing.length > 0) return existing[0].id;

  // Provision lazily. We need an email — Clerk's session-only auth() doesn't
  // include it, so fall back to currentUser() (slightly slower but rare path).
  const cu = await currentUser();
  const email =
    cu?.emailAddresses.find((e) => e.id === cu.primaryEmailAddressId)
      ?.emailAddress ?? cu?.emailAddresses[0]?.emailAddress;
  if (!email) return null;

  const [inserted] = await db
    .insert(users)
    .values({ clerkUserId, email })
    .onConflictDoUpdate({
      target: users.clerkUserId,
      set: { email },
    })
    .returning({ id: users.id });

  await db
    .insert(credits)
    .values({ userId: inserted.id, freeRemaining: 1 })
    .onConflictDoNothing({ target: credits.userId });

  return inserted.id;
}

export async function requireAppUserId(): Promise<string> {
  const id = await getOrCreateAppUserId();
  if (!id) throw new Error("Unauthenticated");
  return id;
}
