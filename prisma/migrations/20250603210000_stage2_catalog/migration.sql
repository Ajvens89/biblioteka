-- ETAP 2: catalog data quality (expand-only)

CREATE TYPE "EanValidationStatus" AS ENUM ('VALID', 'MISSING', 'INVALID_CHECKSUM', 'NEEDS_VERIFICATION');

ALTER TABLE "games" ADD COLUMN IF NOT EXISTS "ean_validation_status" "EanValidationStatus";

CREATE TABLE IF NOT EXISTS "game_slug_aliases" (
    "id" TEXT NOT NULL,
    "game_id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "game_slug_aliases_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "game_slug_aliases_slug_key" ON "game_slug_aliases"("slug");
CREATE INDEX IF NOT EXISTS "game_slug_aliases_game_id_idx" ON "game_slug_aliases"("game_id");

ALTER TABLE "game_slug_aliases" DROP CONSTRAINT IF EXISTS "game_slug_aliases_game_id_fkey";
ALTER TABLE "game_slug_aliases" ADD CONSTRAINT "game_slug_aliases_game_id_fkey" FOREIGN KEY ("game_id") REFERENCES "games"("id") ON DELETE CASCADE ON UPDATE CASCADE;
