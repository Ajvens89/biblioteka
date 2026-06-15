import { existsSync } from "node:fs";
import path from "node:path";
import slugify from "slugify";
import { readCsvBuffer } from "@/lib/csv-source";
import { validateCoverImageUrl } from "./image-utils";
import { scoreTitleMatch } from "./upcitemdb-provider";

export type RebelImageIndex = {
  byProductId: Map<string, string[]>;
  byEan: Map<string, string[]>;
  productFilenames: Map<string, string>;
};

const DEFAULT_PATHS = [
  "./data/rebel-images.csv",
  "./images.csv",
  "../images.csv",
];

const SKIP_URL_MARKERS = [
  "-t.",
  "_t.",
  "-w1",
  "-w2",
  "-w3",
  "_w.",
  "zawartosc",
  "wizualizacja",
  "lifestyle",
  "spis_tresci",
  "spis-tresci",
  "rodzina",
  "mlodziez",
  "/back",
  "-tyl",
  "_tyl",
  ".gif",
];

const PREFER_URL_MARKERS = [
  "pudelko",
  "box3d",
  "box-3d",
  "gra-planszowa",
  "okladka",
  "-gra.",
  "_gra.",
  "gra.jpg",
  "gra.png",
];

let cachedIndex: RebelImageIndex | null = null;
let cachedPath: string | null = null;

export function resolveRebelImagesCsvPath(extraPaths: string[] = []): string | null {
  const env = process.env.REBEL_IMAGES_CSV?.trim();
  if (env) {
    const resolved = path.resolve(env);
    if (existsSync(resolved)) return resolved;
  }
  for (const p of [...extraPaths, ...DEFAULT_PATHS]) {
    const resolved = path.resolve(p);
    if (existsSync(resolved)) return resolved;
  }
  return null;
}

export function isRebelImagesEnabled(): boolean {
  const flag = process.env.REBEL_IMAGES?.trim().toLowerCase();
  if (flag === "false" || flag === "0" || flag === "off") return false;
  if (process.env.REBEL_IMAGES_CSV_URL?.trim()) return true;
  return resolveRebelImagesCsvPath() !== null;
}

/** Parsuje linię CSV: IDProduct,ImageURL (ImageURL może być w cudzysłowie). */
export function parseRebelImagesCsvLine(line: string): { productId: string; imageUrl: string } | null {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("IDProduct")) return null;

  const comma = trimmed.indexOf(",");
  if (comma <= 0) return null;

  const productId = trimmed.slice(0, comma).trim();
  let imageUrl = trimmed.slice(comma + 1).trim();
  if (imageUrl.startsWith('"') && imageUrl.endsWith('"')) {
    imageUrl = imageUrl.slice(1, -1).replace(/""/g, '"');
  }
  if (!productId || !imageUrl.startsWith("http")) return null;
  return { productId, imageUrl };
}

export function extractEansFromUrl(url: string): string[] {
  const found = new Set<string>();
  const digitsOnly = url.replace(/\D/g, "");
  for (let i = 0; i + 13 <= digitsOnly.length; i += 1) {
    found.add(digitsOnly.slice(i, i + 13));
  }
  for (const match of url.matchAll(/\d{2,3}-\d{5,7}-\d{1,2}-\d/g)) {
    const digits = match[0].replace(/\D/g, "");
    if (digits.length >= 10) found.add(digits);
  }
  return [...found];
}

export function scoreRebelImageUrl(url: string): number {
  const lower = url.toLowerCase();
  let score = 50;
  for (const marker of PREFER_URL_MARKERS) {
    if (lower.includes(marker)) score += 12;
  }
  for (const marker of SKIP_URL_MARKERS) {
    if (lower.includes(marker)) score -= 22;
  }
  if (/\.(jpe?g|png|webp)(\?|$)/i.test(lower)) score += 8;
  return score;
}

export function pickBestRebelImageUrl(urls: string[]): string | null {
  let best: string | null = null;
  let bestScore = Number.NEGATIVE_INFINITY;
  for (const raw of urls) {
    const safe = validateCoverImageUrl(raw);
    if (!safe) continue;
    const score = scoreRebelImageUrl(safe);
    if (score > bestScore) {
      best = safe;
      bestScore = score;
    }
  }
  return best;
}

