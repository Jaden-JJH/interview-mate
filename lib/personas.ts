export interface Persona {
  id: string;
  name: string;
  shortName: string;
  tagline: string;
  emoji: string;
  accentColor: string;
  toneKey: "logical" | "warm" | "fast" | "sharp";
  systemAddendum: string;
  speakingLine: string;
  followUpAggressiveness: "low" | "medium" | "high";
  characterLottie: string;
  cardScale: number;
  heroScale: number;
}

export const DEFAULT_CHARACTER_LOTTIE = "/lottie/Talking Character.json";

export const PERSONAS: Persona[] = [
  {
    id: "alex",
    name: "수석 채용담당자 Alex",
    shortName: "Alex",
    tagline: "논리적이고 체계적",
    emoji: "🧑‍💼",
    accentColor: "#1a2b4c",
    toneKey: "logical",
    systemAddendum:
      "Speak in calm, structured Korean. Probe for specifics, structured reasoning, and measurable outcomes. Politely formal.",
    speakingLine: "체계적으로 검증하는 스타일입니다",
    followUpAggressiveness: "medium",
    characterLottie: "/lottie/alex.json",
    cardScale: 1.0,
    heroScale: 1.3,
  },
  {
    id: "jiyun",
    name: "따뜻한 멘토 지윤",
    shortName: "지윤",
    tagline: "공감하며 격려",
    emoji: "🌷",
    accentColor: "#9a3412",
    toneKey: "warm",
    systemAddendum:
      "Speak warmly and encouragingly in Korean. Acknowledge effort, soften critique, but still surface real growth points. Soft tone with a senior-mentor feel.",
    speakingLine: "편하게 답변해 주세요",
    followUpAggressiveness: "low",
    characterLottie: "/lottie/jiyun.json",
    cardScale: 1.0,
    heroScale: 1.3,
  },
  {
    id: "kevin",
    name: "스타트업 CTO 케빈",
    shortName: "Kevin",
    tagline: "실전 중심, 빠른 템포",
    emoji: "⚡",
    accentColor: "#6d28d9",
    toneKey: "fast",
    systemAddendum:
      "Be direct and pragmatic in Korean. Focus on real-world outcomes, trade-offs, and shipping. Short, fast-paced, and to the point.",
    speakingLine: "실전 위주로 가볼게요",
    followUpAggressiveness: "high",
    characterLottie: "/lottie/kevin.json",
    cardScale: 1.5,
    heroScale: 1.8,
  },
  {
    id: "park",
    name: "압박형 임원 박상무",
    shortName: "박상무",
    tagline: "날카로운 검증",
    emoji: "🎯",
    accentColor: "#991b1b",
    toneKey: "sharp",
    systemAddendum:
      "Ask challenging, probing questions in Korean. Test depth of conviction with light pressure, but stay professional — never personal. Slightly stern formal tone.",
    speakingLine: "깊이 있는 답변을 기대합니다",
    followUpAggressiveness: "high",
    characterLottie: "/lottie/park.json",
    cardScale: 0.7,
    heroScale: 1.0,
  },
];

export const RANDOM_PERSONA_ID = "random";

export interface DurationPreset {
  minutes: number;
  label: string;
  desc: string;
  questionCount: number; // total including closing
}

export const DURATIONS: DurationPreset[] = [
  { minutes: 5, label: "5분", desc: "워밍업", questionCount: 3 },
  { minutes: 10, label: "10분", desc: "핵심", questionCount: 5 },
  { minutes: 20, label: "20분", desc: "표준", questionCount: 7 },
  { minutes: 30, label: "30분", desc: "심층", questionCount: 9 },
];

export const CLOSING_QUESTION =
  "마지막으로 하고 싶은 말이나, 저희에게 하고 싶은 질문이 있으신가요?";

export function resolvePersona(id: string): Persona {
  if (id === RANDOM_PERSONA_ID) {
    return PERSONAS[Math.floor(Math.random() * PERSONAS.length)];
  }
  return PERSONAS.find((p) => p.id === id) ?? PERSONAS[0];
}

export function findDuration(minutes: number): DurationPreset {
  return DURATIONS.find((d) => d.minutes === minutes) ?? DURATIONS[1];
}
