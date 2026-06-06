import "dotenv/config";
import { isDatabaseAvailable } from "../src/lib/db";

async function main() {
  const ok = await isDatabaseAvailable();
  if (ok) {
    console.log("DB OK");
    process.exit(0);
  }
  console.error("DB niedostępna. Uruchom: npm run dev:db");
  process.exit(1);
}

main();
