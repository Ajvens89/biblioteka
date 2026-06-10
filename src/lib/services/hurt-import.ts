import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import type { Game, PrismaClient } from "@prisma/client";
import {
  findHurtProductByEan,
  findHurtProductByTitle,
  hurtTitleMatchScore,
  normalizeHurtTitle,
  mapHurtProductToGameData,
  TITLE_CONFLICT_MAX_SCORE,
  type HurtCatalog,
  type HurtCatalogProduct,
  type HurtGameData,
} from "@/lib/hurt-catalog";
import { downloadCoverToPublic } from "@/lib/services/cover-download";
import { isPublicCoverAvailable } from "@/lib/services/import-products";
import slugify from "slugify";
import { loadHurtCatalog } from "@/lib/hurt-catalog-loader";

export type HurtImportConflict = {
  gameId: string;
  gameTitle: string;
  gameEan: string | null;
  hurtTitle: string;
  hurtEan: string;
  hurtIdProduct: string;
  titleScore: number;
  reason: string;
};

export type HurtImportSkipped = {
  gameId: string;
  title: string;
  ean: string | null;
  reason: string;
};

export type HurtFieldPatch = {
  field: string;
  current: string | number | null;
  newValue: string | number | null;
};

export type HurtImportGamePlan = {
  gameId: string;
  title: string;
  ean: string | null;
  hurtIdProduct: string;
  hurtTitle: string;
  matchedBy: "ean" | "title";
  fields: HurtFieldPatch[];
};

export type HurtImportStats = {
  dryRun: boolean;
  replaceEmptyOnly: boolean;
  force: boolean;
  catalogPath: string | null;
  catalogProducts: number;
  gamesInDb: number;
  gamesWithEan: number;
  foundInHurt: number;
  canUpdate: number;
  updated: number;
  skippedExisting: number;
  missingInHurt: string[];
  conflicts: HurtImportConflict[];
  skipped: HurtImportSkipped[];
  plans: HurtImportGamePlan[];
  fieldsTouched: Record<string, number>;
};

type GameRow = Pick<
  Game,
  | "id"
  | "title"
  | "ean"
  | "description"
  | "shortDescription"
  | "minPlayers"
  | "maxPlayers"
  | "minAge"
  | "minPlayTime"
  | "maxPlayTime"
  | "yearPublished"
  | "coverImageUrl"
  | "coverImageSource"
  | "publisherId"
  | "collectionType"
>;

function makeSlug(text: string) {
  return slugify(text, { lower: true, strict: true, locale: "pl" });
}

function isEmptyString(v: string | number | null | undefined): boolean {
  return typeof v !== "string" || !v.trim();
}

function isEmptyNumber(v: string | number | null | undefined): boolean {
  return typeof v !== "number";
}

async function ensurePublisherId(prisma: PrismaClient, name: string | null | undefined) {
  const trimmed = name?.trim();
  if (!trimmed) return null;
  const slug = makeSlug(trimmed) || "wydawca";
  const row = await prisma.publisher.upsert({
    where: { slug },
    create: { name: trimmed, slug },
    update: {},
  });
  return row.id;
}

async function ensureCategoryId(prisma: PrismaClient, name: string | null | undefined) {
  const trimmed = name?.trim();
  if (!trimmed) return null;
  const slug = makeSlug(trimmed) || "kategoria";
  const row = await prisma.category.upsert({
    where: { slug },
    create: { name: trimmed, slug },
    update: {},
  });
  return row.id;
}

function buildPatches(
  game: GameRow,
  mapped: HurtGameData,
  replaceEmptyOnly: boolean,
  force: boolean,
): HurtFieldPatch[] {
  const patches: HurtFieldPatch[] = [];

  const maybe = (
    field: string,
    current: string | number | null | undefined,
    next: string | number | null | undefined,
    emptyCheck: (v: string | number | null | undefined) => boolean,
  ) => {
    if (next == null || (typeof next === "string" && !next.trim())) return;
    const cur = current ?? null;
    if (!force && replaceEmptyOnly && !emptyCheck(cur)) return;
    if (!force && !replaceEmptyOnly && cur === next) return;
    if (force || emptyCheck(cur) || cur !== next) {
      patches.push({ field, current: cur, newValue: next });
    }
  };

  maybe("description", game.description, mapped.description, isEmptyString);
  maybe("shortDescription", game.shortDescription, mapped.shortDescription, isEmptyString);
  maybe("minAge", game.minAge, mapped.minAge, isEmptyNumber);
  maybe("minPlayers", game.minPlayers, mapped.minPlayers, isEmptyNumber);
  maybe("maxPlayers", game.maxPlayers, mapped.maxPlayers, isEmptyNumber);
  maybe("minPlayTime", game.minPlayTime, mapped.minPlayTime, isEmptyNumber);
  maybe("maxPlayTime", game.maxPlayTime, mapped.maxPlayTime, isEmptyNumber);
  maybe("yearPublished", game.yearPublished, mapped.yearPublished, isEmptyNumber);
  maybe("ean", game.ean, mapped.ean, isEmptyString);

  if (
    mapped.imageUrl &&
    (force || !game.coverImageUrl?.trim() || !isPublicCoverAvailable(game.coverImageUrl))
  ) {
    if (replaceEmptyOnly || force || isEmptyString(game.coverImageUrl)) {
      patches.push({
        field: "coverImageUrl",
        current: game.coverImageUrl,
        newValue: mapped.imageUrl,
      });
    }
  }

  if (mapped.publisherName && (force || !game.publisherId)) {
    patches.push({ field: "publisher", current: null, newValue: mapped.publisherName });
  }

  if (mapped.categoryName) {
    patches.push({ field: "category", current: null, newValue: mapped.categoryName });
  }

  if (mapped.collectionType && (force || game.collectionType === "BOARD_GAME")) {
    patches.push({
      field: "collectionType",
      current: game.collectionType,
      newValue: mapped.collectionType,
    });
  }

  return patches;
}

