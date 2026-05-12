// PostHog 클라이언트를 초기화하고 페이지뷰 자동 추적 + Clerk 유저 식별을 담당하는 프로바이더 컴포넌트
"use client";

import posthog from "posthog-js";
import { PostHogProvider as PHProvider, usePostHog } from "posthog-js/react";
import { usePathname, useSearchParams } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { useEffect, Suspense } from "react";

function PostHogPageView() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const ph = usePostHog();

  useEffect(() => {
    if (!ph) return;
    const url = pathname + (searchParams.toString() ? `?${searchParams}` : "");
    ph.capture("$pageview", { $current_url: url });
  }, [pathname, searchParams, ph]);

  return null;
}

function PostHogUserIdentify() {
  const { user, isLoaded } = useUser();
  const ph = usePostHog();

  useEffect(() => {
    if (!ph || !isLoaded) return;
    if (user) {
      ph.identify(user.id, {
        email: user.primaryEmailAddress?.emailAddress,
        name: user.fullName ?? undefined,
      });
    } else {
      ph.reset();
    }
  }, [user, isLoaded, ph]);

  return null;
}

if (typeof window !== "undefined") {
  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
  if (key) {
    posthog.init(key, {
      api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "https://us.i.posthog.com",
      capture_pageview: false, // manual via PostHogPageView
      capture_pageleave: true,
      autocapture: true,
      capture_exceptions: true,
    });
  }
}

export default function PostHogProvider({ children }: { children: React.ReactNode }) {
  return (
    <PHProvider client={posthog}>
      <Suspense fallback={null}>
        <PostHogPageView />
      </Suspense>
      <PostHogUserIdentify />
      {children}
    </PHProvider>
  );
}
