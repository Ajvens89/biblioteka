import type { GameCollectionType } from "@prisma/client";
import { parseCollectionType } from "@/lib/services/collection-type";
import { scoreTitleMatch } from "@/lib/services/ean-providers/upcitemdb-provider";

/** Pola katalogowe z hurt.csv — bez danych handlowych. */
export type HurtCatalogProduct = {
  idProduct: string;
  productName: string;
  description: string;
  fullDescription: string;
  ean: string;
  imageUrl: string;
  thumbnailUrl: string;
  category: string;
  label: string;
  publisher: string;
  minAge: number | null;
  minPlayingTime: number | null;
  maxPlayingTime: number | null;
  minPlayers: number | null;
  maxPlayers: number | null;
  language: string;
  manufacturerInfo: string;
  safetyWarning: string;
  releaseDate: string;
};

export type HurtGameData = {
  title: string;
  shortDescription: string | null;
  description: string | null;
  ean: string | null;
  publisherName: string | null;
  categoryName: string | null;
  minAge: number | null;
  minPlayers: number | null;
  maxPlayers: number | null;
  minPlayTime: number | null;
  maxPlayTime: number | null;
  yearPublished: number | null;
  imageUrl: string | null;
  thumbnailUrl: string | null;
  collectionType: GameCollectionType;
  language: string | null;
  manufacturerInfo: string | null;
  safetyWarning: string | null;
  idProduct: string;
};

export type HurtCatalog = {
  filePath: string;
  products: HurtCatalogProduct[];
  byEan: Map<string, HurtCatalogProduct>;
  byIdProduct: Map<string, HurtCatalogProduct>;
};

const COMMERCIAL_FIELDS = new Set([
  "price",
  "trade",
  "vat",
  "instock",
  "idavailable",
  "productcode",
  "packaging",
  "palette",
  "countryorigin",
  "cn",
  "weight",
]);

const TITLE_MATCH_MIN_SCORE = 68;
export const TITLE_CONFLICT_MAX_SCORE = 48;

/** EAN jako same cyfry (tekst). Nie konwertuj na liczbę. */
export function normalizeEan(raw: string): string {
  return raw.trim().replace(/\D/g, "");
}

/** EAN do zapisu w bazie — zachowuje wiodące zero (12→13 cyfr). */
export function canonicalHurtEan(raw: string): string {
  const digits = normalizeEan(raw);
  if (!digits) return "";
  if (digits.length === 12) return `0${digits}`;
  return digits;
}

/** Warianty EAN do dopasowania (12↔13 z zerem wiodącym). */
export function hurtEanLookupKeys(raw: string): string[] {
  const digits = normalizeEan(raw);
  if (!digits) return [];
  const keys = new Set<string>([digits]);
  if (digits.length === 12) keys.add(`0${digits}`);
  if (digits.length === 13 && digits.startsWith("0")) keys.add(digits.slice(1));
  if (digits.length < 13) keys.add(digits.padStart(13, "0"));
  return [...keys];
}

export function normalizeHurtTitle(title: string): string {
  return title
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Prosty parser CSV (RFC 4180) z obsługą cudzysłowów. */
export function parseCsvRecords(content: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < content.length; i += 1) {
    const ch = content[i];
    if (inQuotes) {
      if (ch === '"') {
        if (content[i + 1] === '"') {
          field += '"';
          i += 1;
        } else {
          inQuotes = false;
        }
      } else {
        field += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ",") {
      row.push(field);
      field = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && content[i + 1] === "\n") i += 1;
      row.push(field);
      field = "";
      if (row.some((cell) => cell.trim().length > 0)) rows.push(row);
      row = [];
    } else {
      field += ch;
    }
  }

  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  return rows;
}

function parseOptionalInt(raw: string | undefined): number | null {
  const trimmed = raw?.trim();
  if (!trimmed) return null;
  const n = Number.parseInt(trimmed, 10);
  return Number.isFinite(n) ? n : null;
}

function stripHtml(html: string): string {
  return html
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/\s+/g, " ")
    .trim();
}

function parseReleaseYear(releaseDate: string): number | null {
  const trimmed = releaseDate.trim();
  if (!trimmed) return null;
  const match = trimmed.match(/\b(19|20)\d{2}\b/);
  return match ? Number.parseInt(match[0], 10) : null;
}

function inferCollectionType(category: string, label: string): GameCollectionType {
  const combined = `${category} ${label}`.toLowerCase();
  if (combined.includes("rpg") || combined.includes("fabular")) return "RPG";
  try {
    return parseCollectionType(category);
  } catch {
    return "BOARD_GAME";
  }
}

