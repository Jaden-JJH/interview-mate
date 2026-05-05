"use client";

import { useCallback, useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import LottieAnimation from "./LottieAnimation";
import { openCheckout } from "@/lib/billing/checkout";

interface Balance {
  free: number;
  paid: number;
  total: number;
}

export default function CreditBadge() {
  const pathname = usePathname();
  const { user } = useUser();
  const [balance, setBalance] = useState<Balance | null>(null);

  const fetchBalance = useCallback(() => {
    let cancelled = false;
    fetch("/api/me/credits", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((b: Balance | null) => {
        if (!cancelled && b) setBalance(b);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  // Refetch when the user lands on a page where the count may have changed
  // (after starting an interview, after coming back to /resume, etc.).
  useEffect(() => fetchBalance(), [pathname, fetchBalance]);

  // 결제 완료 후 webhook 반영되면 잔액 refetch.
  useEffect(() => {
    const handler = () => fetchBalance();
    window.addEventListener("paddle:checkout-completed", handler);
    return () =>
      window.removeEventListener("paddle:checkout-completed", handler);
  }, [fetchBalance]);

  const handleClick = () => {
    if (!user) return;
    openCheckout({
      clerkUserId: user.id,
      email: user.primaryEmailAddress?.emailAddress,
    });
  };

  // While the balance is loading, render an identically-sized skeleton so
  // the header doesn't reflow when the number arrives a tick later.
  if (!balance) {
    return (
      <span aria-hidden className="inline-flex items-center">
        <span className="h-8 w-8 rounded-full bg-gray-200" />
        <span className="block h-4 w-3 rounded bg-gray-200" />
      </span>
    );
  }

  const low = balance.total <= 1;
  return (
    <button
      type="button"
      onClick={handleClick}
      title={`무료 ${balance.free} · 결제 ${balance.paid} · 클릭하여 충전`}
      className="inline-flex items-center leading-none tabular-nums rounded-full px-1 transition hover:bg-gray-100 active:scale-[0.98]"
    >
      <LottieAnimation
        src="/lottie/Coin.json"
        loop={false}
        className="h-8 w-8"
      />
      <span
        className={`text-[16px] font-extrabold ${
          low ? "text-[var(--blue-primary)]" : "text-[var(--gray-900)]"
        }`}
      >
        {balance.total}
      </span>
    </button>
  );
}
