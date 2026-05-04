"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import LottieAnimation from "./LottieAnimation";

interface Balance {
  free: number;
  paid: number;
  total: number;
}

export default function CreditBadge() {
  const pathname = usePathname();
  const [balance, setBalance] = useState<Balance | null>(null);

  // Refetch when the user lands on a page where the count may have changed
  // (after starting an interview, after coming back to /resume, etc.).
  useEffect(() => {
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
  }, [pathname]);

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
    <span
      title={`무료 ${balance.free} · 결제 ${balance.paid}`}
      className="inline-flex items-center leading-none tabular-nums"
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
    </span>
  );
}
