// 인앱 브라우저 감지 시 외부 브라우저 유도 안내를 표시하는 가드 컴포넌트
"use client";

import { useEffect, useState, type ReactNode } from "react";
import {
  isInAppBrowser,
  getInAppBrowserName,
  isAndroid,
} from "@/lib/in-app-browser";

export default function InAppBrowserGuard({
  children,
}: {
  children: ReactNode;
}) {
  const [blocked, setBlocked] = useState(false);
  const [appName, setAppName] = useState("");
  const [android, setAndroid] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const ua = navigator.userAgent;
    if (isInAppBrowser(ua)) {
      setBlocked(true);
      setAppName(getInAppBrowserName(ua));
      setAndroid(isAndroid(ua));
    }
  }, []);

  if (!blocked) return <>{children}</>;

  const currentUrl = typeof window !== "undefined" ? window.location.href : "";

  function handleOpenExternal() {
    if (android) {
      window.location.href = `intent://${window.location.host}${window.location.pathname}${window.location.search}#Intent;scheme=https;package=com.android.chrome;S.browser_fallback_url=${encodeURIComponent(currentUrl)};end`;
    } else {
      handleCopy();
    }
  }

  function handleCopy() {
    navigator.clipboard.writeText(currentUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <div className="flex flex-1 items-center justify-center px-5 py-12">
      <div className="w-full max-w-[400px] rounded-2xl bg-white p-7 text-center shadow-lg">
        <div className="mb-4 text-[48px]">🌐</div>

        <h2 className="mb-2 text-[18px] font-bold text-gray-900">
          외부 브라우저에서 열어주세요
        </h2>

        <p className="mb-6 text-[14px] leading-relaxed text-gray-500">
          <strong>{appName}</strong> 내장 브라우저에서는 Google 로그인이
          제한됩니다.
          {android
            ? " 아래 버튼을 눌러 Chrome으로 열어주세요."
            : " 아래 버튼으로 링크를 복사한 뒤 Safari 또는 Chrome에서 열어주세요."}
        </p>

        <button
          onClick={handleOpenExternal}
          className="mb-3 w-full rounded-xl py-3.5 text-[15px] font-semibold text-white"
          style={{ backgroundColor: "var(--blue-primary, #2563eb)" }}
        >
          {android ? "Chrome으로 열기" : "링크 복사하기"}
        </button>

        {!android && (
          <p
            className="text-[13px] text-gray-400 transition-colors"
            style={{ color: copied ? "var(--blue-primary, #2563eb)" : "" }}
          >
            {copied ? "복사되었습니다!" : "복사 후 Safari에 붙여넣기 해주세요"}
          </p>
        )}

        {android && (
          <button
            onClick={handleCopy}
            className="w-full text-[13px] text-gray-400 underline"
          >
            {copied ? "복사되었습니다!" : "또는 링크 복사하기"}
          </button>
        )}
      </div>
    </div>
  );
}
