"use client";

import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import ScoreGauge from "@/components/ScoreGauge";
import AccordionItem from "@/components/AccordionItem";

const OVERALL_SCORE = 78;
const OVERALL_COMMENT =
  "전체적으로 준비가 잘 되어 있습니다. 기술적 역량 설명에서 구체적인 수치를 더하면 더 좋겠습니다. 팀 갈등 해결 사례에서 본인의 역할을 좀 더 명확히 어필하면 큰 강점이 될 것입니다.";

const QUESTION_DATA = [
  {
    question:
      "자기소개서에 작성하신 프로젝트 경험에 대해 자세히 설명해 주세요.",
    score: 85,
    myAnswer:
      "B2B SaaS 제품에서 실시간 대시보드 시스템을 구축한 경험이 있습니다. WebSocket과 React Query를 활용해 데이터 갱신 주기를 60% 단축했고, 디자인 시스템을 주도적으로 구축해 컴포넌트 재사용률을 40% 향상시켰습니다.",
    modelAnswer:
      "저는 B2B SaaS 제품의 실시간 대시보드 프로젝트에서 프론트엔드 리드를 맡았습니다. 기존 폴링 방식에서 WebSocket 기반 실시간 아키텍처로 전환하고, React Query의 캐싱 전략을 최적화하여 데이터 갱신 주기를 60% 단축했습니다. 이 과정에서 디자인 시스템을 주도적으로 구축하여 30개 이상의 공통 컴포넌트를 표준화하고, 팀 전체의 개발 생산성을 크게 향상시켰습니다.",
    keywords: ["프로젝트 경험", "기술 스택", "역할"],
    feedback:
      "구체적인 수치(60% 단축, 40% 향상)를 포함하여 설득력 있는 답변입니다. 프로젝트에서의 본인 역할(리드/팀원)을 명시하면 더 좋겠습니다.",
  },
  {
    question:
      "해당 프로젝트에서 가장 어려웠던 기술적 도전은 무엇이었나요?",
    score: 72,
    myAnswer:
      "실시간 데이터 동기화에서 네트워크 지연과 상태 불일치 문제가 가장 어려웠습니다. Optimistic Update 패턴과 에러 바운더리를 도입해 사용자 경험을 크게 개선할 수 있었습니다.",
    modelAnswer:
      "가장 큰 기술적 도전은 네트워크 불안정 환경에서의 실시간 데이터 일관성 유지였습니다. 이를 해결하기 위해 세 가지 전략을 도입했습니다: 첫째, Optimistic Update로 체감 속도를 개선하고, 둘째, 이벤트 큐 기반 재시도 로직으로 데이터 유실을 방지했으며, 셋째, React Error Boundary를 통해 장애 시 사용자에게 명확한 피드백을 제공했습니다. 결과적으로 에러율을 95% 감소시켰습니다.",
    keywords: ["문제 해결", "기술적 도전", "결과"],
    feedback:
      "문제와 해결책을 잘 설명했지만, '크게 개선'보다 구체적인 수치(에러율 감소 등)를 제시하면 더 임팩트 있는 답변이 됩니다.",
  },
  {
    question:
      "팀 내 의견 충돌이 있었을 때 어떻게 해결하셨나요?",
    score: 62,
    myAnswer:
      "팀원들과 주로 대화를 통해 해결했습니다. 서로의 의견을 충분히 듣고 합의점을 찾으려 노력했습니다. 결과적으로 좋은 방향으로 해결되었습니다.",
    modelAnswer:
      "디자인 시스템 도입 시 CSS-in-JS vs Tailwind CSS 선택에서 팀 내 의견이 갈렸습니다. 저는 각 방식의 장단점을 정리한 비교 문서를 작성하고, 소규모 PoC를 통해 실제 생산성 데이터를 수집했습니다. 이를 바탕으로 팀 미팅에서 객관적 근거를 제시하여 합의를 이끌어냈고, 이 경험을 통해 기술적 의사결정에서 데이터 기반 접근이 중요함을 배웠습니다.",
    keywords: ["소통", "갈등 해결", "리더십"],
    feedback:
      "구체적인 상황(STAR 기법)이 부족합니다. '대화를 통해 해결'보다는 구체적인 갈등 상황, 본인이 취한 행동, 그리고 결과를 명확히 설명해 주세요.",
  },
  {
    question: "이 포지션에 지원하신 이유가 무엇인가요?",
    score: 80,
    myAnswer:
      "네이버의 기술적 인프라와 대규모 서비스 운영 경험이 제 커리어 성장에 큰 도움이 될 것이라 생각합니다. 특히 프론트엔드 기술 혁신을 선도하는 팀에서 함께 성장하고 싶습니다.",
    modelAnswer:
      "네이버의 프론트엔드 개발자 포지션에 지원한 이유는 세 가지입니다. 첫째, 월간 수천만 사용자를 대상으로 한 대규모 서비스 최적화 경험을 쌓고 싶습니다. 둘째, 네이버가 오픈소스로 공개한 Egjs 등의 프로젝트에서 보이는 기술 철학에 공감합니다. 셋째, 저의 디자인 시스템 구축 경험을 네이버의 대규모 서비스에 적용하여 더 큰 임팩트를 만들고 싶습니다.",
    keywords: ["지원 동기", "회사 이해", "비전"],
    feedback:
      "회사에 대한 관심과 성장 의지가 잘 드러납니다. 회사의 구체적인 프로젝트나 기술 스택을 언급하면 더 깊은 관심을 어필할 수 있습니다.",
  },
  {
    question: "5년 후 커리어 목표를 말씀해 주세요.",
    score: 45,
    myAnswer: "좋은 개발자가 되고 싶습니다. 기술적으로 성장하면서 팀에 기여할 수 있는 사람이 되겠습니다.",
    modelAnswer:
      "단기적으로는 2년 내에 프론트엔드 시니어 개발자로서 기술 설계와 아키텍처 결정을 주도하고 싶습니다. 중기적으로는 3~4년 차에 팀 리드로서 주니어 개발자 멘토링과 기술 문화 구축에 기여하겠습니다. 장기적으로는 5년 차에 프론트엔드 엔지니어링 매니저로서 기술 전략과 팀 빌딩을 함께 이끄는 역할을 목표로 합니다. 이를 위해 현재 시스템 설계와 리더십 관련 학습을 병행하고 있습니다.",
    keywords: ["커리어 목표", "성장 계획", "구체성"],
    feedback:
      "답변이 너무 추상적입니다. 구체적인 시간별 목표(1년/3년/5년)와 이를 달성하기 위한 실천 계획을 포함해야 합니다. '좋은 개발자'의 정의를 구체화하세요.",
  },
];

