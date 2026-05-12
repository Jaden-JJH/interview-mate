// 루트 레이아웃 에러를 캡처해 PostHog에 보고하는 글로벌 에러 페이지
"use client";

import posthog from "posthog-js";
import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    if (!posthog.__loaded) {
      const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
      if (key) {
        posthog.init(key, {
          api_host:
            process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "https://us.i.posthog.com",
          capture_exceptions: true,
        });
      }
    }
    posthog.captureException(error);
  }, [error]);

  return (
    <html lang="ko">
      <body>
        <div className="flex min-h-dvh flex-col items-center justify-center p-6 text-center">
          <h1 style={{ fontSize: 20, fontWeight: 700 }}>
            잠시 문제가 발생했어요
          </h1>
          <p style={{ marginTop: 8, fontSize: 13, color: "#6b7280" }}>
            {error.message || "알 수 없는 오류"}
          </p>
          <button
            onClick={reset}
            style={{
              marginTop: 24,
              padding: "12px 24px",
              borderRadius: 12,
              background: "#3B82F6",
              color: "#fff",
              fontWeight: 700,
              fontSize: 14,
              border: "none",
              cursor: "pointer",
            }}
          >
            다시 시도
          </button>
        </div>
      </body>
    </html>
  );
}
