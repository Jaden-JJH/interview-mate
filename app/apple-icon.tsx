// iOS 홈 화면용 180×180 Apple Touch 아이콘을 Edge에서 동적 생성하는 라우트
import { ImageResponse } from "next/og";

export const runtime = "edge";
export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: 180,
          height: 180,
          borderRadius: 40,
          background: "linear-gradient(135deg, #2575EC 0%, #1B64DA 100%)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <svg width="110" height="110" viewBox="0 0 18 18" fill="none">
          <path
            d="M3.5 5.2c0-.94.76-1.7 1.7-1.7h7.6c.94 0 1.7.76 1.7 1.7v4.6c0 .94-.76 1.7-1.7 1.7H8.6L5.4 13.9v-2.4h-.2c-.94 0-1.7-.76-1.7-1.7V5.2z"
            fill="white"
          />
          <circle cx="6.6" cy="7.5" r="0.95" fill="#1B64DA" />
          <circle cx="9" cy="7.5" r="0.95" fill="#1B64DA" />
          <circle cx="11.4" cy="7.5" r="0.95" fill="#1B64DA" />
        </svg>
      </div>
    ),
    { ...size }
  );
}
