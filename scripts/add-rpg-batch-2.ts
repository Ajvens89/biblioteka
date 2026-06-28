/**
 * Dodaje partię podręczników RPG (tytuł + opcjonalny EAN z researchu).
 *   npx tsx scripts/add-rpg-batch-2.ts
 *   npx tsx scripts/add-rpg-batch-2.ts --dry-run
 */
import "dotenv/config";
import type { GameCollectionType, GameType } from "@prisma/client";
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
import { createGameFromEan } from "../src/lib/services/games";
import { ensureCopiesForGame } from "../src/lib/services/import-products";

type Seed = {
  title: string;
  ean?: string;
  publisher?: string;
  description?: string;
  shortDescription?: string;
  coverUrl?: string;
  yearPublished?: number;
};

const MANUAL_COVER: Record<string, string> = {
  "9788364473524": "https://covers.openlibrary.org/b/isbn/9788364473524-L.jpg",
  "9788393179626": "https://covers.openlibrary.org/b/isbn/9788393179626-L.jpg",
  "9788364473258": "https://covers.openlibrary.org/b/isbn/9788364473258-L.jpg",
  "9788366682023": "https://covers.openlibrary.org/b/isbn/9788366682023-L.jpg",
  "9788395978616": "https://covers.openlibrary.org/b/isbn/9788395978616-L.jpg",
  "9788389765017": "https://covers.openlibrary.org/b/isbn/9788389765017-L.jpg",
  "9788361656074": "https://covers.openlibrary.org/b/isbn/9788361656074-L.jpg",
  "9781934547915": "https://covers.openlibrary.org/b/isbn/9781934547915-L.jpg",
  "9780954752651": "https://covers.openlibrary.org/b/isbn/9780954752651-L.jpg",
  "9788363698829": "https://covers.openlibrary.org/b/isbn/9788363698829-L.jpg",
  "9788395239274": "https://trpg.pl/wp-content/uploads/2025/09/potwor-tygodnia.webp",
  "9788396134806": "https://covers.openlibrary.org/b/isbn/9788396134806-L.jpg",
};

const MANUAL_DESCRIPTION: Record<string, string> = {
  "9788364473524":
    "Savage Worlds (Edycja Polska 2015) to odświeżony polski podręcznik uniwersalnej mechaniki Shane'a Hensleya — szybkie, kinowe sesje w dowolnych realiach. Wydawnictwo Fajne RPG / Kuźnia Gier.",
  "9788393179626":
    "Savage Worlds: Nemezis to polski setting science fiction Andrzeja Stója — planety Ash, Bariz i Cor, Horda i plugawe bestie. Wymaga podręcznika Savage Worlds. Wydawnictwo Gramel.",
  "9788364473258":
    "Savage Worlds: Horror Companion to polskie tłumaczenie suplementu horroru — zasady i porady dla Mistrza Gry prowadzącego mroczne kampanie w mechanice Savage Worlds. Fajne RPG.",
  "9788366682023":
    "Dungeon World: Podziemia i Potwory to polskie wydanie gry PBTA autorstwa Sage LaTorra i Adama Koebela — fantasy oparte na ruchach, współtworzeniu i eksploracji. Gramel.",
  "9788395978616":
    "Kult: Boskość Utracona to współczesny horror fabularny o iluzji rzeczywistości i walce o utraconą boskość. Czwarta edycja systemu Kult. Alis Games.",
  "9788389765017":
    "Armie Apokalipsy to postapokaliptyczna gra fabularna o ocalałych w zrujnowanym świecie — frakcje, mutacje i walka o przetrwanie. Wydawnictwo Menhir.",
  "9788361656074":
    "Klanarchia to polski system mrocznego fantasy horroru Michała Markowskiego — wolne klany, okultyzm i Dominat Ebionitów w świecie po upadku Starożytnych. Copernicus Corporation.",
  "9781934547915":
    "Modern AGE Basic Rulebook to podręcznik współczesnej gry fabularnej opartej na systemie AGE — akcja, śledztwo, miejskie fantasy i opcjonalna magia. Green Ronin (EN).",
  "9780954752651":
    "Ashen Stars to gra detektywistyczna GUMSHOE w kosmosie — drużyna „laserów” rozwiązuje sprawy na pograniczu galaktyki. Robin D. Laws, Pelgrane Press (EN).",
  "9788363698829":
    "Blades in the Dark (pol. Ostrza w Mroku) to gra o bandzie przestępców w industrialnym mieście Doskonałości — tajne plany, duchy i narkotyk elektroplazma. Stinger Press.",
  "9788395239274":
    "Monster of the Week (Potwór tygodnia) to gra horroru akcji oparta na Powered by the Apocalypse — drużyna łowców tropi nadnaturalne zagrożenia. Druga edycja, Gramel.",
  "9788396134806":
    "Dune: Adventures in the Imperium to gra fabularna w uniwersum Diuny — intrygi Wielkich Domów, respekt, waluta i polityka na tle Arrakis. Modiphius / Alis Games.",
};

