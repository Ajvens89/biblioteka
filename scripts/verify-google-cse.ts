/**
 * Sprawdza GOOGLE_CSE_API_KEY + GOOGLE_CSE_CX (Google Grafika / Custom Search).
 *
 *   npm run verify:google-cse
 */
import "dotenv/config";
import {
  buildGoogleCseCoverQuery,
  isGoogleCseConfigured,
  lookupGoogleCseCoverImages,
} from "../src/lib/services/ean-providers/google-cse-provider";

const TEST_TITLE = "7 Wonders";
const TEST_EAN = "5425016923707";

function mask(value: string): string {
  const t = value.trim();
  if (t.length <= 8) return "***";
  return `${t.slice(0, 4)}…${t.slice(-4)}`;
}

async function main() {
  const key = process.env.GOOGLE_CSE_API_KEY?.trim() ?? "";
  const cx = process.env.GOOGLE_CSE_CX?.trim() ?? "";

  console.log("=== Google Custom Search (Grafika) ===\n");

  if (!key) {
    console.log("❌ Brak GOOGLE_CSE_API_KEY w .env");
  } else {
    console.log(`✓ GOOGLE_CSE_API_KEY: ${mask(key)}`);
  }

  if (!cx) {
    console.log("❌ Brak GOOGLE_CSE_CX w .env (Search engine ID z programmablesearchengine.google.com)");
  } else {
    console.log(`✓ GOOGLE_CSE_CX: ${mask(cx)}`);
  }

  if (!isGoogleCseConfigured()) {
    console.log("\nUzupełnij obie zmienne w .env i uruchom ponownie.");
    process.exit(1);
  }

  const query = buildGoogleCseCoverQuery(TEST_TITLE, TEST_EAN);
  console.log(`\nTestowe zapytanie: ${query}`);

  const directUrl = new URL("https://www.googleapis.com/customsearch/v1");
  directUrl.searchParams.set("key", key);
  directUrl.searchParams.set("cx", cx);
  directUrl.searchParams.set("q", query);
  directUrl.searchParams.set("searchType", "image");
  directUrl.searchParams.set("num", "1");

  const res = await fetch(directUrl.toString());
  const body = (await res.json()) as {
    error?: { code?: number; message?: string; errors?: { reason?: string }[] };
    items?: { link?: string }[];
  };

  if (!res.ok) {
    console.log(`\n❌ API HTTP ${res.status}`);
    const msg = body.error?.message ?? JSON.stringify(body);
    console.log(msg);

    const blocked = body.error?.details?.some(
      (d) => (d as { reason?: string }).reason === "API_KEY_SERVICE_BLOCKED",
    );
    if (blocked || res.status === 403) {
      console.log(`
Ten klucz ma zablokowane Custom Search API (typowe dla „Browser key Firebase”).

Naprawa (~2 min):
  1) Włącz API: https://console.cloud.google.com/apis/library/customsearch.googleapis.com
  2) Credentials → Utwórz klucz API (NOWY, nie Firebase)
     • Ograniczenia API: tylko „Custom Search API”
     • Ograniczenia aplikacji: Brak (skrypty npm)
  3) Wklej nowy klucz do GOOGLE_CSE_API_KEY w .env → napisz „gotowe”`);
    }
    process.exit(1);
  }

  const count = body.items?.length ?? 0;
  console.log(`\n✓ API odpowiedziało — wyników obrazów: ${count}`);
  if (body.items?.[0]?.link) {
    console.log(`  Przykład: ${body.items[0].link.slice(0, 80)}…`);
  }

  const urls = await lookupGoogleCseCoverImages(TEST_TITLE, TEST_EAN);
  console.log(`✓ lookupGoogleCseCoverImages: ${urls.length} URL(i) po filtrze`);
  if (urls[0]) console.log(`  ${urls[0].slice(0, 80)}…`);

  console.log("\nGotowe — uruchom: npm run backfill:covers:all");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
