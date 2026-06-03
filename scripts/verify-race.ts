/**
 * Test wyścigu: dwie równoległe rezerwacje jednego egzemplarza.
 *
 *   docker compose up -d && npx prisma db push && npm run db:seed
 *   npm run verify:race
 */
import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { FlowError } from "../src/lib/flows/library-flow";
import { runRaceReservationTest } from "../src/lib/flows/race-flow";

const prisma = new PrismaClient();

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error("❌ RACE TEST FAILED: brak DATABASE_URL w .env");
    process.exit(1);
  }

  try {
    await runRaceReservationTest(prisma);
    console.log("\n✅ RACE TEST OK");
  } catch (e) {
    const reason =
      e instanceof FlowError
        ? e.message
        : e instanceof Error
          ? e.message
          : String(e);
    console.error(`\n❌ RACE TEST FAILED: ${reason}`);
    if (e instanceof Error && e.stack && process.env.DEBUG) {
      console.error(e.stack);
    }
    process.exit(1);
  }
}

main().finally(() => prisma.$disconnect());