export default function ResultPage() {
  const router = useRouter();

  return (
    <motion.div
      className="flex min-h-dvh flex-col"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
    >
      {/* Header */}
      <div className="pt-8 pb-2 text-center">
        <h1 className="text-xl font-bold text-gray-900">면접 결과 리포트</h1>
        <p className="mt-1 text-sm text-gray-400">AI 분석 기반 피드백</p>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto px-5 pb-28">
        {/* Score gauge */}
        <motion.div
          className="flex flex-col items-center py-8"
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.5, ease: "easeOut" }}
        >
          <ScoreGauge score={OVERALL_SCORE} />
        </motion.div>

        {/* Overall comment */}
        <motion.div
          className="mb-8 rounded-2xl bg-white px-5 py-4 shadow-sm ring-1 ring-gray-100"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.4 }}
        >
          <h2 className="mb-2 text-sm font-semibold text-gray-800">
            📊 종합 평가
          </h2>
          <p className="text-sm leading-relaxed text-gray-600">
            {OVERALL_COMMENT}
          </p>
        </motion.div>

        {/* Per-question accordion */}
        <div className="space-y-3">
          <h2 className="mb-1 text-sm font-semibold text-gray-800">
            📋 질문별 상세 피드백
          </h2>
          {QUESTION_DATA.map((q, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 + i * 0.1, duration: 0.35 }}
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
      <div className="fixed bottom-0 left-1/2 w-full max-w-[640px] -translate-x-1/2 bg-gradient-to-t from-gray-50 via-gray-50/95 to-gray-50/0 px-5 pb-6 pt-4">
        <div className="flex gap-3">
          <button
            onClick={() => router.push("/")}
            className="flex-1 rounded-xl border border-gray-300 bg-white py-4 text-base font-semibold text-gray-700 shadow-sm transition-all hover:bg-gray-50 active:scale-[0.98]"
          >
            다시 연습하기
          </button>
          <button
            onClick={() => {
              if (navigator.share) {
                navigator.share({
                  title: "InterviewMate 면접 결과",
                  text: `AI 모의면접 결과: ${OVERALL_SCORE}점! InterviewMate로 면접을 준비해보세요.`,
                });
              }
            }}
            className="flex-1 rounded-xl bg-indigo-600 py-4 text-base font-semibold text-white shadow-lg shadow-indigo-200 transition-all hover:bg-indigo-500 active:scale-[0.98]"
          >
            결과 공유하기
          </button>
        </div>
      </div>
    </motion.div>
  );
}
