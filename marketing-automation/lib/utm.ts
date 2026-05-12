// UTM 파라미터 헬퍼 — 채널별 CTA URL 생성 (W9 성과 추적)

const BASE_URL = "https://interview-mate.com";

export type UtmSource = "instagram" | "threads" | "youtube" | "blog";

export function buildCampaignId(date: Date = new Date()): string {
  return `ai_interview_daily_${date.toISOString().slice(0, 10).replace(/-/g, "")}`;
}

export function buildUtmUrl(
  source: UtmSource,
  campaign: string,
  content?: string,
): string {
  const url = new URL(BASE_URL);
  url.searchParams.set("utm_source", source);
  url.searchParams.set("utm_medium", "organic");
  url.searchParams.set("utm_campaign", campaign);
  if (content) url.searchParams.set("utm_content", content);
  return url.toString();
}
