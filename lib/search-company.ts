// Serper API로 기업·직무 정보를 검색해 프롬프트에 주입할 컨텍스트 반환
export interface CompanyContext {
  companyName: string;
  snippets: string[];
}

export async function searchCompanyInfo(
  companyName: string,
  position?: string
): Promise<CompanyContext | null> {
  const apiKey = process.env.SERPER_API_KEY;
  if (!apiKey) return null;

  const query = position
    ? `${companyName} ${position} 채용 기업문화 기술스택`
    : `${companyName} 채용 기업문화 인재상`;

  try {
    const res = await fetch("https://google.serper.dev/search", {
      method: "POST",
      headers: {
        "X-API-KEY": apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ q: query, gl: "kr", hl: "ko", num: 5 }),
    });

    if (!res.ok) return null;

    const data = await res.json();

    const snippets: string[] = [];

    if (data.knowledgeGraph?.description) {
      snippets.push(data.knowledgeGraph.description);
    }

    if (data.organic) {
      for (const item of data.organic.slice(0, 5)) {
        if (item.snippet) snippets.push(item.snippet);
      }
    }

    if (snippets.length === 0) return null;

    return { companyName, snippets };
  } catch {
    return null;
  }
}

export function formatCompanyContext(ctx: CompanyContext): string {
  return [
    `[${ctx.companyName} 관련 참고 정보]`,
    ...ctx.snippets.map((s, i) => `${i + 1}. ${s}`),
  ].join("\n");
}
