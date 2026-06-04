import "dotenv/config";
import { cleanupE2eData, ensureE2eFlowFixture, prepareE2eUserState } from "./db-cleanup";

function isRemotePlaywrightTarget(): boolean {
  const base = process.env.PLAYWRIGHT_BASE_URL?.trim();
  if (!base) return false;
  return !/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?(\/|$)/i.test(base);
}

export default async function globalSetup() {
  if (process.env.PLAYWRIGHT_SKIP_DB_SETUP === "1" || isRemotePlaywrightTarget()) {
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
