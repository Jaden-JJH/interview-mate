"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { motion } from "framer-motion";
import { resolvePersona } from "@/lib/personas";

interface Balance {
  free: number;
  paid: number;
  total: number;
}

interface SavedResume {
  content: string;
  fileName: string | null;
  updatedAt: string;
}

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
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")}`;
}

const RESUME_PREVIEW = 200;

export default function MyPage() {
  const router = useRouter();
  const { isSignedIn, user } = useUser();

  const [balance, setBalance] = useState<Balance | null>(null);
  const [resume, setResume] = useState<SavedResume | null>(null);
  const [resumeLoaded, setResumeLoaded] = useState(false);
  const [history, setHistory] = useState<HistoryItem[] | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      fetch("/api/me/credits", { cache: "no-store" }).then((r) =>
        r.ok ? r.json() : null
      ),
      fetch("/api/me/resume", { cache: "no-store" }).then((r) =>
        r.ok ? r.json() : null
      ),
      fetch("/api/me/history", { cache: "no-store" }).then((r) =>
        r.ok ? r.json() : null
      ),
    ])
      .then(([b, r, h]) => {
        if (cancelled) return;
        if (b) setBalance(b);
        setResume(r?.resume ?? null);
        setResumeLoaded(true);
        setHistory(h?.items ?? []);
      })
      .catch(() => {
        if (!cancelled) setResumeLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const handleDeleteResume = async () => {
    if (!confirm("저장된 이력서를 삭제할까요? 다음 면접 시 다시 입력해야 해요.")) return;
    setDeleting(true);
    try {
      const res = await fetch("/api/me/resume", { method: "DELETE" });
      if (res.ok) setResume(null);
    } finally {
      setDeleting(false);
    }
  };

  if (!isSignedIn) return null;

  const memberSince = user?.createdAt
    ? formatDate(new Date(user.createdAt).toISOString())
    : null;

  return (
    <div className="flex min-h-dvh flex-col bg-white">
      {/* Top bar */}
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
          마이페이지
        </span>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-6 space-y-8 pb-12">
        {/* Section: 내 정보 */}
        <section>
          <h2 className="text-[14px] font-bold text-[var(--gray-900)] mb-3">
            내 정보
          </h2>
          <div className="rounded-2xl border border-[var(--gray-200)] p-4 space-y-2">
            <Row label="이름" value={user?.fullName ?? user?.firstName ?? "—"} />
            <Row
              label="이메일"
              value={user?.primaryEmailAddress?.emailAddress ?? "—"}
            />
            {memberSince && <Row label="가입일" value={memberSince} />}
          </div>
        </section>

        {/* Section: 크레딧 */}
        <section>
          <h2 className="text-[14px] font-bold text-[var(--gray-900)] mb-3">
            크레딧
          </h2>
          <div className="rounded-2xl border border-[var(--gray-200)] p-4">
            <div className="flex items-end justify-between">
              <div>
                <p className="text-[12px] text-[var(--gray-500)]">현재 잔액</p>
                <p className="mt-1 text-[28px] font-extrabold text-[var(--gray-900)] leading-none">
                  {balance?.total ?? "—"}
                  <span className="text-[14px] font-semibold text-[var(--gray-500)] ml-1">
                    회
                  </span>
                </p>
              </div>
              <div className="text-right text-[12px] text-[var(--gray-500)] space-y-0.5">
                <p>무료 {balance?.free ?? 0}</p>
                <p>결제 {balance?.paid ?? 0}</p>
              </div>
            </div>
            <button
              disabled
              className="mt-4 w-full rounded-xl bg-[var(--blue-primary)] py-3 text-[14px] font-bold text-white opacity-60"
              title="결제는 곧 출시됩니다"
            >
              패키지 구매 (준비중)
            </button>
          </div>
        </section>

        {/* Section: 이력서 관리 */}
        <section>
          <h2 className="text-[14px] font-bold text-[var(--gray-900)] mb-3">
            이력서 관리
          </h2>
          {resumeLoaded && !resume && (
            <div className="rounded-2xl border border-dashed border-[var(--gray-200)] p-5 text-center">
              <p className="text-[13px] text-[var(--gray-500)]">
                저장된 이력서가 없어요.
              </p>
              <Link
                href="/resume"
                className="mt-3 inline-block rounded-full bg-[var(--blue-primary)] px-4 py-1.5 text-[13px] font-semibold text-white"
              >
                이력서 등록하기
              </Link>
            </div>
          )}
          {resume && (
            <div className="rounded-2xl border border-[var(--gray-200)] p-4">
              {resume.fileName && (
                <p className="text-[12px] font-semibold text-[var(--gray-700)] mb-2">
                  {resume.fileName}
                </p>
              )}
              <p className="text-[12px] leading-[18px] text-[var(--gray-600)] whitespace-pre-line">
                {resume.content.slice(0, RESUME_PREVIEW)}
                {resume.content.length > RESUME_PREVIEW && "…"}
              </p>
              <p className="mt-3 text-[11px] text-[var(--gray-400)]">
                업데이트: {formatDate(resume.updatedAt)}
              </p>
              <div className="mt-3 flex gap-2">
                <Link
                  href="/resume"
                  className="flex-1 rounded-xl border border-[var(--gray-200)] py-2 text-center text-[13px] font-semibold text-[var(--gray-700)]"
                >
                  수정하기
                </Link>
                <button
                  onClick={handleDeleteResume}
                  disabled={deleting}
                  className="flex-1 rounded-xl border border-red-200 py-2 text-[13px] font-semibold text-red-500 disabled:opacity-50"
                >
                  {deleting ? "삭제 중..." : "삭제"}
                </button>
              </div>
            </div>
          )}
        </section>

        {/* Section: 면접 히스토리 */}
        <section>
          <h2 className="text-[14px] font-bold text-[var(--gray-900)] mb-3">
            면접 히스토리
          </h2>
          {history === null && (
            <p className="text-[13px] text-[var(--gray-500)]">불러오는 중...</p>
          )}
          {history && history.length === 0 && (
            <div className="rounded-2xl border border-dashed border-[var(--gray-200)] p-5 text-center">
              <p className="text-[13px] text-[var(--gray-500)]">
                아직 완료한 면접이 없어요.
              </p>
            </div>
          )}
          {history && history.length > 0 && (
            <ul className="space-y-2">
              {history.map((item, i) => {
                const persona = resolvePersona(item.personaId);
                return (
                  <motion.li
                    key={item.id}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.03 }}
                  >
                    <Link
                      href={`/history/${item.id}`}
                      className="block rounded-2xl border border-[var(--gray-200)] px-4 py-3"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[13px] font-semibold text-[var(--gray-900)]">
                          {persona.name}
                        </span>
                        <span className="text-[16px] font-extrabold text-[var(--blue-primary)]">
                          {item.overallScore ?? "—"}
                          <span className="text-[11px] text-[var(--gray-500)] font-medium ml-0.5">
                            점
                          </span>
                        </span>
                      </div>
                      <p className="mt-0.5 text-[11px] text-[var(--gray-500)]">
                        {item.durationMinutes}분 · {formatDate(item.startedAt)}
                      </p>
                    </Link>
                  </motion.li>
                );
              })}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between text-[13px]">
      <span className="text-[var(--gray-500)]">{label}</span>
      <span className="font-medium text-[var(--gray-900)] truncate max-w-[60%]">
        {value}
      </span>
    </div>
  );
}
