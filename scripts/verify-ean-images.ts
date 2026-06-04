/**
 * Weryfikacja pobierania okładek (plan A/B/C/D) — mocki + opcjonalnie DB.
 *
 *   npm run verify:ean-images
 */
import "dotenv/config";
import assert from "node:assert/strict";
import { PrismaClient } from "@prisma/client";
import { buildEan13 } from "../src/lib/services/ean";
import { createGameFromEan, lookupByEan } from "../src/lib/services/games";
import { lookupGoogleBooksProvider } from "../src/lib/services/ean-providers/google-books-provider";
import { lookupOpenLibraryProvider } from "../src/lib/services/ean-providers/open-library-provider";
import { lookupBggProvider } from "../src/lib/services/ean-providers/bgg-provider";
import {
  pickAutoSelectedCandidate,
  lookupGameByEanWithFallback,
} from "../src/lib/services/ean-providers";
import { validateCoverImageUrl } from "../src/lib/services/ean-providers/image-utils";
import type { CoverCandidate } from "../src/lib/services/ean-providers/types";

const prisma = new PrismaClient();
const PREFIX = "verify-ean-img-";
const LOCAL_EAN = buildEan13("590999000099");
const ISBN = buildEan13("978999000099");

type FetchHandler = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function xmlResponse(body: string, status = 200): Response {
  return new Response(body, {
    status,
    headers: { "Content-Type": "application/xml" },
  });
}

async function withMockFetch(handler: FetchHandler, fn: () => Promise<void>) {
  const original = globalThis.fetch;
  globalThis.fetch = handler as typeof fetch;
  try {
    await fn();
  } finally {
    globalThis.fetch = original;
  }
}

function runPureChecks() {
  assert.equal(validateCoverImageUrl("https://example.com/cover.jpg"), "https://example.com/cover.jpg");
  assert.equal(validateCoverImageUrl("javascript:alert(1)"), null);
  assert.equal(validateCoverImageUrl("data:image/png;base64,abc"), null);
  assert.equal(validateCoverImageUrl("file:///tmp/x.jpg"), null);

  const multiLow: CoverCandidate[] = [
    { source: "bgg", title: "A", confidence: "low", coverImageUrl: "https://a.test/1.jpg" },
    { source: "bgg", title: "B", confidence: "low", coverImageUrl: "https://a.test/2.jpg" },
  ];
  assert.equal(pickAutoSelectedCandidate(multiLow), undefined);

  const singleHigh: CoverCandidate[] = [
    {
      source: "google_books",
      title: "Book",
      confidence: "high",
      coverImageUrl: "https://books.google.com/x.jpg",
    },
  ];
  assert.equal(pickAutoSelectedCandidate(singleHigh)?.source, "google_books");

  const mixed: CoverCandidate[] = [
    { source: "google_books", confidence: "high", coverImageUrl: "https://x.test/1.jpg" },
    { source: "bgg", confidence: "high", coverImageUrl: "https://x.test/2.jpg", title: "BGG" },
  ];
  assert.equal(pickAutoSelectedCandidate(mixed), undefined);
}

async function runGoogleBooksMock() {
  const isbn = ISBN;
  await withMockFetch(async (input) => {
    const url = String(input);
    if (url.includes("googleapis.com/books")) {
      return jsonResponse({
        items: [
          {
            id: "mock-vol",
            volumeInfo: {
              title: "Verify ISBN Book",
              authors: ["Test Author"],
              publishedDate: "2020",
              imageLinks: { thumbnail: "http://books.google.com/thumb.jpg" },
            },
          },
        ],
      });
    }
    return new Response(null, { status: 404 });
  }, async () => {
    const rows = await lookupGoogleBooksProvider(isbn);
    assert.equal(rows.length, 1);
    assert.equal(rows[0]?.source, "google_books");
    assert.equal(rows[0]?.title, "Verify ISBN Book");
    assert.ok(rows[0]?.coverImageUrl?.startsWith("https://"));
  });
}

async function runOpenLibraryMock() {
  const isbn = ISBN;
  await withMockFetch(async (input) => {
    const url = String(input);
    if (url.includes("openlibrary.org/api/books")) {
      return jsonResponse({
        [`ISBN:${isbn}`]: {
          title: "OL Title",
          authors: [{ name: "OL Author" }],
          publish_date: "2019",
        },
      });
    }
    if (url.includes("covers.openlibrary.org") && url.includes("-L.jpg")) {
      return new Response(null, { status: 200, headers: { "content-type": "image/jpeg" } });
    }
    if (url.includes("covers.openlibrary.org")) {
      return new Response(null, { status: 404 });
    }
    return new Response(null, { status: 404 });
  }, async () => {
    const rows = await lookupOpenLibraryProvider(isbn, { googleHadCover: false });
    assert.equal(rows.length, 1);
    assert.equal(rows[0]?.source, "open_library");
    assert.ok(rows[0]?.coverImageUrl?.includes("openlibrary.org"));
  });
}

