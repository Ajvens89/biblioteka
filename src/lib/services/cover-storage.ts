import { createHash } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import slugify from "slugify";
import { fetchWithTimeout, validateCoverImageUrl } from "@/lib/services/ean-providers/image-utils";

const BUCKET = "game-images";
const USER_AGENT = "BibliotekaZakatki/1.0 (+cover-storage)";

function extensionFromContentType(contentType: string): string {
  const ct = contentType.toLowerCase();
  if (ct.includes("png")) return "png";
  if (ct.includes("webp")) return "webp";
  if (ct.includes("gif")) return "gif";
  return "jpg";
}

function hasStorageConfig(): boolean {
  const bucket = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  return Boolean(
    bucket &&
      serviceKey &&
      !bucket.includes("placeholder") &&
      !bucket.includes("[PROJECT"),
  );
}

async function downloadImageBuffer(
  url: string,
): Promise<{ buffer: Buffer; contentType: string } | null> {
  try {
    const res = await fetchWithTimeout(
      url,
      { headers: { Accept: "image/*", "User-Agent": USER_AGENT } },
      20_000,
    );
    if (!res.ok) return null;
    const contentType = res.headers.get("content-type") ?? "image/jpeg";
    if (!contentType.startsWith("image/")) return null;
    const buffer = Buffer.from(await res.arrayBuffer());
    if (buffer.length < 400 || buffer.length > 12_000_000) return null;
    return { buffer, contentType };
  } catch {
    return null;
  }
}

/**
 * Docelowo: kopiuje okładkę do Supabase Storage (bucket game-images).
 * Gdy Storage niedostępny — zwraca zwalidowany zewnętrzny URL.
 */
export async function copyCoverToStorage(
  externalUrl: string,
  baseName = "gra",
): Promise<{ url: string; stored: boolean; message: string }> {
  const safe = validateCoverImageUrl(externalUrl);
  if (!safe) {
    return {
      url: "",
      stored: false,
      message: "Nieprawidłowy URL okładki.",
    };
  }

  if (!hasStorageConfig()) {
    return {
      url: safe,
      stored: false,
      message:
        "Supabase Storage nie jest skonfigurowany — zapisany zostanie zewnętrzny URL okładki.",
    };
  }

  const downloaded = await downloadImageBuffer(safe);
  if (!downloaded) {
    return {
      url: safe,
      stored: false,
      message: "Nie udało się pobrać okładki — użyty zostanie zewnętrzny URL.",
    };
  }

  const slug = slugify(baseName, { lower: true, strict: true, locale: "pl" }) || "gra";
  const hash = createHash("sha1").update(safe).digest("hex").slice(0, 10);
  const ext = extensionFromContentType(downloaded.contentType);
  const objectPath = `covers/${slug}.${hash}.${ext}`;

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  const { error } = await supabase.storage.from(BUCKET).upload(objectPath, downloaded.buffer, {
    contentType: downloaded.contentType,
    upsert: true,
  });

  if (error) {
    return {
      url: safe,
      stored: false,
      message: `Upload do Storage nie powiódł się (${error.message}) — użyty zewnętrzny URL.`,
    };
  }

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(objectPath);
  return {
    url: data.publicUrl,
    stored: true,
    message: "Okładka skopiowana do Supabase Storage.",
  };
}
