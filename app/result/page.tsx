"use client";

import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import ScoreGauge from "@/components/ScoreGauge";
import AccordionItem from "@/components/AccordionItem";

const OVERALL_SCORE = 78;
const OVERALL_COMMENT =
  "전체적으로 준비가 잘 되어 있어요. 기술적 역량 설명에서 구체적인 수치를 더하면 더 좋겠어요. 팀 갈등 해결 사례에서 본인의 역할을 좀 더 명확히 어필해 보세요.";

const QUESTION_DATA = [
  {
    question: "자기소개서에 작성하신 프로젝트 경험에 대해 자세히 설명해 주세요.",
    score: 85,
    myAnswer: "B2B SaaS 제품에서 실시간 대시보드 시스템을 구축한 경험이 있습니다. WebSocket과 React Query를 활용해 데이터 갱신 주기를 60% 단축했고, 디자인 시스템을 주도적으로 구축해 컴포넌트 재사용률을 40% 향상시켰습니다.",
    modelAnswer: "저는 B2B SaaS 제품의 실시간 대시보드 프로젝트에서 프론트엔드 리드를 맡았습니다. 기존 폴링 방식에서 WebSocket 기반 실시간 아키텍처로 전환하고, React Query의 캐싱 전략을 최적화하여 데이터 갱신 주기를 60% 단축했습니다. 이 과정에서 디자인 시스템을 주도적으로 구축하여 30개 이상의 공통 컴포넌트를 표준화하고, 팀 전체의 개발 생산성을 크게 향상시켰습니다.",
    keywords: ["프로젝트 경험", "기술 스택", "역할"],
    feedback: "구체적인 수치(60% 단축, 40% 향상)를 포함하여 설득력 있는 답변이에요. 프로젝트에서의 본인 역할(리드/팀원)을 명시하면 더 좋겠어요.",
  },
  {
    question: "해당 프로젝트에서 가장 어려웠던 기술적 도전은 무엇이었나요?",
    score: 72,
    myAnswer: "실시간 데이터 동기화에서 네트워크 지연과 상태 불일치 문제가 가장 어려웠습니다. Optimistic Update 패턴과 에러 바운더리를 도입해 사용자 경험을 크게 개선할 수 있었습니다.",
    modelAnswer: "가장 큰 기술적 도전은 네트워크 불안정 환경에서의 실시간 데이터 일관성 유지였습니다. Optimistic Update로 체감 속도를 개선하고, 이벤트 큐 기반 재시도 로직으로 데이터 유실을 방지했으며, React Error Boundary를 통해 장애 시 사용자에게 명확한 피드백을 제공했습니다. 결과적으로 에러율을 95% 감소시켰습니다.",
    keywords: ["문제 해결", "기술적 도전", "결과"],
    feedback: "'크게 개선'보다 구체적인 수치(에러율 감소 등)를 제시하면 더 임팩트 있는 답변이 돼요.",
  },
  {
    question: "팀 내 의견 충돌이 있었을 때 어떻게 해결하셨나요?",
    score: 62,
    myAnswer: "팀원들과 주로 대화를 통해 해결했습니다. 서로의 의견을 충분히 듣고 합의점을 찾으려 노력했습니다.",
    modelAnswer: "디자인 시스템 도입 시 CSS-in-JS vs Tailwind CSS 선택에서 팀 내 의견이 갈렸습니다. 저는 각 방식의 장단점을 정리한 비교 문서를 작성하고, 소규모 PoC를 통해 실제 생산성 데이터를 수집했습니다. 이를 바탕으로 팀 미팅에서 객관적 근거를 제시하여 합의를 이끌어냈습니다.",
    keywords: ["소통", "갈등 해결", "리더십"],
    feedback: "구체적인 상황(STAR 기법)이 부족해요. 어떤 갈등이었고, 어떻게 행동했는지 구체적으로 설명해 보세요.",
  },
  {
    question: "이 포지션에 지원하신 이유가 무엇인가요?",
    score: 80,
    myAnswer: "네이버의 기술적 인프라와 대규모 서비스 운영 경험이 제 커리어 성장에 큰 도움이 될 것이라 생각합니다. 특히 프론트엔드 기술 혁신을 선도하는 팀에서 함께 성장하고 싶습니다.",
    modelAnswer: "네이버의 프론트엔드 개발자 포지션에 지원한 이유는 세 가지입니다. 첫째, 월간 수천만 사용자를 대상으로 한 대규모 서비스 최적화 경험을 쌓고 싶습니다. 둘째, 네이버가 오픈소스로 공개한 Egjs 등의 프로젝트에서 보이는 기술 철학에 공감합니다. 셋째, 저의 디자인 시스템 구축 경험을 네이버의 대규모 서비스에 적용하여 더 큰 임팩트를 만들고 싶습니다.",
    keywords: ["지원 동기", "회사 이해", "비전"],
    feedback: "회사에 대한 관심이 잘 드러나요. 회사의 구체적인 프로젝트를 언급하면 더 깊은 관심을 어필할 수 있어요.",
  },
  {
    question: "5년 후 커리어 목표를 말씀해 주세요.",
    score: 45,
    myAnswer: "좋은 개발자가 되고 싶습니다. 기술적으로 성장하면서 팀에 기여할 수 있는 사람이 되겠습니다.",
    modelAnswer: "단기적으로는 2년 내에 프론트엔드 시니어 개발자로서 기술 설계와 아키텍처 결정을 주도하고 싶습니다. 중기적으로는 팀 리드로서 주니어 멘토링과 기술 문화 구축에 기여하겠습니다. 장기적으로는 프론트엔드 엔지니어링 매니저로서 기술 전략과 팀 빌딩을 함께 이끄는 역할을 목표로 합니다.",
    keywords: ["커리어 목표", "성장 계획", "구체성"],
    feedback: "답변이 너무 추상적이에요. 구체적인 시간별 목표와 실천 계획을 포함해야 해요.",
  },
];

