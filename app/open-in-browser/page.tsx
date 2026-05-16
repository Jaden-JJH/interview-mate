// 인앱 브라우저(카카오톡·네이버 등)에서 접근 시 외부 브라우저 유도 안내 페이지
import type { Metadata } from "next";
import OpenInBrowserClient from "./OpenInBrowserClient";

export const metadata: Metadata = {
  title: "외부 브라우저에서 열어주세요",
  robots: { index: false, follow: false },
};

export default function Page() {
  return <OpenInBrowserClient />;
}
