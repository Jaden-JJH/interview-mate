// Guest mode — bypasses Clerk auth and DB writes for local/preview
// testing. Toggled via NEXT_PUBLIC_GUEST_MODE so both server (middleware,
// route handlers) and client (header badge) can read it.
//
// When ON:
//   - Protected routes serve unauthenticated traffic
//   - User-bound API routes return memory/no-op responses
//   - No credits are consumed, no rows are written
export function isGuestMode(): boolean {
  return process.env.NEXT_PUBLIC_GUEST_MODE === "true";
}