export default function ResultPage() {
  const router = useRouter();

  return (
    <motion.div
      className="flex min-h-dvh flex-col bg-[var(--gray-bg)]"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      {/* Top bar */}
      <div className="flex items-center bg-white px-5 py-3 border-b border-[var(--gray-200)]">
        <button onClick={() => router.push("/")} className="p-1 mr-3">
          <svg className="h-5 w-5 text-[var(--gray-900)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <span className="text-[15px] font-bold text-[var(--gray-900)]">면접 결과</span>
      </div>

      {/* Scrollable */}
      <div className="flex-1 overflow-y-auto pb-28">
        {/* Score section */}
        <div className="bg-white px-5 pt-8 pb-6">
          <motion.div
            className="flex flex-col items-center"
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.1, duration: 0.4, ease: "easeOut" }}
          >
            <ScoreGauge score={OVERALL_SCORE} />
            <p className="mt-6 text-[14px] leading-[22px] text-center text-[var(--gray-700)] px-4">
              {OVERALL_COMMENT}
            </p>
          </motion.div>
        </div>

        {/* Stats row */}
        <div className="px-5 py-4">
          <div className="flex gap-3">
            {[
              { label: "총 질문", value: "5개" },
              { label: "평균 점수", value: "69점" },
              { label: "최고 점수", value: "85점" },
            ].map((stat) => (
              <motion.div
                key={stat.label}
                className="flex-1 rounded-2xl bg-white px-4 py-4 text-center"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4, duration: 0.3 }}
              >
                <p className="text-[11px] text-[var(--gray-400)]">{stat.label}</p>
                <p className="mt-1 text-[18px] font-bold text-[var(--gray-900)]">{stat.value}</p>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Questions */}
        <div className="px-5 space-y-3">
          <p className="text-[14px] font-bold text-[var(--gray-900)] mb-1">질문별 피드백</p>
          {QUESTION_DATA.map((q, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 + i * 0.08, duration: 0.3 }}
            >
              <AccordionItem
                questionNumber={i + 1}
                question={q.question}
                score={q.score}
                myAnswer={q.myAnswer}
                modelAnswer={q.modelAnswer}
                keywords={q.keywords}
                feedback={q.feedback}
              />
            </motion.div>
          ))}
        </div>
      </div>

      {/* Bottom buttons */}
      <div className="fixed bottom-0 left-1/2 w-full max-w-[640px] -translate-x-1/2 bg-white px-5 pb-8 pt-3 border-t border-[var(--gray-200)]">
        <div className="flex gap-3">
          <button
            onClick={() => router.push("/")}
            className="flex-1 rounded-2xl border border-[var(--gray-200)] bg-white py-[16px] text-[15px] font-bold text-[var(--gray-700)] active:scale-[0.98] transition-all"
          >
            다시 연습하기
          </button>
          <button
            onClick={() => {
              if (navigator.share) {
                navigator.share({
                  title: "인터뷰메이트 면접 결과",
                  text: `면접 연습 결과: ${OVERALL_SCORE}점`,
                });
              }
            }}
            className="flex-1 rounded-2xl bg-[var(--blue-primary)] py-[16px] text-[15px] font-bold text-white active:scale-[0.98] transition-all"
          >
            결과 공유하기
          </button>
        </div>
      </div>
    </motion.div>
  );
}
