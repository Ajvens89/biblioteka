/**
 * Pełny test przepływu biblioteki na PostgreSQL (Prisma).
 *
 * Uruchomienie:
 *   docker compose up -d
 *   npx prisma db push
 *   npm run db:seed
 *   npm run verify:flow
 */
import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { FlowError, runLibraryFlowTest } from "../src/lib/flows/library-flow";

const prisma = new PrismaClient();

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error("❌ FLOW FAILED: brak DATABASE_URL w .env");
    process.exit(1);
  }

  try {
    await runLibraryFlowTest(prisma);
    console.log("\n✅ FLOW OK");
  } catch (e) {
    const reason =
      e instanceof FlowError
        ? e.message
        : e instanceof Error
          ? e.message
          : String(e);
    console.error(`\n❌ FLOW FAILED: ${reason}`);
    if (e instanceof Error && e.stack && process.env.DEBUG) {
      console.error(e.stack);
    }
    process.exit(1);
  }
}

main()
  .finally(() => prisma.$disconnect());
