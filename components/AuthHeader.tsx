"use client";

import Link from "next/link";
import { SignedIn, SignedOut, SignInButton, UserButton } from "@clerk/nextjs";

export default function AuthHeader() {
  return (
    <header className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-white/80 backdrop-blur">
      <Link href="/" className="text-sm font-semibold text-gray-900">
        인터뷰메이트
      </Link>
      <div className="flex items-center gap-3">
        <SignedOut>
          <SignInButton mode="modal">
            <button className="text-sm text-gray-600 hover:text-gray-900">
              로그인
            </button>
          </SignInButton>
        </SignedOut>
        <SignedIn>
          <UserButton afterSignOutUrl="/" />
        </SignedIn>
      </div>
    </header>
  );
}
