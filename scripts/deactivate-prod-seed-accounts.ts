/**
 * Dezaktywacja produkcyjnych kont seed (admin, bibliotekarz).
 *   npm run deactivate:seed-accounts
 *   npm run deactivate:seed-accounts -- --dry-run
 */
import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const ADMIN_EMAIL = "ajvens@gmail.com";
const TO_BLOCK = ["admin@example.com", "bibliotekarz@example.com"] as const;
const KEEP_ACTIVE = ["user@example.com"] as const;
const REASON = "Dezaktywacja produkcyjnego konta seed";

async function main() {
  const dryRun = process.argv.includes("--dry-run");
  const prisma = new PrismaClient();

  const admin = await prisma.profile.findUnique({ where: { email: ADMIN_EMAIL } });
  if (!admin) {
    console.error(`BLOKADA: brak konta ${ADMIN_EMAIL}`);
    process.exit(2);
  }
  if (admin.role !== "ADMIN") {
    console.error(`BLOKADA: ${ADMIN_EMAIL} nie ma roli ADMIN (ma: ${admin.role})`);
    process.exit(2);
  }
  if (admin.isBlocked) {
    console.error(`BLOKADA: ${ADMIN_EMAIL} jest zablokowany`);
    process.exit(2);
  }

  console.log(`OK: ${ADMIN_EMAIL} — ADMIN, aktywny (actorId: ${admin.id})\n`);

  for (const email of KEEP_ACTIVE) {
    const p = await prisma.profile.findUnique({ where: { email } });
    if (!p) {
      console.warn(`Uwaga: ${email} nie istnieje`);
      continue;
    }
    console.log(`${email}: rola=${p.role}, zablokowany=${p.isBlocked} (bez zmian)`);
  }

  console.log("");
  for (const email of TO_BLOCK) {
    const profile = await prisma.profile.findUnique({ where: { email } });
    if (!profile) {
      console.log(`[pominięto] ${email} — brak w bazie`);
      continue;
    }
    if (profile.isBlocked) {
      console.log(`[OK] ${email} — już zablokowany`);
      continue;
    }

    console.log(`[blokuj] ${email}: isBlocked false → true`);
    if (!dryRun) {
      await prisma.profile.update({
        where: { id: profile.id },
        data: { isBlocked: true },
      });
      await prisma.auditLog.create({
        data: {
          actorId: admin.id,
          action: "UPDATE",
          entityType: "profile",
          entityId: profile.id,
          metadata: {
            field: "isBlocked",
            oldValue: false,
            newValue: true,
            reason: REASON,
            email,
          },
        },
      });
    }
  }

  console.log(dryRun ? "\n=== DRY RUN — brak zapisu ===" : "\nGotowe.");
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
