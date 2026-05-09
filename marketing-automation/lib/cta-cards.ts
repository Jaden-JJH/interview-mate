// 사전 렌더된 CTA 카드 URL — render-cta-cards.ts로 한 번 생성 후 env.local에 보관.
// colorIndex(0=파랑/1=보라/2=주황) → 해당 색 CTA 카드 공개 URL.

const ENV_KEYS = ["CTA_CARD_URL_BLUE", "CTA_CARD_URL_PURPLE", "CTA_CARD_URL_ORANGE"] as const;

export function getCtaCardUrl(colorIndex: 0 | 1 | 2): string {
  const url = process.env[ENV_KEYS[colorIndex]];
  if (!url) {
    throw new Error(
      `${ENV_KEYS[colorIndex]} 환경변수 없음. 'npx tsx scripts/render-cta-cards.ts' 실행 후 .env.local에 추가하세요.`
    );
  }
  return url;
}

/** 3색 모두 설정됐는지 사전 검증 (carousel-pipeline 호출 전). */
export function assertCtaCardsReady(): void {
  const missing = ENV_KEYS.filter((k) => !process.env[k]);
  if (missing.length > 0) {
    throw new Error(
      `CTA 카드 URL 누락: ${missing.join(", ")}. 'npx tsx scripts/render-cta-cards.ts' 실행 필요.`
    );
  }
}
