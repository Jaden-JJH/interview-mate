// 자소서메이트 라우트 전용 레이아웃 — JasoseoProvider를 이 범위에만 제공
import { JasoseoProvider } from "@/contexts/JasoseoContext";

export default function JasoseoLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <JasoseoProvider>{children}</JasoseoProvider>;
}
