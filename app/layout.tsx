import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import { koKR } from "@clerk/localizations";
import "./globals.css";
import GlobalClickEffect from "@/components/GlobalClickEffect";
import StarryBackground from "@/components/StarryBackground";
import { InterviewProvider } from "@/contexts/InterviewContext";
import ErrorBoundary from "@/components/ErrorBoundary";
import AuthHeader from "@/components/AuthHeader";
import Footer from "@/components/Footer";
import PostHogProvider from "@/components/PostHogProvider";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

const JSON_LD = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "인터뷰메이트",
  applicationCategory: "EducationApplication",
  operatingSystem: "Web",
  url: SITE_URL,
  description:
    "자기소개서와 채용공고를 입력하면 AI가 맞춤 면접 질문을 생성하고, 실전처럼 연습하며 상세 피드백을 받을 수 있는 AI 모의 면접 서비스",
  inLanguage: "ko",
  offers: {
    "@type": "Offer",
    price: "0",
    priceCurrency: "KRW",
    description: "무료 체험 1회 제공",
  },
};

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "인터뷰메이트 - AI 모의 면접",
    template: "%s | 인터뷰메이트",
  },
  description:
    "자기소개서와 채용공고를 입력하면 AI가 맞춤 면접 질문을 생성하고, 실전처럼 연습하며 상세 피드백을 받을 수 있는 AI 모의 면접 서비스입니다.",
  keywords: [
    "AI 면접", "모의 면접", "면접 연습", "자기소개서", "채용", "취업 준비",
    "면접 질문", "면접 피드백", "인터뷰 연습", "취업", "AI 면접관",
  ],
  authors: [{ name: "인터뷰메이트" }],
  creator: "인터뷰메이트",
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true },
  },
  openGraph: {
    title: "인터뷰메이트 - AI 기반 모의 면접",
    description:
      "자기소개서와 채용공고를 입력하면 AI가 맞춤 면접 질문을 생성하고, 실전처럼 연습하며 상세 피드백을 받을 수 있습니다.",
    type: "website",
    locale: "ko_KR",
    url: SITE_URL,
    siteName: "인터뷰메이트",
    images: [
      {
        url: "/og.png",
        width: 1200,
        height: 630,
        alt: "인터뷰메이트 - AI 모의 면접",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "인터뷰메이트 - AI 기반 모의 면접",
    description: "5분이면 첫 면접 리포트가 나옵니다",
    images: ["/og.png"],
  },
  verification: {
    google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION,
    other: {
      ...(process.env.NEXT_PUBLIC_NAVER_SITE_VERIFICATION
        ? { "naver-site-verification": process.env.NEXT_PUBLIC_NAVER_SITE_VERIFICATION }
        : {}),
      ...(process.env.NEXT_PUBLIC_BING_SITE_VERIFICATION
        ? { "msvalidate.01": process.env.NEXT_PUBLIC_BING_SITE_VERIFICATION }
        : {}),
    },
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
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(JSON_LD) }}
        />
        <ClerkProvider localization={koKR}>
          <PostHogProvider>
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
                    <div className="flex-1">{children}</div>
                    <Footer />
                  </div>
                </div>
                <GlobalClickEffect />
              </InterviewProvider>
            </ErrorBoundary>
          </PostHogProvider>
        </ClerkProvider>
      </body>
    </html>
  );
}