function normalizeForMatch(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function titleTokens(title: string): string[] {
  return normalizeForMatch(title)
    .split(/\s+/)
    .filter((t) => t.length >= 3);
}

function slugInFilenames(filenames: string, slug: string): boolean {
  const segments = filenames.toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);
  const tokens = slug.split(/\s+/).filter((t) => t.length >= 3);

  if (tokens.length >= 2) {
    return tokens.every((token) => segments.some((s) => s === token || s.includes(token)));
  }

  const compactSlug = slug.replace(/\s/g, "");
  if (compactSlug.length < 3) return false;
  if (compactSlug.length <= 4) {
    return segments.some((s) => s === compactSlug);
  }
  return segments.some((s) => s.includes(compactSlug));
}

export function buildRebelImageIndex(csvContent: string): RebelImageIndex {
  const byProductId = new Map<string, string[]>();
  const byEan = new Map<string, string[]>();
  const productFilenames = new Map<string, string>();

  for (const line of csvContent.split(/\r?\n/)) {
    const row = parseRebelImagesCsvLine(line);
    if (!row) continue;

    const list = byProductId.get(row.productId) ?? [];
    list.push(row.imageUrl);
    byProductId.set(row.productId, list);

    const basename = path.basename(row.imageUrl).toLowerCase();
    const prev = productFilenames.get(row.productId) ?? "";
    productFilenames.set(row.productId, `${prev} ${basename}`);

    for (const ean of extractEansFromUrl(row.imageUrl)) {
      const ids = byEan.get(ean) ?? [];
      if (!ids.includes(row.productId)) ids.push(row.productId);
      byEan.set(ean, ids);
    }
  }

  return { byProductId, byEan, productFilenames };
}

export function findRebelProductIdByTitle(title: string, index: RebelImageIndex): string | null {
  const tokens = titleTokens(title);
  if (!tokens.length) return null;

  const slug = normalizeForMatch(
    slugify(title, { lower: true, strict: true, locale: "pl" }).replace(/-/g, " "),
  );

  let bestId: string | null = null;
  let bestScore = 0;

  for (const [productId, filenames] of index.productFilenames) {
    if (!slugInFilenames(filenames, slug)) continue;

    const hay = filenames.replace(/[^a-z0-9]+/g, " ");
    const compactSlug = slug.replace(/\s/g, "");

    let matched = 0;
    for (const token of tokens) {
      if (hay.includes(token)) matched += 1;
    }
    let score = (matched / tokens.length) * 70;
    if (compactSlug.length >= 4) score += 35;

    const basename = filenames.split(" ").pop() ?? "";
    score = Math.max(
      score,
      scoreTitleMatch(title, basename.replace(/\.[a-z0-9]+$/i, "").replace(/-/g, " ")),
    );

    if (score > bestScore && score >= 52) {
      bestScore = score;
      bestId = productId;
    }
  }

  return bestId;
}

export function findRebelProductIdByEan(ean: string, index: RebelImageIndex): string | null {
  const digits = ean.replace(/\D/g, "");
  if (!digits) return null;

  const fromIndex = index.byEan.get(digits);
  if (fromIndex?.[0]) return fromIndex[0];

  for (const [productId, urls] of index.byProductId) {
    if (urls.some((url) => url.replace(/\D/g, "").includes(digits))) {
      return productId;
    }
  }
  return null;
}

export async function loadRebelImageIndex(): Promise<RebelImageIndex | null> {
  const csvPath = resolveRebelImagesCsvPath();
  const cacheKey = `${process.env.REBEL_IMAGES_CSV_URL ?? ""}|${csvPath ?? ""}`;
  if (cachedIndex && cachedPath === cacheKey) return cachedIndex;

  const buffer = await readCsvBuffer(
    csvPath && existsSync(csvPath) ? csvPath : null,
    process.env.REBEL_IMAGES_CSV_URL,
  );
  if (!buffer) return null;

  const content = buffer.toString("utf8");
  cachedIndex = buildRebelImageIndex(content);
  cachedPath = cacheKey;
  return cachedIndex;
}

export async function lookupRebelCoverUrl(
  title: string,
  ean?: string | null,
  rebelProductId?: string | null,
): Promise<{ coverUrl: string; productId: string } | null> {
  const index = await loadRebelImageIndex();
  if (!index) return null;

  let productId = rebelProductId?.trim() || null;
  const normalizedEan = ean?.replace(/\D/g, "") ?? "";

  if (!productId && normalizedEan.length >= 8) {
    productId = findRebelProductIdByEan(normalizedEan, index);
  }
  if (!productId && !normalizedEan) {
    productId = findRebelProductIdByTitle(title.trim(), index);
  }
  if (!productId) return null;

  const urls = index.byProductId.get(productId);
  if (!urls?.length) return null;

  const coverUrl = pickBestRebelImageUrl(urls);
  if (!coverUrl) return null;

  return { coverUrl, productId };
}
