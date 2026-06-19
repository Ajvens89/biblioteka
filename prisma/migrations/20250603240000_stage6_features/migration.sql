-- ETAP 6: wishlist, ratings, performance indexes (expand-only)

-- CreateTable wishlist_items
CREATE TABLE IF NOT EXISTS "wishlist_items" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "game_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "wishlist_items_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "wishlist_items_user_id_game_id_key" ON "wishlist_items"("user_id", "game_id");
CREATE INDEX IF NOT EXISTS "wishlist_items_user_id_idx" ON "wishlist_items"("user_id");
CREATE INDEX IF NOT EXISTS "wishlist_items_game_id_idx" ON "wishlist_items"("game_id");

ALTER TABLE "wishlist_items" DROP CONSTRAINT IF EXISTS "wishlist_items_user_id_fkey";
ALTER TABLE "wishlist_items" ADD CONSTRAINT "wishlist_items_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "wishlist_items" DROP CONSTRAINT IF EXISTS "wishlist_items_game_id_fkey";
ALTER TABLE "wishlist_items" ADD CONSTRAINT "wishlist_items_game_id_fkey" FOREIGN KEY ("game_id") REFERENCES "games"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable game_ratings
CREATE TABLE IF NOT EXISTS "game_ratings" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "game_id" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "comment" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "game_ratings_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "game_ratings_user_id_game_id_key" ON "game_ratings"("user_id", "game_id");
CREATE INDEX IF NOT EXISTS "game_ratings_game_id_idx" ON "game_ratings"("game_id");
CREATE INDEX IF NOT EXISTS "game_ratings_user_id_idx" ON "game_ratings"("user_id");
CREATE INDEX IF NOT EXISTS "game_ratings_game_id_rating_idx" ON "game_ratings"("game_id", "rating");

ALTER TABLE "game_ratings" DROP CONSTRAINT IF EXISTS "game_ratings_user_id_fkey";
ALTER TABLE "game_ratings" ADD CONSTRAINT "game_ratings_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "game_ratings" DROP CONSTRAINT IF EXISTS "game_ratings_game_id_fkey";
ALTER TABLE "game_ratings" ADD CONSTRAINT "game_ratings_game_id_fkey" FOREIGN KEY ("game_id") REFERENCES "games"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Performance indexes for catalog and library queries
CREATE INDEX IF NOT EXISTS "games_deleted_at_is_active_idx" ON "games"("deleted_at", "is_active");
CREATE INDEX IF NOT EXISTS "games_collection_type_is_active_idx" ON "games"("collection_type", "is_active");
CREATE INDEX IF NOT EXISTS "game_copies_game_id_status_idx" ON "game_copies"("game_id", "status");
CREATE INDEX IF NOT EXISTS "reservations_user_id_status_idx" ON "reservations"("user_id", "status");
CREATE INDEX IF NOT EXISTS "loans_user_id_status_idx" ON "loans"("user_id", "status");
CREATE INDEX IF NOT EXISTS "loans_status_due_at_idx" ON "loans"("status", "due_at");
