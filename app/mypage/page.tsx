// 마이페이지 — 크레딧 잔액, 저장된 자기소개서 슬롯, 회원 탈퇴 기능 제공
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { motion, AnimatePresence } from "framer-motion";
import { resolvePersona } from "@/lib/personas";
import PremiumGenerateButton from "@/components/PremiumGenerateButton";
import {
  deleteGuestResume,
  isGuestMode,
  loadGuestResumes,
} from "@/lib/guest-resume-store";
import { openCheckout } from "@/lib/billing/checkout";

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
  const [showWithdrawConfirm, setShowWithdrawConfirm] = useState(false);
  const [isWithdrawing, setIsWithdrawing] = useState(false);

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

  // 결제 완료 후 webhook이 DB에 반영되면 잔액 refetch
  useEffect(() => {
    const handler = () => {
      fetch("/api/me/credits", { cache: "no-store" })
        .then((r) => (r.ok ? r.json() : null))
        .then((b) => {
          if (b) setBalance(b);
        })
        .catch(() => {});
    };
    window.addEventListener("paddle:checkout-completed", handler);
    return () =>
      window.removeEventListener("paddle:checkout-completed", handler);
  }, []);

  const handlePurchase = () => {
    if (!user) return;
    openCheckout({
      clerkUserId: user.id,
      email: user.primaryEmailAddress?.emailAddress,
    });
  };

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

  const handleWithdraw = async () => {
    setIsWithdrawing(true);
    try {
      const res = await fetch("/api/me/delete", { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json();
        alert(data.error ?? "탈퇴 처리 중 오류가 발생했습니다.");
        return;
      }
      // Clerk 세션이 무효화되므로 홈으로 이동하면 자동 로그아웃
      router.replace("/");
    } catch {
      alert("탈퇴 처리 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.");
    } finally {
      setIsWithdrawing(false);
      setShowWithdrawConfirm(false);
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
              onClick={handlePurchase}
              disabled={!user}
              className="mt-4 w-full rounded-xl bg-[var(--blue-primary)] py-3 text-[14px] font-bold text-white transition hover:brightness-110 active:scale-[0.98] disabled:opacity-60"
            >
              패키지 구매
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
                <PremiumGenerateButton />
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

      {/* 회원 탈퇴 */}
      <div className="px-5 pb-10 pt-2">
        <button
          onClick={() => setShowWithdrawConfirm(true)}
          className="text-[12px] text-[var(--gray-400)] underline underline-offset-2 hover:text-red-400 transition-colors"
        >
          회원 탈퇴
        </button>
      </div>

      {/* 탈퇴 확인 시트 */}
      <AnimatePresence>
        {showWithdrawConfirm && (
          <>
            <motion.div
              className="fixed inset-0 z-50 bg-black/40"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => !isWithdrawing && setShowWithdrawConfirm(false)}
            />
            <div className="pointer-events-none fixed inset-0 z-[51] flex items-end justify-center px-4 pb-4 sm:items-center sm:pb-0">
              <motion.div
                className="pointer-events-auto w-full max-w-[360px] rounded-2xl bg-white px-5 pt-5 pb-5"
                initial={{ y: 40, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: 40, opacity: 0 }}
                transition={{ type: "spring", damping: 28, stiffness: 280 }}
              >
                <h2 className="text-[16px] font-bold text-[var(--gray-900)]">
                  정말 탈퇴하시겠어요?
                </h2>
                <p className="mt-1.5 text-[13px] leading-[19px] text-[var(--gray-600)]">
                  이력서, 면접 기록, 크레딧이 모두 삭제되며 복구할 수 없습니다.
                </p>
                <div className="mt-4 flex gap-2">
                  <button
                    onClick={() => setShowWithdrawConfirm(false)}
                    disabled={isWithdrawing}
                    className="flex-1 rounded-xl border border-[var(--gray-200)] bg-white py-2.5 text-[13px] font-semibold text-[var(--gray-700)] disabled:opacity-50"
                  >
                    취소
                  </button>
                  <button
                    onClick={handleWithdraw}
                    disabled={isWithdrawing}
                    className="flex-1 rounded-xl bg-red-500 py-2.5 text-[13px] font-bold text-white disabled:opacity-50"
                  >
                    {isWithdrawing ? "처리 중..." : "탈퇴하기"}
                  </button>
                </div>
              </motion.div>
            </div>
          </>
        )}
      </AnimatePresence>
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
