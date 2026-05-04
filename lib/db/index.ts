import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import { DATABASE_URL_NAMES, requireEnv } from "../env";
import * as schema from "./schema";

const sql = neon(requireEnv(...DATABASE_URL_NAMES));
export const db = drizzle(sql, { schema });
export { schema };
