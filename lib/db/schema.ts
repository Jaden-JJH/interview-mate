// Drizzle ORM 스키마 정의 — users, credits, savedResumes, interviewHistory, transactions 테이블
import {
  pgTable,
  uuid,
  text,
  integer,
  timestamp,
  jsonb,
  boolean,
} from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  clerkUserId: text("clerk_user_id").notNull().unique(),
  email: text("email").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const credits = pgTable("credits", {
  userId: uuid("user_id")
    .primaryKey()
    .references(() => users.id, { onDelete: "cascade" }),
  freeRemaining: integer("free_remaining").default(1).notNull(),
  paidRemaining: integer("paid_remaining").default(0).notNull(),
  totalUsed: integer("total_used").default(0).notNull(),
  aiAssistUsed: boolean("ai_assist_used").default(false).notNull(),
  jasoseoFreeUnlockUsed: boolean("jasoseo_free_unlock_used").default(false).notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const savedResumes = pgTable("saved_resumes", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .references(() => users.id, { onDelete: "cascade" })
    .notNull(),
  content: text("content").notNull(),
  fileName: text("file_name"),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const interviewHistory = pgTable("interview_history", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .references(() => users.id, { onDelete: "cascade" })
    .notNull(),
  personaId: text("persona_id").notNull(),
  durationMinutes: integer("duration_minutes").notNull(),
  startedAt: timestamp("started_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  endedAt: timestamp("ended_at", { withTimezone: true }),
  overallScore: integer("overall_score"),
  qaResults: jsonb("qa_results").notNull(),
});

export const transactions = pgTable("transactions", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .references(() => users.id, { onDelete: "cascade" })
    .notNull(),
  paddleTransactionId: text("paddle_transaction_id").notNull().unique(),
  amount: integer("amount").notNull(),
  currency: text("currency").default("KRW").notNull(),
  status: text("status").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const resumeAnalyses = pgTable("resume_analyses", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .references(() => users.id, { onDelete: "cascade" })
    .notNull(),
  resumeText: text("resume_text").notNull(),
  jobPostingText: text("job_posting_text"),
  jobPostingCompany: text("job_posting_company"),
  jobPostingPosition: text("job_posting_position"),
  overallScore: integer("overall_score").notNull(),
  overallComment: text("overall_comment").notNull(),
  axes: jsonb("axes").notNull(),
  sections: jsonb("sections").notNull(),
  unlockedSections: jsonb("unlocked_sections"),
  unlockedAt: timestamp("unlocked_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const processedWebhooks = pgTable("processed_webhooks", {
  paddleEventId: text("paddle_event_id").primaryKey(),
  processedAt: timestamp("processed_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});
