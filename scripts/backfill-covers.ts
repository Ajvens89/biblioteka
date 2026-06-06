/**
 * Uzupełnia brakujące okładki (BGG / Open Library / Google Books).
 *
 *   npm run backfill:covers
 *   npm run backfill:covers -- --limit=20
 *   npm run backfill:covers -- --all
 *   npm run backfill:covers -- --dry-run
 *
 * Wymaga BGG_TOKEN w .env dla gier planszowych (boardgamegeek.com/applications).
 */
import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import {
  backfillMissingCovers,
  formatCoverBackfillReport,
  gameNeedsCoverFetch,
  isBggConfigured,
} from "../src/lib/services/cover-fetch";
import {
  isGoogleCseConfigured,
  isGoogleCseHealthy,
} from "../src/lib/services/ean-providers/google-cse-provider";

function createPrisma() {
  const url = process.env.DATABASE_URL?.replace(/[?&]pgbouncer=true/gi, "") ?? process.env.DATABASE_URL;
  return url && url !== process.env.DATABASE_URL
    ? new PrismaClient({ datasources: { db: { url } } })
    : new PrismaClient();
}

const prisma = createPrisma();

async function withRetry<T>(fn: () => Promise<T>, maxAttempts = 4): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      const msg = error instanceof Error ? error.message : String(error);
      const transient =
        msg.includes("prepared statement") ||
        msg.includes("Response from the Engine was empty") ||
        msg.includes("Can't reach database server");
      if (!transient || attempt >= maxAttempts - 1) break;
      await prisma.$disconnect().catch(() => {});
      await sleep(250 * (attempt + 1));
      await prisma.$connect().catch(() => {});
    }
  }
  throw lastError;
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const fetchAll = args.includes("--all");
const limitArg = args.find((a) => a.startsWith("--limit="));
const limit = fetchAll
  ? Number.MAX_SAFE_INTEGER
  : limitArg
    ? Math.max(1, parseInt(limitArg.split("=")[1] ?? "50", 10))
    : 50;

async function main() {
  if (!isBggConfigured()) {
    console.warn("ℹ️  Bez BGG_TOKEN — używany UPCitemdb + Open Library (darmowe).");
    console.warn("   Opcjonalnie BGG: https://boardgamegeek.com/applications\n");
  }

  if (isGoogleCseConfigured()) {
    const ok = await isGoogleCseHealthy();
    if (ok) {
      console.log("✓ Google Grafika (CSE): API działa.\n");
    } else {
      console.warn("⚠️  Google CSE w .env, ale API zablokowane — pomijam Grafikę.");
      console.warn("   Uruchom: npm run verify:google-cse (instrukcja naprawy klucza)\n");
    }
  }

  const games = await withRetry(() =>
    prisma.game.findMany({
      where: { deletedAt: null, isActive: true },
      select: { id: true, title: true, coverImageUrl: true, ean: true, collectionType: true },
      orderBy: { title: "asc" },
    }),
  );

  const targets = games.filter((g) => gameNeedsCoverFetch(g.coverImageUrl));
  console.log(`Gier w katalogu: ${games.length}, do pobrania okładek: ${targets.length}`);

  const stats = await backfillMissingCovers(games, {
    limit,
    dryRun,
    onProgress: (current, total, title, ok) => {
      const mark = ok ? "+" : "—";
      console.log(`[${current}/${total}] ${mark} ${title}`);
    },
    update: async (id, coverImageUrl, source) => {
      await withRetry(() =>
        prisma.game.update({
          where: { id },
          data: { coverImageUrl, coverImageSource: source },
        }),
      );
    },
  });

  console.log(formatCoverBackfillReport(stats, dryRun));
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
