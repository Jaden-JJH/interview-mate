"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { motion } from "framer-motion";
import { resolvePersona } from "@/lib/personas";
import PremiumGenerateButton from "@/components/PremiumGenerateButton";
import ResumeGenerateModal from "@/components/ResumeGenerateModal";
import {
  deleteGuestResume,
  isGuestMode,
  loadGuestResumes,
} from "@/lib/guest-resume-store";

interface Balance {
  free: number;
  paid: number;
  total: number;
}

interface SavedResume {
  id: string;
  content: string;
  fileName: string | null;
  updatedAt: string;
}

const MAX_SLOTS = 3;

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

function formatShortDate(iso: string): string {
  const d = new Date(iso);
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

const RESUME_PREVIEW = 160;

export default function MyPage() {
  const router = useRouter();
  const { isSignedIn, user } = useUser();

  const [balance, setBalance] = useState<Balance | null>(null);
  const [resumes, setResumes] = useState<SavedResume[] | null>(null);
  const [history, setHistory] = useState<HistoryItem[] | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [showGenerateModal, setShowGenerateModal] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const guest = isGuestMode();
    Promise.all([
      fetch("/api/me/credits", { cache: "no-store" }).then((r) =>
        r.ok ? r.json() : null
      ),
      guest
        ? Promise.resolve({ resumes: loadGuestResumes() })
        : fetch("/api/me/resume", { cache: "no-store" }).then((r) =>
            r.ok ? r.json() : null
          ),
      fetch("/api/me/history", { cache: "no-store" }).then((r) =>
        r.ok ? r.json() : null
      ),
    ])
      .then(([b, r, h]) => {
        if (cancelled) return;
        if (b) setBalance(b);
        setResumes(r?.resumes ?? []);
        setHistory(h?.items ?? []);
      })
      .catch(() => {
        if (!cancelled) setResumes([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const handleDeleteResume = async (id: string) => {
    if (!confirm("이 이력서를 삭제할까요?")) return;
    setDeletingId(id);
    try {
      if (isGuestMode()) {
        deleteGuestResume(id);
        setResumes((prev) => (prev ?? []).filter((r) => r.id !== id));
      } else {
        const res = await fetch(
          `/api/me/resume?id=${encodeURIComponent(id)}`,
          { method: "DELETE" }
        );
        if (res.ok) {
          setResumes((prev) => (prev ?? []).filter((r) => r.id !== id));
        }
      }
    } finally {
      setDeletingId(null);
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
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-[14px] font-bold text-[var(--gray-900)]">
              이력서 관리
            </h2>
            {resumes && resumes.length > 0 && (
              <span className="text-[12px] font-medium text-[var(--gray-400)]">
                {resumes.length}/{MAX_SLOTS}
              </span>
            )}
          </div>

          {resumes !== null && resumes.length === 0 && (
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
              <div className="mt-5">
                <PremiumGenerateButton onClick={() => setShowGenerateModal(true)} />
              </div>
            </div>
          )}

          {resumes && resumes.length > 0 && (
            <>
              <ul className="space-y-2">
                {resumes.map((r) => (
                  <li
                    key={r.id}
                    className="rounded-2xl border border-[var(--gray-200)] p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="text-[13px] font-semibold text-[var(--gray-900)] truncate">
                          {r.fileName ?? "직접 입력"}
                        </p>
                        <p className="mt-0.5 text-[11px] text-[var(--gray-400)]">
                          {formatShortDate(r.updatedAt)} 업데이트
                        </p>
                      </div>
                      <button
                        onClick={() => handleDeleteResume(r.id)}
                        disabled={deletingId === r.id}
                        className="shrink-0 rounded-xl border border-red-200 px-3 py-1.5 text-[12px] font-semibold text-red-500 disabled:opacity-50"
                      >
                        {deletingId === r.id ? "삭제 중..." : "삭제"}
                      </button>
                    </div>
                    <p className="mt-2 text-[12px] leading-[18px] text-[var(--gray-600)] whitespace-pre-line line-clamp-3 break-words">
                      {r.content.slice(0, RESUME_PREVIEW)}
                      {r.content.length > RESUME_PREVIEW && "…"}
                    </p>
                  </li>
                ))}
              </ul>

              {resumes.length < MAX_SLOTS ? (
                <Link
                  href="/resume"
                  className="mt-3 block w-full rounded-2xl border border-dashed border-[var(--gray-300)] py-3 text-center text-[13px] font-semibold text-[var(--gray-700)] hover:border-[var(--blue-primary)] hover:text-[var(--blue-primary)] transition-colors"
                >
                  + 새 이력서 등록
                </Link>
              ) : (
                <div className="mt-3 rounded-2xl bg-[var(--gray-100)] px-4 py-3 text-[12px] text-[var(--gray-600)] text-center leading-[18px]">
                  이력서는 {MAX_SLOTS}개까지 등록 가능해요.
                  <br />
                  새로 등록하려면 기존 이력서를 삭제해 주세요.
                </div>
              )}

              <div className="mt-4">
                <PremiumGenerateButton
                  variant="compact"
                  onClick={() => setShowGenerateModal(true)}
                  disabled={resumes.length >= MAX_SLOTS}
                  disabledReason="기존 이력서를 삭제해 주세요"
                />
              </div>
            </>
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

      <ResumeGenerateModal
        open={showGenerateModal}
        onClose={() => setShowGenerateModal(false)}
        existingResume={resumes?.[0]?.content}
      />
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
