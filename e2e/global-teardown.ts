import { cleanupE2eAdminGame, cleanupE2eData } from "./db-cleanup";

export default async function globalTeardown() {
  await cleanupE2eAdminGame();
  await cleanupE2eData();
}
