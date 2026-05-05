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
  "/api/generate-questions(.*)",
  "/api/evaluate-answer(.*)",
  "/api/generate-feedback(.*)",
  "/api/parse-pdf(.*)",
  "/api/parse-job-posting(.*)",
  "/api/me(.*)",
  "/api/interview-history(.*)",
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
