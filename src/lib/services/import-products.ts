import type { CopyStatus, GameCollectionType, PrismaClient } from "@prisma/client";
import { copyFile, mkdir, readFile, stat } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import slugify from "slugify";
import { buildEan13, normalizeEan } from "@/lib/services/ean";
import { fetchCoverForGame } from "@/lib/services/cover-fetch";
import { validateCoverImageUrl } from "@/lib/services/ean-providers/image-utils";

export type ProductRecord = {
  name?: string;
  description?: string;
  author?: string;
  image?: string;
  thumbnail?: string;
  stock_count?: number;
  on_stock?: number;
  barcode?: string;
};

export type ProductsFile = {
  collection?: ProductRecord[];
  result?: string;
};

export type ImportProductsStats = {
  filePath: string;
  dryRun: boolean;
  read: number;
  created: number;
  updated: number;
  skipped: number;
  copiesAdded: number;
  invalidEan: number;
  coversResolved: number;
  coversMissing: number;
  coversFetchedRemote: number;
  issues: string[];
};

const DEFAULT_PATHS = ["./products.json", "./data/products.json", "./public/products.json"];
/** Numer inwentarzowy egzemplarza z importu products.json */
const IMPORT_INVENTORY_PREFIX = "ZF-EGZ-IMP";

export function isValidBarcodeLength(digits: string): boolean {
  return [8, 12, 13, 14].includes(digits.length);
}

/** Cyfry z barcode; 12→EAN-13, 14 z zerem wiodącym→13; inaczej normalizeEan gdy możliwe. */
export function normalizeProductBarcode(raw: string | undefined | null): string | null {
  if (!raw?.trim()) return null;
  const digits = raw.replace(/\D/g, "");
  if (!digits || !isValidBarcodeLength(digits)) return null;

  try {
    if (digits.length === 12) return buildEan13(digits);
    if (digits.length === 14 && digits.startsWith("0")) return normalizeEan(digits.slice(1));
    if (digits.length === 13 || digits.length === 8) return normalizeEan(digits);
    return digits;
  } catch {
    if (digits.length === 13 || digits.length === 8) return digits;
    return null;
  }
}

export function resolveProductsFilePath(argv: string[]): string | null {
  const pathArg = argv.find((a) => {
    if (a.startsWith("-")) return false;
    if (!a.toLowerCase().endsWith(".json")) return false;
    const resolved = path.resolve(a);
    return existsSync(resolved);
  });
  if (pathArg) {
    return path.resolve(pathArg);
  }
  for (const p of DEFAULT_PATHS) {
    const resolved = path.resolve(p);
    if (existsSync(resolved)) return resolved;
  }
  return null;
}

export function parseProductsJson(content: string): ProductsFile {
  const trimmed = content.trim();
  if (!trimmed) {
    throw new Error(
      "Plik JSON jest pusty. Otwórz products.json w Notatniku → Ctrl+A → Ctrl+C → wklej w sekcji „Wklej products.json”.",
    );
  }
  let data: ProductsFile;
  try {
    data = JSON.parse(trimmed) as ProductsFile;
  } catch (e) {
    const detail = e instanceof Error ? e.message : "błąd składni";
    throw new Error(
      `Niepoprawny JSON (${detail}). Plik mógł się nie skopiować (OneDrive) — użyj wklejania z Notatnika.`,
    );
  }
  if (!Array.isArray(data.collection)) {
    throw new Error("Plik products.json musi zawierać tablicę „collection”.");
  }
  if (data.collection.length === 0) {
    throw new Error("Tablica „collection” jest pusta — brak produktów do importu.");
  }
  return data;
}

export async function loadProductsFile(filePath: string): Promise<{ data: ProductsFile; baseDir: string }> {
  const resolved = path.resolve(filePath);
  const info = await stat(resolved);
  if (info.size === 0) {
    throw new Error(
      `Plik ${resolved} ma 0 bajtów (pusty). Przeciągnij ponownie z pulpitu lub wklej JSON w sekcji powyżej.`,
    );
  }
  const content = await readFile(resolved, "utf8");
  const data = parseProductsJson(content);
  return { data, baseDir: path.dirname(resolved) };
}

