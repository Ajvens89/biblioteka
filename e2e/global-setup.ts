import "dotenv/config";
import { cleanupE2eData, ensureE2eFlowFixture, prepareE2eUserState } from "./db-cleanup";
import { skipE2eDatabaseChanges } from "./test-target";

export default async function globalSetup() {
  if (skipE2eDatabaseChanges()) {
    console.log(
      "ℹ️  Playwright: pominięto setup bazy (testy przeciwko staging URL lub PLAYWRIGHT_SKIP_DB_SETUP=1).",
    );
    console.log("   Upewnij się, że na staging działa: npm run db:seed:staging");
    return;
  }

  if (!process.env.DATABASE_URL) {
    throw new Error("Brak DATABASE_URL — uruchom bazę (docker compose lub npx prisma dev --detach).");
  }
  await cleanupE2eData();
  await prepareE2eUserState();
  await ensureE2eFlowFixture();
}
