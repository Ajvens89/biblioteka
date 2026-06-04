/**
 * Audyt EAN — tylko odczyt.
 *
 *   npm run audit:ean
 *   npm run audit:ean -- --json
 */
import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { formatEanAuditText, runEanAudit } from "../src/lib/services/ean-audit";

function createPrisma() {
  const url = process.env.DATABASE_URL?.replace(/[?&]pgbouncer=true/gi, "") ?? process.env.DATABASE_URL;
  return url && url !== process.env.DATABASE_URL
    ? new PrismaClient({ datasources: { db: { url } } })
    : new PrismaClient();
}

const prisma = createPrisma();

async function main() {
  const jsonOut = process.argv.includes("--json");

  try {
    await prisma.$queryRaw`SELECT 1`;
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error(`❌ EAN AUDIT FAILED: brak połączenia z bazą — ${msg}`);
    process.exit(1);
  }

  const report = await runEanAudit(prisma);

  if (jsonOut) {
    console.log(JSON.stringify(report, null, 2));
  } else {
    console.log(formatEanAuditText(report));
  }

  process.exit(report.ok ? 0 : 2);
}

main()
  .catch((e) => {
    console.error(`❌ EAN AUDIT FAILED: ${e instanceof Error ? e.message : e}`);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