export function formatHurtImportReport(stats: HurtImportStats): string {
  const lines = [
    stats.dryRun ? "=== DRY RUN — import hurt.csv ===" : "=== Import hurt.csv ===",
    `Plik katalogu: ${stats.catalogPath ?? "brak"}`,
    `Produktów w hurt.csv: ${stats.catalogProducts}`,
    `Gier w bazie: ${stats.gamesInDb}`,
    `Gier z EAN: ${stats.gamesWithEan}`,
    `Znalezionych w hurt.csv: ${stats.foundInHurt}`,
    `Do uzupełnienia: ${stats.canUpdate}`,
    `Zaktualizowanych: ${stats.updated}`,
    `Pominiętych (dane już OK): ${stats.skippedExisting}`,
  ];

  if (Object.keys(stats.fieldsTouched).length > 0) {
    lines.push("", "Pola do uzupełnienia:");
    for (const [field, count] of Object.entries(stats.fieldsTouched).sort()) {
      lines.push(`  • ${field}: ${count}`);
    }
  }

  if (stats.missingInHurt.length > 0) {
    lines.push("", `Brak w hurt.csv (${stats.missingInHurt.length}):`);
    for (const ean of stats.missingInHurt.slice(0, 15)) lines.push(`  • EAN ${ean}`);
    if (stats.missingInHurt.length > 15) {
      lines.push(`  … i ${stats.missingInHurt.length - 15} więcej`);
    }
  }

  if (stats.conflicts.length > 0) {
    lines.push("", `Konflikty tytułów (${stats.conflicts.length}):`);
    for (const c of stats.conflicts.slice(0, 10)) {
      lines.push(`  • ${c.gameTitle} ↔ ${c.hurtTitle} (score ${c.titleScore})`);
    }
  }

  if (stats.skipped.length > 0) {
    lines.push("", `Pominięte (${stats.skipped.length}):`);
    for (const s of stats.skipped.slice(0, 8)) {
      lines.push(`  • ${s.title}: ${s.reason}`);
    }
  }

  return lines.join("\n");
}

export async function runHurtImport(
  prisma: PrismaClient,
  options?: {
    dryRun?: boolean;
    replaceEmptyOnly?: boolean;
    force?: boolean;
    csvPath?: string;
    conflictsPath?: string;
  },
): Promise<HurtImportStats> {
  const dryRun = options?.dryRun ?? false;
  const replaceEmptyOnly = options?.force ? false : (options?.replaceEmptyOnly ?? true);
  const force = options?.force ?? false;

  const catalog = await loadHurtCatalog(options?.csvPath);
  const stats: HurtImportStats = {
    dryRun,
    replaceEmptyOnly,
    force,
    catalogPath: catalog?.filePath ?? null,
    catalogProducts: catalog?.products.length ?? 0,
    gamesInDb: 0,
    gamesWithEan: 0,
    foundInHurt: 0,
    canUpdate: 0,
    updated: 0,
    skippedExisting: 0,
    missingInHurt: [],
    conflicts: [],
    skipped: [],
    plans: [],
    fieldsTouched: {},
  };

  if (!catalog) return stats;

  const games = await prisma.game.findMany({
    where: { deletedAt: null, isActive: true },
    select: {
      id: true,
      title: true,
      ean: true,
      description: true,
      shortDescription: true,
      minPlayers: true,
      maxPlayers: true,
      minAge: true,
      minPlayTime: true,
      maxPlayTime: true,
      yearPublished: true,
      coverImageUrl: true,
      coverImageSource: true,
      publisherId: true,
      collectionType: true,
    },
  });

  stats.gamesInDb = games.length;
  stats.gamesWithEan = games.filter((g) => g.ean?.trim()).length;

  for (const game of games) {
    const match = resolveHurtMatch(game, catalog);
    if (!match) {
      if (game.ean?.trim()) stats.missingInHurt.push(game.ean);
      continue;
    }

    stats.foundInHurt += 1;

    if (match.conflict) {
      stats.conflicts.push(match.conflict);
      continue;
    }

    const mapped = mapHurtProductToGameData(match.product);
    const patches = buildPatches(game, mapped, replaceEmptyOnly, force);

    if (patches.length === 0) {
      stats.skippedExisting += 1;
      stats.skipped.push({
        gameId: game.id,
        title: game.title,
        ean: game.ean,
        reason: "Wszystkie docelowe pola już wypełnione",
      });
      continue;
    }

    stats.canUpdate += 1;
    for (const p of patches) {
      stats.fieldsTouched[p.field] = (stats.fieldsTouched[p.field] ?? 0) + 1;
    }

    stats.plans.push({
      gameId: game.id,
      title: game.title,
      ean: game.ean,
      hurtIdProduct: match.product.idProduct,
      hurtTitle: match.product.productName,
      matchedBy: match.matchedBy,
      fields: patches,
    });

    if (dryRun) continue;

    await applyHurtPatches(prisma, game.id, mapped, patches);
    stats.updated += 1;
  }

  if (stats.conflicts.length > 0) {
    const out = options?.conflictsPath ?? path.resolve("reports/hurt-import-conflicts.json");
    await mkdir(path.dirname(out), { recursive: true });
    await writeFile(out, JSON.stringify(stats.conflicts, null, 2), "utf8");
  }

  return stats;
}

