// Clerk 인증 미들웨어 — 인앱 브라우저 감지 + 보호된 라우트 인증 차단
import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { isGuestMode } from "@/lib/guest";
import { isInAppBrowser } from "@/lib/in-app-browser";

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

const isAuthPage = createRouteMatcher(["/sign-in(.*)", "/sign-up(.*)"]);

export default clerkMiddleware(async (auth, req) => {
  const ua = req.headers.get("user-agent") ?? "";
  if (isInAppBrowser(ua)) {
    const needsAuth = isAuthPage(req) || isProtectedRoute(req);
    if (needsAuth && !req.nextUrl.pathname.startsWith("/open-in-browser")) {
      const url = req.nextUrl.clone();
      url.pathname = "/open-in-browser";
      url.searchParams.set("redirect", req.nextUrl.pathname);
      return NextResponse.redirect(url);
    }
  }

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
