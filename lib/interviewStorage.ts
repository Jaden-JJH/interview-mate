// Persists the in-flight interview to localStorage so a stray refresh /
// closed tab / OS sleep doesn't lose paid progress. TTL is 24h — beyond
// that the user's resume/job-posting context is too stale to safely resume
// (and we already charged a credit, so we err on the side of "let them
// start fresh" rather than restoring noise).

const CONTEXT_KEY = "interview:context:v1";
const PROGRESS_KEY = "interview:progress:v1";
const TTL_MS = 24 * 60 * 60 * 1000;

interface Envelope<T> {
  savedAt: number;
  data: T;
}

function isBrowser(): boolean {
  return typeof window !== "undefined";
}

function read<T>(key: string): T | null {
  if (!isBrowser()) return null;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return null;
    const env = JSON.parse(raw) as Envelope<T>;
    if (
      !env ||
      typeof env.savedAt !== "number" ||
      Date.now() - env.savedAt > TTL_MS
    ) {
      window.localStorage.removeItem(key);
      return null;
    }
    return env.data;
  } catch {
    return null;
  }
}

function write<T>(key: string, data: T): void {
  if (!isBrowser()) return;
  try {
    const env: Envelope<T> = { savedAt: Date.now(), data };
    window.localStorage.setItem(key, JSON.stringify(env));
  } catch {
    // Quota exceeded / private mode — silently ignore.
  }
}

function remove(key: string): void {
  if (!isBrowser()) return;
  try {
    window.localStorage.removeItem(key);
  } catch {}
}

export function loadContext<T>(): T | null {
  return read<T>(CONTEXT_KEY);
}

export function saveContext<T>(data: T): void {
  write(CONTEXT_KEY, data);
}

export function clearContext(): void {
  remove(CONTEXT_KEY);
}

export function loadProgress<T>(): T | null {
  return read<T>(PROGRESS_KEY);
}

export function saveProgress<T>(data: T): void {
  write(PROGRESS_KEY, data);
}

export function clearProgress(): void {
  remove(PROGRESS_KEY);
}

export function clearAll(): void {
  clearContext();
  clearProgress();
}