function rowToProduct(header: string[], values: string[]): HurtCatalogProduct | null {
  const index = new Map(header.map((name, i) => [name.trim().toLowerCase(), i]));
  const get = (key: string) => values[index.get(key) ?? -1]?.trim() ?? "";

  const eanRaw = get("ean").trim();
  const productName = get("productname");
  if (!productName) return null;

  const ean = eanRaw ? eanRaw.replace(/[\s-]/g, "") : "";

  return {
    idProduct: get("idproduct"),
    productName,
    description: stripHtml(get("description")),
    fullDescription: stripHtml(get("fulldescription")),
    ean,
    imageUrl: get("imageurl"),
    thumbnailUrl: get("thumbnail120x160") || get("thumbnail60x100"),
    category: get("category"),
    label: get("label"),
    publisher: get("publisher") || get("label"),
    minAge: parseOptionalInt(get("minage")),
    minPlayingTime: parseOptionalInt(get("minplayingtime")),
    maxPlayingTime: parseOptionalInt(get("maxplayingtime")),
    minPlayers: parseOptionalInt(get("minplayers")),
    maxPlayers: parseOptionalInt(get("maxplayers")),
    language: get("language"),
    manufacturerInfo: stripHtml(get("manufactuerinfo")),
    safetyWarning: stripHtml(get("safetywarning")),
    releaseDate: get("releasedate"),
  };
}

export function buildHurtCatalog(filePath: string, records: string[][]): HurtCatalog {
  if (!records.length) {
    return { filePath, products: [], byEan: new Map(), byIdProduct: new Map() };
  }

  const header = records[0].map((h) => h.trim());
  const products: HurtCatalogProduct[] = [];
  const byEan = new Map<string, HurtCatalogProduct>();
  const byIdProduct = new Map<string, HurtCatalogProduct>();

  for (const row of records.slice(1)) {
    const product = rowToProduct(header, row);
    if (!product) continue;
    products.push(product);
    if (product.idProduct) byIdProduct.set(product.idProduct, product);
    if (product.ean) {
      for (const key of hurtEanLookupKeys(product.ean)) {
        if (!byEan.has(key)) byEan.set(key, product);
      }
    }
  }

  return { filePath, products, byEan, byIdProduct };
}

export function findHurtProductByEan(
  ean: string,
  catalog: HurtCatalog | null | undefined,
): HurtCatalogProduct | null {
  if (!catalog) return null;
  const cat = catalog;
  for (const key of hurtEanLookupKeys(ean)) {
    const hit = cat.byEan.get(key);
    if (hit) return hit;
  }
  return null;
}

export function findHurtProductByTitle(
  title: string,
  catalog: HurtCatalog | null | undefined,
): { product: HurtCatalogProduct; score: number } | null {
  if (!catalog?.products.length) return null;
  const cat = catalog;

  const normalized = normalizeHurtTitle(title);
  if (!normalized) return null;

  let best: HurtCatalogProduct | null = null;
  let bestScore = 0;

  for (const product of cat.products) {
    const score = scoreTitleMatch(title, product.productName);
    const normalizedProduct = normalizeHurtTitle(product.productName);
    if (normalized === normalizedProduct) {
      return { product, score: 100 };
    }
    if (score > bestScore) {
      bestScore = score;
      best = product;
    }
  }

  if (!best || bestScore < TITLE_MATCH_MIN_SCORE) return null;
  return { product: best, score: bestScore };
}

export function mapHurtProductToGameData(product: HurtCatalogProduct): HurtGameData {
  const description =
    product.fullDescription?.trim() || product.description?.trim() || null;
  const shortDescription = product.description?.trim() || null;

  return {
    title: product.productName.trim(),
    shortDescription,
    description,
    ean: product.ean ? canonicalHurtEan(product.ean) : null,
    publisherName: product.publisher?.trim() || product.label?.trim() || null,
    categoryName: product.category?.trim() || null,
    minAge: product.minAge,
    minPlayers: product.minPlayers,
    maxPlayers: product.maxPlayers,
    minPlayTime: product.minPlayingTime,
    maxPlayTime: product.maxPlayingTime,
    yearPublished: parseReleaseYear(product.releaseDate),
    imageUrl: product.imageUrl?.trim() || null,
    thumbnailUrl: product.thumbnailUrl?.trim() || null,
    collectionType: inferCollectionType(product.category, product.label),
    language: product.language?.trim() || null,
    manufacturerInfo: product.manufacturerInfo?.trim() || null,
    safetyWarning: product.safetyWarning?.trim() || null,
    idProduct: product.idProduct,
  };
}

export function hurtTitleMatchScore(gameTitle: string, productName: string): number {
  return scoreTitleMatch(gameTitle, productName);
}

export function isCommercialHurtField(fieldName: string): boolean {
  return COMMERCIAL_FIELDS.has(fieldName.trim().toLowerCase());
}
