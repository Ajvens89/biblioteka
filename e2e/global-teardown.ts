import { cleanupE2eAdminGame, cleanupE2eData } from "./db-cleanup";
import { skipE2eDatabaseChanges } from "./test-target";

export default async function globalTeardown() {
  // A remote/read-only run must never clean fixtures in the caller's database.
  if (skipE2eDatabaseChanges()) return;
  await cleanupE2eAdminGame();
  await cleanupE2eData();
}
