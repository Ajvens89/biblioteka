/**
 * Uzupełnia gry danymi opisowymi z hurt.csv (bez cen i stanów magazynowych).
 *
 *   npm run import:hurt
 *   npm run import:hurt -- --dry-run
 *   npm run import:hurt -- --force
 */
import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import {
  formatHurtImportReport,
  runHurtImport,
} from "../src/lib/services/hurt-import";

const prisma = new PrismaClient();
const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const force = args.includes("--force");
const replaceEmptyOnly = !force && !args.includes("--replace-all");

async function main() {
  const stats = await runHurtImport(prisma, {
    dryRun,
    force,
    replaceEmptyOnly,
  });

  console.log(formatHurtImportReport(stats));

  if (stats.plans.length > 0) {
    console.log("\nPrzykładowe uzupełnienia:");
    for (const plan of stats.plans.slice(0, 8)) {
      const fields = plan.fields.map((f) => f.field).join(", ");
      console.log(`  • ${plan.title} [${plan.matchedBy}] → ${fields}`);
    }
  }

  if (!stats.catalogPath) {
    console.error("\n❌ Brak data/hurt.csv — skopiuj plik lub ustaw HURT_CSV w .env");
    process.exit(1);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
