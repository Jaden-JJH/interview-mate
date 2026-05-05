import Link from "next/link";

export default function Footer() {
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
          href="mailto:interviewmate@gmail.com"
          className="transition hover:text-[var(--gray-800)]"
        >
          interviewmate@gmail.com
        </a>
      </nav>
      <p className="mt-2 text-[11px] text-[var(--gray-400)]">
        © Trust. All rights reserved.
      </p>
    </footer>
  );
}
