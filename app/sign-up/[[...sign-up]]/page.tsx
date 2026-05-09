// Clerk SignUp 컴포넌트를 렌더링하는 회원가입 페이지
import type { Metadata } from "next";
import { SignUp } from "@clerk/nextjs";

export const metadata: Metadata = {
  title: "회원가입",
  description: "인터뷰메이트에 가입하고 무료 AI 모의 면접 1회를 시작하세요.",
  robots: { index: false, follow: false },
};

export default function Page() {
  return (
    <div className="flex flex-1 items-center justify-center py-12">
      <SignUp />
    </div>
  );
}
