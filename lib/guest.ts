// NEXT_PUBLIC_GUEST_MODE 플래그를 읽어 게스트 모드 여부를 반환하는 서버·클라 공용 유틸
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
