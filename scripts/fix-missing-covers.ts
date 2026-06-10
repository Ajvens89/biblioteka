/**
 * Uzupełnia brakujące okładki — EAN z hurt/Rebel/UPC + sklepy bee/taniaksiazka.
 *   npx tsx scripts/fix-missing-covers.ts
 *   npx tsx scripts/fix-missing-covers.ts --dry-run
 */
import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { downloadCoverToPublic } from "../src/lib/services/cover-download";
import { fetchCoverForGame } from "../src/lib/services/cover-fetch";
import {
  fetchWithTimeout,
  probeImageUrl,
  resolveOpenLibraryCover,
} from "../src/lib/services/ean-providers/image-utils";
import { lookupUpcitemdbByEan } from "../src/lib/services/ean-providers/upcitemdb-provider";
import { isIsbn13 } from "../src/lib/services/ean";
import { lookupGoogleBooksProvider } from "../src/lib/services/ean-providers/google-books-provider";

const prisma = new PrismaClient();
const dryRun = process.argv.includes("--dry-run");

const EAN_IMAGE_FOLDERS = [
  "2A0", "32D", "EAB", "113", "FF9", "130", "2B0", "3A1", "4C2", "5D3",
  "6E4", "7F5", "8G6", "9H7", "A01", "B02", "C03", "D04", "E05", "F06",
];

async function tryEanShopUrls(ean: string): Promise<string | null> {
  const digits = ean.replace(/\D/g, "");
  if (digits.length < 8) return null;

  const bases = [
    "https://bigimg.bee.pl/images/popups",
    "https://bigimg.taniaksiazka.pl/images/popups",
  ];

  for (const base of bases) {
    for (const folder of EAN_IMAGE_FOLDERS) {
      const url = `${base}/${folder}/${digits}.jpg`;
      if (await probeImageUrl(url)) return url;
    }
    const direct = `${base}/2A0/${digits}.jpg`;
    if (await probeImageUrl(direct)) return direct;
  }
  return null;
}

async function tryIsbnCover(ean: string): Promise<string | null> {
  if (!isIsbn13(ean)) return null;
  const openLib = await resolveOpenLibraryCover(ean);
  if (openLib && (await probeImageUrl(openLib))) return openLib;

  const books = await lookupGoogleBooksProvider(ean);
  for (const b of books) {
    const url = b.coverImageUrl ?? b.thumbnailUrl;
    if (url && (await probeImageUrl(url))) return url;
  }
  return null;
}

async function tryUpcCover(ean: string): Promise<string | null> {
  const hits = await lookupUpcitemdbByEan(ean);
  for (const h of hits) {
    const url = h.coverImageUrl ?? h.thumbnailUrl;
    if (url && (await probeImageUrl(url))) return url;
  }
  return null;
}

async function searchTaniaksiazkaByEan(ean: string): Promise<string | null> {
  const digits = ean.replace(/\D/g, "");
  try {
    const res = await fetchWithTimeout(
      `https://www.taniaksiazka.pl/szukaj/?q=${encodeURIComponent(digits)}`,
      { headers: { "User-Agent": "Mozilla/5.0" } },
      12_000,
    );
    const html = await res.text();
    const productLink = html.match(/href="(\/[^"]+-p-\d+\.html)"/i)?.[1];
    if (!productLink) return null;

    const page = await fetchWithTimeout(
      `https://www.taniaksiazka.pl${productLink}`,
      { headers: { "User-Agent": "Mozilla/5.0" } },
      12_000,
    );
    const pageHtml = await page.text();
    const img =
      pageHtml.match(/bigimg\.taniaksiazka\.pl\/images\/popups\/[^"']+\.jpg/i)?.[0] ??
      pageHtml.match(/content="(https?:\/\/bigimg[^"]+\.jpg)"/i)?.[1];
    if (!img) return null;
    const url = img.startsWith("http") ? img : `https://${img}`;
    return (await probeImageUrl(url)) ? url : null;
  } catch {
    return null;
  }
}

async function searchBeeByEan(ean: string): Promise<string | null> {
  const digits = ean.replace(/\D/g, "");
  try {
    const res = await fetchWithTimeout(
      `https://www.bee.pl/szukaj?query=${encodeURIComponent(digits)}`,
      { headers: { "User-Agent": "Mozilla/5.0" } },
      12_000,
    );
    const html = await res.text();
    const img = html.match(/bigimg\.bee\.pl\/images\/popups\/[^"']+\.jpg/i)?.[0];
    if (!img) return null;
    const url = img.startsWith("http") ? img : `https://${img}`;
    return (await probeImageUrl(url)) ? url : null;
  } catch {
    return null;
  }
}

async function fetchCover(title: string, ean: string | null) {
  if (ean) {
    const fetched = await fetchCoverForGame({ title, ean });
    if (fetched.coverImageUrl) return fetched;

    for (const fn of [tryEanShopUrls, tryIsbnCover, tryUpcCover, searchTaniaksiazkaByEan, searchBeeByEan]) {
      const remote = await fn(ean);
      if (!remote) continue;
      const local = await downloadCoverToPublic(remote, title);
      if (local) {
        return {
          coverImageUrl: local,
          coverImageSource: isIsbn13(ean) ? ("open_library" as const) : ("manual" as const),
        };
      }
    }
  } else {
    const fetched = await fetchCoverForGame({ title, ean: null });
    if (fetched.coverImageUrl) return fetched;
  }
  return { coverImageUrl: null, coverImageSource: null };
}

async function main() {
  const games = await prisma.game.findMany({
    where: { deletedAt: null, isActive: true, OR: [{ coverImageUrl: null }, { coverImageUrl: "" }] },
    select: { id: true, title: true, ean: true, slug: true },
    orderBy: { title: "asc" },
  });

  console.log(`Gier bez okładki: ${games.length}\n`);
  let ok = 0;
  let fail = 0;

  for (const game of games) {
    process.stdout.write(`${game.title} (${game.ean ?? "brak EAN"})… `);
    const result = await fetchCover(game.title, game.ean);

    if (!result.coverImageUrl) {
      console.log("BRAK");
      fail += 1;
      continue;
    }

    if (!dryRun) {
      await prisma.game.update({
        where: { id: game.id },
        data: {
          coverImageUrl: result.coverImageUrl,
          coverImageSource: result.coverImageSource ?? "manual",
        },
      });
    }
    console.log(`OK → ${result.coverImageUrl}`);
    ok += 1;
  }

  console.log(`\nGotowe: ${ok} ok, ${fail} bez okładki${dryRun ? " (dry-run)" : ""}`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
