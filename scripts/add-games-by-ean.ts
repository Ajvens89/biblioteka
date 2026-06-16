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
  findHurtProductByTitle,
  mapHurtProductToGameData,
  canonicalHurtEan,
} from "../src/lib/hurt-catalog";
import { loadHurtCatalog } from "../src/lib/hurt-catalog-loader";
import { downloadCoverToPublic } from "../src/lib/services/cover-download";
import { fetchCoverForGame } from "../src/lib/services/cover-fetch";
import { lookupPlanszeoCoverUrl } from "../src/lib/services/ean-providers/planszeo-provider";
import { lookupRebelCoverUrl } from "../src/lib/services/ean-providers/rebel-images-provider";
import { findGameByEan } from "../src/lib/services/game-by-ean";
import { createGameFromEan, lookupByEan } from "../src/lib/services/games";
import { inferGameType } from "../src/lib/services/game-type-infer";

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
  { ean: "9788395409523", title: "Neuroshima: Bohater² (dodatek 07)", collectionType: "RPG", type: "RPG" },
  { ean: "9788395802034", title: "Neuroshima: Miami (dodatek 08)", collectionType: "RPG", type: "RPG" },
  { ean: "9788395409592", title: "Neuroshima: Ruiny (dodatek 16)", collectionType: "RPG", type: "RPG" },
  { ean: "9788395802027", title: "Neuroshima: Nowy Jork (dodatek 17)", collectionType: "RPG", type: "RPG" },
  { ean: "9788395409547", title: "Neuroshima: Bohater Maxx (dodatek 21)", collectionType: "RPG", type: "RPG" },
  { ean: "9788396103109", title: "Neuroshima: Łowca Mutantów / Zabójca Maszyn", collectionType: "RPG", type: "RPG" },
  { ean: "9788393057122", title: "Afterbomb Madness (Druga edycja)", collectionType: "RPG", type: "RPG" },
  { ean: "9788364198045", title: "Zew Cthulhu: Księga Strażnika", collectionType: "RPG", type: "RPG" },
  { ean: "9788364198175", title: "Zew Cthulhu: Podręcznik Badacza", collectionType: "RPG", type: "RPG" },
  { ean: "9788364198342", title: "Zew Cthulhu: Pulp Cthulhu", collectionType: "RPG", type: "RPG" },
  { ean: "9788364198892", title: "Zew Cthulhu: Horror w Orient Expressie", collectionType: "RPG", type: "RPG" },
  { ean: "9788367619028", title: "Zew Cthulhu: Kulty Cthulhu", collectionType: "RPG", type: "RPG" },
  { ean: "9788364198533", title: "Zew Cthulhu: Dwie z Tysiąca", collectionType: "RPG", type: "RPG" },
  { ean: "9788364198144", title: "Zew Cthulhu: Usłysz Zew Cthulhu", collectionType: "RPG", type: "RPG" },
  { ean: "9788364198496", title: "Zew Cthulhu: Posiadłości Szaleństwa Tom I", collectionType: "RPG", type: "RPG" },
  { ean: "9788364198410", title: "Zew Cthulhu: Twarzą w Twarz", collectionType: "RPG", type: "RPG" },
  { ean: "9788395672002", title: "Wampir: Maskarada (5. edycja)", collectionType: "RPG", type: "RPG" },
  { ean: "9788397264588", title: "Wampir: Camarilla", collectionType: "RPG", type: "RPG" },
  { ean: "9788396134837", title: "Wampir: Sabat – Czarna Ręka", collectionType: "RPG", type: "RPG" },
  { ean: "9788396566362", title: "Wampir: Druga Inkwizycja", collectionType: "RPG", type: "RPG" },
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

function rpgDefaults(seed: GameSeed) {
  const isRpg = (seed.collectionType ?? "RPG") === "RPG";
  return {
    minPlayers: seed.minPlayers ?? (isRpg ? 1 : 2),
    maxPlayers: seed.maxPlayers ?? (isRpg ? 6 : 4),
    minAge: seed.minAge ?? (isRpg ? 0 : 10),
    minPlayTime: seed.minPlayTime ?? (isRpg ? 0 : 30),
    maxPlayTime: seed.maxPlayTime ?? (isRpg ? 0 : 60),
  };
}

function mergeSeedWithHurt(seed: GameSeed, hurt: ReturnType<typeof mapHurtProductToGameData>) {
  const defs = rpgDefaults(seed);
  const collectionType = seed.collectionType ?? hurt.collectionType ?? "RPG";
  const rpgCategory = seed.collectionType === "RPG" ? "RPG" : null;
  return {
    title: hurt.title || seed.title,
    collectionType,
    description: hurt.description ?? seed.description ?? null,
    shortDescription: hurt.shortDescription ?? seed.shortDescription ?? null,
    publisherName: hurt.publisherName ?? seed.publisher ?? null,
    categoryName: seed.category ?? rpgCategory ?? hurt.categoryName ?? null,
    minPlayers: hurt.minPlayers ?? defs.minPlayers,
    maxPlayers: hurt.maxPlayers ?? defs.maxPlayers,
    minAge: hurt.minAge ?? defs.minAge,
    minPlayTime: hurt.minPlayTime ?? defs.minPlayTime,
    maxPlayTime: hurt.maxPlayTime ?? defs.maxPlayTime,
    yearPublished: hurt.yearPublished ?? seed.yearPublished ?? null,
    imageUrl: hurt.imageUrl ?? hurt.thumbnailUrl ?? seed.coverUrl ?? null,
    idProduct: hurt.idProduct,
    gameType: seed.type ?? inferGameType(collectionType, hurt.categoryName ?? ""),
  };
}

