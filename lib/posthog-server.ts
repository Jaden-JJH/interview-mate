// 서버 사이드 PostHog 클라이언트를 싱글턴으로 초기화하고 에러·이벤트를 캡처하는 유틸
import { PostHog } from "posthog-node";

let _client: PostHog | null = null;

function getClient(): PostHog | null {
  const key = process.env.POSTHOG_API_KEY;
  if (!key) return null;
  if (!_client) {
    _client = new PostHog(key, {
      host: process.env.POSTHOG_HOST ?? "https://us.i.posthog.com",
      flushAt: 1,
      flushInterval: 0,
    });
  }
  return _client;
}

export function captureServerError(
  route: string,
  err: unknown,
  extra?: Record<string, unknown>
) {
  const client = getClient();
  if (!client) return;

  client.captureException(err, "server", { route, ...extra });
}

export function captureServerEvent(
  event: string,
  properties?: Record<string, unknown>
) {
  const client = getClient();
  if (!client) return;
  client.capture({ distinctId: "server", event, properties });
}
