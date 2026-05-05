import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import { koKR } from "@clerk/localizations";
import "./globals.css";
import GlobalClickEffect from "@/components/GlobalClickEffect";
import StarryBackground from "@/components/StarryBackground";
import { InterviewProvider } from "@/contexts/InterviewContext";
import ErrorBoundary from "@/components/ErrorBoundary";
import AuthHeader from "@/components/AuthHeader";

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
        <ClerkProvider localization={koKR}>
          <ErrorBoundary>
            <InterviewProvider>
              <StarryBackground />
              {/* Outer flex centers the app container regardless of any
                  ancestor that might otherwise leave `mx-auto` ineffective.
                  Centers consistently with viewport-anchored fixed
                  elements (toasts, modals) rendered via portal. */}
              <div className="relative z-10 flex justify-center">
                <div className="w-full max-w-[640px] min-h-dvh flex flex-col bg-white shadow-2xl">
                  <AuthHeader />
                  {children}
                </div>
              </div>
              <GlobalClickEffect />
            </InterviewProvider>
          </ErrorBoundary>
        </ClerkProvider>
      </body>
    </html>
  );
}
