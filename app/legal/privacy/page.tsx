import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "개인정보처리방침 | 인터뷰메이트",
  description: "인터뷰메이트가 수집·이용하는 개인정보 처리 방침을 확인하세요.",
};

const SECTIONS = [
  {
    title: "1. 수집하는 개인정보",
    body: [
      "이메일 주소: Clerk 인증 서비스를 통해 회원가입·로그인 시 수집됩니다.",
      "자기소개서 텍스트 및 파일명: 이용자가 직접 입력하거나 PDF 업로드를 통해 제공하는 정보입니다. 계정 내 최대 3개까지 데이터베이스에 저장됩니다.",
      "면접 결과 기록: 면접 완료 시 질문·답변·점수·AI 피드백이 마이페이지 히스토리 제공을 위해 데이터베이스에 저장됩니다.",
      "크레딧 잔액 및 결제 내역: 서비스 이용권 관리를 위해 저장됩니다.",
      "채용공고 정보(URL·텍스트)는 데이터베이스에 저장되지 않습니다. 면접 진행 세션에서만 임시 사용됩니다.",
    ],
  },
  {
    title: "2. 수집 목적",
    body: [
      "회원 식별 및 인증: 이메일을 통해 계정을 관리하고 서비스 이용 자격을 확인합니다.",
      "맞춤형 면접 서비스 제공: 자기소개서와 채용공고 정보를 Anthropic AI 모델에 전달하여 개인화된 질문·피드백을 생성합니다.",
      "면접 히스토리 제공: 과거 면접 결과를 마이페이지에서 확인할 수 있도록 저장합니다.",
      "서비스 개선 및 고객 지원: 이용 기록을 분석하여 서비스 품질을 향상시키고 문의에 대응합니다.",
    ],
  },
  {
    title: "3. 보유 및 이용 기간",
    body: [
      "개인정보는 회원 탈퇴 시 또는 이용자의 삭제 요청 시 지체 없이 파기됩니다.",
      "자기소개서는 이용자가 직접 삭제하거나 회원 탈퇴 시 삭제됩니다. 마이페이지에서 개별 삭제가 가능합니다.",
      "면접 결과(질문·답변·피드백)는 회원 탈퇴 시 함께 삭제됩니다.",
      "채용공고 정보는 별도로 보관되지 않습니다.",
      "단, 관계 법령(전자상거래 등에서의 소비자 보호에 관한 법률 등)에 따라 보관이 필요한 결제 기록은 해당 기간 동안 보관됩니다.",
    ],
  },
  {
    title: "4. 제3자 제공",
    body: [
      "Clerk (인증): 이메일 주소를 포함한 계정 정보를 처리합니다. clerk.com/privacy",
      "Neon (데이터베이스): 이력서 텍스트, 면접 결과(질문·답변·점수·피드백), 크레딧 잔액, 결제 내역을 저장합니다. neon.tech/privacy",
      "Anthropic (AI 처리): 맞춤 질문 및 피드백 생성을 위해 자기소개서 텍스트와 채용공고 정보가 Anthropic API로 전송됩니다. anthropic.com/privacy",
      "Paddle (결제): 유료 크레딧 결제 시 카드 정보 등 결제 데이터를 처리합니다. 카드 정보는 인터뷰메이트 서버에 저장되지 않습니다. paddle.com/legal/privacy",
    ],
  },
  {
    title: "5. 개인정보 삭제 요청",
    body: [
      "이용자는 마이페이지에서 개별 이력서를 직접 삭제할 수 있습니다.",
      "회원 탈퇴 시 이메일·이력서·면접 결과·크레딧 정보가 모두 삭제됩니다. (법정 보관 의무 항목 제외)",
      "또는 interviewmate@gmail.com 로 삭제를 요청할 수 있으며, 요청 접수 후 7영업일 이내에 처리됩니다.",
      "삭제 후에는 복구가 불가능하므로 신중하게 결정해 주세요.",
    ],
  },
];

export default function PrivacyPage() {
  return (
    <main className="max-w-[640px] mx-auto px-5 py-8">
      <Link
        href="/"
        className="inline-flex items-center gap-1 text-[13px] text-[var(--gray-500)] mb-6 hover:text-[var(--gray-900)] transition-colors"
      >
        ← 뒤로
      </Link>

      <h1 className="text-[22px] font-extrabold text-[var(--gray-900)] mb-1">
        개인정보처리방침
      </h1>
      <p className="text-[13px] text-[var(--gray-500)] mb-8">
        시행일: 2026년 5월 1일
      </p>

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
