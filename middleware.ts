// Clerk 인증 미들웨어 — 보호된 라우트 목록을 정의하고 미인증 접근을 차단
import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { isGuestMode } from "@/lib/guest";

// Routes that require an authenticated user. Public landing, sign-in/up,
// and the Clerk webhook endpoint stay open.
const isProtectedRoute = createRouteMatcher([
  "/resume(.*)",
  "/job-posting(.*)",
  "/interview-prep(.*)",
  "/interview(.*)",
  "/result(.*)",
  "/history(.*)",
  "/mypage(.*)",
  "/jasoseo(.*)",
  "/api/generate-questions(.*)",
  "/api/evaluate-answer(.*)",
  "/api/generate-feedback(.*)",
  "/api/parse-pdf(.*)",
  "/api/parse-job-posting(.*)",
  "/api/me(.*)",
  "/api/interview-history(.*)",
  "/api/generate-resume(.*)",
  "/api/generate-career(.*)",
  "/api/generate-answers(.*)",
  "/api/generate-resume-doc(.*)",
]);

export default clerkMiddleware(async (auth, req) => {
  // Guest mode bypasses auth entirely so testers can run the full flow
  // without sign-in. User-bound API routes return memory/no-op responses
  // — see lib/guest.ts and individual route handlers.
  if (isGuestMode()) return;
  if (isProtectedRoute(req)) {
    await auth.protect();
  }
});

export const config = {
  matcher: [
    // Skip Next internals and static files
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest|json)).*)",
    "/(api|trpc)(.*)",
  ],
};