async function runBggMock() {
  await withMockFetch(async (input) => {
    const url = String(input);
    if (url.includes("/search?")) {
      return xmlResponse(`
        <items>
          <item type="boardgame" id="1001"><name type="primary" value="Catan"/></item>
          <item type="boardgame" id="1002"><name type="primary" value="Catan X"/></item>
        </items>`);
    }
    if (url.includes("/thing?")) {
      return xmlResponse(`
        <items>
          <item type="boardgame" id="1001">
            <name type="primary" value="Catan"/>
            <yearpublished value="1995"/>
            <image>https://cf.geekdo-static.com/catan.jpg</image>
            <thumbnail>https://cf.geekdo-static.com/catan-t.jpg</thumbnail>
          </item>
          <item type="boardgame" id="1002">
            <name type="primary" value="Catan X"/>
            <yearpublished value="2000"/>
            <image>https://cf.geekdo-static.com/catanx.jpg</image>
          </item>
        </items>`);
    }
    return new Response(null, { status: 404 });
  }, async () => {
    const { candidates } = await lookupBggProvider("Catan");
    assert.ok(candidates.length >= 2);
    assert.equal(pickAutoSelectedCandidate(candidates), undefined);
    assert.ok(candidates.every((c) => c.source === "bgg"));
  });
}

async function runDbChecks() {
  if (!process.env.DATABASE_URL) {
    console.log("⚠ Pominięto testy DB (brak DATABASE_URL)");
    return;
  }

  try {
    await prisma.$queryRaw`SELECT 1`;
  } catch {
    console.log("⚠ Pominięto testy DB (PostgreSQL niedostępny)");
    return;
  }

  await prisma.gameCopy.deleteMany({
    where: { game: { slug: { startsWith: PREFIX } } },
  });
  await prisma.game.deleteMany({ where: { slug: { startsWith: PREFIX } } });

  const admin = await prisma.profile.findFirst({ where: { role: "ADMIN" } });
  if (!admin) throw new Error("Brak ADMIN — uruchom npm run db:seed");

  const withCover = await createGameFromEan(
    prisma,
    {
      title: "Verify Cover Game",
      ean: LOCAL_EAN,
      collectionType: "BOARD_GAME",
      type: "BOARD",
      difficulty: "MEDIUM",
      minPlayers: 2,
      maxPlayers: 4,
      minAge: 10,
      minPlayTime: 30,
      maxPlayTime: 60,
      slug: `${PREFIX}with-cover`,
      coverImageUrl: "https://placehold.co/120x160?text=Cover",
      coverImageSource: "manual",
      coverImageExternalId: "test-ext",
    },
    admin.id,
  );
  assert.equal(withCover.coverImageUrl, "https://placehold.co/120x160?text=Cover");
  assert.equal(withCover.coverImageSource, "manual");

  const lookup = await lookupByEan(prisma, LOCAL_EAN);
  assert.equal(lookup.status, "exists");
  assert.equal(lookup.candidates[0]?.source, "local");
  assert.ok(lookup.game?.id === withCover.id);

  const noCover = await createGameFromEan(
    prisma,
    {
      title: "Verify No Cover",
      ean: buildEan13("590999000098"),
      collectionType: "BOARD_GAME",
      type: "BOARD",
      difficulty: "MEDIUM",
      minPlayers: 2,
      maxPlayers: 4,
      minAge: 10,
      minPlayTime: 30,
      maxPlayTime: 60,
      slug: `${PREFIX}no-cover`,
      coverImageUrl: "",
    },
    admin.id,
  );
  assert.equal(noCover.coverImageUrl, null);

  await withMockFetch(async (input) => {
    const url = String(input);
    if (url.includes("googleapis.com/books")) {
      return jsonResponse({
        items: [
          {
            id: "isbn-vol",
            volumeInfo: {
              title: "RPG Verify Book",
              imageLinks: { thumbnail: "https://books.google.com/isbn.jpg" },
            },
          },
        ],
      });
    }
    return new Response(null, { status: 404 });
  }, async () => {
    const isbnLookup = await lookupGameByEanWithFallback(prisma, ISBN);
    assert.ok(
      isbnLookup.status === "found_external" || isbnLookup.status === "candidates",
    );
    assert.ok(isbnLookup.candidates.some((c) => c.source === "google_books"));
  });

  await prisma.gameCopy.deleteMany({
    where: { game: { slug: { startsWith: PREFIX } } },
  });
  await prisma.game.deleteMany({ where: { slug: { startsWith: PREFIX } } });
}

async function main() {
  runPureChecks();
  await runGoogleBooksMock();
  await runOpenLibraryMock();
  await runBggMock();
  await runDbChecks();
  console.log("\n✅ EAN IMAGES VERIFY OK");
}

main()
  .catch((e) => {
    console.error(`\n❌ EAN IMAGES VERIFY FAILED: ${e instanceof Error ? e.message : e}`);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
