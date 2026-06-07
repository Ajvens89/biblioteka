/**
 * Audyt okładek — wykrywa podejrzane dopasowania tytuł ↔ plik okładki.
 *
 *   npx tsx scripts/audit-covers.ts
 *   npx tsx scripts/audit-covers.ts --json
 *   npx tsx scripts/audit-covers.ts --high-confidence
 */
import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import {
  auditGameCover,
  type CoverAuditRow,
  type CoverIssueCode,
} from "../src/lib/services/cover-audit";

const prisma = new PrismaClient();

type AuditRow = CoverAuditRow;
type IssueCode = CoverIssueCode;

function parseArgs() {
  const args = process.argv.slice(2);
  const json = args.includes("--json");
  const highOnly = args.includes("--high-confidence");
  const minScoreArg = args.find((a) => a.startsWith("--min-score="));
  const minScore = minScoreArg ? Math.max(0, parseInt(minScoreArg.split("=")[1] ?? "50", 10)) : 50;
  return { json, highOnly, minScore };
}

const HIGH_CONFIDENCE_ISSUES: IssueCode[] = [
  "series_mismatch",
  "book_game_mismatch",
  "puzzle_mismatch",
  "missing_file",
];

function isHighConfidence(row: AuditRow): boolean {
  if (row.needsFix) return true;
  if (row.issues.some((i) => HIGH_CONFIDENCE_ISSUES.includes(i))) return true;
  if (row.issues.includes("hex_import_path") && row.issues.includes("missing_file")) return true;
  return (
    row.matchScore < 25 &&
    (row.coverImageSource === "planszeo" || row.coverImageSource === "upcitemdb")
  );
}

async function main() {
  const { json, highOnly, minScore } = parseArgs();

  const games = await prisma.game.findMany({
    where: { deletedAt: null, isActive: true },
    select: {
      id: true,
      title: true,
      slug: true,
      ean: true,
      coverImageUrl: true,
      coverImageSource: true,
    },
    orderBy: { title: "asc" },
  });

  let rows = games
    .map((g) => auditGameCover(g, minScore))
    .filter((r): r is AuditRow => r !== null)
    .sort((a, b) => b.severity - a.severity || a.matchScore - b.matchScore);

  if (highOnly) {
    rows = rows.filter(isHighConfidence);
  }

  const missing = rows.filter((r) => r.issues.includes("missing_cover"));
  const suspicious = rows.filter((r) => !r.issues.includes("missing_cover"));

  if (json) {
    console.log(JSON.stringify({ total: games.length, missing: missing.length, suspicious: suspicious.length, rows }, null, 2));
    return;
  }

  const allRows = games
    .map((g) => auditGameCover(g, minScore))
    .filter((r): r is AuditRow => r !== null);
  const highConfCount = allRows.filter((r) => r.needsFix).length;

  console.log(`=== Audyt okładek (${games.length} gier) ===\n`);
  console.log(`Brak okładki: ${missing.length}`);
  console.log(`Podejrzane (wszystkie): ${allRows.filter((r) => !r.issues.includes("missing_cover")).length}`);
  console.log(`Pewne błędy (--high-confidence): ${highConfCount}`);
  if (highOnly) console.log(`(filtr: tylko pewne błędy)`);
  console.log(`OK: ${games.length - allRows.length}\n`);

  if (suspicious.length > 0) {
    console.log("--- Podejrzane dopasowania (najgorsze pierwsze) ---\n");
    for (const r of suspicious.slice(0, 80)) {
      console.log(`[${r.matchScore}%] ${r.title}`);
      console.log(`  slug: ${r.slug}`);
      console.log(`  okładka: ${r.coverImageUrl}`);
      console.log(`  plik→"${r.coverSlug}" | źródło: ${r.coverImageSource ?? "—"}`);
      console.log(`  problemy: ${r.issues.join(", ")}`);
      if (r.ean) console.log(`  EAN: ${r.ean}`);
      console.log("");
    }
    if (suspicious.length > 80) {
      console.log(`… i ${suspicious.length - 80} więcej (użyj --json)\n`);
    }
  }

  if (missing.length > 0) {
    console.log(`--- Brak okładki (${missing.length}) ---\n`);
    for (const r of missing.slice(0, 30)) {
      console.log(`  • ${r.title}${r.ean ? ` (${r.ean})` : ""}`);
    }
    if (missing.length > 30) console.log(`  … i ${missing.length - 30} więcej`);
  }

  console.log("\nNaprawa: npm run backfill:covers -- --fix-flagged --all");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
