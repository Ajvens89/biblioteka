import type { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import {
  FlowError,
  VERIFY_FLOW_EMAILS,
  assertDbConnection,
  attemptFlowCreateReservation,
} from "@/lib/flows/library-flow";

export const RACE_TEST_SLUG = "verify-race-game";
export const RACE_COPY_INVENTORY = "VF-RACE-001";
export const RACE_USER_B_EMAIL = "verify-race-b@example.com";

const FAILURE_PATTERNS = [/race/i, /zarezerwowan/i, /dostępn/i, /brak egzemplarz/i, /no_copy/i];

function isExpectedFailureMessage(error: string): boolean {
  return FAILURE_PATTERNS.some((p) => p.test(error));
}

export async function ensureRaceUserB(prisma: PrismaClient): Promise<string> {
  const passwordHash = await bcrypt.hash("VerifyRaceB123!", 12);
  const profile = await prisma.profile.upsert({
    where: { email: RACE_USER_B_EMAIL },
    create: {
      authUserId: `local:${RACE_USER_B_EMAIL}`,
      email: RACE_USER_B_EMAIL,
      fullName: "Verify Race User B",
      role: "USER",
      passwordHash,
    },
    update: { passwordHash, isBlocked: false, role: "USER" },
  });
  return profile.id;
}

/** Gra z dokładnie jednym egzemplarzem AVAILABLE. */
export async function ensureRaceFixture(prisma: PrismaClient) {
  const game = await prisma.game.upsert({
    where: { slug: RACE_TEST_SLUG },
    create: {
      title: "Verify Race Game",
      slug: RACE_TEST_SLUG,
      description: "Fixture do testu verify:race",
      minPlayers: 2,
      maxPlayers: 4,
      minAge: 8,
      minPlayTime: 30,
      maxPlayTime: 60,
      isActive: true,
    },
    update: { isActive: true, deletedAt: null },
  });

  await prisma.gameCopy.deleteMany({
    where: {
      gameId: game.id,
      inventoryNumber: { not: RACE_COPY_INVENTORY },
    },
  });

  const copy = await prisma.gameCopy.upsert({
    where: { inventoryNumber: RACE_COPY_INVENTORY },
    create: {
      gameId: game.id,
      inventoryNumber: RACE_COPY_INVENTORY,
      status: "AVAILABLE",
      location: "Test race",
    },
    update: { gameId: game.id, status: "AVAILABLE" },
  });

  const availableCount = await prisma.gameCopy.count({
    where: { gameId: game.id, status: "AVAILABLE" },
  });
  if (availableCount !== 1) {
    throw new FlowError(
      `Fixture: oczekiwano 1 egzemplarza AVAILABLE, jest ${availableCount}.`,
    );
  }

  await prisma.reservation.updateMany({
    where: {
      copyId: copy.id,
      status: { in: ["PENDING", "APPROVED", "READY_FOR_PICKUP", "BORROWED"] },
    },
    data: { status: "CANCELLED", cancelledAt: new Date() },
  });

  return { gameId: game.id, copyId: copy.id };
}

export async function raceCleanup(
  prisma: PrismaClient,
  params: { gameId: string; copyId: string; runId: string },
) {
  const reservations = await prisma.reservation.findMany({
    where: { notes: { contains: `verify-race:${params.runId}` } },
  });
  const reservationIds = reservations.map((r) => r.id);

  if (reservationIds.length) {
    await prisma.loan.deleteMany({
      where: { reservationId: { in: reservationIds } },
    });
    await prisma.reservation.deleteMany({ where: { id: { in: reservationIds } } });
  }

  await prisma.gameCopy.update({
    where: { id: params.copyId },
    data: { status: "AVAILABLE" },
  });

  if (reservationIds.length) {
    const auditLogs = await prisma.auditLog.findMany({
      where: { entityId: { in: reservationIds } },
    });
    const auditIds = auditLogs
      .filter((l) => {
        const m = l.metadata as { runId?: string; source?: string } | null;
        return m?.source === "verify-race" && m?.runId === params.runId;
      })
      .map((l) => l.id);
    if (auditIds.length) {
      await prisma.auditLog.deleteMany({ where: { id: { in: auditIds } } });
    }
  }
}

export async function runRaceReservationTest(prisma: PrismaClient): Promise<void> {
  const runId = `verify-race-${Date.now()}`;

  await assertDbConnection(prisma);

  const userA = await prisma.profile.findUnique({
    where: { email: VERIFY_FLOW_EMAILS.user },
  });
  if (!userA) {
    throw new FlowError(`Brak ${VERIFY_FLOW_EMAILS.user}. Uruchom: npm run db:seed`);
  }

  const userBId = await ensureRaceUserB(prisma);
  const { gameId, copyId } = await ensureRaceFixture(prisma);

  console.log(`▶ runId=${runId}`);
  console.log(`▶ gra=${RACE_TEST_SLUG}, egzemplarz=${RACE_COPY_INVENTORY}`);
  console.log(`▶ userA=${VERIFY_FLOW_EMAILS.user}, userB=${RACE_USER_B_EMAIL}`);

  const prismaA = prisma;
  const { PrismaClient } = await import("@prisma/client");
  const prismaB = new PrismaClient();

  try {
    const [resultA, resultB] = await Promise.all([
      attemptFlowCreateReservation(prismaA, {
        runId,
        userId: userA.id,
        gameId,
        copyId,
        source: "verify-race",
      }),
      attemptFlowCreateReservation(prismaB, {
        runId,
        userId: userBId,
        gameId,
        copyId,
        source: "verify-race",
      }),
    ]);

    const outcomes = [
      { label: "userA", ...resultA },
      { label: "userB", ...resultB },
    ];
    const successes = outcomes.filter((o) => o.ok);
    const failures = outcomes.filter((o) => !o.ok);

    console.log("▶ wyniki równoległe:");
    for (const o of outcomes) {
      if (o.ok) console.log(`   ${o.label}: OK → ${o.reservationId}`);
      else console.log(`   ${o.label}: FAIL → ${o.error}`);
    }

    if (successes.length !== 1 || failures.length !== 1) {
      throw new FlowError(
        `Oczekiwano 1 sukces i 1 porażka, jest: ${successes.length} sukcesów, ${failures.length} porażek.`,
      );
    }

    const failMsg = failures[0].error;
    if (!isExpectedFailureMessage(failMsg)) {
      throw new FlowError(`Porażka ma nieoczekiwany komunikat: ${failMsg}`);
    }

    const activeOnCopy = await prisma.reservation.count({
      where: {
        copyId,
        status: { in: ["PENDING", "APPROVED", "READY_FOR_PICKUP", "BORROWED"] },
      },
    });
    if (activeOnCopy !== 1) {
      throw new FlowError(
        `Oczekiwano 1 aktywnej rezerwacji na egzemplarzu, jest ${activeOnCopy}.`,
      );
    }

    const copy = await prisma.gameCopy.findUnique({ where: { id: copyId } });
    if (!copy || copy.status !== "RESERVED") {
      throw new FlowError(`game_copy: oczekiwano RESERVED, jest ${copy?.status ?? "brak"}.`);
    }

    const successReservationId = successes[0].reservationId;
    const reserved = await prisma.reservation.findUnique({
      where: { id: successReservationId },
    });
    if (!reserved || reserved.copyId !== copyId) {
      throw new FlowError("Sukces nie powiązał rezerwacji z testowym egzemplarzem.");
    }
  } finally {
    await raceCleanup(prisma, { gameId, copyId, runId });
    await prismaB.$disconnect();
    console.log("▶ posprzątano dane testu race");
  }
}
