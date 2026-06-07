import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import slugify from "slugify";
import { fetchWithTimeout, validateCoverImageUrl } from "@/lib/services/ean-providers/image-utils";

const PUBLIC_DIR = path.resolve("public");
const PUBLIC_COVERS_DIR = path.join(PUBLIC_DIR, "covers");

const USER_AGENT = "BibliotekaZakatki/1.0 (+cover-backfill; planszeo-licensed)";

function extensionFromContentType(contentType: string): string {
  const ct = contentType.toLowerCase();
  if (ct.includes("png")) return "png";
  if (ct.includes("webp")) return "webp";
  if (ct.includes("gif")) return "gif";
  return "jpg";
}

export function publicCoversDir(): string {
  return PUBLIC_COVERS_DIR;
}

/**
 * Pobiera obraz z URL i zapisuje w public/covers/.
 * Zwraca ścieżkę publiczną /covers/… lub null.
 */
export async function downloadCoverToPublic(
  remoteUrl: string,
  baseName: string,
): Promise<string | null> {
  const safe = validateCoverImageUrl(remoteUrl);
  if (!safe) return null;

  try {
    const res = await fetchWithTimeout(
      safe,
      { headers: { Accept: "image/*", "User-Agent": USER_AGENT } },
      20_000,
    );
    if (!res.ok) return null;

    const contentType = res.headers.get("content-type") ?? "image/jpeg";
    if (!contentType.startsWith("image/")) return null;

    const buffer = Buffer.from(await res.arrayBuffer());
    if (buffer.length < 400 || buffer.length > 12_000_000) return null;

    const slug = slugify(baseName, { lower: true, strict: true, locale: "pl" }) || "gra";
    const hash = createHash("sha1").update(safe).digest("hex").slice(0, 10);
    const ext = extensionFromContentType(contentType);
    const fileName = `${slug}.${hash}.${ext}`;
    const dest = path.join(PUBLIC_COVERS_DIR, fileName);

    await mkdir(PUBLIC_COVERS_DIR, { recursive: true });
    if (!existsSync(dest)) {
      await writeFile(dest, buffer);
    }

    return `/covers/${fileName}`;
  } catch {
    return null;
  }
}
