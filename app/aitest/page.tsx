// AI 인적성검사 허브 페이지 — 3종 검사 카드 + 면접/서류 서비스 연결 CTA
"use client";

import { useRef, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import posthog from "posthog-js";
import LottieAnimation from "@/components/LottieAnimation";

function LazyLottie({ src, className, style }: { src: string; className?: string; style?: React.CSSProperties }) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setVisible(true); obs.disconnect(); } }, { rootMargin: "100px" });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  return <div ref={ref}>{visible && <LottieAnimation src={src} className={className} style={style} />}</div>;
}

const TESTS = [
  {
    id: "nback",
    title: "N-Back 도형 기억력",
    desc: "N번째 전 도형을 기억하는 게임",
    ability: "작업기억력",
    lottie: "/lottie/Morphing shapes.json",
    lottieSize: "w-20 h-20",
    lottieScale: 1.0,
    color: "from-blue-500/10 to-blue-600/5",
    accent: "var(--blue-primary)",
    href: "/aitest/nback",
  },
  {
    id: "potion",
    title: "마법약 확률 추론",
    desc: "재료 조합 패턴을 파악하고\n예측하는 게임",
    ability: "패턴인식력",
    lottie: "/lottie/Animation - Magic Potion.json",
    lottieSize: "w-20 h-20",
    lottieScale: 1.2,
    color: "from-emerald-500/10 to-emerald-600/5",
    accent: "#00B167",
    href: "/aitest/potion",
  },
  {
    id: "rotation",
    title: "도형 회전 공간지각",
    desc: "도형의 회전·반전 변환을 추론해\n정답을 맞추는 공간지각 게임",
    ability: "공간지각력",
    lottie: "/lottie/Connected cubes animation.json",
    lottieSize: "w-12 h-12",
    lottieScale: 1,
    color: "from-purple-500/10 to-purple-600/5",
    accent: "#7C5CFF",
    href: "/aitest/rotation",
  },
];

export default function AiTestHub() {
  const router = useRouter();

  return (
    <motion.div
      className="flex min-h-dvh flex-col bg-white"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
    >
      {/* HERO */}
      <section className="px-6 pt-6 pb-2">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="inline-flex items-center gap-1.5 rounded-full bg-[var(--blue-light)] px-3 py-1 text-[12px] font-semibold text-[var(--blue-primary)]"
        >
          <span className="inline-block w-1.5 h-1.5 rounded-full bg-[var(--blue-primary)] animate-pulse" />
          무료 체험
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, delay: 0.08 }}
          className="mt-3 text-[28px] font-extrabold leading-[1.2] text-[var(--gray-900)] tracking-tight"
        >
          AI 인적성검사
          <br />
          <span className="text-[var(--blue-primary)]">실전 체험</span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.15 }}
          className="mt-2 text-[14px] leading-[22px] text-[var(--gray-500)] font-medium"
        >
          대기업 인적성검사에서 자주 출제되는 유형을 연습하세요.
          <br />
          작업기억 · 패턴인식 · 공간지각 3가지 영역을 측정합니다.
        </motion.p>
      </section>

      {/* TEST CARDS */}
      <section className="px-6 pt-4 pb-6 flex flex-col gap-3">
        {TESTS.map((test, i) => (
          <motion.button
            key={test.id}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: 0.2 + i * 0.08 }}
            onClick={() => {
              posthog.capture("aitest_card_clicked", { test: test.id });
              router.push(test.href);
            }}
            className={`relative overflow-hidden rounded-2xl bg-gradient-to-br ${test.color} p-5 text-left transition-transform active:scale-[0.98]`}
          >
            <div className="flex items-start gap-4">
              <div className="w-14 h-14 shrink-0 rounded-xl bg-white/80 flex items-center justify-center shadow-sm overflow-hidden">
                <LazyLottie
                  src={test.lottie}
                  className={`${test.lottieSize}`}
                  style={{ transform: `scale(${test.lottieScale})` }}
                />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="text-[16px] font-bold text-[var(--gray-900)]">
                    {test.title}
                  </h3>
                </div>
                <p className="mt-1 text-[13px] leading-[20px] text-[var(--gray-500)] font-medium whitespace-pre-line">
                  {test.desc}
                </p>
                <div className="mt-2.5 flex items-center gap-2">
                  <span
                    className="inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold text-white"
                    style={{ backgroundColor: test.accent }}
                  >
                    {test.ability}
                  </span>
                  <span className="text-[12px] text-[var(--gray-400)] font-medium">
                    약 5~10분
                  </span>
                </div>
              </div>
              <div className="shrink-0 flex items-center justify-center w-8 h-8 rounded-full bg-white/60 mt-1">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path
                    d="M6 4l4 4-4 4"
                    stroke="var(--gray-400)"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
            </div>
          </motion.button>
        ))}
      </section>

      {/* FUNNEL CTA */}
      <section className="px-6 pb-8">
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true, margin: "-40px" }}
          transition={{ duration: 0.5 }}
          className="relative overflow-hidden rounded-3xl bg-[var(--gray-900)] px-6 py-8 text-center"
        >
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center opacity-40 mix-blend-screen">
            <LottieAnimation
              src="/lottie/congratulation.json"
              className="w-[140%] h-[140%] object-contain"
            />
          </div>
          <div className="relative">
            <h2 className="text-[20px] font-extrabold leading-[1.3] text-white tracking-tight">
              인적성 다음은
              <br />
              면접 · 서류 준비
            </h2>
            <p className="mt-2 text-[13px] text-[var(--gray-400)] font-medium">
              24개 빅데이터 기반 맞춤 면접, 서류 전형 준비
            </p>
            <div className="mt-5 flex gap-2">
              <button
                onClick={() => {
                  posthog.capture("aitest_funnel_interview");
                  router.push("/resume");
                }}
                className="flex-1 rounded-2xl bg-white py-[14px] text-[15px] font-bold text-[var(--gray-900)] transition-transform active:scale-[0.98]"
              >
                면접관 4명과 면접
              </button>
              <button
                onClick={() => {
                  posthog.capture("aitest_funnel_jasoseo");
                  router.push("/jasoseo");
                }}
                className="flex-1 rounded-2xl bg-white/20 py-[14px] text-[15px] font-bold text-white border border-white/30 transition-transform active:scale-[0.98]"
              >
                5가지 서류 준비
              </button>
            </div>
          </div>
        </motion.div>
      </section>
    </motion.div>
  );
}
