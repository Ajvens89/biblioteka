/**
 * Read-only audyt kont seed (@example.com) w bazie.
 *   npm run audit:seed-accounts
 *
 * Nie wyświetla hashy haseł ani sekretów.
 */
import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const SEED_EMAILS = [
  "admin@example.com",
  "bibliotekarz@example.com",
  "user@example.com",
  "verify-race-b@example.com",
];

async function main() {
  const prisma = new PrismaClient();

  const profiles = await prisma.profile.findMany({
    where: { email: { in: SEED_EMAILS } },
    select: {
      id: true,
      email: true,
      role: true,
      isBlocked: true,
      createdAt: true,
      authUserId: true,
    },
    orderBy: { email: "asc" },
  });

  console.log("=== Audyt kont seed (read-only) ===\n");
  console.log(`Sprawdzono adresy: ${SEED_EMAILS.join(", ")}\n`);

  if (profiles.length === 0) {
    console.log("✓ Brak rozpoznawalnych kont seed w bazie.");
  } else {
    console.log(`Znaleziono ${profiles.length} kont:\n`);
    for (const p of profiles) {
      console.log(`  email:      ${p.email}`);
      console.log(`  id:         ${p.id}`);
      console.log(`  rola:       ${p.role}`);
      console.log(`  zablokowany: ${p.isBlocked}`);
      console.log(`  utworzono:  ${p.createdAt.toISOString()}`);
      console.log(`  authUserId: ${p.authUserId}`);
      console.log("");
    }
    console.log(
      "⚠ Na produkcji rozważ usunięcie lub dezaktywację kont @example.com (wymaga decyzji właściciela).",
    );
  }

  await prisma.$disconnect();
  process.exit(profiles.length > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error("Błąd audytu:", e instanceof Error ? e.message : e);
  process.exit(2);
});
