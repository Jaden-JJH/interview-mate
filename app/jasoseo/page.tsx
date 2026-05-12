// 자소서메이트 서비스 허브 — 자기소개서·경력기술서·이력서 생성 서비스 선택 페이지
"use client";

import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import LottieAnimation from "@/components/LottieAnimation";

const services = [
  {
    title: "자기소개서 답변 생성",
    subtitle: "기업 질문에 맞는 합격형 답변",
    tag: "1크레딧",
    route: "/jasoseo/generate",
    icon: "sparkle" as const,
  },
  {
    title: "경력기술서 생성",
    subtitle: "성과 중심 스토리텔링 3~5장",
    tag: "1크레딧",
    route: "/jasoseo/career",
    icon: "briefcase" as const,
  },
  {
    title: "이력서 생성",
    subtitle: "깔끔한 실전용 이력서 1~2장",
    tag: "1크레딧",
    route: "/jasoseo/resume-gen",
    icon: "user" as const,
  },
];

function ServiceIcon({ type, className }: { type: "sparkle" | "briefcase" | "user"; className?: string }) {
  switch (type) {
    case "sparkle":
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 3l1.9 4.6L19 9.5l-4 3.9.9 5.6L12 16.4 8.1 19l.9-5.6-4-3.9 5.1-1.9z" />
        </svg>
      );
    case "briefcase":
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
          <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
        </svg>
      );
    case "user":
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="4" width="18" height="16" rx="2" />
          <circle cx="9" cy="11" r="2.5" />
          <path d="M5 17c0-2 1.8-3 4-3s4 1 4 3" />
          <line x1="15" y1="9" x2="19" y2="9" />
          <line x1="15" y1="13" x2="19" y2="13" />
        </svg>
      );
  }
}

export default function JasoseoHubPage() {
  const router = useRouter();

  return (
    <div className="flex flex-1 flex-col px-5 pt-6 pb-12">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center"
      >
        <h1 className="text-[22px] font-extrabold text-[var(--gray-900)]">
          AI 문서 작성소
        </h1>
        <p className="mt-1 text-[14px] text-[var(--gray-500)]">
          합격을 부르는 서류, AI가 대신 써 드려요
        </p>
      </motion.div>

      {/* Lottie character */}
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.1 }}
        className="flex justify-center my-4"
      >
        <LottieAnimation src="/lottie/alex.json" className="w-32 h-32" />
      </motion.div>

      {/* Service cards */}
      <div className="flex flex-col gap-3">
        {services.map((service, index) => (
          <motion.div
            key={service.route}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 * index }}
          >
            <button
              type="button"
              onClick={() => router.push(service.route)}
              className="group relative w-full overflow-hidden rounded-2xl p-[1.5px] active:scale-[0.99] transition-transform"
            >
              {/* Animated conic gradient border */}
              <span
                aria-hidden
                className="absolute inset-[-1000%] animate-[premiumSpin_3s_linear_infinite] bg-[conic-gradient(from_90deg_at_50%_50%,#1B64DA_0%,#7C5CFF_25%,#E2CBFF_50%,#7C5CFF_75%,#1B64DA_100%)]"
              />

              {/* Inner content */}
              <span className="relative flex w-full items-center gap-3 rounded-[14px] bg-[var(--gray-900)] px-5 py-4 text-left">
                {/* Icon circle */}
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#7C5CFF] to-[#1B64DA]">
                  <ServiceIcon type={service.icon} className="h-5 w-5" />
                </span>

                {/* Text block */}
                <span className="flex flex-1 flex-col gap-0.5">
                  <span className="text-[14px] font-bold text-white">
                    {service.title}
                  </span>
                  <span className="text-[12px] text-white/60">
                    {service.subtitle}
                  </span>
                  <span className="mt-1 inline-flex w-fit rounded-full bg-white/10 px-2 py-[2px] text-[10px] font-semibold text-white/80">
                    {service.tag}
                  </span>
                </span>

                {/* Chevron */}
                <svg
                  className="h-4 w-4 shrink-0 text-white/50 transition-transform group-hover:translate-x-0.5"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2.5}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M9 6l6 6-6 6" />
                </svg>
              </span>
            </button>
          </motion.div>
        ))}
      </div>

      {/* Bottom analyze link */}
      <button
        onClick={() => router.push("/jasoseo/analyze")}
        className="mt-6 flex items-center justify-center gap-1 text-[13px] font-semibold text-[var(--gray-500)] hover:text-[var(--blue-primary)] transition-colors"
      >
        이미 작성한 자소서 분석하기
        <svg
          className="h-4 w-4"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
        </svg>
      </button>
    </div>
  );
}