const PUBLIC_DIR = path.resolve("public");
const PUBLIC_COVERS_DIR = path.join(PUBLIC_DIR, "covers");

/** Katalogi, w których szukamy plików okładek obok products.json. */
export function getCoverSearchDirs(baseDir: string): string[] {
  const dirs = [path.resolve(baseDir), PUBLIC_DIR, path.resolve("data"), path.resolve(".")];
  for (const candidate of ["./products.json", "../products.json", path.join("..", "products.json")]) {
    const resolved = path.resolve(candidate);
    if (existsSync(resolved)) {
      dirs.push(path.dirname(resolved));
    }
  }
  return [...new Set(dirs)];
}

export function publicCoverPath(coverUrl: string): string {
  return path.join(PUBLIC_DIR, coverUrl.replace(/^\//, "").replace(/\//g, path.sep));
}

export function isPublicCoverAvailable(coverUrl: string | null | undefined): boolean {
  if (!coverUrl?.trim()) return false;
  const trimmed = coverUrl.trim();
  if (/^https?:\/\//i.test(trimmed)) return true;
  if (!trimmed.startsWith("/")) return false;
  return existsSync(publicCoverPath(trimmed));
}

function findCoverSourceFile(
  imagePath: string,
  baseDir: string,
  searchDirs = getCoverSearchDirs(baseDir),
): string | null {
  const raw = imagePath.trim();
  const fileName = path.basename(raw.replace(/^\//, ""));
  const candidates: string[] = [];

  if (raw.startsWith("/")) {
    candidates.push(publicCoverPath(raw));
    candidates.push(path.resolve(baseDir, raw.replace(/^\//, "")));
  } else {
    candidates.push(path.resolve(baseDir, raw));
    candidates.push(path.join(PUBLIC_DIR, raw));
  }

  for (const dir of searchDirs) {
    candidates.push(path.join(dir, raw.replace(/^\//, "")));
    candidates.push(path.join(dir, "covers", fileName));
  }

  for (const candidate of candidates) {
    if (existsSync(candidate)) return candidate;
  }
  return null;
}

/**
 * Zwraca publiczny URL okładki tylko gdy plik istnieje lub można go skopiować do public/covers.
 * Nie zapisuje „martwych” ścieżek /covers/… bez pliku na dysku.
 */
export async function ensureProductCover(
  imagePath: string | undefined,
  baseDir: string,
): Promise<string | null> {
  const raw = imagePath?.trim();
  if (!raw) return null;

  if (/^https?:\/\//i.test(raw)) {
    return validateCoverImageUrl(raw);
  }

  if (raw.startsWith("/") && isPublicCoverAvailable(raw)) {
    return raw;
  }

  const source = findCoverSourceFile(raw, baseDir);
  if (!source) return null;

  const relToPublic = path.relative(PUBLIC_DIR, source);
  if (!relToPublic.startsWith("..") && !path.isAbsolute(relToPublic)) {
    return `/${relToPublic.replace(/\\/g, "/")}`;
  }

  const fileName = path.basename(source);
  await mkdir(PUBLIC_COVERS_DIR, { recursive: true });
  const dest = path.join(PUBLIC_COVERS_DIR, fileName);
  if (!existsSync(dest)) {
    await copyFile(source, dest);
  }
  return `/covers/${fileName}`;
}

/** @deprecated Użyj ensureProductCover — synchroniczna wersja tylko do testów. */
export function resolveCoverUrl(
  imagePath: string | undefined,
  baseDir: string,
): string | null {
  const raw = imagePath?.trim();
  if (!raw) return null;
  if (/^https?:\/\//i.test(raw)) return validateCoverImageUrl(raw);
  if (raw.startsWith("/") && isPublicCoverAvailable(raw)) return raw;

  const source = findCoverSourceFile(raw, baseDir);
  if (!source) return null;

  const relToPublic = path.relative(PUBLIC_DIR, source);
  if (!relToPublic.startsWith("..") && !path.isAbsolute(relToPublic)) {
    return `/${relToPublic.replace(/\\/g, "/")}`;
  }

  const fileName = path.basename(source);
  const dest = path.join(PUBLIC_COVERS_DIR, fileName);
  return existsSync(dest) ? `/covers/${fileName}` : null;
}

function makeSlug(title: string) {
  return slugify(title, { lower: true, strict: true, locale: "pl" });
}

async function uniqueSlug(prisma: PrismaClient, title: string, ean: string | null): Promise<string> {
  let base = makeSlug(title);
  if (!base) base = "gra";
  let candidate = base;
  let n = 0;
  while (true) {
    const existing = await prisma.game.findFirst({
      where: { slug: candidate, deletedAt: null },
      select: { id: true, ean: true, title: true },
    });
    if (!existing) return candidate;
    if (ean && existing.ean === ean) return candidate;
    if (existing.title.trim().toLowerCase() === title.trim().toLowerCase()) return candidate;
    n += 1;
    candidate = `${base}-${n}`;
  }
}

export async function findExistingGameByBarcodeOrTitle(
  prisma: PrismaClient,
  ean: string | null,
  title: string,
) {
  if (ean) {
    const byEan = await prisma.game.findFirst({
      where: { ean, deletedAt: null },
      include: { copies: true },
    });
    if (byEan) return byEan;
  }

  const slug = makeSlug(title);
  const bySlug = await prisma.game.findFirst({
    where: { slug, deletedAt: null },
    include: { copies: true },
  });
  if (bySlug) return bySlug;

  return prisma.game.findFirst({
    where: {
      deletedAt: null,
      title: { equals: title.trim(), mode: "insensitive" },
    },
    include: { copies: true },
  });
}

async function ensurePublisher(prisma: PrismaClient, author: string | undefined) {
  const name = author?.trim();
  if (!name) return null;
  const slug = makeSlug(name) || "wydawca";
  const pub = await prisma.publisher.upsert({
    where: { slug },
    create: { name, slug },
    update: {},
  });
  return pub.id;
}

type PickedCover = {
  url: string | null;
  source: string | null;
  fromRemote: boolean;
};

function shouldFetchCoversOnImport(): boolean {
  const flag = process.env.IMPORT_FETCH_COVERS?.trim().toLowerCase();
  return flag === "1" || flag === "true" || flag === "yes";
}

async function pickCover(product: ProductRecord, baseDir: string): Promise<PickedCover> {
  const local =
    (await ensureProductCover(product.image, baseDir)) ??
    (await ensureProductCover(product.thumbnail, baseDir));
  if (local) {
    return { url: local, source: "products_import", fromRemote: false };
  }

  if (!shouldFetchCoversOnImport()) {
    return { url: null, source: null, fromRemote: false };
  }

  const title = product.name?.trim();
  if (!title) return { url: null, source: null, fromRemote: false };

  const fetched = await fetchCoverForGame({
    title,
    ean: normalizeProductBarcode(product.barcode),
    collectionType: "BOARD_GAME",
  });

  return {
    url: fetched.coverImageUrl,
    source: fetched.coverImageSource,
    fromRemote: Boolean(fetched.coverImageUrl),
  };
}

function clampInt(value: unknown, fallback: number, min = 0, max = 999): number {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, Math.floor(n)));
}

async function nextImportInventoryNumbers(
  prisma: PrismaClient,
  count: number,
): Promise<string[]> {
  const prefix = `${IMPORT_INVENTORY_PREFIX}-`;
  const existing = await prisma.gameCopy.findMany({
    where: { inventoryNumber: { startsWith: prefix } },
    select: { inventoryNumber: true },
  });
  let maxSeq = 0;
  for (const row of existing) {
    const m = row.inventoryNumber.match(/ZF-EGZ-IMP-(\d+)$/);
    if (m) maxSeq = Math.max(maxSeq, parseInt(m[1], 10));
  }
  const out: string[] = [];
  for (let i = 1; i <= count; i++) {
    out.push(`${prefix}${String(maxSeq + i).padStart(6, "0")}`);
  }
  return out;
}

/**
 * Dodaje brakujące egzemplarze do stock_count.
 * on_stock < stock_count: nadmiarowe nowe egzemplarze jako RETIRED (poza stanem).
 * Model nie ma osobnego „niedostępny na półce” — tylko statusy CopyStatus.
 */
export async function ensureCopiesForGame(
  prisma: PrismaClient,
  gameId: string,
  stockCount: number,
  onStock: number,
  dryRun: boolean,
): Promise<number> {
  const target = clampInt(stockCount, 1, 0, 500);
  const availableTarget = clampInt(onStock, target, 0, target);

  const game = await prisma.game.findUnique({
    where: { id: gameId },
    include: { copies: true },
  });
  if (!game) return 0;

  const current = game.copies.length;
  if (current >= target) return 0;

  const toAdd = target - current;
  const currentAvailable = game.copies.filter((c) => c.status === "AVAILABLE").length;
  let availableSlots = Math.max(0, availableTarget - currentAvailable);

  const inventoryNumbers = await nextImportInventoryNumbers(prisma, toAdd);

  if (dryRun) return toAdd;

  let added = 0;
  for (let i = 0; i < toAdd; i++) {
    const status: CopyStatus = availableSlots > 0 ? "AVAILABLE" : "RETIRED";
    if (availableSlots > 0) availableSlots -= 1;

    await prisma.gameCopy.create({
      data: {
        gameId,
        inventoryNumber: inventoryNumbers[i],
        barcode: null,
        status,
        condition: "GOOD",
        notes:
          status === "RETIRED"
            ? "Import products.json — poza stanem on_stock (egzemplarz w bibliotece, niewypożyczalny)."
            : "Import products.json",
      },
    });
    added += 1;
  }
  return added;
}

export type UpsertProductResult =
  | {
      action: "created" | "updated";
      gameId: string;
      copiesAdded: number;
      hadCoverPath: boolean;
      coverResolved: boolean;
      coverFromRemote: boolean;
    }
  | { action: "skipped"; reason: string };

export async function upsertGameFromProduct(
  prisma: PrismaClient,
  product: ProductRecord,
  baseDir: string,
  dryRun: boolean,
  dbAvailable = true,
): Promise<UpsertProductResult> {
  const title = product.name?.trim();
  if (!title) return { action: "skipped", reason: "Brak nazwy (name)" };

  const hadCoverPath = Boolean(product.image?.trim() || product.thumbnail?.trim());

  const ean = normalizeProductBarcode(product.barcode);
  const invalidBarcode = Boolean(product.barcode?.trim()) && !ean;
  const stockCount = clampInt(product.stock_count, 1);
  const onStock = clampInt(product.on_stock, stockCount);

  if (dryRun && !dbAvailable) {
    if (invalidBarcode) {
      return { action: "skipped", reason: `Niepoprawny barcode (dry-run bez DB): ${title}` };
    }
    const dryCover = await pickCover(product, baseDir);
    return {
      action: "created",
      gameId: "dry-run",
      copiesAdded: stockCount,
      hadCoverPath,
      coverResolved: Boolean(dryCover.url),
      coverFromRemote: dryCover.fromRemote,
    };
  }

  if (invalidBarcode) {
    const existing = await findExistingGameByBarcodeOrTitle(prisma, null, title);
    if (!existing) {
      return { action: "skipped", reason: `Niepoprawny barcode i brak unikalnej gry po tytule: ${title}` };
    }
  }

  const existing = await findExistingGameByBarcodeOrTitle(prisma, ean, title);
  const cover = await pickCover(product, baseDir);
  const description = product.description?.trim() || null;
  const publisherId = dryRun ? null : await ensurePublisher(prisma, product.author);

  const collectionType: GameCollectionType = "BOARD_GAME";

  if (existing) {
    const updateData = {
      title,
      collectionType,
      description: description ?? undefined,
      coverImageUrl: cover.url ?? undefined,
      coverImageSource: cover.source ?? undefined,
      publisherId: publisherId ?? undefined,
      ean: ean && !existing.ean ? ean : undefined,
      isActive: true,
    };

    if (!dryRun) {
      await prisma.game.update({
        where: { id: existing.id },
        data: {
          title: updateData.title,
          collectionType: updateData.collectionType,
          ...(updateData.description ? { description: updateData.description } : {}),
          ...(updateData.coverImageUrl
            ? {
                coverImageUrl: updateData.coverImageUrl,
                coverImageSource: updateData.coverImageSource ?? "products_import",
              }
            : existing.coverImageUrl && !isPublicCoverAvailable(existing.coverImageUrl)
              ? { coverImageUrl: null, coverImageSource: null }
              : {}),
          ...(updateData.publisherId ? { publisherId: updateData.publisherId } : {}),
          ...(updateData.ean ? { ean: updateData.ean } : {}),
          isActive: true,
        },
      });
    }

    const copiesAdded = await ensureCopiesForGame(
      prisma,
      existing.id,
      stockCount,
      onStock,
      dryRun,
    );
    return {
      action: "updated",
      gameId: existing.id,
      copiesAdded,
      hadCoverPath,
      coverResolved: Boolean(cover.url),
      coverFromRemote: cover.fromRemote,
    };
  }

  if (invalidBarcode && !ean) {
    return { action: "skipped", reason: `Niepoprawny barcode, gra nie istnieje: ${title}` };
  }

  const slug = await uniqueSlug(prisma, title, ean);

  if (dryRun) {
    const wouldAdd = Math.max(0, stockCount);
    return {
      action: "created",
      gameId: "dry-run",
      copiesAdded: wouldAdd,
      hadCoverPath,
      coverResolved: Boolean(cover.url),
      coverFromRemote: cover.fromRemote,
    };
  }

  const created = await prisma.game.create({
    data: {
      title,
      slug,
      ean,
      collectionType,
      type: "BOARD",
      difficulty: "MEDIUM",
      description,
      coverImageUrl: cover.url,
      coverImageSource: cover.source,
      publisherId,
      minPlayers: 2,
      maxPlayers: 4,
      minAge: 8,
      minPlayTime: 30,
      maxPlayTime: 60,
      isActive: true,
    },
  });

  const copiesAdded = await ensureCopiesForGame(
    prisma,
    created.id,
    stockCount,
    onStock,
    false,
  );

  return {
    action: "created",
    gameId: created.id,
    copiesAdded,
    hadCoverPath,
    coverResolved: Boolean(cover.url),
    coverFromRemote: cover.fromRemote,
  };
}

async function runProductsImport(
  prisma: PrismaClient,
  data: ProductsFile,
  baseDir: string,
  label: string,
  options?: { dryRun?: boolean; dbAvailable?: boolean },
): Promise<ImportProductsStats> {
  const dryRun = options?.dryRun ?? false;
  let dbAvailable = options?.dbAvailable ?? true;
  if (dryRun && options?.dbAvailable === undefined) {
    try {
      await prisma.$queryRaw`SELECT 1`;
    } catch {
      dbAvailable = false;
    }
  }
  const stats: ImportProductsStats = {
    filePath: label,
    dryRun,
    read: data.collection!.length,
    created: 0,
    updated: 0,
    skipped: 0,
    copiesAdded: 0,
    invalidEan: 0,
    coversResolved: 0,
    coversMissing: 0,
    coversFetchedRemote: 0,
    issues: [],
  };

  for (const product of data.collection!) {
    const title = product.name?.trim() ?? "";
    const digits = product.barcode?.replace(/\D/g, "") ?? "";
    if (product.barcode?.trim() && (!digits || !normalizeProductBarcode(product.barcode))) {
      stats.invalidEan += 1;
      if (stats.issues.length < 10) {
        stats.issues.push(`Niepoprawny EAN/barcode: ${product.barcode} (${title || "bez nazwy"})`);
      }
    }

    try {
      const result = await upsertGameFromProduct(prisma, product, baseDir, dryRun, dbAvailable);
      if (result.action === "skipped") {
        stats.skipped += 1;
        if (stats.issues.length < 10) stats.issues.push(result.reason);
      } else if (result.action === "created") {
        stats.created += 1;
        stats.copiesAdded += result.copiesAdded;
        if (result.hadCoverPath) {
          if (result.coverResolved) stats.coversResolved += 1;
          else stats.coversMissing += 1;
        }
        if (result.coverFromRemote) stats.coversFetchedRemote += 1;
      } else {
        stats.updated += 1;
        stats.copiesAdded += result.copiesAdded;
        if (result.hadCoverPath) {
          if (result.coverResolved) stats.coversResolved += 1;
          else stats.coversMissing += 1;
        }
        if (result.coverFromRemote) stats.coversFetchedRemote += 1;
      }
    } catch (e) {
      stats.skipped += 1;
      const msg = e instanceof Error ? e.message : String(e);
      if (stats.issues.length < 10) stats.issues.push(`${title || "?"}: ${msg}`);
    }
  }

  return stats;
}

export async function importProductsFromFile(
  prisma: PrismaClient,
  filePath: string,
  options?: { dryRun?: boolean; dbAvailable?: boolean },
): Promise<ImportProductsStats> {
  const { data, baseDir } = await loadProductsFile(filePath);
  return runProductsImport(prisma, data, baseDir, filePath, options);
}

/** Import z wklejonego tekstu JSON (bez wyboru pliku w przeglądarce). */
export async function importProductsFromContent(
  prisma: PrismaClient,
  content: string,
  options?: { dryRun?: boolean; dbAvailable?: boolean },
): Promise<ImportProductsStats> {
  const trimmed = content.trim();
  if (!trimmed) {
    throw new Error("Wklej zawartość pliku products.json.");
  }
  const data = parseProductsJson(trimmed);
  const baseDir = path.resolve("./data");
  return runProductsImport(prisma, data, baseDir, "(wklejony JSON)", options);
}

export function formatImportReport(stats: ImportProductsStats): string {
  const lines = [
    stats.dryRun ? "=== DRY RUN (bez zapisu do bazy) ===" : "=== IMPORT products.json ===",
    stats.dryRun && stats.read > 0 && stats.created + stats.updated === 0 && stats.skipped === stats.read
      ? "(dry-run bez połączenia z DB — symulacja „utworzono” dla poprawnych rekordów)"
      : "",
    `Plik: ${stats.filePath}`,
    `Odczytano rekordów: ${stats.read}`,
    `Dodano gier: ${stats.created}`,
    `Zaktualizowano gier: ${stats.updated}`,
    `Pominięto: ${stats.skipped}`,
    `Dodano egzemplarzy: ${stats.copiesAdded}`,
    `Rekordów z błędnym EAN/barcode: ${stats.invalidEan}`,
    `Okładki lokalne (plik): ${stats.coversResolved}`,
    `Okładki pobrane z internetu: ${stats.coversFetchedRemote}`,
    `Okładki w JSON bez pliku na dysku: ${stats.coversMissing}`,
  ];
  if (stats.coversMissing > 0) {
    lines.push(
      "",
      "Brak plików okładek? Skopiuj folder covers (data/covers/)",
      "lub: npm run backfill:covers (wymaga BGG_TOKEN w .env)",
      "lub ustaw IMPORT_FETCH_COVERS=true przy imporcie.",
    );
  }
  if (stats.issues.length > 0) {
    lines.push("", "Pierwsze problemy:");
    for (const issue of stats.issues) lines.push(`  - ${issue}`);
  }
  return lines.filter(Boolean).join("\n");
}
