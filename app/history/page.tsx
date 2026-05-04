"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { resolvePersona } from "@/lib/personas";

interface HistoryItem {
  id: string;
  personaId: string;
  durationMinutes: number;
  startedAt: string;
  endedAt: string | null;
  overallScore: number | null;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const hh = String(d.getHours()).padStart(2, "0");
  const mi = String(d.getMinutes()).padStart(2, "0");
  return `${yyyy}.${mm}.${dd} ${hh}:${mi}`;
}

export default function HistoryPage() {
  const router = useRouter();
  const [items, setItems] = useState<HistoryItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/me/history", { cache: "no-store" });
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`);
        }
        const data = (await res.json()) as { items: HistoryItem[] };
        if (!cancelled) setItems(data.items);
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "불러오기 실패");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="flex min-h-dvh flex-col bg-white">
      <div className="flex items-center bg-white px-5 py-3 border-b border-[var(--gray-200)]">
        <button onClick={() => router.push("/")} className="p-1 mr-3">
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
          지난 면접
        </span>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-5">
        {error && (
          <p className="text-[13px] text-red-500">불러오기에 실패했어요.</p>
        )}
        {items === null && !error && (
          <p className="text-[13px] text-[var(--gray-500)]">불러오는 중...</p>
        )}
        {items && items.length === 0 && (
          <div className="mt-12 text-center">
            <p className="text-[14px] text-[var(--gray-500)]">
              아직 완료한 면접이 없어요.
            </p>
            <Link
              href="/resume"
              className="mt-4 inline-block rounded-full bg-[var(--blue-primary)] px-5 py-2 text-[13px] font-semibold text-white"
            >
              첫 면접 시작하기
            </Link>
          </div>
        )}
        {items && items.length > 0 && (
          <ul className="space-y-3">
            {items.map((item, i) => {
              const persona = resolvePersona(item.personaId);
              return (
                <motion.li
                  key={item.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04 }}
                >
                  <Link
                    href={`/history/${item.id}`}
                    className="block rounded-2xl border border-[var(--gray-200)] bg-white px-4 py-4 active:scale-[0.99] transition"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[13px] font-semibold text-[var(--gray-900)]">
                        {persona.name}
                      </span>
                      <span className="text-[18px] font-extrabold text-[var(--blue-primary)]">
                        {item.overallScore ?? "—"}
                        <span className="text-[12px] text-[var(--gray-500)] font-medium ml-0.5">
                          점
                        </span>
                      </span>
                    </div>
                    <div className="mt-1 flex items-center gap-2 text-[12px] text-[var(--gray-500)]">
                      <span>{item.durationMinutes}분</span>
                      <span>•</span>
                      <span>{formatDate(item.startedAt)}</span>
                    </div>
                  </Link>
                </motion.li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
