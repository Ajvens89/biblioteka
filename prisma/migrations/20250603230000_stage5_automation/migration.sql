-- ETAP 5: automation — waitlist, extension requests, notification types (expand-only)

-- AlterEnum NotificationType
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'WAITLIST_AVAILABLE';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'EXTENSION_APPROVED';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'EXTENSION_REJECTED';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'EVENT_REMINDER';

-- CreateEnum WaitlistStatus
DO $$ BEGIN
  CREATE TYPE "WaitlistStatus" AS ENUM ('WAITING', 'NOTIFIED', 'FULFILLED', 'EXPIRED', 'CANCELLED');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- CreateEnum ExtensionRequestStatus
DO $$ BEGIN
  CREATE TYPE "ExtensionRequestStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- CreateTable waitlist_entries
CREATE TABLE IF NOT EXISTS "waitlist_entries" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "game_id" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "status" "WaitlistStatus" NOT NULL DEFAULT 'WAITING',
    "notified_at" TIMESTAMP(3),
    "expires_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "waitlist_entries_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "waitlist_entries_game_id_status_position_idx" ON "waitlist_entries"("game_id", "status", "position");
CREATE INDEX IF NOT EXISTS "waitlist_entries_user_id_game_id_idx" ON "waitlist_entries"("user_id", "game_id");
CREATE INDEX IF NOT EXISTS "waitlist_entries_user_id_status_idx" ON "waitlist_entries"("user_id", "status");

ALTER TABLE "waitlist_entries" DROP CONSTRAINT IF EXISTS "waitlist_entries_user_id_fkey";
ALTER TABLE "waitlist_entries" ADD CONSTRAINT "waitlist_entries_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "waitlist_entries" DROP CONSTRAINT IF EXISTS "waitlist_entries_game_id_fkey";
ALTER TABLE "waitlist_entries" ADD CONSTRAINT "waitlist_entries_game_id_fkey" FOREIGN KEY ("game_id") REFERENCES "games"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable loan_extension_requests
CREATE TABLE IF NOT EXISTS "loan_extension_requests" (
    "id" TEXT NOT NULL,
    "loan_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "status" "ExtensionRequestStatus" NOT NULL DEFAULT 'PENDING',
    "requested_days" INTEGER NOT NULL DEFAULT 7,
    "reason" TEXT,
    "reviewed_at" TIMESTAMP(3),
    "reviewed_by_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "loan_extension_requests_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "loan_extension_requests_loan_id_idx" ON "loan_extension_requests"("loan_id");
CREATE INDEX IF NOT EXISTS "loan_extension_requests_user_id_idx" ON "loan_extension_requests"("user_id");
CREATE INDEX IF NOT EXISTS "loan_extension_requests_status_idx" ON "loan_extension_requests"("status");
CREATE INDEX IF NOT EXISTS "loan_extension_requests_status_created_at_idx" ON "loan_extension_requests"("status", "created_at");

ALTER TABLE "loan_extension_requests" DROP CONSTRAINT IF EXISTS "loan_extension_requests_loan_id_fkey";
ALTER TABLE "loan_extension_requests" ADD CONSTRAINT "loan_extension_requests_loan_id_fkey" FOREIGN KEY ("loan_id") REFERENCES "loans"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "loan_extension_requests" DROP CONSTRAINT IF EXISTS "loan_extension_requests_user_id_fkey";
ALTER TABLE "loan_extension_requests" ADD CONSTRAINT "loan_extension_requests_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "loan_extension_requests" DROP CONSTRAINT IF EXISTS "loan_extension_requests_reviewed_by_id_fkey";
ALTER TABLE "loan_extension_requests" ADD CONSTRAINT "loan_extension_requests_reviewed_by_id_fkey" FOREIGN KEY ("reviewed_by_id") REFERENCES "profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;
