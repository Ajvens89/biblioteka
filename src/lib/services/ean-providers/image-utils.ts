export const PROVIDER_TIMEOUT_MS = 5000;

const BLOCKED_URL_PROTOCOLS = /^(javascript|data|file|blob):/i;

/** Akceptuje tylko http/https. */
export function validateCoverImageUrl(url: string | null | undefined): string | null {
  if (!url?.trim()) return null;
  const trimmed = url.trim();
  if (BLOCKED_URL_PROTOCOLS.test(trimmed)) return null;
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return null;
    return parsed.toString();
  } catch {
    return null;
  }
}

export async function fetchWithTimeout(
  url: string,
  init?: RequestInit,
  timeoutMs = PROVIDER_TIMEOUT_MS,
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal, next: { revalidate: 3600 } });
  } finally {
    clearTimeout(timer);
  }
}

/** Sprawdza, czy URL obrazka odpowiada (HEAD, fallback GET). */
export async function probeImageUrl(url: string): Promise<boolean> {
  const safe = validateCoverImageUrl(url);
  if (!safe) return false;
  try {
    const head = await fetchWithTimeout(safe, { method: "HEAD" }, 3000);
    if (head.ok) {
      const ct = head.headers.get("content-type") ?? "";
      if (ct.startsWith("image/")) return true;
    }
    const get = await fetchWithTimeout(safe, { method: "GET" }, 4000);
    return get.ok && (get.headers.get("content-type") ?? "").startsWith("image/");
  } catch {
    return false;
  }
}

/** Open Library Covers: L → M → S */
export function openLibraryCoverUrls(isbn: string): string[] {
  const base = `https://covers.openlibrary.org/b/isbn/${isbn}`;
  return [`${base}-L.jpg?default=false`, `${base}-M.jpg?default=false`, `${base}-S.jpg?default=false`];
}

export async function resolveOpenLibraryCover(isbn: string): Promise<string | undefined> {
  for (const url of openLibraryCoverUrls(isbn)) {
    if (await probeImageUrl(url)) return validateCoverImageUrl(url) ?? undefined;
  }
  return undefined;
}

type GoogleImageLinks = {
  extraLarge?: string;
  large?: string;
  medium?: string;
  small?: string;
  thumbnail?: string;
  smallThumbnail?: string;
};

/** Największa dostępna okładka z Google Books. */
export function pickGoogleBooksCover(links?: GoogleImageLinks): string | undefined {
  if (!links) return undefined;
  const raw =
    links.extraLarge ??
    links.large ??
    links.medium ??
    links.small ??
    links.thumbnail ??
    links.smallThumbnail;
  return raw ? validateCoverImageUrl(raw.replace(/^http:/, "https:")) ?? undefined : undefined;
}

export function planszeoSearchUrl(title: string): string {
  return `https://planszeo.pl/szukaj?q=${encodeURIComponent(title.trim())}`;
}

export function bggSearchUrl(title: string): string {
  return `https://boardgamegeek.com/search/boardgame?q=${encodeURIComponent(title.trim())}`;
}

export function googleImagesSearchUrl(title: string): string {
  return `https://www.google.com/search?tbm=isch&q=${encodeURIComponent(title.trim())}`;
}
