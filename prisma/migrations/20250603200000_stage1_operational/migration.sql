-- ETAP 1: operational automation (expand-only)

-- AlterEnum
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'RESERVATION_EXPIRED';

-- AlterTable profiles
ALTER TABLE "profiles" ADD COLUMN IF NOT EXISTS "email_notifications_enabled" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable loans
ALTER TABLE "loans" ADD COLUMN IF NOT EXISTS "last_reminder_at" TIMESTAMP(3);
ALTER TABLE "loans" ADD COLUMN IF NOT EXISTS "overdue_notified_at" TIMESTAMP(3);

-- AlterTable notifications
ALTER TABLE "notifications" ADD COLUMN IF NOT EXISTS "link_url" TEXT;

-- CreateIndex
CREATE INDEX IF NOT EXISTS "notifications_created_at_idx" ON "notifications"("created_at");

-- CreateTable rate_limit_entries
CREATE TABLE IF NOT EXISTS "rate_limit_entries" (
    "id" TEXT NOT NULL,
    "scope" TEXT NOT NULL,
    "key_hash" TEXT NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 1,
    "window_start" TIMESTAMP(3) NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "rate_limit_entries_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "rate_limit_entries_scope_key_hash_window_start_key" ON "rate_limit_entries"("scope", "key_hash", "window_start");
CREATE INDEX IF NOT EXISTS "rate_limit_entries_expires_at_idx" ON "rate_limit_entries"("expires_at");

-- CreateTable password_reset_tokens
CREATE TABLE IF NOT EXISTS "password_reset_tokens" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "token_hash" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "used_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "password_reset_tokens_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "password_reset_tokens_user_id_idx" ON "password_reset_tokens"("user_id");
CREATE INDEX IF NOT EXISTS "password_reset_tokens_token_hash_idx" ON "password_reset_tokens"("token_hash");
CREATE INDEX IF NOT EXISTS "password_reset_tokens_expires_at_idx" ON "password_reset_tokens"("expires_at");

ALTER TABLE "password_reset_tokens" DROP CONSTRAINT IF EXISTS "password_reset_tokens_user_id_fkey";
ALTER TABLE "password_reset_tokens" ADD CONSTRAINT "password_reset_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable cron_job_logs
CREATE TABLE IF NOT EXISTS "cron_job_logs" (
    "id" TEXT NOT NULL,
    "job_name" TEXT NOT NULL,
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finished_at" TIMESTAMP(3),
    "status" TEXT NOT NULL,
    "processed" INTEGER NOT NULL DEFAULT 0,
    "metadata" JSONB,
    "error" TEXT,
    CONSTRAINT "cron_job_logs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "cron_job_logs_job_name_started_at_idx" ON "cron_job_logs"("job_name", "started_at");
