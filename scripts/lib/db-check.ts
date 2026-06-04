import "dotenv/config";
import { PrismaClient } from "@prisma/client";

export const DB_HELP_MESSAGE = [
  "PostgreSQL jest niedostępny lub DATABASE_URL jest niepoprawny.",
  "",
  "Uruchom bazę jedną z metod:",
  "  npx prisma dev --detach",
  "  docker compose up -d",
  "",
  "Następnie:",
  "  npx prisma db push",
  "  npm run db:seed",
].join("\n");

export function hasDatabaseUrl(): boolean {
  const url = process.env.DATABASE_URL?.trim();
  return Boolean(url && !url.includes("[") && !url.includes("YOUR_"));
}

export async function checkDatabaseConnection(): Promise<boolean> {
  if (!hasDatabaseUrl()) {
    console.error("❌ Brak DATABASE_URL w .env (skopiuj z .env.example).");
    console.error(DB_HELP_MESSAGE);
    return false;
  }

  const url = process.env.DATABASE_URL!.replace(/[?&]pgbouncer=true/gi, "");
  const prisma = new PrismaClient({ datasources: { db: { url } } });

  try {
    await prisma.$queryRaw`SELECT 1`;
    return true;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    const short =
      msg.includes("Can't reach database server") || msg.includes("ECONNREFUSED")
        ? msg.split("\n")[0]
        : msg;
    console.error("❌ Połączenie z bazą nie powiodło się.");
    console.error(`   ${short}`);
    console.error("");
    console.error(DB_HELP_MESSAGE);
    return false;
  } finally {
    await prisma.$disconnect().catch(() => undefined);
  }
}
