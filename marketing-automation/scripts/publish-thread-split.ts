/**
 * 분할 발행 스크립트 — 500자 한도를 넘는 글을 메인글 + 답글로 나눠 발행.
 *
 * 사용자 검토 후 실행. 콘텐츠는 인라인 하드코딩(일회성).
 * 실행: npx tsx scripts/publish-thread-split.ts
 */
import { publishText } from "../lib/threads.js";

const part1 = `AI가 사람을 대체하는 게 아니라,
AI를 잘 활용하는 사람이 그렇지 않은 사람을 대체하는 시대가 오고 있습니다.

재미있는 건,
AI를 가장 잘 쓰는 사람들이 꼭 신입이나 MZ세대가 아니라는 점입니다.

오히려 실무 경험이 많고,
"이 결과물이 몇 점짜리인지" 판단할 수 있는 사람들이
AI를 훨씬 더 강력하게 활용합니다.

왜냐면 AI는 '정답 자판기'가 아니라
'대답 자판기'에 가깝기 때문입니다.

대부분의 AI 답변은 80점 정도.
그걸 100점으로 끌어올리는 건 결국 질문하는 사람의 몫입니다.`;

const part2 = `좋은 면접 답변도 똑같습니다.

같은 지원자라도
어떤 질문을 받느냐,
어떤 추가 질문으로 깊이를 끌어내느냐에 따라
답변의 밀도는 완전히 달라집니다.

그래서 앞으로의 면접은 단순 암기가 아니라,

* 생각을 구조화하는 능력
* 경험을 언어화하는 능력
* 질문 속 의도를 읽는 능력
* AI와 함께 답을 발전시키는 능력

이 더 중요해질 겁니다.

인터뷰메이트는
단순 예상 질문 생성기가 아니라,

"당신의 경험에서 더 좋은 답을 끌어내는 AI 면접 파트너"를 만들고 있습니다.

AI 시대의 면접은
답을 외우는 사람이 아니라,
자신만의 스토리를 설명할 수 있는 사람이 강해집니다.`;

console.log(`▶ Part1 발행 시작 (${part1.length}자)…`);
const main = await publishText(part1);
console.log(`✓ Part1 발행 완료`);
console.log(`  mediaId  : ${main.mediaId}`);
console.log(`  permalink: ${main.permalink ?? "(조회 실패)"}`);

console.log(`\n▶ Part2 발행 시작 (reply, ${part2.length}자)…`);
const reply = await publishText(part2, { replyToId: main.mediaId });
console.log(`✓ Part2 발행 완료`);
console.log(`  mediaId  : ${reply.mediaId}`);
console.log(`  permalink: ${reply.permalink ?? "(조회 실패)"}`);

console.log(`\n✅ 분할 발행 성공`);
