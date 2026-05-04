import { NextResponse } from "next/server";
import { eq, desc } from "drizzle-orm";
import { db } from "@/lib/db";
import { savedResumes } from "@/lib/db/schema";
import { getOrCreateAppUserId } from "@/lib/db/users";

export async function GET() {
  const userId = await getOrCreateAppUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rows = await db
    .select({
      content: savedResumes.content,
      fileName: savedResumes.fileName,
      updatedAt: savedResumes.updatedAt,
    })
    .from(savedResumes)
    .where(eq(savedResumes.userId, userId))
    .orderBy(desc(savedResumes.updatedAt))
    .limit(1);

  return NextResponse.json({ resume: rows[0] ?? null });
}

export async function PUT(req: Request) {
  const userId = await getOrCreateAppUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await req.json()) as {
    content?: unknown;
    fileName?: unknown;
  };
  const content =
    typeof body.content === "string" ? body.content.trim() : "";
  if (!content) {
    return NextResponse.json({ error: "content required" }, { status: 400 });
  }
  const fileName =
    typeof body.fileName === "string" && body.fileName.length > 0
      ? body.fileName
      : null;

  // Treat saved resume as a per-user singleton: replace any existing rows.
  await db.delete(savedResumes).where(eq(savedResumes.userId, userId));
  const [inserted] = await db
    .insert(savedResumes)
    .values({ userId, content, fileName })
    .returning({
      content: savedResumes.content,
      fileName: savedResumes.fileName,
      updatedAt: savedResumes.updatedAt,
    });

  return NextResponse.json({ resume: inserted });
}

export async function DELETE() {
  const userId = await getOrCreateAppUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  await db.delete(savedResumes).where(eq(savedResumes.userId, userId));
  return NextResponse.json({ ok: true });
}
