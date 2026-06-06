import type {
  CopyCondition,
  CopyStatus,
  Difficulty,
  GameCollectionType,
  GameType,
  PrismaClient,
} from "@prisma/client";
import { readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import slugify from "slugify";
import { parseCollectionType } from "@/lib/services/collection-type";
import { normalizeEan } from "@/lib/services/ean";
import { assertBarcodeNotProductEan } from "@/lib/services/copy-barcode";

export const GAMES_JSON_VERSION = 1;

export type GameCopyJsonRecord = {
  inventoryNumber: string;
  barcode?: string | null;
  status?: CopyStatus;
  condition?: CopyCondition;
  location?: string | null;
  notes?: string | null;
};

export type GameJsonRecord = {
  title: string;
  slug?: string;
  ean?: string | null;
  collectionType?: GameCollectionType;
  description?: string | null;
  shortDescription?: string | null;
  minPlayers?: number;
  maxPlayers?: number;
  minAge?: number;
  minPlayTime?: number;
  maxPlayTime?: number;
  difficulty?: Difficulty;
  type?: GameType;
  yearPublished?: number | null;
  coverImageUrl?: string | null;
  coverImageSource?: string | null;
  instructionUrl?: string | null;
  isActive?: boolean;
  isFeatured?: boolean;
  publisher?: string | null;
  designer?: string | null;
  categories?: string[];
  tags?: string[];
  copies?: GameCopyJsonRecord[];
};

export type GamesJsonFile = {
  version: number;
  exportedAt?: string;
  source?: string;
  games: GameJsonRecord[];
};

export type ImportGamesJsonStats = {
  filePath: string;
  dryRun: boolean;
  read: number;
  created: number;
  updated: number;
  skipped: number;
  copiesCreated: number;
  copiesUpdated: number;
  issues: string[];
};

const DEFAULT_PATHS = ["./games.json", "./data/games.json", "./public/games.json"];

const COPY_STATUSES = new Set<string>([
  "AVAILABLE",
  "RESERVED",
  "BORROWED",
  "DAMAGED",
  "LOST",
  "REPAIR",
  "RETIRED",
]);

const COPY_CONDITIONS = new Set<string>(["NEW", "GOOD", "FAIR", "POOR"]);

const DIFFICULTIES = new Set<string>(["EASY", "MEDIUM", "HARD", "EXPERT"]);

const GAME_TYPES = new Set<string>([
  "BOARD",
  "CARD",
  "RPG",
  "WARGAME",
  "EDUCATIONAL",
  "PARTY",
  "FAMILY",
]);

function makeSlug(text: string) {
  return slugify(text, { lower: true, strict: true, locale: "pl" });
}

export function resolveGamesJsonPath(argv: string[]): string | null {
  const pathArg = argv.find((a) => {
    if (a.startsWith("-")) return false;
    const resolved = path.resolve(a);
    return existsSync(resolved);
  });
  if (pathArg) return path.resolve(pathArg);
  for (const p of DEFAULT_PATHS) {
    const resolved = path.resolve(p);
    if (existsSync(resolved)) return resolved;
  }
  return null;
}

export function parseGamesJson(content: string): GamesJsonFile {
  const raw = JSON.parse(content) as Record<string, unknown>;

  if (Array.isArray(raw.collection) && !Array.isArray(raw.games)) {
    throw new Error(
      'To wygląda na products.json (pole „collection”). Użyj importu products.json lub wyeksportuj katalog jako games.json.',
    );
  }

  if (!Array.isArray(raw.games)) {
    throw new Error('Plik games.json musi zawierać tablicę „games”.');
  }

  const version = typeof raw.version === "number" ? raw.version : 1;
  if (version > GAMES_JSON_VERSION) {
    throw new Error(`Nieobsługiwana wersja pliku: ${version} (obsługiwane: ${GAMES_JSON_VERSION}).`);
  }

  return {
    version,
    exportedAt: typeof raw.exportedAt === "string" ? raw.exportedAt : undefined,
    source: typeof raw.source === "string" ? raw.source : undefined,
    games: raw.games as GameJsonRecord[],
  };
}

export async function loadGamesJsonFile(filePath: string): Promise<GamesJsonFile> {
  const content = await readFile(filePath, "utf8");
  return parseGamesJson(content);
}

export async function fetchGamesForExport(prisma: PrismaClient) {
  return prisma.game.findMany({
    where: { deletedAt: null },
    include: {
      publisher: true,
      designer: true,
      copies: { orderBy: { inventoryNumber: "asc" } },
      categories: { include: { category: true } },
      tags: { include: { tag: true } },
    },
    orderBy: { title: "asc" },
  });
}

export function buildGamesExportFile(
  games: Awaited<ReturnType<typeof fetchGamesForExport>>,
): GamesJsonFile {
  return {
    version: GAMES_JSON_VERSION,
    exportedAt: new Date().toISOString(),
    source: "biblioteka-export",
    games: games.map((g) => ({
      title: g.title,
      slug: g.slug,
      ean: g.ean,
      collectionType: g.collectionType,
      description: g.description,
      shortDescription: g.shortDescription,
      minPlayers: g.minPlayers,
      maxPlayers: g.maxPlayers,
      minAge: g.minAge,
      minPlayTime: g.minPlayTime,
      maxPlayTime: g.maxPlayTime,
      difficulty: g.difficulty,
      type: g.type,
      yearPublished: g.yearPublished,
      coverImageUrl: g.coverImageUrl,
      coverImageSource: g.coverImageSource,
      instructionUrl: g.instructionUrl,
      isActive: g.isActive,
      isFeatured: g.isFeatured,
      publisher: g.publisher?.name ?? null,
      designer: g.designer?.name ?? null,
      categories: g.categories.map((c) => c.category.name),
      tags: g.tags.map((t) => t.tag.name),
      copies: g.copies.map((c) => ({
        inventoryNumber: c.inventoryNumber,
        barcode: c.barcode,
        status: c.status,
        condition: c.condition,
        location: c.location,
        notes: c.notes,
      })),
    })),
  };
}

export function serializeGamesExport(file: GamesJsonFile): string {
  return JSON.stringify(file, null, 2);
}

async function ensureNamedEntity(
  prisma: PrismaClient,
  model: "publisher" | "designer",
  name: string | null | undefined,
) {
  const trimmed = name?.trim();
  if (!trimmed) return null;
  const slug = makeSlug(trimmed) || (model === "publisher" ? "wydawca" : "autor");
  if (model === "publisher") {
    const row = await prisma.publisher.upsert({
      where: { slug },
      create: { name: trimmed, slug },
      update: {},
    });
    return row.id;
  }
  const row = await prisma.designer.upsert({
    where: { slug },
    create: { name: trimmed, slug },
    update: {},
  });
  return row.id;
}

async function ensureCategoryIds(prisma: PrismaClient, names: string[] | undefined) {
  if (!names?.length) return [];
  const ids: string[] = [];
  for (const name of names) {
    const trimmed = name.trim();
    if (!trimmed) continue;
    const slug = makeSlug(trimmed) || "kategoria";
    const row = await prisma.category.upsert({
      where: { slug },
      create: { name: trimmed, slug },
      update: {},
    });
    ids.push(row.id);
  }
  return ids;
}

async function ensureTagIds(prisma: PrismaClient, names: string[] | undefined) {
  if (!names?.length) return [];
  const ids: string[] = [];
  for (const name of names) {
    const trimmed = name.trim();
    if (!trimmed) continue;
    const slug = makeSlug(trimmed) || "tag";
    const row = await prisma.tag.upsert({
      where: { slug },
      create: { name: trimmed, slug },
      update: {},
    });
    ids.push(row.id);
  }
  return ids;
}

async function findExistingGame(
  prisma: PrismaClient,
  slug: string,
  ean: string | null,
  title: string,
) {
  const bySlug = await prisma.game.findFirst({
    where: { slug, deletedAt: null },
    select: { id: true },
  });
  if (bySlug) return bySlug;

  if (ean) {
    const byEan = await prisma.game.findFirst({
      where: { ean, deletedAt: null },
      select: { id: true },
    });
    if (byEan) return byEan;
  }

  return prisma.game.findFirst({
    where: {
      deletedAt: null,
      title: { equals: title.trim(), mode: "insensitive" },
    },
    select: { id: true },
  });
}

function parseEnum<T extends string>(
  value: string | undefined,
  allowed: Set<string>,
  fallback: T,
): T {
  if (value && allowed.has(value)) return value as T;
  return fallback;
}

function clampInt(value: unknown, fallback: number, min = 0, max = 9999): number {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, Math.floor(n)));
}

