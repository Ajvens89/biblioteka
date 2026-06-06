/**
 * Uruchamia Prisma Dev, gdy baza nie odpowiada (np. po restarcie komputera).
 * Wywoływane przed `npm run dev`.
 */
import "dotenv/config";
import { execSync } from "node:child_process";
import { PrismaClient } from "@prisma/client";

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function run(cmd: string, stdio: "inherit" | "pipe" = "pipe") {
  execSync(cmd, { stdio });
}

async function ping(): Promise<boolean> {
  const prisma = new PrismaClient();
  try {
    await prisma.$queryRaw`SELECT 1`;
    return true;
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.warn("Ping DB:", msg.split("\n")[0]);
    return false;
  } finally {
    await prisma.$disconnect();
  }
}

async function stopPrismaDev(): Promise<void> {
  try {
    run("npx prisma dev stop default", "pipe");
    await sleep(5000);
  } catch {
    /* ignore */
  }
}

async function startPrismaDev(): Promise<void> {
  await stopPrismaDev();

  for (let attempt = 0; attempt < 4; attempt++) {
    try {
      run("npx prisma dev --detach", "inherit");
      return;
    } catch {
      const waitSec = 5 * (attempt + 1);
      console.warn(`Prisma Dev nie wystartował (próba ${attempt + 1}/4). Czekam ${waitSec}s…`);
      await sleep(waitSec * 1000);
      if (attempt === 1) await stopPrismaDev();
    }
  }

  throw new Error("Nie udało się uruchomić Prisma Dev (lock file?). Spróbuj: npx prisma dev stop default");
}

async function main() {
  if (await ping()) {
    console.log("✓ Baza danych dostępna");
    try {
      run("npx tsx scripts/patch-db-schema.ts", "inherit");
    } catch {
      console.error("⚠️  db:patch nie powiódł się — uruchom ręcznie: npm run db:patch");
    }
    return;
  }

  console.log("Baza niedostępna — uruchamiam Prisma Dev…");
  try {
    await startPrismaDev();
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error(`❌ ${msg}`);
    process.exit(1);
  }

  for (let i = 0; i < 15; i++) {
    await sleep(2000);
    if (await ping()) {
      console.log("✓ Prisma Dev gotowy");
      try {
        run("npx tsx scripts/patch-db-schema.ts", "inherit");
      } catch {
        console.error("⚠️  db:patch nie powiódł się — uruchom ręcznie: npm run db:patch");
      }
      return;
    }
  }

  console.error(
    "❌ Baza nadal niedostępna. Sprawdź DATABASE_URL w .env (port z `npx prisma dev ls`).",
  );
  process.exit(1);
}

main();
