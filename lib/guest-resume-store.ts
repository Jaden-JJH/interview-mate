// 게스트 모드에서 자기소개서 슬롯을 localStorage에 저장·관리하는 클라이언트 유틸
//
// Guest mode (`NEXT_PUBLIC_GUEST_MODE=true`) intentionally skips DB writes
// on the server (see lib/guest.ts) so local testing doesn't pollute the
// real database. That makes the resume slot list ephemeral across pages.
// This module gives guest-mode resumes a localStorage-backed home so the
// /resume → /mypage flow still works end-to-end.

export interface GuestResume {
  id: string;
  content: string;
  fileName: string | null;
  updatedAt: string;
}

const KEY = "guest_resume_slots";
const MAX = 3;

export function isGuestMode(): boolean {
  return process.env.NEXT_PUBLIC_GUEST_MODE === "true";
}

export function loadGuestResumes(): GuestResume[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as GuestResume[];
    return Array.isArray(parsed) ? parsed.slice(0, MAX) : [];
  } catch {
    return [];
  }
}

function save(list: GuestResume[]) {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(list.slice(0, MAX)));
  } catch {
    // localStorage may be full or disabled — ignore.
  }
}

export function addGuestResume(
  content: string,
  fileName: string
): { ok: true; resume: GuestResume } | { ok: false; reason: "full" } {
  const list = loadGuestResumes();
  if (list.length >= MAX) return { ok: false, reason: "full" };
  const resume: GuestResume = {
    id: `guest_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    content,
    fileName,
    updatedAt: new Date().toISOString(),
  };
  save([resume, ...list]);
  return { ok: true, resume };
}

export function deleteGuestResume(id: string): void {
  const list = loadGuestResumes().filter((r) => r.id !== id);
  save(list);
}
