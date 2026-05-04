import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "인터뷰메이트 - AI 기반 모의 면접";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const PRETENDARD =
  "https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/packages/pretendard/dist/public/static/Pretendard-ExtraBold.otf";
const PRETENDARD_MEDIUM =
  "https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/packages/pretendard/dist/public/static/Pretendard-Medium.otf";

export default async function Image() {
  const [bold, medium] = await Promise.all([
    fetch(PRETENDARD).then((r) => r.arrayBuffer()),
    fetch(PRETENDARD_MEDIUM).then((r) => r.arrayBuffer()),
  ]);

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          background:
            "linear-gradient(135deg, #2575EC 0%, #1B64DA 38%, #0F3F8E 100%)",
          padding: "72px 80px",
          position: "relative",
          color: "white",
          fontFamily: "Pretendard",
        }}
      >
        {/* Soft glow blob */}
        <div
          style={{
            position: "absolute",
            top: -180,
            right: -180,
            width: 640,
            height: 640,
            borderRadius: 9999,
            background:
              "radial-gradient(circle at center, rgba(255,255,255,0.22) 0%, rgba(255,255,255,0) 70%)",
            display: "flex",
          }}
        />

        {/* Decorative oversized chat bubble mark */}
        <div
          style={{
            position: "absolute",
            top: 110,
            right: -40,
            width: 560,
            height: 560,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            opacity: 0.16,
          }}
        >
          <svg width="520" height="520" viewBox="0 0 200 200" fill="none">
            <path
              d="M30 56c0-13 11-24 24-24h92c13 0 24 11 24 24v66c0 13-11 24-24 24h-30l-32 32v-32h-30c-13 0-24-11-24-24V56z"
              fill="white"
            />
            <circle cx="78" cy="92" r="9" fill="#1B64DA" />
            <circle cx="100" cy="92" r="9" fill="#1B64DA" />
            <circle cx="122" cy="92" r="9" fill="#1B64DA" />
          </svg>
        </div>

        {/* Brand */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 18,
            position: "relative",
          }}
        >
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: 18,
              background: "white",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 8px 20px rgba(0,0,0,0.18)",
            }}
          >
            <svg width="38" height="38" viewBox="0 0 18 18" fill="none">
              <path
                d="M3.5 5.2c0-.94.76-1.7 1.7-1.7h7.6c.94 0 1.7.76 1.7 1.7v4.6c0 .94-.76 1.7-1.7 1.7H8.6L5.4 13.9v-2.4h-.2c-.94 0-1.7-.76-1.7-1.7V5.2z"
                fill="#1B64DA"
              />
              <circle cx="6.6" cy="7.5" r="0.95" fill="white" />
              <circle cx="9" cy="7.5" r="0.95" fill="white" />
              <circle cx="11.4" cy="7.5" r="0.95" fill="white" />
            </svg>
          </div>
          <div
            style={{
              fontSize: 38,
              fontWeight: 800,
              letterSpacing: "-0.02em",
              display: "flex",
            }}
          >
            인터뷰메이트
          </div>
        </div>

        <div style={{ flex: 1, display: "flex" }} />

        {/* Kicker */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            marginBottom: 22,
            position: "relative",
          }}
        >
          <div
            style={{
              padding: "8px 16px",
              borderRadius: 9999,
              background: "rgba(255,255,255,0.15)",
              fontSize: 22,
              fontWeight: 800,
              letterSpacing: "0.06em",
              display: "flex",
            }}
          >
            AI 모의 면접
          </div>
          <div
            style={{
              fontSize: 22,
              fontWeight: 500,
              color: "rgba(255,255,255,0.75)",
              display: "flex",
            }}
          >
            맞춤 질문 · 실시간 피드백 · 상세 리포트
          </div>
        </div>

        {/* Headline */}
        <div
          style={{
            fontSize: 88,
            fontWeight: 800,
            lineHeight: 1.12,
            letterSpacing: "-0.04em",
            display: "flex",
            flexDirection: "column",
            position: "relative",
          }}
        >
          <div style={{ display: "flex" }}>합격에 가까워지는</div>
          <div style={{ display: "flex" }}>가장 빠른 면접 연습</div>
        </div>

        <div
          style={{
            marginTop: 28,
            fontSize: 26,
            color: "rgba(255,255,255,0.78)",
            fontWeight: 500,
            display: "flex",
            position: "relative",
          }}
        >
          5분이면 첫 면접 리포트가 나옵니다
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [
        { name: "Pretendard", data: bold, weight: 800, style: "normal" },
        { name: "Pretendard", data: medium, weight: 500, style: "normal" },
      ],
    }
  );
}
