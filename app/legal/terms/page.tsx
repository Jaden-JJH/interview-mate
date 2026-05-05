import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "이용약관 | 인터뷰메이트",
  description: "인터뷰메이트 서비스 이용약관을 확인하세요.",
};

const SECTIONS = [
  {
    title: "1. 서비스 소개",
    body: [
      "인터뷰메이트(이하 '서비스')는 AI 기술을 활용해 사용자 맞춤형 모의 면접 경험을 제공하는 웹 애플리케이션입니다.",
      "서비스는 자기소개서와 채용공고를 분석하여 맞춤 질문을 생성하고, AI 면접관과의 실전 연습 및 상세 피드백을 제공합니다. 자기소개서와 면접 결과(질문·답변·점수·피드백)는 마이페이지에서 확인할 수 있도록 저장됩니다. 채용공고 정보는 서버에 저장되지 않습니다.",
      "서비스를 이용함으로써 본 약관에 동의한 것으로 간주됩니다.",
    ],
  },
  {
    title: "2. 이용 조건 및 제한",
    body: [
      "서비스는 만 14세 이상의 이용자만 사용할 수 있으며, 회원가입 시 정확한 정보를 제공해야 합니다.",
      "서비스를 상업적 목적으로 무단 복제·재배포하거나 자동화 수단(봇 등)으로 악용하는 행위를 금지합니다.",
      "운영자는 서비스 품질 유지를 위해 이용 조건을 위반한 계정을 사전 통보 없이 제한 또는 삭제할 수 있습니다.",
    ],
  },
  {
    title: "3. 크레딧 및 유료 서비스",
    body: [
      "신규 가입 회원에게는 무료 크레딧 2회가 제공되며, 이후 서비스 이용을 위해서는 크레딧을 구매해야 합니다.",
      "유료 크레딧은 Paddle을 통해 결제되며, 결제 후 7일 이내 미사용 크레딧에 한해 전액 환불이 가능합니다.",
      "크레딧은 타인에게 양도하거나 현금으로 환급받을 수 없으며, 계정 탈퇴 시 잔여 크레딧은 소멸됩니다.",
    ],
  },
  {
    title: "4. 면책 조항",
    body: [
      "서비스가 제공하는 AI 질문 및 피드백은 참고용이며, 실제 채용 결과를 보장하지 않습니다.",
      "서비스는 천재지변, 서버 장애, 제3자 API 중단 등 불가항력적 사유로 인한 서비스 중단에 대해 책임을 지지 않습니다.",
      "이용자가 입력한 정보의 정확성 및 적법성은 이용자 본인의 책임이며, 이로 인한 분쟁에 운영자는 개입하지 않습니다.",
    ],
  },
  {
    title: "5. 준거법",
    body: [
      "본 약관은 대한민국 법률에 따라 해석 및 적용됩니다.",
      "서비스 이용과 관련한 분쟁이 발생할 경우 운영자의 소재지를 관할하는 법원을 제1심 관할 법원으로 합니다.",
      "약관 내용 중 관계 법령에 위반되는 사항은 해당 법령에 따릅니다.",
    ],
  },
];

export default function TermsPage() {
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
        이용약관
      </h1>
      <p className="text-[13px] text-[var(--gray-500)] mb-8">
        시행일: 2026년 5월 1일
      </p>

      {/* 섹션 목록 */}
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
    </main>
  );
}
