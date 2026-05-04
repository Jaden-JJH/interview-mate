import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { interviewHistory } from "@/lib/db/schema";
import { getOrCreateAppUserId } from "@/lib/db/users";

interface QAResultPayload {
  question: string;
  answer: string;
  score: number;
  feedback: string;
  bestAnswer: string;
  keywords: string[];
}

interface SaveBody {
  personaId?: string;
  durationMinutes?: number;
  overallScore?: number;
  overallComment?: string;
  qaResults?: QAResultPayload[];
  startedAt?: string;
  endedAt?: string;
}

export async function POST(req: Request) {
  const userId = await getOrCreateAppUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await req.json()) as SaveBody;
  if (
    !body.personaId ||
    typeof body.durationMinutes !== "number" ||
    !Array.isArray(body.qaResults) ||
    body.qaResults.length === 0
  ) {
    return NextResponse.json(
      { error: "personaId, durationMinutes, qaResults required" },
      { status: 400 }
    );
  }

  const startedAt = body.startedAt ? new Date(body.startedAt) : new Date();
  const endedAt = body.endedAt ? new Date(body.endedAt) : new Date();

  const [inserted] = await db
    .insert(interviewHistory)
    .values({
      userId,
      personaId: body.personaId,
      durationMinutes: body.durationMinutes,
      startedAt,
      endedAt,
      overallScore:
        typeof body.overallScore === "number" ? body.overallScore : null,
      qaResults: {
        items: body.qaResults,
        overallComment: body.overallComment ?? "",
      },
    })
    .returning({ id: interviewHistory.id });

  return NextResponse.json({ id: inserted.id });
}
