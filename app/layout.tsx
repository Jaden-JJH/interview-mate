import type { Metadata } from "next";
import "./globals.css";
import GlobalClickEffect from "@/components/GlobalClickEffect";
import StarryBackground from "@/components/StarryBackground";
import { InterviewProvider } from "@/contexts/InterviewContext";
import ErrorBoundary from "@/components/ErrorBoundary";

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"
  ),
  title: "인터뷰메이트 - 면접 연습",
  description:
    "이력서와 채용공고를 기반으로 맞춤형 면접 질문을 생성하고, 실전처럼 연습하며, 상세한 피드백을 받아보세요.",
  openGraph: {
    title: "인터뷰메이트 - AI 기반 모의 면접",
    description:
      "이력서와 채용공고를 기반으로 맞춤형 면접 질문을 생성하고, 실전처럼 연습하며, 상세한 피드백을 받아보세요.",
    type: "website",
    locale: "ko_KR",
  },
  twitter: {
    card: "summary_large_image",
    title: "인터뷰메이트 - AI 기반 모의 면접",
    description: "5분이면 첫 면접 리포트가 나옵니다",
  },
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
        <ErrorBoundary>
          <InterviewProvider>
            <StarryBackground />
            <div className="relative z-10 mx-auto min-h-dvh max-w-[640px] flex flex-col bg-white shadow-2xl">
              {children}
            </div>
            <GlobalClickEffect />
          </InterviewProvider>
        </ErrorBoundary>
      </body>
    </html>
  );
}
