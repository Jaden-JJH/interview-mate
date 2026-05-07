import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "가격정책",
  description:
    "인터뷰메이트 요금제 안내. 가입 즉시 무료 체험 1회, 9,900원 패키지로 면접 8회와 AI 도움받기 무제한 이용. 14일 사유 불문 전액 환불.",
  alternates: { canonical: "/legal/pricing" },
};

const PLANS = [
  {
    label: "무료 체험",
    price: "0원",
    description: "가입 즉시 제공",
    features: ["AI 모의 면접 1회", "맞춤 질문 생성", "점수 및 상세 피드백"],
  },
  {
    label: "크레딧 패키지",
    price: "9,900원",
    description: "1회 결제 · 기간 제한 없음 · 부가세(VAT) 포함",
    features: [
      "AI 모의 면접 8회",
      "AI 도움받기 무제한",
      "맞춤 질문 생성",
      "점수 및 상세 피드백",
    ],
  },
];

const SECTIONS = [
  {
    title: "환불 정책",
    body: [
      "결제 후 14일 이내 사유 불문 전액 환불이 가능합니다.",
      "환불 요청은 interviewmate2026@gmail.com 로 주문 번호와 함께 이메일을 보내주세요. 접수 후 3영업일 이내 처리됩니다.",
    ],
  },
  {
    title: "결제 및 보안",
    body: [
      "모든 결제는 Paddle을 통해 안전하게 처리되며, 카드 정보는 인터뷰메이트 서버에 저장되지 않습니다.",
      "원화(KRW) 기준으로 표시된 금액이 청구되며, 해외 카드 사용 시 카드사 정책에 따라 환율 수수료가 발생할 수 있습니다.",
      "결제 관련 문의는 interviewmate2026@gmail.com 로 연락해 주세요.",
    ],
  },
  {
    title: "크레딧 소멸",
    body: [
      "구매한 크레딧의 유효 기간은 별도로 정해져 있지 않습니다.",
      "단, 회원 탈퇴 시 잔여 크레딧은 자동으로 소멸되며 환불되지 않습니다.",
      "크레딧은 계정 간 양도 또는 현금 교환이 불가합니다.",
    ],
  },
];

export default function PricingPage() {
  return (
    <main className="max-w-[640px] mx-auto px-5 py-8">
      {/* 뒤로 가기 */}
      <Link
        href="/"
        className="inline-flex items-center gap-1 text-[13px] text-[var(--gray-500)] mb-6 hover:text-[var(--gray-900)] transition-colors"
      >
        ← 뒤로
      </Link>

      {/* 헤더 */}
      <h1 className="text-[22px] font-extrabold text-[var(--gray-900)] mb-1">
        가격정책
      </h1>
      <p className="text-[13px] text-[var(--gray-500)] mb-8">
        부담 없이 시작하고, 필요할 때만 결제하세요.
      </p>

      {/* 요금제 카드 */}
      <div className="flex flex-col gap-4 mb-10">
        {PLANS.map((plan) => (
          <div
            key={plan.label}
            className="bg-white rounded-2xl border border-[var(--gray-200)] px-5 py-5"
          >
            <div className="flex items-baseline justify-between mb-1">
              <span className="text-[15px] font-bold text-[var(--gray-900)]">
                {plan.label}
              </span>
              <span className="text-[18px] font-extrabold text-[var(--blue-primary)]">
                {plan.price}
              </span>
            </div>
            <p className="text-[12px] text-[var(--gray-500)] mb-3">
              {plan.description}
            </p>
            <ul className="flex flex-col gap-1">
              {plan.features.map((feat) => (
                <li
                  key={feat}
                  className="text-[13px] leading-[20px] text-[var(--gray-700)] before:content-['·'] before:mr-1.5"
                >
                  {feat}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      {/* 정책 섹션 */}
      <div className="flex flex-col gap-7">
        {SECTIONS.map((section) => (
          <section key={section.title}>
            <h2 className="text-[15px] font-bold text-[var(--gray-800)] mb-2">
              {section.title}
            </h2>
            <ul className="flex flex-col gap-2">
              {section.body.map((line, i) => (
                <li
                  key={i}
                  className="text-[14px] leading-[22px] text-[var(--gray-600)]"
                >
                  {line}
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>

      {/* 문의 */}
      <div className="mt-10 pt-6 border-t border-[var(--gray-200)]">
        <p className="text-[13px] text-[var(--gray-500)]">
          결제·환불 문의:{" "}
          <a
            href="mailto:interviewmate2026@gmail.com"
            className="text-[var(--blue-primary)] underline underline-offset-2"
          >
            interviewmate2026@gmail.com
          </a>
        </p>
      </div>
    </main>
  );
}
