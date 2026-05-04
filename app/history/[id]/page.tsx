"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import ScoreGauge from "@/components/ScoreGauge";
import AccordionItem from "@/components/AccordionItem";
import RadarChart from "@/components/RadarChart";
import { resolvePersona } from "@/lib/personas";
import type { QAResult } from "@/contexts/InterviewContext";

interface HistoryDetail {
  id: string;
  personaId: string;
  durationMinutes: number;
  startedAt: string;
  overallScore: number | null;
  qaResults: { items: QAResult[]; overallComment?: string };
}

function safeAvg(values: number[]): number {
  if (values.length === 0) return 0;
  return Math.round(values.reduce((a, b) => a + b, 0) / values.length);
}

export default function HistoryDetailPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const [detail, setDetail] = useState<HistoryDetail | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/me/history/${params.id}`, {
          cache: "no-store",
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = (await res.json()) as { item: HistoryDetail };
        if (!cancelled) setDetail(data.item);
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "불러오기 실패");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [params.id]);

  const qaResults = detail?.qaResults?.items ?? [];
  const overallScore = detail?.overallScore ?? 0;
  const overallComment = detail?.qaResults?.overallComment ?? "";
  const persona = detail ? resolvePersona(detail.personaId) : null;

  const radarData = useMemo(() => {
    if (qaResults.length === 0) return [];
    const s = qaResults.map((q) => q.score);
    const tech = s.slice(0, 2);
    const proj = s.slice(2, 4);
    const soft = s.slice(4, 5);
    const motiv = s.slice(5, 6);
    const career = s.slice(6, 7);
    return [
      { label: "직무 이해도", value: safeAvg(tech) || overallScore },
      { label: "문제 해결력", value: safeAvg(proj) || overallScore },
      { label: "커뮤니케이션", value: safeAvg(soft) || overallScore },
      { label: "논리성", value: overallScore },
      {
        label: "인성/태도",
        value: safeAvg([...motiv, ...career]) || overallScore,
      },
    ];
  }, [qaResults, overallScore]);

  return (
    <div className="flex min-h-dvh flex-col bg-white">
      <div className="flex items-center bg-white px-5 py-3 border-b border-[var(--gray-200)]">
        <button onClick={() => router.push("/history")} className="p-1 mr-3">
          <svg
            className="h-5 w-5 text-[var(--gray-900)]"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M15 19l-7-7 7-7"
            />
          </svg>
        </button>
        <span className="text-[15px] font-bold text-[var(--gray-900)]">
          {persona ? `${persona.name}와의 면접` : "면접 결과"}
        </span>
      </div>

      <div className="flex-1 overflow-y-auto pb-12">
        {error && (
          <p className="px-5 py-6 text-[13px] text-red-500">
            불러오기에 실패했어요.
          </p>
        )}
        {!error && !detail && (
          <p className="px-5 py-6 text-[13px] text-[var(--gray-500)]">
            불러오는 중...
          </p>
        )}
        {detail && (
          <>
            <div className="bg-white px-5 pt-8 pb-6 relative overflow-hidden">
              <motion.div
                className="flex flex-col items-center relative z-10"
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.3 }}
              >
                <ScoreGauge score={overallScore} />
                {overallComment && (
                  <p className="mt-5 text-[14px] leading-[22px] text-center text-[var(--gray-700)] px-4">
                    {overallComment}
                  </p>
                )}
                {radarData.length > 0 && (
                  <div className="mt-8 mb-2 w-full flex justify-center">
                    <RadarChart data={radarData} size={260} />
                  </div>
                )}
              </motion.div>
            </div>

            <div className="px-5 space-y-3">
              <p className="text-[14px] font-bold text-[var(--gray-900)] mb-1">
                질문별 피드백
              </p>
              {qaResults.map((q, i) => (
                <AccordionItem
                  key={i}
                  questionNumber={i + 1}
                  question={q.question}
                  score={q.score}
                  myAnswer={q.answer}
                  modelAnswer={q.bestAnswer}
                  keywords={q.keywords}
                  feedback={q.feedback}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