const SEEDS: Seed[] = [
  {
    title: "Afterglow",
    publisher: "White Tree Games",
    shortDescription: "Postapokaliptyczna gra fabularna · Poświaty",
    description:
      "Afterglow to polska postapokaliptyczna gra fabularna osadzona w świecie Poświat — zrujnowanych miast, mutantów i nomadycznych klanów walczących o przetrwanie. Podręcznik zawiera zasady, opis świata i narzędzia do prowadzenia mrocznych przygód. Wydawnictwo White Tree Games (2019). Brak oficjalnego ISBN — wydanie ze zbiórki wspieram.to.",
    coverUrl: "https://rpggeek.com/image/55277/afterglow-postapokaliptyczna-gra-fabularna",
  },
  {
    ean: "9788364473524",
    title: "Savage Worlds (Edycja Polska 2015)",
    publisher: "Fajne RPG",
    shortDescription: "Uniwersalna mechanika SW · Shane Hensley",
  },
  {
    ean: "9788393179626",
    title: "Savage Worlds: Nemezis",
    publisher: "Gramel",
    shortDescription: "Setting SF · Andrzej Stój",
  },
  {
    ean: "9788364473258",
    title: "Savage Worlds: Horror Companion",
    publisher: "Fajne RPG",
    shortDescription: "Suplement horroru · Savage Worlds PL",
  },
  {
    ean: "9788366682023",
    title: "Dungeon World: Podziemia i Potwory",
    publisher: "Gramel",
    shortDescription: "PBTA fantasy · LaTorra & Koebel",
  },
  {
    ean: "9788395978616",
    title: "Kult: Boskość Utracona",
    publisher: "Alis Games",
    shortDescription: "Współczesny horror · 4. edycja",
  },
  {
    ean: "9788389765017",
    title: "Armie Apokalipsy",
    publisher: "Menhir",
    shortDescription: "Postapokalipsa · Katarzyna i Marcin Kuczyńscy",
  },
  {
    ean: "9788361656074",
    title: "Klanarchia",
    publisher: "Copernicus Corporation",
    shortDescription: "Mroczne fantasy horror · Michał Markowski",
  },
  {
    ean: "9781934547915",
    title: "Modern AGE – Podręcznik podstawowy",
    publisher: "Green Ronin",
    shortDescription: "Współczesne / miejskie fantasy · AGE System (EN)",
  },
  {
    ean: "9780954752651",
    title: "Ashen Stars",
    publisher: "Pelgrane Press",
    shortDescription: "GUMSHOE · kosmiczni detektywi · Robin D. Laws (EN)",
  },
  {
    ean: "9788363698829",
    title: "Blades in the Dark",
    publisher: "Stinger Press",
    shortDescription: "Ostrza w Mroku · John Harper",
  },
  {
    ean: "9788395239274",
    title: "Monster of the Week (druga edycja)",
    publisher: "Gramel",
    shortDescription: "Horror akcji · Powered by the Apocalypse",
  },
  {
    ean: "9788396134806",
    title: "Dune: Adventures in the Imperium",
    publisher: "Alis Games",
    shortDescription: "Uniwersum Diuny · Modiphius 2D20",
  },
];

const dryRun = process.argv.includes("--dry-run");

function makeSlug(title: string) {
  return slugify(title, { lower: true, strict: true, locale: "pl" });
}

async function findExisting(prisma: PrismaClient, seed: Seed) {
  if (seed.ean) {
    const ean = canonicalHurtEan(seed.ean);
    const byEan = await prisma.game.findFirst({
      where: { ean, deletedAt: null },
      select: { id: true, title: true, coverImageUrl: true },
    });
    if (byEan) return byEan;
  }
  const slug = makeSlug(seed.title);
  const bySlug = await prisma.game.findFirst({
    where: { slug, deletedAt: null },
    select: { id: true, title: true, coverImageUrl: true },
  });
  if (bySlug) return bySlug;
  return prisma.game.findFirst({
    where: {
      deletedAt: null,
      title: { equals: seed.title.trim(), mode: "insensitive" },
    },
    select: { id: true, title: true, coverImageUrl: true },
  });
}

