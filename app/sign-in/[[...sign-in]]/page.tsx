import type { Metadata } from "next";
import { SignIn } from "@clerk/nextjs";

export const metadata: Metadata = {
  title: "로그인",
  description: "인터뷰메이트에 로그인하고 AI 모의 면접을 시작하세요.",
  robots: { index: false, follow: false },
};

export default function Page() {
  return (
    <div className="flex flex-1 items-center justify-center py-12">
      <SignIn />
    </div>
  );
}
