// Clerk SignUp 페이지 — 인앱 브라우저 감지 시 외부 브라우저 유도
import type { Metadata } from "next";
import { SignUp } from "@clerk/nextjs";
import InAppBrowserGuard from "@/components/InAppBrowserGuard";

export const metadata: Metadata = {
  title: "회원가입",
  description: "인터뷰메이트에 가입하고 무료 AI 모의 면접 1회를 시작하세요.",
  robots: { index: false, follow: false },
};

export default function Page() {
  return (
    <InAppBrowserGuard>
      <div className="flex flex-1 items-center justify-center py-12">
        <SignUp />
      </div>
    </InAppBrowserGuard>
  );
}
