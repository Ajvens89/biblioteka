/**
 * Dodaje gry po liście EAN — hurt.csv → Planszeo/Rebel → baza.
 *   npx tsx scripts/add-games-by-ean.ts
 *   npx tsx scripts/add-games-by-ean.ts --dry-run
 */
import "dotenv/config";
import type { Difficulty, GameCollectionType, GameType } from "@prisma/client";
import { PrismaClient } from "@prisma/client";
import slugify from "slugify";
import {
  findHurtProductByEan,
  mapHurtProductToGameData,
  canonicalHurtEan,
} from "../src/lib/hurt-catalog";
import { loadHurtCatalog } from "../src/lib/hurt-catalog-loader";
import { downloadCoverToPublic } from "../src/lib/services/cover-download";
import { fetchCoverForGame } from "../src/lib/services/cover-fetch";
import { lookupPlanszeoCoverUrl } from "../src/lib/services/ean-providers/planszeo-provider";
import { lookupRebelCoverUrl } from "../src/lib/services/ean-providers/rebel-images-provider";
import { findGameByEan } from "../src/lib/services/game-by-ean";
import { createGameFromEan } from "../src/lib/services/games";

type GameSeed = {
  ean: string;
  title: string;
  collectionType?: GameCollectionType;
  type?: GameType;
  difficulty?: Difficulty;
  publisher?: string;
  category?: string;
  description?: string;
  shortDescription?: string;
  minPlayers?: number;
  maxPlayers?: number;
  minAge?: number;
  minPlayTime?: number;
  maxPlayTime?: number;
  yearPublished?: number;
  coverUrl?: string;
};

const GAME_SEEDS: GameSeed[] = [
  { ean: "3760175518263", title: "Proszę wsiadać! Nowy Jork i Londyn", publisher: "Days of Wonder" },
  { ean: "5902560387629", title: "Circadians: Nowy Świt - Specjaliści" },
  { ean: "5902560386981", title: "Eleven: Edycja Polska" },
  { ean: "5902560387278", title: "Dead by Daylight: Gra planszowa" },
  { ean: "5902560384338", title: "Wyprawa Darwina / Darwin's Journey" },
  { ean: "5902560381580", title: "Monolith Arena" },
  { ean: "5902560387322", title: "Niezbadana Planeta" },
  { ean: "5905794220151", title: "Niezbadana Planeta: Superksiężyc" },
  { ean: "5902560387681", title: "Resurgence" },
  { ean: "5902560384857", title: "Circadians: Ład Chaosu" },
  { ean: "5902560388121", title: "Circadians: Ład Chaosu - Heroldowie" },
  { ean: "5902560384079", title: "Potwory w Tokio" },
  { ean: "5902560384529", title: "Potwory w Tokio: Halloween" },
  { ean: "5905965251502", title: "Nowy świt" },
  { ean: "5902560387599", title: "Niezbadana planeta: Zestaw ulepszeń" },
];

const dryRun = process.argv.includes("--dry-run");

function makeSlug(title: string) {
  return slugify(title, { lower: true, strict: true, locale: "pl" });
}

async function ensurePublisherId(prisma: PrismaClient, name: string | null | undefined) {
  if (!name?.trim()) return null;
  const slug = makeSlug(name) || "wydawca";
  const row = await prisma.publisher.upsert({
    where: { slug },
    create: { name: name.trim(), slug },
    update: {},
  });
  return row.id;
}

async function ensureCategoryIds(prisma: PrismaClient, name: string | null | undefined) {
  if (!name?.trim()) return [];
  const slug = makeSlug(name) || "kategoria";
  const row = await prisma.category.upsert({
    where: { slug },
    create: { name: name.trim(), slug },
    update: {},
  });
  return [row.id];
}

async function resolveCover(
  title: string,
  ean: string,
  hurtImage: string | null,
  seedCover?: string,
): Promise<{ url: string | null; source: string | null; externalId?: string }> {
  if (hurtImage) {
    const local = await downloadCoverToPublic(hurtImage, title);
    if (local) return { url: local, source: "hurt" };
  }
  const rebel = await lookupRebelCoverUrl(title, ean);
  if (rebel?.coverUrl) {
    const local = await downloadCoverToPublic(rebel.coverUrl, title);
    if (local) return { url: local, source: "rebel", externalId: rebel.productId };
  }
  if (seedCover) {
    const local = await downloadCoverToPublic(seedCover, title);
    if (local) return { url: local, source: "manual" };
  }
  const planszeo = await lookupPlanszeoCoverUrl(title, ean);
  if (planszeo?.coverUrl) {
    const local = await downloadCoverToPublic(planszeo.coverUrl, title);
    if (local) return { url: local, source: "planszeo" };
  }
  const fetched = await fetchCoverForGame({ title, ean });
  if (fetched.coverImageUrl) {
    return {
      url: fetched.coverImageUrl,
      source: fetched.coverImageSource,
    };
  }
  return { url: null, source: null };
}

