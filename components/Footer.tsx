// 약관·가격정책 링크를 포함하는 전역 푸터 컴포넌트 (면접 페이지에서는 숨김)
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function Footer() {
  const pathname = usePathname();
  // Hide on full-screen chat experience (interview) where the legal links
  // would visually compete with the fixed-bottom input area.
  if (pathname === "/interview") return null;

  return (
    <footer className="border-t border-[var(--gray-100)] px-5 py-6 text-[12px] text-[var(--gray-500)]">
      <nav className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <Link href="/legal/terms" className="transition hover:text-[var(--gray-800)]">
          이용약관
        </Link>
        <span aria-hidden>·</span>
        <Link href="/legal/pricing" className="transition hover:text-[var(--gray-800)]">
          가격정책
        </Link>
        <span aria-hidden>·</span>
        <Link href="/legal/privacy" className="transition hover:text-[var(--gray-800)]">
          개인정보처리방침
        </Link>
        <span aria-hidden>·</span>
        <a
          href="mailto:interviewmate2026@gmail.com"
          className="transition hover:text-[var(--gray-800)]"
        >
          interviewmate2026@gmail.com
        </a>
      </nav>
      <p className="mt-2 text-[11px] text-[var(--gray-400)]">
        © Trust. All rights reserved.
      </p>
    </footer>
  );
}
