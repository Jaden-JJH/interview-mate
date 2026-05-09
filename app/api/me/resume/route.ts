// 저장된 자기소개서 슬롯(최대 3개)을 CRUD하는 API 라우트
import { NextResponse } from "next/server";
import { eq, and, desc } from "drizzle-orm";
import { db } from "@/lib/db";
import { savedResumes } from "@/lib/db/schema";
import { getOrCreateAppUserId } from "@/lib/db/users";
import { isGuestMode } from "@/lib/guest";

const MAX_SLOTS = 3;

export async function GET() {
  if (isGuestMode()) {
    return NextResponse.json({ resumes: [], max: MAX_SLOTS });
  }
  const userId = await getOrCreateAppUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rows = await db
    .select({
      id: savedResumes.id,
      content: savedResumes.content,
      fileName: savedResumes.fileName,
      updatedAt: savedResumes.updatedAt,
    })
    .from(savedResumes)
    .where(eq(savedResumes.userId, userId))
    .orderBy(desc(savedResumes.updatedAt))
    .limit(MAX_SLOTS);

  return NextResponse.json({ resumes: rows, max: MAX_SLOTS });
}

export async function POST(req: Request) {
  if (isGuestMode()) {
    // Memory-only: no persistence in guest mode. Return a synthetic
    // success so the client UI flows without erroring.
    return NextResponse.json({
      resume: { id: "guest", content: "", fileName: "guest.pdf", updatedAt: new Date().toISOString() },
    });
  }
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
  const fileName =
    typeof body.fileName === "string" && body.fileName.length > 0
      ? body.fileName
      : null;

  if (!content) {
    return NextResponse.json({ error: "content required" }, { status: 400 });
  }
  if (!fileName) {
    return NextResponse.json(
      { error: "fileName required — text-only resumes are not stored as slots" },
      { status: 400 }
    );
  }

  const existing = await db
    .select({ id: savedResumes.id })
    .from(savedResumes)
    .where(eq(savedResumes.userId, userId));

  if (existing.length >= MAX_SLOTS) {
    return NextResponse.json(
      { error: "slot_full", message: `이력서는 ${MAX_SLOTS}개까지 등록 가능해요.` },
      { status: 409 }
    );
  }

  const [inserted] = await db
    .insert(savedResumes)
    .values({ userId, content, fileName })
    .returning({
      id: savedResumes.id,
      content: savedResumes.content,
      fileName: savedResumes.fileName,
      updatedAt: savedResumes.updatedAt,
    });

  return NextResponse.json({ resume: inserted });
}

export async function DELETE(req: Request) {
  if (isGuestMode()) {
    return NextResponse.json({ ok: true });
  }
  const userId = await getOrCreateAppUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const url = new URL(req.url);
  const id = url.searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "id required" }, { status: 400 });
  }
  await db
    .delete(savedResumes)
    .where(and(eq(savedResumes.userId, userId), eq(savedResumes.id, id)));
  return NextResponse.json({ ok: true });
}
