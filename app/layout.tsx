import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "InterviewMate — AI 모의면접 코치",
  description:
    "이력서와 채용공고를 기반으로 맞춤형 면접 질문을 생성하고, 실전처럼 연습하며, 상세한 피드백을 받아보세요.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <head>
        <link
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard/dist/web/variable/pretendardvariable.css"
          rel="stylesheet"
        />
      </head>
      <body className="bg-gray-50 text-gray-900 antialiased">
        <div className="mx-auto min-h-dvh max-w-[640px] flex flex-col">
          {children}
        </div>
      </body>
    </html>
  );
}
