import { config } from "dotenv";
import { defineConfig } from "drizzle-kit";

config({ path: ".env.local" });
config({ path: ".env" });

const url =
  process.env.DATABASE_URL ?? process.env.interview_mate_DATABASE_URL;

if (!url) {
  throw new Error(
    "Set DATABASE_URL or interview_mate_DATABASE_URL in .env.local"
  );
}

export default defineConfig({
  schema: "./lib/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: { url },
  strict: true,
  verbose: true,
});
