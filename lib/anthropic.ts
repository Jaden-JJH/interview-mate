import Anthropic from "@anthropic-ai/sdk";

export const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export const CLAUDE_MODEL = "claude-sonnet-4-6";
// Cheaper model used for non-reasoning bulk tasks (e.g. raw PDF text extraction).
export const CLAUDE_HAIKU = "claude-haiku-4-5";

export function extractText(message: Anthropic.Message): string {
  return message.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("");
}

export function parseJsonFromText<T = unknown>(text: string): T {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const body = (fenced ? fenced[1] : text).trim();
  const start = body.search(/[\[{]/);
  if (start === -1) throw new Error("No JSON found in model response");
  let depth = 0;
  let end = -1;
  const open = body[start];
  const close = open === "{" ? "}" : "]";
  let inString = false;
  let escape = false;
  for (let i = start; i < body.length; i++) {
    const c = body[i];
    if (escape) { escape = false; continue; }
    if (c === "\\") { escape = true; continue; }
    if (c === '"') { inString = !inString; continue; }
    if (inString) continue;
    if (c === open) depth++;
    else if (c === close) {
      depth--;
      if (depth === 0) { end = i; break; }
    }
  }
  const slice = end === -1 ? body.slice(start) : body.slice(start, end + 1);
  return JSON.parse(slice) as T;
}
