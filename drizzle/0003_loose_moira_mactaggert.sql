CREATE TABLE "resume_analyses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"resume_text" text NOT NULL,
	"job_posting_text" text,
	"job_posting_company" text,
	"job_posting_position" text,
	"overall_score" integer NOT NULL,
	"overall_comment" text NOT NULL,
	"axes" jsonb NOT NULL,
	"sections" jsonb NOT NULL,
	"unlocked_sections" jsonb,
	"unlocked_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "credits" ADD COLUMN "jasoseo_free_unlock_used" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "resume_analyses" ADD CONSTRAINT "resume_analyses_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;