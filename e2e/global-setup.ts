import "dotenv/config";
import { cleanupE2eData, ensureE2eFlowFixture, prepareE2eUserState } from "./db-cleanup";

export default async function globalSetup() {
  if (!process.env.DATABASE_URL) {
    throw new Error("Brak DATABASE_URL — uruchom bazę (docker compose lub npx prisma dev --detach).");
  }
  await cleanupE2eData();
  await prepareE2eUserState();
  await ensureE2eFlowFixture();
}
