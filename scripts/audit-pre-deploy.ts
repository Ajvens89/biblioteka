/**
 * Read-only audyt przed wdrożeniem — baza i konta (bez sekretów).
 *   npm run audit:pre-deploy
 */
import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const SEED_EMAILS = [
  "admin@example.com",
  "bibliotekarz@example.com",
  "user@example.com",
];

function parseDbHostSafe(databaseUrl: string | undefined) {
  if (!databaseUrl) {
    return { configured: false as const };
  }
  try {
    const normalized = databaseUrl.replace(/^postgresql:\/\//, "https://");
    const u = new URL(normalized);
    const host = u.hostname;
    const database = u.pathname.replace(/^\//, "").split("?")[0] || "(default)";
    const isNeon = host.includes("neon.tech");
    const isLocal =
      host === "localhost" || host === "127.0.0.1" || host.endsWith(".local");
    const looksLikeProdMarker =
      host.includes("neon.tech") ||
      databaseUrl.includes("pooler") ||
      database.includes("neondb");
    return {
      configured: true as const,
      host,
      database,
      provider: isNeon ? "Neon PostgreSQL" : isLocal ? "local/Docker" : "PostgreSQL (other)",
      looksLikeProdMarker,
    };
  } catch {
    return { configured: true as const, host: "(parse error)", database: "?", provider: "unknown", looksLikeProdMarker: false };
  }
}

async function main() {
  const prisma = new PrismaClient();
  const dbInfo = parseDbHostSafe(process.env.DATABASE_URL);

  console.log("=== AUDYT PRZED WDROŻENIEM (read-only) ===\n");

  console.log("--- Identyfikacja bazy (bez URL/haseł) ---");
  if (!dbInfo.configured) {
    console.log("DATABASE_URL: nie skonfigurowany w tym środowisku");
  } else {
    console.log(`Provider:     ${dbInfo.provider}`);
    console.log(`Host:         ${dbInfo.host}`);
    console.log(`Nazwa bazy:   ${dbInfo.database}`);
    console.log(
      `Neon branch:  nieustalone z samego hosta — sprawdź w Neon Console (Projects → Branches)`,
    );
    console.log(
      `Neon project: nieustalone z samego hosta — dopasuj host w Neon Console do powyższego host`,
    );
  }

  const [gameCount, copyCount, profileCount] = await Promise.all([
    prisma.game.count({ where: { deletedAt: null, isActive: true } }),
    prisma.gameCopy.count(),
    prisma.profile.count(),
  ]);

  console.log("\n--- Metryki katalogu (porównaj z prod: 509 / 487) ---");
  console.log(`Aktywne gry:  ${gameCount}`);
  console.log(`Egzemplarze:  ${copyCount}`);
  console.log(`Profile:      ${profileCount}`);

  const prodMatch =
    gameCount === 509 ? "prawdopodobnie ta sama baza co prod" : "prawdopodobnie INNA baza niż prod";
  console.log(`Ocena:        ${prodMatch}`);

  console.log("\n--- Konta ADMIN (wszystkie) ---");
  const admins = await prisma.profile.findMany({
    where: { role: "ADMIN" },
    select: {
      id: true,
      email: true,
      isBlocked: true,
      createdAt: true,
    },
    orderBy: { email: "asc" },
  });

  if (admins.length === 0) {
    console.log("⚠ BRAK konta ADMIN — BLOCKER wdrożenia");
  } else {
    for (const a of admins) {
      const seed = a.email.endsWith("@example.com") ? " [SEED]" : " [PRODUKCYJNE?]";
      console.log(`  ${a.email}${seed} | blocked=${a.isBlocked} | utworzono=${a.createdAt.toISOString()}`);
    }
  }

  const realAdmins = admins.filter((a) => !a.email.endsWith("@example.com") && !a.isBlocked);
  console.log(
    `\nPrawdziwe aktywne ADMIN (≠ @example.com): ${realAdmins.length > 0 ? realAdmins.map((a) => a.email).join(", ") : "BRAK"}`,
  );

  console.log("\n--- Szczegóły kont seed ---");
  for (const email of SEED_EMAILS) {
    const profile = await prisma.profile.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        role: true,
        isBlocked: true,
        createdAt: true,
      },
    });
    if (!profile) {
      console.log(`\n${email}: nie istnieje`);
      continue;
    }

    const [
      activeReservations,
      totalReservations,
      activeLoans,
      totalLoans,
      auditAsActor,
      lastLoginAudit,
    ] = await Promise.all([
      prisma.reservation.count({
        where: {
          userId: profile.id,
          status: { in: ["PENDING", "APPROVED", "READY_FOR_PICKUP"] },
        },
      }),
      prisma.reservation.count({ where: { userId: profile.id } }),
      prisma.loan.count({
        where: { userId: profile.id, status: { in: ["ACTIVE", "OVERDUE"] } },
      }),
      prisma.loan.count({ where: { userId: profile.id } }),
      prisma.auditLog.count({ where: { actorId: profile.id } }),
      prisma.auditLog.findFirst({
        where: { actorId: profile.id, action: "LOGIN" },
        orderBy: { createdAt: "desc" },
        select: { createdAt: true },
      }),
    ]);

    console.log(`\n${email}`);
    console.log(`  id:                    ${profile.id}`);
    console.log(`  rola:                  ${profile.role}`);
    console.log(`  aktywne:               ${profile.isBlocked ? "NIE (zablokowane)" : "TAK"}`);
    console.log(`  utworzono:             ${profile.createdAt.toISOString()}`);
    console.log(
      `  ostatnie LOGIN w audit: ${lastLoginAudit?.createdAt.toISOString() ?? "brak wpisu LOGIN"}`,
    );
    console.log(`  aktywne rezerwacje:    ${activeReservations}`);
    console.log(`  rezerwacje łącznie:    ${totalReservations}`);
    console.log(`  aktywne wypożyczenia:  ${activeLoans}`);
    console.log(`  wypożyczenia łącznie:  ${totalLoans}`);
    console.log(`  wpisy audit (actor):   ${auditAsActor}`);

    const canDeactivate =
      activeReservations === 0 &&
      activeLoans === 0 &&
      !profile.email.endsWith("@example.com")
        ? "tak"
        : profile.email === "admin@example.com" && realAdmins.length === 0
          ? "NIE — jedyny ADMIN"
          : activeReservations > 0 || activeLoans > 0
            ? "ostrożnie — aktywne operacje"
            : "tak (po potwierdzeniu prod ADMIN)";

    console.log(`  bezpieczna dezaktywacja: ${canDeactivate}`);
    console.log(`  usunięcie konta:         wymaga CASCADE check — rezerwacje=${totalReservations}, loans=${totalLoans}`);
  }

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error("Błąd:", e instanceof Error ? e.message : e);
  process.exit(2);
});
