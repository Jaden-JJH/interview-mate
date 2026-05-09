// YouTube 영상 업로드 — OAuth 2.0 + Resumable Upload

import { env } from "./env.js";

const TOKEN_URL = "https://oauth2.googleapis.com/token";
const UPLOAD_URL = "https://www.googleapis.com/upload/youtube/v3/videos";

type UploadResult = {
  videoId: string;
  videoUrl: string;
};

async function getAccessToken(): Promise<string> {
  const { clientId, clientSecret, refreshToken } = env.youtube;
  if (!clientId || !clientSecret || !refreshToken) {
    throw new Error(
      "YOUTUBE_CLIENT_ID, YOUTUBE_CLIENT_SECRET, YOUTUBE_REFRESH_TOKEN 모두 필요. " +
      "npx tsx scripts/youtube-auth.ts 로 발급하세요.",
    );
  }

  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });

  const data = (await res.json()) as Record<string, any>;
  if (!res.ok || !data.access_token) {
    throw new Error(`YouTube 토큰 갱신 실패: ${JSON.stringify(data)}`);
  }
  return data.access_token;
}

export async function uploadVideo(
  videoBuf: Buffer,
  title: string,
  description: string,
  tags: string[],
): Promise<UploadResult> {
  const accessToken = await getAccessToken();

  const metadata = {
    snippet: {
      title,
      description,
      tags,
      categoryId: "22", // People & Blogs
      defaultLanguage: "ko",
    },
    status: {
      privacyStatus: "public",
      selfDeclaredMadeForKids: false,
    },
  };

  // 1단계: 이어받기 세션 시작
  const initRes = await fetch(
    `${UPLOAD_URL}?uploadType=resumable&part=snippet,status`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json; charset=UTF-8",
        "X-Upload-Content-Length": String(videoBuf.length),
        "X-Upload-Content-Type": "video/mp4",
      },
      body: JSON.stringify(metadata),
    },
  );

  if (!initRes.ok) {
    const err = await initRes.text();
    throw new Error(`YouTube 업로드 세션 실패 ${initRes.status}: ${err}`);
  }

  const uploadUrl = initRes.headers.get("location");
  if (!uploadUrl) throw new Error("YouTube 업로드 URL 없음");

  // 2단계: 영상 데이터 업로드
  const uploadRes = await fetch(uploadUrl, {
    method: "PUT",
    headers: {
      "Content-Type": "video/mp4",
      "Content-Length": String(videoBuf.length),
    },
    body: videoBuf,
  });

  if (!uploadRes.ok) {
    const err = await uploadRes.text();
    throw new Error(`YouTube 업로드 실패 ${uploadRes.status}: ${err}`);
  }

  const result = (await uploadRes.json()) as Record<string, any>;
  const videoId = result.id;

  return {
    videoId,
    videoUrl: `https://www.youtube.com/shorts/${videoId}`,
  };
}

export async function pingYouTube(): Promise<{ channelId: string; title: string }> {
  const accessToken = await getAccessToken();
  const res = await fetch(
    `https://www.googleapis.com/youtube/v3/channels?part=snippet&mine=true`,
    { headers: { Authorization: `Bearer ${accessToken}` } },
  );
  const data = (await res.json()) as Record<string, any>;
  if (!res.ok) throw new Error(`YouTube ping 실패: ${JSON.stringify(data)}`);
  const ch = data.items?.[0];
  return { channelId: ch?.id ?? "unknown", title: ch?.snippet?.title ?? "unknown" };
}