function resolveHurtMatch(
  game: GameRow,
  catalog: HurtCatalog,
): {
  product: HurtCatalogProduct;
  matchedBy: "ean" | "title";
  conflict?: HurtImportConflict;
} | null {
  let product = game.ean ? findHurtProductByEan(game.ean, catalog) : null;
  let matchedBy: "ean" | "title" = "ean";

  if (!product) {
    const byTitle = findHurtProductByTitle(game.title, catalog);
    if (!byTitle) return null;
    product = byTitle.product;
    matchedBy = "title";
  }

  const titleScore = hurtTitleMatchScore(game.title, product.productName);
  const normGame = normalizeHurtTitle(game.title);
  const normHurt = normalizeHurtTitle(product.productName);
  if (
    matchedBy === "ean" &&
    normGame !== normHurt &&
    titleScore < TITLE_CONFLICT_MAX_SCORE
  ) {
    return {
      product,
      matchedBy,
      conflict: {
        gameId: game.id,
        gameTitle: game.title,
        gameEan: game.ean,
        hurtTitle: product.productName,
        hurtEan: product.ean,
        hurtIdProduct: product.idProduct,
        titleScore,
        reason: "EAN pasuje, ale tytuły są zbyt różne",
      },
    };
  }

  return { product, matchedBy };
}

async function applyHurtPatches(
  prisma: PrismaClient,
  gameId: string,
  mapped: HurtGameData,
  patches: HurtFieldPatch[],
) {
  const data: Record<string, unknown> = {};

  for (const patch of patches) {
    switch (patch.field) {
      case "description":
        data.description = patch.newValue;
        break;
      case "shortDescription":
        data.shortDescription = patch.newValue;
        break;
      case "minAge":
        data.minAge = patch.newValue;
        break;
      case "minPlayers":
        data.minPlayers = patch.newValue;
        break;
      case "maxPlayers":
        data.maxPlayers = patch.newValue;
        break;
      case "minPlayTime":
        data.minPlayTime = patch.newValue;
        break;
      case "maxPlayTime":
        data.maxPlayTime = patch.newValue;
        break;
      case "yearPublished":
        data.yearPublished = patch.newValue;
        break;
      case "ean":
        data.ean = patch.newValue;
        break;
      case "collectionType":
        data.collectionType = patch.newValue;
        break;
      case "coverImageUrl": {
        const remote = String(patch.newValue ?? "");
        const local = await downloadCoverToPublic(remote, mapped.title);
        if (local) {
          data.coverImageUrl = local;
          data.coverImageSource = "hurt";
          data.coverImageExternalId = mapped.idProduct;
        }
        break;
      }
      default:
        break;
    }
  }

  const publisherPatch = patches.find((p) => p.field === "publisher");
  if (publisherPatch?.newValue) {
    data.publisherId = await ensurePublisherId(prisma, String(publisherPatch.newValue));
  }

  if (Object.keys(data).length > 0) {
    await prisma.game.update({ where: { id: gameId }, data });
  }

  const categoryPatch = patches.find((p) => p.field === "category");
  if (categoryPatch?.newValue) {
    const categoryId = await ensureCategoryId(prisma, String(categoryPatch.newValue));
    if (categoryId) {
      await prisma.gameCategory.deleteMany({ where: { gameId } });
      await prisma.gameCategory.create({
        data: { gameId, categoryId },
      });
    }
  }
}
