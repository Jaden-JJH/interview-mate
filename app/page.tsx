"use client";

import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import LottieAnimation from "@/components/LottieAnimation";

const STEPS = [
  {
    n: "01",
    title: "자기소개서 입력",
    desc: "PDF 업로드 또는 직접 입력",
    lottie: "/lottie/File Search.json",
  },
  {
    n: "02",
    title: "채용공고 분석",
    desc: "지원하려는 포지션을 알려주세요",
    lottie: "/lottie/Document OCR Scan.json",
  },
  {
    n: "03",
    title: "AI 모의 면접",
    desc: "실전과 같은 맞춤 질문에 답변",
    lottie: "/lottie/Talking Character.json",
  },
  {
    n: "04",
    title: "상세 피드백",
    desc: "강점·개선점을 한눈에 확인",
    lottie: "/lottie/Trophy.json",
  },
];

const FEATURES = [
  {
    icon: "/lottie/Sparkles Loop Loader ai.json",
    title: "AI 맞춤 질문",
    desc: "이력서와 공고를 분석해\n나만을 위한 질문 생성",
    iconSize: "w-20 h-20",
  },
  {
    icon: "/lottie/Audio&Voice-A-002.json",
    title: "실시간 음성 피드백",
    desc: "발화 톤·속도·키워드까지\n즉시 코칭",
    iconSize: "w-20 h-20",
  },
  {
    icon: "/lottie/Fire.json",
    title: "약점 집중 훈련",
    desc: "취약한 영역을 반복 학습해\n빠르게 개선",
    iconSize: "w-12 h-12",
  },
];

const TESTIMONIALS = [
  {
    name: "이*현",
    role: "프론트엔드 3년차",
    quote: "예상 질문이 실제 면접에서 70% 이상 적중했어요. 답변 구조 잡는 법까지 코칭해주는 게 인상적.",
  },
  {
    name: "김*영",
    role: "신입 데이터 분석",
    quote: "혼자 연습할 때 막막했는데, 점수와 개선점이 구체적이라 매일 조금씩 늘고 있는 게 보여요.",
  },
];

const STATS = [
  { value: "12,400+", label: "누적 사용자" },
  { value: "94%", label: "만족도" },
  { value: "+28점", label: "평균 점수 향상" },
];