async function syncGameRelations(
  prisma: PrismaClient,
  gameId: string,
  categoryIds: string[],
  tagIds: string[],
) {
  await prisma.gameCategory.deleteMany({ where: { gameId } });
  if (categoryIds.length) {
    await prisma.gameCategory.createMany({
      data: categoryIds.map((categoryId) => ({ gameId, categoryId })),
      skipDuplicates: true,
    });
  }

  await prisma.gameTag.deleteMany({ where: { gameId } });
  if (tagIds.length) {
    await prisma.gameTag.createMany({
      data: tagIds.map((tagId) => ({ gameId, tagId })),
      skipDuplicates: true,
    });
  }
}

async function upsertCopies(
  prisma: PrismaClient,
  gameId: string,
  copies: GameCopyJsonRecord[] | undefined,
  dryRun: boolean,
  stats: ImportGamesJsonStats,
) {
  if (!copies?.length) return;

  for (const copy of copies) {
    const inventoryNumber = copy.inventoryNumber?.trim();
    if (!inventoryNumber) {
      if (stats.issues.length < 15) stats.issues.push("Pominięto egzemplarz bez numeru inwentarzowego");
      continue;
    }

    const barcode = copy.barcode?.trim() || null;
    if (barcode) {
      try {
        await assertBarcodeNotProductEan(prisma, gameId, barcode);
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        if (stats.issues.length < 15) stats.issues.push(`${inventoryNumber}: ${msg}`);
        continue;
      }
    }

    const status = parseEnum(copy.status, COPY_STATUSES, "AVAILABLE");
    const condition = parseEnum(copy.condition, COPY_CONDITIONS, "GOOD");

    const existing = await prisma.gameCopy.findUnique({
      where: { inventoryNumber },
      select: { id: true, gameId: true },
    });

    if (existing && existing.gameId !== gameId) {
      if (stats.issues.length < 15) {
        stats.issues.push(
          `Numer ${inventoryNumber} jest już przypisany do innej gry — pominięto.`,
        );
      }
      continue;
    }

    if (dryRun) {
      if (existing) stats.copiesUpdated += 1;
      else stats.copiesCreated += 1;
      continue;
    }

    if (existing) {
      await prisma.gameCopy.update({
        where: { inventoryNumber },
        data: {
          barcode: barcode ?? undefined,
          status,
          condition,
          location: copy.location?.trim() || null,
          notes: copy.notes?.trim() || null,
        },
      });
      stats.copiesUpdated += 1;
    } else {
      await prisma.gameCopy.create({
        data: {
          gameId,
          inventoryNumber,
          barcode,
          status,
          condition,
          location: copy.location?.trim() || null,
          notes: copy.notes?.trim() || null,
        },
      });
      stats.copiesCreated += 1;
    }
  }
}

