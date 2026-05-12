// 라우트 세그먼트 에러를 캡처해 PostHog에 보고하고 재시도 UI를 표시하는 에러 페이지
"use client";

import posthog from "posthog-js";
import { useEffect } from "react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    posthog.captureException(error);
  }, [error]);

  return (
    <div className="flex min-h-[60dvh] flex-col items-center justify-center p-6 text-center">
      <h1 className="text-[20px] font-bold text-[var(--gray-900)]">
        잠시 문제가 발생했어요
      </h1>
      <p className="mt-2 text-[13px] text-[var(--gray-500)] max-w-[320px]">
        {error.message || "알 수 없는 오류"}
      </p>
      <button
        onClick={reset}
        className="mt-6 rounded-xl bg-[var(--blue-primary)] px-6 py-3 text-[14px] font-bold text-white"
      >
        다시 시도
      </button>
    </div>
  );
}
