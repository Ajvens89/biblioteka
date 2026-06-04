-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('GUEST', 'USER', 'LIBRARIAN', 'ADMIN');

-- CreateEnum
CREATE TYPE "GameType" AS ENUM ('BOARD', 'CARD', 'RPG', 'WARGAME', 'EDUCATIONAL', 'PARTY', 'FAMILY');

-- CreateEnum
CREATE TYPE "GameCollectionType" AS ENUM ('BOARD_GAME', 'RPG');

-- CreateEnum
CREATE TYPE "Difficulty" AS ENUM ('EASY', 'MEDIUM', 'HARD', 'EXPERT');

-- CreateEnum
CREATE TYPE "CopyStatus" AS ENUM ('AVAILABLE', 'RESERVED', 'BORROWED', 'DAMAGED', 'LOST', 'REPAIR', 'RETIRED');

-- CreateEnum
CREATE TYPE "CopyCondition" AS ENUM ('NEW', 'GOOD', 'FAIR', 'POOR');

-- CreateEnum
CREATE TYPE "ReservationStatus" AS ENUM ('PENDING', 'APPROVED', 'READY_FOR_PICKUP', 'BORROWED', 'RETURNED', 'CANCELLED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "LoanStatus" AS ENUM ('ACTIVE', 'RETURNED', 'OVERDUE', 'LOST', 'DAMAGED');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('RESERVATION_CONFIRMED', 'READY_FOR_PICKUP', 'RETURN_REMINDER', 'OVERDUE_RETURN', 'GENERAL');

-- CreateEnum
CREATE TYPE "AuditAction" AS ENUM ('CREATE', 'UPDATE', 'DELETE', 'LOGIN', 'RESERVE', 'APPROVE', 'BORROW', 'RETURN', 'CANCEL', 'IMPORT', 'EXPORT', 'SETTINGS');

-- CreateTable
CREATE TABLE "profiles" (
    "id" TEXT NOT NULL,
    "auth_user_id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "full_name" TEXT,
    "phone" TEXT,
    "role" "UserRole" NOT NULL DEFAULT 'USER',
    "is_blocked" BOOLEAN NOT NULL DEFAULT false,
    "admin_notes" TEXT,
    "avatar_url" TEXT,
    "password_hash" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "categories" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tags" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tags_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "publishers" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "website" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "publishers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "designers" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "designers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "games" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "ean" TEXT,
    "collection_type" "GameCollectionType" NOT NULL DEFAULT 'BOARD_GAME',
    "description" TEXT,
    "short_description" TEXT,
    "min_players" INTEGER NOT NULL DEFAULT 1,
    "max_players" INTEGER NOT NULL DEFAULT 4,
    "min_age" INTEGER NOT NULL DEFAULT 8,
    "min_play_time" INTEGER NOT NULL DEFAULT 30,
    "max_play_time" INTEGER NOT NULL DEFAULT 60,
    "difficulty" "Difficulty" NOT NULL DEFAULT 'MEDIUM',
    "type" "GameType" NOT NULL DEFAULT 'BOARD',
    "publisher_id" TEXT,
    "designer_id" TEXT,
    "year_published" INTEGER,
    "cover_image_url" TEXT,
    "cover_image_source" TEXT,
    "cover_image_external_id" TEXT,
    "instruction_url" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "is_featured" BOOLEAN NOT NULL DEFAULT false,
    "popularity_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "games_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "game_categories" (
    "game_id" TEXT NOT NULL,
    "category_id" TEXT NOT NULL,

    CONSTRAINT "game_categories_pkey" PRIMARY KEY ("game_id","category_id")
);

-- CreateTable
CREATE TABLE "game_tags" (
    "game_id" TEXT NOT NULL,
    "tag_id" TEXT NOT NULL,

    CONSTRAINT "game_tags_pkey" PRIMARY KEY ("game_id","tag_id")
);

-- CreateTable
CREATE TABLE "game_images" (
    "id" TEXT NOT NULL,
    "game_id" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "alt" TEXT,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "game_images_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "game_copies" (
    "id" TEXT NOT NULL,
    "game_id" TEXT NOT NULL,
    "inventory_number" TEXT NOT NULL,
    "barcode" TEXT,
    "status" "CopyStatus" NOT NULL DEFAULT 'AVAILABLE',
    "condition" "CopyCondition" NOT NULL DEFAULT 'GOOD',
    "location" TEXT,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "game_copies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reservations" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "game_id" TEXT NOT NULL,
    "copy_id" TEXT,
    "status" "ReservationStatus" NOT NULL DEFAULT 'PENDING',
    "pickup_deadline" TIMESTAMP(3),
    "notes" TEXT,
    "cancelled_at" TIMESTAMP(3),
    "approved_at" TIMESTAMP(3),
    "ready_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "reservations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "loans" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "copy_id" TEXT NOT NULL,
    "reservation_id" TEXT,
    "status" "LoanStatus" NOT NULL DEFAULT 'ACTIVE',
    "borrowed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "due_at" TIMESTAMP(3) NOT NULL,
    "returned_at" TIMESTAMP(3),
    "return_notes" TEXT,
    "damage_notes" TEXT,
    "extension_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "loans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "loan_extensions" (
    "id" TEXT NOT NULL,
    "loan_id" TEXT NOT NULL,
    "previous_due" TIMESTAMP(3) NOT NULL,
    "new_due" TIMESTAMP(3) NOT NULL,
    "reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "loan_extensions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "app_settings" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "app_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "actor_id" TEXT,
    "action" "AuditAction" NOT NULL,
    "entity_type" TEXT NOT NULL,
    "entity_id" TEXT,
    "metadata" JSONB,
    "ip_address" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "is_read" BOOLEAN NOT NULL DEFAULT false,
    "sent_email" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "profiles_auth_user_id_key" ON "profiles"("auth_user_id");

-- CreateIndex
CREATE UNIQUE INDEX "profiles_email_key" ON "profiles"("email");

-- CreateIndex
CREATE INDEX "profiles_email_idx" ON "profiles"("email");

-- CreateIndex
CREATE INDEX "profiles_role_idx" ON "profiles"("role");

-- CreateIndex
CREATE UNIQUE INDEX "categories_name_key" ON "categories"("name");

-- CreateIndex
CREATE UNIQUE INDEX "categories_slug_key" ON "categories"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "tags_name_key" ON "tags"("name");

-- CreateIndex
CREATE UNIQUE INDEX "tags_slug_key" ON "tags"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "publishers_name_key" ON "publishers"("name");

-- CreateIndex
CREATE UNIQUE INDEX "publishers_slug_key" ON "publishers"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "designers_name_key" ON "designers"("name");

-- CreateIndex
CREATE UNIQUE INDEX "designers_slug_key" ON "designers"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "games_slug_key" ON "games"("slug");

-- CreateIndex
CREATE INDEX "games_title_idx" ON "games"("title");

-- CreateIndex
CREATE INDEX "games_is_active_idx" ON "games"("is_active");

-- CreateIndex
CREATE INDEX "games_is_featured_idx" ON "games"("is_featured");

-- CreateIndex
CREATE INDEX "games_popularity_count_idx" ON "games"("popularity_count");

-- CreateIndex
CREATE INDEX "games_type_idx" ON "games"("type");

-- CreateIndex
CREATE INDEX "games_ean_idx" ON "games"("ean");

-- CreateIndex
CREATE INDEX "games_collection_type_idx" ON "games"("collection_type");

-- CreateIndex
CREATE INDEX "game_images_game_id_idx" ON "game_images"("game_id");

-- CreateIndex
CREATE UNIQUE INDEX "game_copies_inventory_number_key" ON "game_copies"("inventory_number");

-- CreateIndex
CREATE UNIQUE INDEX "game_copies_barcode_key" ON "game_copies"("barcode");

-- CreateIndex
CREATE INDEX "game_copies_game_id_idx" ON "game_copies"("game_id");

-- CreateIndex
CREATE INDEX "game_copies_status_idx" ON "game_copies"("status");

-- CreateIndex
CREATE INDEX "reservations_user_id_idx" ON "reservations"("user_id");

-- CreateIndex
CREATE INDEX "reservations_game_id_idx" ON "reservations"("game_id");

-- CreateIndex
CREATE INDEX "reservations_status_idx" ON "reservations"("status");

-- CreateIndex
CREATE INDEX "reservations_created_at_idx" ON "reservations"("created_at");

-- CreateIndex
CREATE UNIQUE INDEX "loans_reservation_id_key" ON "loans"("reservation_id");

-- CreateIndex
CREATE INDEX "loans_user_id_idx" ON "loans"("user_id");

-- CreateIndex
CREATE INDEX "loans_copy_id_idx" ON "loans"("copy_id");

-- CreateIndex
CREATE INDEX "loans_status_idx" ON "loans"("status");

-- CreateIndex
CREATE INDEX "loans_due_at_idx" ON "loans"("due_at");

-- CreateIndex
CREATE INDEX "loan_extensions_loan_id_idx" ON "loan_extensions"("loan_id");

-- CreateIndex
CREATE UNIQUE INDEX "app_settings_key_key" ON "app_settings"("key");

-- CreateIndex
CREATE INDEX "audit_logs_actor_id_idx" ON "audit_logs"("actor_id");

-- CreateIndex
CREATE INDEX "audit_logs_entity_type_idx" ON "audit_logs"("entity_type");

-- CreateIndex
CREATE INDEX "audit_logs_created_at_idx" ON "audit_logs"("created_at");

-- CreateIndex
CREATE INDEX "notifications_user_id_idx" ON "notifications"("user_id");

-- CreateIndex
CREATE INDEX "notifications_is_read_idx" ON "notifications"("is_read");

-- AddForeignKey
ALTER TABLE "games" ADD CONSTRAINT "games_publisher_id_fkey" FOREIGN KEY ("publisher_id") REFERENCES "publishers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "games" ADD CONSTRAINT "games_designer_id_fkey" FOREIGN KEY ("designer_id") REFERENCES "designers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "game_categories" ADD CONSTRAINT "game_categories_game_id_fkey" FOREIGN KEY ("game_id") REFERENCES "games"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "game_categories" ADD CONSTRAINT "game_categories_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "game_tags" ADD CONSTRAINT "game_tags_game_id_fkey" FOREIGN KEY ("game_id") REFERENCES "games"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "game_tags" ADD CONSTRAINT "game_tags_tag_id_fkey" FOREIGN KEY ("tag_id") REFERENCES "tags"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "game_images" ADD CONSTRAINT "game_images_game_id_fkey" FOREIGN KEY ("game_id") REFERENCES "games"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "game_copies" ADD CONSTRAINT "game_copies_game_id_fkey" FOREIGN KEY ("game_id") REFERENCES "games"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reservations" ADD CONSTRAINT "reservations_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reservations" ADD CONSTRAINT "reservations_game_id_fkey" FOREIGN KEY ("game_id") REFERENCES "games"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reservations" ADD CONSTRAINT "reservations_copy_id_fkey" FOREIGN KEY ("copy_id") REFERENCES "game_copies"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "loans" ADD CONSTRAINT "loans_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "loans" ADD CONSTRAINT "loans_copy_id_fkey" FOREIGN KEY ("copy_id") REFERENCES "game_copies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "loans" ADD CONSTRAINT "loans_reservation_id_fkey" FOREIGN KEY ("reservation_id") REFERENCES "reservations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "loan_extensions" ADD CONSTRAINT "loan_extensions_loan_id_fkey" FOREIGN KEY ("loan_id") REFERENCES "loans"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