export async function importGamesFromFile(
  prisma: PrismaClient,
  filePath: string,
  options?: { dryRun?: boolean },
): Promise<ImportGamesJsonStats> {
  const dryRun = options?.dryRun ?? false;
  const data = await loadGamesJsonFile(filePath);

  const stats: ImportGamesJsonStats = {
    filePath,
    dryRun,
    read: data.games.length,
    created: 0,
    updated: 0,
    skipped: 0,
    copiesCreated: 0,
    copiesUpdated: 0,
    issues: [],
  };

  for (const record of data.games) {
    const title = record.title?.trim();
    if (!title) {
      stats.skipped += 1;
      if (stats.issues.length < 15) stats.issues.push("Pominięto rekord bez tytułu");
      continue;
    }

    let ean: string | null = null;
    if (record.ean?.trim()) {
      try {
        ean = normalizeEan(record.ean);
      } catch {
        stats.skipped += 1;
        if (stats.issues.length < 15) stats.issues.push(`Niepoprawny EAN: ${record.ean} (${title})`);
        continue;
      }
    }

    let collectionType: GameCollectionType = "BOARD_GAME";
    try {
      collectionType = record.collectionType
        ? parseCollectionType(String(record.collectionType))
        : "BOARD_GAME";
    } catch {
      stats.skipped += 1;
      if (stats.issues.length < 15) stats.issues.push(`Niepoprawny collectionType: ${title}`);
      continue;
    }

    const slug = record.slug?.trim() || makeSlug(title) || "gra";
    const existing = await findExistingGame(prisma, slug, ean, title);

    const gameData = {
      title,
      slug,
      ean,
      collectionType,
      description: record.description?.trim() || null,
      shortDescription: record.shortDescription?.trim() || null,
      minPlayers: clampInt(record.minPlayers, collectionType === "RPG" ? 1 : 2),
      maxPlayers: clampInt(record.maxPlayers, collectionType === "RPG" ? 6 : 4),
      minAge: clampInt(record.minAge, collectionType === "RPG" ? 0 : 10),
      minPlayTime: clampInt(record.minPlayTime, collectionType === "RPG" ? 0 : 30),
      maxPlayTime: clampInt(record.maxPlayTime, collectionType === "RPG" ? 0 : 60),
      difficulty: parseEnum(record.difficulty, DIFFICULTIES, "MEDIUM"),
      type: parseEnum(record.type, GAME_TYPES, "BOARD"),
      yearPublished:
        record.yearPublished != null && Number.isFinite(Number(record.yearPublished))
          ? Number(record.yearPublished)
          : null,
      coverImageUrl: record.coverImageUrl?.trim() || null,
      coverImageSource: record.coverImageSource?.trim() || null,
      instructionUrl: record.instructionUrl?.trim() || null,
      isActive: record.isActive ?? true,
      isFeatured: record.isFeatured ?? false,
      publisherId: dryRun ? null : await ensureNamedEntity(prisma, "publisher", record.publisher),
      designerId: dryRun ? null : await ensureNamedEntity(prisma, "designer", record.designer),
    };

    if (dryRun) {
      if (existing) stats.updated += 1;
      else stats.created += 1;
      if (record.copies?.length) {
        stats.copiesCreated += record.copies.filter((c) => c.inventoryNumber?.trim()).length;
      }
      continue;
    }

    let gameId: string;
    if (existing) {
      const { slug: _importSlug, ...updateFields } = gameData;
      await prisma.game.update({
        where: { id: existing.id },
        data: {
          ...updateFields,
          ean: ean ?? undefined,
        },
      });
      gameId = existing.id;
      stats.updated += 1;
    } else {
      const created = await prisma.game.create({ data: gameData });
      gameId = created.id;
      stats.created += 1;
    }

    const categoryIds = await ensureCategoryIds(prisma, record.categories);
    const tagIds = await ensureTagIds(prisma, record.tags);
    await syncGameRelations(prisma, gameId, categoryIds, tagIds);
    await upsertCopies(prisma, gameId, record.copies, false, stats);
  }

  return stats;
}

export function formatGamesImportReport(stats: ImportGamesJsonStats): string {
  const lines = [
    stats.dryRun ? "=== DRY RUN games.json (bez zapisu) ===" : "=== IMPORT games.json ===",
    `Plik: ${stats.filePath}`,
    `Odczytano gier: ${stats.read}`,
    `Dodano: ${stats.created}`,
    `Zaktualizowano: ${stats.updated}`,
    `Pominięto: ${stats.skipped}`,
    `Egzemplarze — nowe: ${stats.copiesCreated}, zaktualizowane: ${stats.copiesUpdated}`,
  ];
  if (stats.issues.length > 0) {
    lines.push("", "Problemy:");
    for (const issue of stats.issues) lines.push(`  - ${issue}`);
  }
  return lines.join("\n");
}
