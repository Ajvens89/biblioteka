/**
 * Szybka weryfikacja: baza + seed + profile z hasłami.
 * Uruchom: npx tsx scripts/verify-stack.ts
 */
import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🔍 Weryfikacja stosu…\n");

  const [games, copies, reservations, loans, profiles] = await Promise.all([
    prisma.game.count({ where: { deletedAt: null } }),
    prisma.gameCopy.count(),
    prisma.reservation.count(),
    prisma.loan.count(),
    prisma.profile.findMany({
      select: { email: true, role: true, passwordHash: true },
    }),
  ]);

  console.log("PostgreSQL (Prisma):");
  console.log(`  Gry:          ${games}`);
  console.log(`  Egzemplarze:  ${copies}`);
  console.log(`  Rezerwacje:   ${reservations}`);
  console.log(`  Wypożyczenia: ${loans}`);
  console.log(`  Profile:      ${profiles.length}`);

  const withPassword = profiles.filter((p) => p.passwordHash);
  console.log(`  Z hasłem (local auth): ${withPassword.length}`);

  if (games < 1) {
    console.error("\n❌ Brak gier — uruchom: npm run db:seed");
    process.exit(1);
  }
  if (withPassword.length < 1) {
    console.warn("\n⚠️  Brak profili z passwordHash — npm run db:seed");
  }

  console.log("\n✅ Baza działa. Logika biznesowa jest w Server Actions + Prisma (nie mock).");
  console.log("   Uruchom npm run dev i przetestuj logowanie /admin/rezerwacje.");
}

main()
  .catch((e) => {
    console.error("❌ Błąd połączenia z bazą:", e.message);
    console.error("   Uruchom: docker compose up -d && npx prisma db push && npm run db:seed");
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
