"use client";

import Link from "next/link";
import {
  ClerkLoaded,
  ClerkLoading,
  SignedIn,
  SignedOut,
  SignInButton,
  UserButton,
} from "@clerk/nextjs";
import CreditBadge from "./CreditBadge";

function BrandMark() {
  return (
    <Link href="/" className="flex items-center gap-2">
      <span className="relative flex items-center justify-center w-7 h-7 rounded-[8px] bg-[var(--blue-primary)] shadow-[0_4px_12px_-2px_rgba(27,100,218,0.45)]">
        <svg
          width="18"
          height="18"
          viewBox="0 0 18 18"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M3.5 5.2c0-.94.76-1.7 1.7-1.7h7.6c.94 0 1.7.76 1.7 1.7v4.6c0 .94-.76 1.7-1.7 1.7H8.6L5.4 13.9v-2.4h-.2c-.94 0-1.7-.76-1.7-1.7V5.2z"
            fill="white"
          />
          <circle cx="6.6" cy="7.5" r="0.9" fill="#1B64DA" />
          <circle cx="9" cy="7.5" r="0.9" fill="#1B64DA" />
          <circle cx="11.4" cy="7.5" r="0.9" fill="#1B64DA" />
        </svg>
      </span>
      <span className="text-[15px] font-extrabold text-[var(--gray-900)] tracking-tight">
        인터뷰<span className="text-[var(--blue-primary)]">메이트</span>
      </span>
    </Link>
  );
}

// Fixed-height slot so hydration never bumps the content below.
const AUTH_SLOT = "h-8 flex items-center justify-end";

export default function AuthHeader() {
  return (
    <header className="sticky top-0 z-20 flex h-14 items-center justify-between border-b border-gray-100 bg-white/80 px-5 backdrop-blur-md">
      <BrandMark />
      <div className="flex items-center gap-3">
        <ClerkLoaded>
          <SignedIn>
            <CreditBadge />
          </SignedIn>
        </ClerkLoaded>
        <div className={`${AUTH_SLOT} ml-2`}>
          <ClerkLoading>
            <span
              aria-hidden
              className="block h-8 w-[72px] rounded-full bg-gray-100"
            />
          </ClerkLoading>
          <ClerkLoaded>
            <SignedOut>
              <SignInButton mode="modal">
                <button className="rounded-full bg-[var(--blue-primary)] px-4 py-1.5 text-[13px] font-semibold text-white shadow-[0_2px_8px_-2px_rgba(27,100,218,0.45)] transition hover:brightness-110 active:scale-[0.98]">
                  로그인
                </button>
              </SignInButton>
            </SignedOut>
            <SignedIn>
              <UserButton
                afterSignOutUrl="/"
                appearance={{ elements: { avatarBox: "w-8 h-8" } }}
              >
                <UserButton.MenuItems>
                  <UserButton.Link
                    label="마이페이지"
                    labelIcon={
                      <svg
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                        <circle cx="12" cy="7" r="4" />
                      </svg>
                    }
                    href="/mypage"
                  />
                </UserButton.MenuItems>
              </UserButton>
            </SignedIn>
          </ClerkLoaded>
        </div>
      </div>
    </header>
  );
}