async function resolveCover(
  title: string,
  ean: string | undefined,
  hurtImage: string | null,
  seedCover?: string,
) {
  if (hurtImage) {
    const local = await downloadCoverToPublic(hurtImage, title);
    if (local) return { url: local, source: "hurt" as const };
  }
  if (ean) {
    const rebel = await lookupRebelCoverUrl(title, ean);
    if (rebel?.coverUrl) {
      const local = await downloadCoverToPublic(rebel.coverUrl, title);
      if (local) return { url: local, source: "rebel" as const };
    }
  }
  if (seedCover) {
    const local = await downloadCoverToPublic(seedCover, title);
    if (local) return { url: local, source: "manual" as const };
  }
  if (ean && MANUAL_COVER[ean]) {
    const local = await downloadCoverToPublic(MANUAL_COVER[ean], title);
    if (local) return { url: local, source: "open_library" as const };
  }
  if (ean) {
    const planszeo = await lookupPlanszeoCoverUrl(title, ean);
    if (planszeo?.coverUrl) {
      const local = await downloadCoverToPublic(planszeo.coverUrl, title);
      if (local) return { url: local, source: "planszeo" as const };
    }
    const fetched = await fetchCoverForGame({ title, ean, collectionType: "RPG" });
    if (fetched.coverImageUrl) {
      return { url: fetched.coverImageUrl, source: fetched.coverImageSource };
    }
  }
  if (!ean) {
    const fetched = await fetchCoverForGame({ title, collectionType: "RPG" });
    if (fetched.coverImageUrl) {
      return { url: fetched.coverImageUrl, source: fetched.coverImageSource };
    }
  }
  return { url: null, source: null };
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

async function ensureRpgCategoryId(prisma: PrismaClient) {
  const row = await prisma.category.upsert({
    where: { slug: "rpg" },
    create: { name: "RPG", slug: "rpg" },
    update: {},
  });
  return row.id;
}

async function main() {
  const prisma = new PrismaClient();
  const catalog = await loadHurtCatalog();
  const rpgCategoryId = await ensureRpgCategoryId(prisma);

  const admin = await prisma.profile.findFirst({
    where: { role: "ADMIN" },
    select: { id: true, email: true },
  });
  if (!admin) {
    console.error("Brak konta ADMIN");
    process.exit(1);
  }

  console.log(dryRun ? "=== DRY RUN — RPG batch 2 ===" : "=== Dodawanie RPG batch 2 ===\n");

  let added = 0;
  let skipped = 0;
  let coversPatched = 0;
  let copiesAdded = 0;

  for (const seed of SEEDS) {
    const ean = seed.ean ? canonicalHurtEan(seed.ean) : null;
    const existing = await findExisting(prisma, seed);

    const hurtProduct = ean && catalog ? findHurtProductByEan(ean, catalog) : null;
    const hurtMapped = hurtProduct ? mapHurtProductToGameData(hurtProduct) : null;

    const title = seed.title;
    const description =
      (ean && MANUAL_DESCRIPTION[ean]) ??
      seed.description ??
      hurtMapped?.description ??
      null;
    const shortDescription = seed.shortDescription ?? hurtMapped?.shortDescription ?? null;
    const publisherName = seed.publisher ?? hurtMapped?.publisherName ?? null;

    const cover = await resolveCover(
      title,
      ean ?? undefined,
      hurtMapped?.imageUrl ?? hurtMapped?.thumbnailUrl ?? null,
      seed.coverUrl ?? (ean ? MANUAL_COVER[ean] : undefined),
    );

    if (existing) {
      const needsCover = !existing.coverImageUrl?.trim() && cover.url;
      console.log(
        `⏭  „${existing.title}” — już w bazie${needsCover ? " (brak okładki — uzupełnię)" : ""}`,
      );
      if (needsCover && !dryRun) {
        await prisma.game.update({
          where: { id: existing.id },
          data: {
            coverImageUrl: cover.url,
            coverImageSource: cover.source,
            collectionType: "RPG",
            type: "RPG",
          },
        });
        coversPatched += 1;
      }
      if (!dryRun) {
        const copies = await ensureCopiesForGame(prisma, existing.id, 1, 1, false);
        if (copies > 0) copiesAdded += copies;
      }
      skipped += 1;
      continue;
    }

    console.log(`+  ${title}`);
    console.log(`   EAN: ${ean ?? "brak"} | okładka: ${cover.url ? cover.source : "nie"} | opis: ${description ? "tak" : "nie"}`);

    if (dryRun) {
      added += 1;
      continue;
    }

    const publisherId = await ensurePublisherId(prisma, publisherName);
    const game = await createGameFromEan(
      prisma,
      {
        title,
        ean: ean ?? undefined,
        collectionType: "RPG" as GameCollectionType,
        type: "RPG" as GameType,
        description,
        shortDescription,
        minPlayers: 1,
        maxPlayers: 6,
        minAge: 0,
        minPlayTime: 0,
        maxPlayTime: 0,
        yearPublished: hurtMapped?.yearPublished ?? seed.yearPublished ?? null,
        coverImageUrl: cover.url,
        coverImageSource: cover.source,
        publisherId: publisherId ?? undefined,
        categoryIds: [rpgCategoryId],
        difficulty: "MEDIUM",
        skipEanChecksum: true,
        isActive: true,
      },
      admin.id,
    );

    const copies = await ensureCopiesForGame(prisma, game.id, 1, 1, false);
    copiesAdded += copies;
    console.log(`   → /gry/${game.slug} (+${copies} egz.)\n`);
    added += 1;
  }

  console.log(
    `\nDodano: ${added}, pominięte (już były): ${skipped}, okładki uzupełnione: ${coversPatched}, egzemplarze: ${copiesAdded}`,
  );
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