async function mergeFromLookup(
  prisma: PrismaClient,
  seed: GameSeed,
  ean: string,
): Promise<ReturnType<typeof mergeSeedWithHurt> | null> {
  const lookup = await lookupByEan(prisma, ean, { titleHint: seed.title });
  const candidates = lookup.candidates;
  const bySource = (source: string) => candidates.find((c) => c.source === source);
  const candidate =
    lookup.selectedCandidate ??
    bySource("hurt") ??
    bySource("google_books") ??
    bySource("open_library") ??
    candidates.find((c) => c.coverImageUrl || c.description || c.title);
  if (!candidate && lookup.status === "not_found") return null;

  const descCandidate =
    bySource("hurt") ??
    bySource("google_books") ??
    bySource("open_library") ??
    candidates.find((c) => c.description);
  const coverCandidate =
    bySource("hurt") ??
    candidates.find((c) => c.coverImageUrl) ??
    candidate;

  const defs = rpgDefaults(seed);
  const collectionType =
    seed.collectionType ?? candidate?.collectionTypeSuggestion ?? "RPG";
  const rpgCategory = seed.collectionType === "RPG" ? "RPG" : null;

  return {
    title: candidate?.title ?? seed.title,
    collectionType,
    description: descCandidate?.description ?? seed.description ?? null,
    shortDescription:
      descCandidate?.shortDescription ??
      descCandidate?.authors?.join(", ") ??
      seed.shortDescription ??
      null,
    publisherName:
      candidate?.publisher ?? descCandidate?.publisher ?? seed.publisher ?? null,
    categoryName: seed.category ?? rpgCategory ?? null,
    minPlayers: candidate?.minPlayers ?? defs.minPlayers,
    maxPlayers: candidate?.maxPlayers ?? defs.maxPlayers,
    minAge: candidate?.minAge ?? defs.minAge,
    minPlayTime: candidate?.minPlayTime ?? defs.minPlayTime,
    maxPlayTime: candidate?.maxPlayTime ?? defs.maxPlayTime,
    yearPublished: candidate?.year ?? descCandidate?.year ?? seed.yearPublished ?? null,
    imageUrl:
      coverCandidate?.coverImageUrl ??
      coverCandidate?.thumbnailUrl ??
      seed.coverUrl ??
      null,
    idProduct: coverCandidate?.externalId ?? "",
    gameType:
      candidate?.gameTypeSuggestion ??
      seed.type ??
      inferGameType(collectionType, seed.title),
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

    const hurtProduct =
      (catalog ? findHurtProductByEan(ean, catalog) : null) ??
      (catalog ? findHurtProductByTitle(seed.title, catalog)?.product : null);
    const hurtMapped = hurtProduct ? mapHurtProductToGameData(hurtProduct) : null;
    let merged = hurtMapped
      ? mergeSeedWithHurt(seed, hurtMapped)
      : await mergeFromLookup(prisma, seed, ean);

    if (!merged) {
      const defs = rpgDefaults(seed);
      merged = {
        title: seed.title,
        collectionType: seed.collectionType ?? "RPG",
        description: seed.description ?? null,
        shortDescription: seed.shortDescription ?? null,
        publisherName: seed.publisher ?? null,
        categoryName: seed.category ?? null,
        minPlayers: defs.minPlayers,
        maxPlayers: defs.maxPlayers,
        minAge: defs.minAge,
        minPlayTime: defs.minPlayTime,
        maxPlayTime: defs.maxPlayTime,
        yearPublished: seed.yearPublished ?? null,
        imageUrl: seed.coverUrl ?? null,
        idProduct: "",
        gameType: seed.type ?? "RPG",
      };
    }

    const dataSource = hurtProduct ? "hurt.csv" : merged.description ? "lookup EAN" : "tytuł ręczny";
    const cover = await resolveCover(merged.title, ean, merged.imageUrl, seed.coverUrl);
    const source = cover.source ?? (hurtProduct ? "hurt" : null);

    console.log(`✓  ${ean} — ${merged.title}`);
    console.log(
      `   źródło danych: ${dataSource}, okładka: ${cover.url ? source : "brak"}, opis: ${merged.description ? "tak" : "nie"}`,
    );

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
          type: merged.gameType ?? seed.type ?? "RPG",
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
