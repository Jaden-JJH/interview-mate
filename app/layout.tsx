import type { Metadata } from "next";
import "./globals.css";
import GlobalClickEffect from "@/components/GlobalClickEffect";

export const metadata: Metadata = {
  title: "인터뷰메이트 - 면접 연습",
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
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=0" />
      </head>
      <body>
        <div className="mx-auto min-h-dvh max-w-[640px] flex flex-col bg-[var(--gray-bg)]">
          {children}
        </div>
        <GlobalClickEffect />
      </body>
    </html>
  );
}
