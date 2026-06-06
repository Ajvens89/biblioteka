-- Uzupełnienie brakujących kolumn (stara baza dev)
DO $$ BEGIN
  CREATE TYPE "GameCollectionType" AS ENUM ('BOARD_GAME', 'RPG');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE "games" ADD COLUMN IF NOT EXISTS "ean" TEXT;
ALTER TABLE "games" ADD COLUMN IF NOT EXISTS "collection_type" "GameCollectionType" NOT NULL DEFAULT 'BOARD_GAME';
ALTER TABLE "games" ADD COLUMN IF NOT EXISTS "cover_image_url" TEXT;
ALTER TABLE "games" ADD COLUMN IF NOT EXISTS "cover_image_source" TEXT;
ALTER TABLE "games" ADD COLUMN IF NOT EXISTS "cover_image_external_id" TEXT;
ALTER TABLE "games" ADD COLUMN IF NOT EXISTS "instruction_url" TEXT;
ALTER TABLE "games" ADD COLUMN IF NOT EXISTS "deleted_at" TIMESTAMP(3);

CREATE INDEX IF NOT EXISTS "games_ean_idx" ON "games"("ean");
CREATE INDEX IF NOT EXISTS "games_collection_type_idx" ON "games"("collection_type");