export default function LandingPage() {
  const router = useRouter();

  return (
    <motion.div
      className="flex min-h-dvh flex-col bg-white"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
    >
      {/* HERO */}
      <section className="relative overflow-hidden pt-5 pb-10">
        {/* Ambient blur */}
        <div className="pointer-events-none absolute inset-0 -top-10 opacity-70">
          <LottieAnimation
            src="/lottie/Fixed Blur.json"
            className="w-full h-full object-cover"
          />
        </div>

        <div className="relative px-6 pt-7">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="inline-flex items-center gap-1.5 rounded-full bg-[var(--blue-light)] px-3 py-1 text-[12px] font-semibold text-[var(--blue-primary)]"
          >
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-[var(--blue-primary)] animate-pulse" />
            AI 기반 모의 면접 서비스
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.18 }}
            className="mt-4 text-[32px] font-extrabold leading-[1.2] text-[var(--gray-900)] tracking-tight"
          >
            합격에 가까워지는<br />
            <span className="bg-gradient-to-r from-[var(--blue-primary)] to-[#5B8DEF] bg-clip-text text-transparent">
              가장 빠른 면접 연습
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.26 }}
            className="mt-3 text-[15px] leading-[24px] text-[var(--gray-500)] font-medium"
          >
            이력서와 채용공고를 기반으로 실전 면접 질문을 생성하고,<br />
            답변을 분석해 강점과 개선점을 정확히 알려드려요.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="relative mt-2 mx-auto w-full max-w-[360px] aspect-square"
          >
            <LottieAnimation
              src="/lottie/Talking Character.json"
              className="w-full h-full object-contain"
            />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
            className="flex flex-col gap-2.5"
          >
            <button
              onClick={() => router.push("/resume")}
              className="w-full rounded-2xl bg-[var(--blue-primary)] py-[18px] text-[16px] font-bold text-white shadow-[0_8px_24px_-8px_rgba(27,100,218,0.5)] transition-transform active:scale-[0.98]"
            >
              무료로 면접 준비 시작하기
            </button>
            <p className="text-center text-[12px] text-[var(--gray-400)]">
              회원가입 없이 바로 사용 · 약 5분 소요
            </p>
          </motion.div>
        </div>
      </section>

      {/* STATS */}
      <section className="px-6 mb-12">
        <div className="grid grid-cols-3 gap-2 rounded-2xl bg-[var(--gray-100)] py-5">
          {STATS.map((s, i) => (
            <motion.div
              key={s.label}
              initial={{ opacity: 0, y: 8 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-40px" }}
              transition={{ duration: 0.4, delay: i * 0.07 }}
              className="text-center border-r last:border-r-0 border-[var(--gray-200)]"
            >
              <div className="text-[18px] font-extrabold text-[var(--gray-900)] tracking-tight">
                {s.value}
              </div>
              <div className="mt-0.5 text-[11px] text-[var(--gray-500)] font-medium">
                {s.label}
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="px-6 mb-14">
        <SectionLabel kicker="HOW IT WORKS" title="4단계로 끝내는 면접 준비" />
        <div className="mt-6 flex flex-col gap-3">
          {STEPS.map((step, i) => (
            <motion.div
              key={step.n}
              initial={{ opacity: 0, x: -12 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.4, delay: i * 0.06 }}
              className="flex items-center gap-4 rounded-2xl border border-[var(--gray-200)] bg-white px-4 py-4"
            >
              <div className="w-16 h-16 shrink-0 rounded-xl bg-[var(--blue-bg)] flex items-center justify-center overflow-hidden">
                <LottieAnimation src={step.lottie} className="w-[120%] h-[120%] object-contain" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[11px] font-bold text-[var(--blue-primary)] tracking-wider">
                  STEP {step.n}
                </div>
                <div className="mt-0.5 text-[15px] font-bold text-[var(--gray-900)]">
                  {step.title}
                </div>
                <div className="text-[13px] text-[var(--gray-500)] font-medium">
                  {step.desc}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* FEATURES */}
      <section className="px-6 mb-14">
        <SectionLabel kicker="FEATURES" title="혼자 연습하는 게 아닙니다" />
        <div className="mt-6 grid grid-cols-1 gap-3">
          {FEATURES.map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-40px" }}
              transition={{ duration: 0.45, delay: i * 0.08 }}
              className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[var(--blue-bg)] to-white p-5 border border-[var(--gray-200)]"
            >
              <div className="absolute right-4 top-1/2 -translate-y-1/2 w-20 h-20 flex items-center justify-center">
                <LottieAnimation src={f.icon} className={`${f.iconSize} object-contain`} />
              </div>
              <div className="relative pr-24">
                <div className="text-[16px] font-bold text-[var(--gray-900)]">
                  {f.title}
                </div>
                <div className="mt-1 text-[13px] leading-[20px] text-[var(--gray-500)] font-medium whitespace-pre-line">
                  {f.desc}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* TESTIMONIALS */}
      <section className="px-6 mb-14">
        <SectionLabel kicker="REVIEWS" title="이렇게 달라졌어요" />
        <div className="mt-6 flex flex-col gap-3">
          {TESTIMONIALS.map((t, i) => (
            <motion.div
              key={t.name}
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-40px" }}
              transition={{ duration: 0.45, delay: i * 0.08 }}
              className="rounded-2xl bg-[var(--gray-100)] p-5"
            >
              <div className="flex gap-0.5 text-[13px] text-[#FFB400]">
                {"★★★★★".split("").map((s, idx) => <span key={idx}>{s}</span>)}
              </div>
              <p className="mt-2 text-[14px] leading-[22px] text-[var(--gray-800)] font-medium">
                “{t.quote}”
              </p>
              <div className="mt-3 flex items-center gap-2">
                <div className="w-7 h-7 rounded-full bg-[var(--blue-light)] text-[var(--blue-primary)] text-[12px] font-bold flex items-center justify-center">
                  {t.name[0]}
                </div>
                <div className="text-[12px] text-[var(--gray-500)] font-medium">
                  <span className="text-[var(--gray-800)] font-semibold">{t.name}</span>
                  {" · "}{t.role}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="px-6 pb-14">
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true, margin: "-40px" }}
          transition={{ duration: 0.5 }}
          className="relative overflow-hidden rounded-3xl bg-[var(--gray-900)] px-6 py-10 text-center"
        >
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center opacity-60 mix-blend-screen">
            <LottieAnimation src="/lottie/congratulation.json" className="w-[140%] h-[140%] object-contain" />
          </div>
          <div className="relative">
            <h2 className="text-[22px] font-extrabold leading-[1.3] text-white tracking-tight">
              지금 5분이면<br />첫 면접 리포트가 나옵니다
            </h2>
            <p className="mt-2 text-[13px] text-[var(--gray-400)] font-medium">
              이력서를 올리는 순간, 맞춤 질문이 생성돼요
            </p>
            <button
              onClick={() => router.push("/resume")}
              className="mt-6 w-full rounded-2xl bg-white py-[16px] text-[15px] font-bold text-[var(--gray-900)] transition-transform active:scale-[0.98]"
            >
              지금 바로 시작하기
            </button>
          </div>
        </motion.div>

        <p className="mt-6 text-center text-[11px] text-[var(--gray-400)]">
          © 2026 인터뷰메이트
        </p>
      </section>
    </motion.div>
  );
}

function SectionLabel({ kicker, title }: { kicker: string; title: string }) {
  return (
    <div>
      <div className="text-[11px] font-bold tracking-[0.12em] text-[var(--blue-primary)]">
        {kicker}
      </div>
      <h2 className="mt-2 text-[22px] font-extrabold leading-[1.25] text-[var(--gray-900)] tracking-tight">
        {title}
      </h2>
    </div>
  );
}
