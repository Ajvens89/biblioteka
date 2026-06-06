/**
 * Uzupełnia brakujące kolumny (gdy baza powstała ze starego schematu).
 *   npm run db:patch
 */
import "dotenv/config";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import pg from "pg";

function cleanUrl(raw: string): string {
  return raw.replace(/[?&]pgbouncer=true/gi, "").replace(/\?&/, "?").replace(/\?$/, "");
}

function candidateUrls(): string[] {
  const ordered: string[] = [];
  const add = (raw?: string) => {
    if (!raw) return;
    const u = cleanUrl(raw);
    if (!ordered.includes(u)) ordered.push(u);
  };
  add(process.env.DATABASE_URL);
  add(process.env.DIRECT_URL);
  add("postgres://postgres:postgres@127.0.0.1:51214/template1?sslmode=disable");
  add("postgres://postgres:postgres@127.0.0.1:51215/template1?sslmode=disable");
  return ordered;
}

async function connectAll(): Promise<pg.Client[]> {
  const clients: pg.Client[] = [];
  let lastError: unknown;
  for (const url of candidateUrls()) {
    const client = new pg.Client({ connectionString: url });
    try {
      await client.connect();
      console.log("Połączono:", url.replace(/:[^:@]+@/, ":****@"));
      clients.push(client);
    } catch (e) {
      lastError = e;
      await client.end().catch(() => {});
    }
  }
  if (!clients.length) throw lastError ?? new Error("Brak połączenia z PostgreSQL");
  return clients;
}

async function hasGamesTable(client: pg.Client): Promise<boolean> {
  const r = await client.query<{ exists: boolean }>(
    `SELECT EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = 'games'
    ) AS exists`,
  );
  return Boolean(r.rows[0]?.exists);
}

async function main() {
  const clients = await connectAll();
  const patchSql = readFileSync(resolve(__dirname, "patch-schema.sql"), "utf8");
  const migrationSql = readFileSync(
    resolve(__dirname, "../prisma/migrations/20250603120000_init/migration.sql"),
    "utf8",
  );

  try {
    for (const client of clients) {
      const hasGames = await hasGamesTable(client);
      if (!hasGames) {
        console.log("Brak tabeli games — uruchamiam pełną migrację init…");
        await client.query(migrationSql);
      } else {
        await client.query(patchSql);
        console.log("Patch kolumn na istniejącej tabeli games.");
      }
    }

    const prisma = new (await import("@prisma/client")).PrismaClient();
    try {
      await prisma.game.findMany({ take: 1, select: { id: true, coverImageSource: true } });
      console.log("✅ Prisma Client OK (DATABASE_URL =", cleanUrl(process.env.DATABASE_URL ?? "").replace(/:[^:@]+@/, ":****@"), ")");
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error("\n❌ Prisma Client nie widzi poprawnej bazy:");
      console.error(msg.split("\n")[0]);
      console.error(
        "\nW pliku .env (oba URL na port TCP z `npx prisma dev ls`, zwykle 51214):\n" +
          'DATABASE_URL="postgres://postgres:postgres@localhost:51214/template1?sslmode=disable"\n' +
          'DIRECT_URL="postgres://postgres:postgres@localhost:51214/template1?sslmode=disable"\n' +
          "BEZ &pgbouncer=true. Potem: Ctrl+C → npm run dev",
      );
      process.exit(1);
    } finally {
      await prisma.$disconnect();
    }

    console.log("\n✅ Baza gotowa. Odśwież przeglądarkę (F5).");
  } finally {
    for (const c of clients) await c.end().catch(() => {});
  }
}

main().catch((e) => {
  console.error("❌ Patch failed:", e instanceof Error ? e.message : e);
  console.error("\nUruchom najpierw: npm run dev:db");
  process.exit(1);
});
