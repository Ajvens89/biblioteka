/**
 * Uzupełnia brakujące okładki — Rebel images.csv, Planszeo, potem UPC/BGG/Google.
 *
 *   npm run backfill:covers
 *   npm run backfill:covers -- --limit=20
 *   npm run backfill:covers -- --all
 *   npm run backfill:covers -- --dry-run
 *   npm run backfill:covers -- --force --q=Monopoly
 *   npm run backfill:covers -- --fix-flagged --all
 *
 * Po backfillu na Firebase: ponowny deploy (pliki w public/covers/ trafiają do builda).
 */
import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import {
  backfillMissingCovers,
  formatCoverBackfillReport,
  gameNeedsCoverFetch,
  isBggConfigured,
} from "../src/lib/services/cover-fetch";
import { isRebelImagesEnabled } from "../src/lib/services/ean-providers/rebel-images-provider";
import {
  isGoogleCseConfigured,
  isGoogleCseHealthy,
} from "../src/lib/services/ean-providers/google-cse-provider";
import { gameNeedsCoverFixFromAudit } from "../src/lib/services/cover-audit";

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
const force = args.includes("--force") || args.includes("--fix-flagged");
const fixFlagged = args.includes("--fix-flagged");
const qArg = args.find((a) => a.startsWith("--q="));
const titleQuery = qArg ? qArg.split("=")[1]?.trim().toLowerCase() : "";
const limitArg = args.find((a) => a.startsWith("--limit="));
const limit = fetchAll
  ? Number.MAX_SAFE_INTEGER
  : limitArg
    ? Math.max(1, parseInt(limitArg.split("=")[1] ?? "50", 10))
    : 50;

async function main() {
  if (isRebelImagesEnabled()) {
    console.log("✓ Rebel images.csv: okładki z licencjonowanego katalogu.\n");
  } else {
    console.warn("ℹ️  Brak data/rebel-images.csv — pomijam Rebel (ustaw REBEL_IMAGES_CSV).\n");
  }
  console.log("✓ Okładki zapisywane na serwer (public/covers/).\n");

  if (!isBggConfigured()) {
    console.warn("ℹ️  Bez BGG_TOKEN — po Planszeo: UPCitemdb + Open Library.\n");
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
      select: {
        id: true,
        title: true,
        coverImageUrl: true,
        coverImageSource: true,
        coverImageExternalId: true,
        ean: true,
        collectionType: true,
      },
      orderBy: { title: "asc" },
    }),
  );

  let filtered = titleQuery
    ? games.filter((g) => g.title.toLowerCase().includes(titleQuery))
    : games;

  if (fixFlagged) {
    filtered = filtered.filter((g) => gameNeedsCoverFixFromAudit(g));
  }

  const targets = filtered.filter((g) => gameNeedsCoverFetch(g.coverImageUrl, { force }));
  const mode = force ? " (wymuszone nadpisanie)" : "";
  const qLabel = titleQuery ? `, filtr „${titleQuery}”` : "";
  const flaggedLabel = fixFlagged ? ", tylko błędne z audytu" : "";
  console.log(
    `Gier w katalogu: ${games.length}${qLabel}${flaggedLabel}, do pobrania okładek: ${targets.length}${mode}`,
  );

  const stats = await backfillMissingCovers(filtered, {
    limit,
    dryRun,
    force,
    onProgress: (current, total, title, ok) => {
      const mark = ok ? "+" : "—";
      console.log(`[${current}/${total}] ${mark} ${title}`);
    },
    update: async (id, coverImageUrl, source) => {
      await withRetry(() =>
        prisma.game.update({
          where: { id },
          data: {
            coverImageUrl: coverImageUrl?.trim() ? coverImageUrl : null,
            coverImageSource: coverImageUrl?.trim() ? source : null,
          },
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
