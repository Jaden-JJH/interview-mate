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

  const message = err instanceof Error ? err.message : String(err);
  const stack = err instanceof Error ? err.stack : undefined;

  client.capture({
    distinctId: "server",
    event: "$exception",
    properties: {
      $exception_message: message,
      $exception_stack_trace_raw: stack,
      route,
      ...extra,
    },
  });
}

export function captureServerEvent(
  event: string,
  properties?: Record<string, unknown>
) {
  const client = getClient();
  if (!client) return;
  client.capture({ distinctId: "server", event, properties });
}
