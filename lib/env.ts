// Reads an env var with optional fallbacks. Useful for Vercel Marketplace
// integrations that prefix variables with the project name
// (e.g. interview_mate_DATABASE_URL).
export function readEnv(...names: string[]): string | undefined {
  for (const name of names) {
    const value = process.env[name];
    if (value) return value;
  }
  return undefined;
}

export function requireEnv(...names: string[]): string {
  const value = readEnv(...names);
  if (!value) {
    throw new Error(
      `Missing env var. Set one of: ${names.join(", ")}`
    );
  }
  return value;
}

export const DATABASE_URL_NAMES = [
  "DATABASE_URL",
  "interview_mate_DATABASE_URL",
] as const;