function mergeSeedWithHurt(seed: GameSeed, hurt: ReturnType<typeof mapHurtProductToGameData>) {
  return {
    title: hurt.title || seed.title,
    collectionType: hurt.collectionType ?? seed.collectionType ?? "BOARD_GAME",
    description: hurt.description ?? seed.description ?? null,
    shortDescription: hurt.shortDescription ?? seed.shortDescription ?? null,
    publisherName: hurt.publisherName ?? seed.publisher ?? null,
    categoryName: hurt.categoryName ?? seed.category ?? null,
    minPlayers: hurt.minPlayers ?? seed.minPlayers ?? 2,
    maxPlayers: hurt.maxPlayers ?? seed.maxPlayers ?? 4,
    minAge: hurt.minAge ?? seed.minAge ?? 10,
    minPlayTime: hurt.minPlayTime ?? seed.minPlayTime ?? 30,
    maxPlayTime: hurt.maxPlayTime ?? seed.maxPlayTime ?? 60,
    yearPublished: hurt.yearPublished ?? seed.yearPublished ?? null,
    imageUrl: hurt.imageUrl ?? hurt.thumbnailUrl ?? seed.coverUrl ?? null,
    idProduct: hurt.idProduct,
  };
}

async function main() {
  const prisma = new PrismaClient();
  const catalog = await loadHurtCatalog();

  const admin = await prisma.profile.findFirst({
    where: { role: "ADMIN" },
    select: { id: true, email: true },
  });
  if (!admin) {
    console.error("Brak konta ADMIN — uruchom npm run db:seed");
    process.exit(1);
  }

  console.log(dryRun ? "=== DRY RUN — dodawanie gier ===" : "=== Dodawanie gier po EAN ===");
  console.log(`Admin: ${admin.email}\n`);

  let added = 0;
  let skipped = 0;
  let failed = 0;

  for (const seed of GAME_SEEDS) {
    const ean = canonicalHurtEan(seed.ean);
    const existing = await findGameByEan(prisma, ean);
    if (existing) {
      console.log(`⏭  ${ean} — już w bazie: „${existing.title}” (${existing.slug})`);
      skipped += 1;
      continue;
    }

    const hurtProduct = catalog ? findHurtProductByEan(ean, catalog) : null;
    const hurtMapped = hurtProduct ? mapHurtProductToGameData(hurtProduct) : null;
    const merged = hurtMapped
      ? mergeSeedWithHurt(seed, hurtMapped)
      : {
          title: seed.title,
          collectionType: seed.collectionType ?? "BOARD_GAME",
          description: seed.description ?? null,
          shortDescription: seed.shortDescription ?? null,
          publisherName: seed.publisher ?? null,
          categoryName: seed.category ?? null,
          minPlayers: seed.minPlayers ?? 2,
          maxPlayers: seed.maxPlayers ?? 4,
          minAge: seed.minAge ?? 10,
          minPlayTime: seed.minPlayTime ?? 30,
          maxPlayTime: seed.maxPlayTime ?? 60,
          yearPublished: seed.yearPublished ?? null,
          imageUrl: seed.coverUrl ?? null,
          idProduct: "",
        };

    const cover = await resolveCover(merged.title, ean, merged.imageUrl, seed.coverUrl);
    const source = cover.source ?? (hurtProduct ? "hurt" : null);

    console.log(`✓  ${ean} — ${merged.title}`);
    console.log(`   źródło danych: ${hurtProduct ? "hurt.csv" : "katalog ręczny"}, okładka: ${cover.url ? source : "brak"}`);

    if (dryRun) {
      added += 1;
      continue;
    }

    try {
      const publisherId = await ensurePublisherId(prisma, merged.publisherName);
      const categoryIds = await ensureCategoryIds(prisma, merged.categoryName);

      const game = await createGameFromEan(
        prisma,
        {
          title: merged.title,
          ean,
          collectionType: merged.collectionType as GameCollectionType,
          description: merged.description,
          shortDescription: merged.shortDescription,
          minPlayers: merged.minPlayers,
          maxPlayers: merged.maxPlayers,
          minAge: merged.minAge,
          minPlayTime: merged.minPlayTime,
          maxPlayTime: merged.maxPlayTime,
          yearPublished: merged.yearPublished,
          coverImageUrl: cover.url,
          coverImageSource: source,
          coverImageExternalId: cover.externalId ?? merged.idProduct ?? null,
          publisherId: publisherId ?? undefined,
          categoryIds,
          type: seed.type ?? "BOARD",
          difficulty: seed.difficulty ?? "MEDIUM",
          skipEanChecksum: true,
          isActive: true,
        },
        admin.id,
      );

      console.log(`   → utworzono: /gry/${game.slug}\n`);
      added += 1;
    } catch (e) {
      console.error(`   ❌ błąd: ${e instanceof Error ? e.message : e}\n`);
      failed += 1;
    }
  }

  console.log(`\nPodsumowanie: dodane ${added}, pominięte ${skipped}, błędy ${failed}`);
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
