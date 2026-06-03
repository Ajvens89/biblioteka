/**
 * Test przepływu verify:flow — wywołuje te same serwisy co Server Actions (UI).
 */
import type { AuditAction, PrismaClient } from "@prisma/client";
import * as loanService from "@/lib/services/loans";
import * as reservationService from "@/lib/services/reservations";
import { isServiceError } from "@/lib/services/errors";

export const VERIFY_FLOW_EMAILS = {
  user: "user@example.com",
  librarian: "bibliotekarz@example.com",
  admin: "admin@example.com",
} as const;

export type FlowContext = {
  runId: string;
  userId: string;
  librarianId: string;
  gameId: string;
  copyId: string;
  tag?: "verify-flow" | "verify-race";
  reservationId?: string;
  loanId?: string;
};

export class FlowError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "FlowError";
  }
}

function toFlowError(e: unknown): FlowError {
  if (e instanceof FlowError) return e;
  if (isServiceError(e)) return new FlowError(e.message);
  if (e instanceof Error) return new FlowError(e.message);
  return new FlowError(String(e));
}

function flowAudit(ctx: FlowContext, extra?: Record<string, unknown>) {
  return {
    actorId: ctx.librarianId,
    metadata: { source: ctx.tag ?? "verify-flow", runId: ctx.runId, ...extra },
  };
}

export async function assertDbConnection(prisma: PrismaClient) {
  await prisma.$connect();
}

export async function assertSeedAccounts(prisma: PrismaClient) {
  for (const email of Object.values(VERIFY_FLOW_EMAILS)) {
    const profile = await prisma.profile.findUnique({ where: { email } });
    if (!profile) {
      throw new FlowError(`Brak konta w bazie: ${email}. Uruchom: npm run db:seed`);
    }
    if (email === VERIFY_FLOW_EMAILS.user && !profile.passwordHash) {
      throw new FlowError(`Konto ${email} nie ma password_hash (tryb local). Uruchom seed.`);
    }
  }
}

export async function findAvailableGame(prisma: PrismaClient) {
  const copy = await prisma.gameCopy.findFirst({
    where: {
      status: "AVAILABLE",
      game: { isActive: true, deletedAt: null },
    },
    include: { game: true },
    orderBy: { inventoryNumber: "asc" },
  });
  if (!copy) {
    throw new FlowError(
      "Brak egzemplarza AVAILABLE. Uruchom seed lub zwolnij egzemplarz w panelu.",
    );
  }
  return { gameId: copy.gameId, copyId: copy.id, gameTitle: copy.game.title };
}

export async function flowCreateReservation(
  prisma: PrismaClient,
  ctx: FlowContext,
): Promise<string> {
  try {
    const { reservationId } = await reservationService.reserveGame(prisma, {
      userId: ctx.userId,
      gameId: ctx.gameId,
      copyId: ctx.copyId,
      notes: `${ctx.tag ?? "verify-flow"}:${ctx.runId}`,
      audit: {
        actorId: ctx.userId,
        metadata: { source: ctx.tag ?? "verify-flow", runId: ctx.runId },
      },
    });
    return reservationId;
  } catch (e) {
    throw toFlowError(e);
  }
}

export type ReservationAttemptResult =
  | { ok: true; reservationId: string }
  | { ok: false; error: string };

export async function attemptFlowCreateReservation(
  prisma: PrismaClient,
  params: {
    runId: string;
    userId: string;
    gameId: string;
    copyId: string;
    source: "verify-flow" | "verify-race";
  },
): Promise<ReservationAttemptResult> {
  const ctx: FlowContext = {
    runId: params.runId,
    userId: params.userId,
    librarianId: params.userId,
    gameId: params.gameId,
    copyId: params.copyId,
    tag: params.source,
  };
  try {
    const reservationId = await flowCreateReservation(prisma, ctx);
    return { ok: true, reservationId };
  } catch (e) {
    const error = e instanceof FlowError ? e.message : e instanceof Error ? e.message : String(e);
    return { ok: false, error };
  }
}

export async function flowAssertReservationPending(
  prisma: PrismaClient,
  reservationId: string,
  copyId: string,
) {
  const [reservation, copy] = await Promise.all([
    prisma.reservation.findUnique({ where: { id: reservationId } }),
    prisma.gameCopy.findUnique({ where: { id: copyId } }),
  ]);
  if (!reservation) throw new FlowError("Brak rekordu reservation.");
  if (reservation.status !== "PENDING") {
    throw new FlowError(`Oczekiwano PENDING, jest: ${reservation.status}`);
  }
  if (!copy) throw new FlowError("Brak game_copy.");
  if (copy.status !== "RESERVED") {
    throw new FlowError(`Oczekiwano RESERVED na egzemplarzu, jest: ${copy.status}`);
  }
}

export async function flowApproveReservation(
  prisma: PrismaClient,
  ctx: FlowContext,
  reservationId: string,
) {
  try {
    await reservationService.approveReservation(prisma, reservationId, {
      actorId: ctx.librarianId,
      metadata: { source: "verify-flow", runId: ctx.runId },
    });
  } catch (e) {
    throw toFlowError(e);
  }
}

export async function flowMarkReadyForPickup(
  prisma: PrismaClient,
  ctx: FlowContext,
  reservationId: string,
) {
  try {
    await reservationService.markReadyForPickup(prisma, reservationId, flowAudit(ctx));
  } catch (e) {
    throw toFlowError(e);
  }
}

export async function flowIssueLoan(
  prisma: PrismaClient,
  ctx: FlowContext,
  reservationId: string,
): Promise<string> {
  try {
    const { loanId } = await loanService.issueLoanFromReservation(
      prisma,
      reservationId,
      flowAudit(ctx, { reservationId }),
    );
    return loanId;
  } catch (e) {
    throw toFlowError(e);
  }
}

export async function flowAssertBorrowedState(
  prisma: PrismaClient,
  reservationId: string,
  loanId: string,
  copyId: string,
) {
  const [loan, reservation, copy] = await Promise.all([
    prisma.loan.findUnique({ where: { id: loanId } }),
    prisma.reservation.findUnique({ where: { id: reservationId } }),
    prisma.gameCopy.findUnique({ where: { id: copyId } }),
  ]);
  if (!loan || loan.status !== "ACTIVE") {
    throw new FlowError(`loan: oczekiwano ACTIVE, jest ${loan?.status ?? "brak"}`);
  }
  if (!reservation || reservation.status !== "BORROWED") {
    throw new FlowError(`reservation: oczekiwano BORROWED, jest ${reservation?.status ?? "brak"}`);
  }
  if (!copy || copy.status !== "BORROWED") {
    throw new FlowError(`copy: oczekiwano BORROWED, jest ${copy?.status ?? "brak"}`);
  }
}

export async function flowReturnLoan(
  prisma: PrismaClient,
  ctx: FlowContext,
  loanId: string,
) {
  try {
    await loanService.returnLoan(prisma, loanId, flowAudit(ctx));
  } catch (e) {
    throw toFlowError(e);
  }
}

export async function flowAssertReturnedState(
  prisma: PrismaClient,
  reservationId: string,
  loanId: string,
  copyId: string,
) {
  const [loan, reservation, copy] = await Promise.all([
    prisma.loan.findUnique({ where: { id: loanId } }),
    prisma.reservation.findUnique({ where: { id: reservationId } }),
    prisma.gameCopy.findUnique({ where: { id: copyId } }),
  ]);
  if (!loan || loan.status !== "RETURNED") {
    throw new FlowError(`loan: oczekiwano RETURNED, jest ${loan?.status ?? "brak"}`);
  }
  if (!reservation || reservation.status !== "RETURNED") {
    throw new FlowError(`reservation: oczekiwano RETURNED, jest ${reservation?.status ?? "brak"}`);
  }
  if (!copy || copy.status !== "AVAILABLE") {
    throw new FlowError(`copy: oczekiwano AVAILABLE, jest ${copy?.status ?? "brak"}`);
  }
}

const REQUIRED_AUDIT: Array<{ action: AuditAction; entityType: string }> = [
  { action: "RESERVE", entityType: "reservation" },
  { action: "APPROVE", entityType: "reservation" },
  { action: "UPDATE", entityType: "reservation" },
  { action: "BORROW", entityType: "loan" },
  { action: "RETURN", entityType: "loan" },
];

function auditMatchesRun(metadata: unknown, runId: string): boolean {
  if (!metadata || typeof metadata !== "object") return false;
  return (metadata as { runId?: string }).runId === runId;
}

export async function flowAssertAuditLogs(
  prisma: PrismaClient,
  reservationId: string,
  loanId: string,
  runId: string,
) {
  const logs = await prisma.auditLog.findMany({
    where: {
      OR: [{ entityId: reservationId }, { entityId: loanId }],
    },
  });
  const scoped = logs.filter((l) => auditMatchesRun(l.metadata, runId));

  for (const req of REQUIRED_AUDIT) {
    const found = scoped.some(
      (l) => l.action === req.action && l.entityType === req.entityType,
    );
    if (!found) {
      throw new FlowError(
        `Brak audit_log: action=${req.action}, entityType=${req.entityType}, runId=${runId}`,
      );
    }
  }
}

export async function flowCleanup(
  prisma: PrismaClient,
  ctx: FlowContext,
) {
  if (ctx.loanId) {
    await prisma.loanExtension.deleteMany({ where: { loanId: ctx.loanId } });
    await prisma.loan.deleteMany({ where: { id: ctx.loanId } });
  }
  if (ctx.reservationId) {
    await prisma.notification.deleteMany({
      where: {
        userId: ctx.userId,
        body: { contains: ctx.runId },
      },
    });
    await prisma.reservation.deleteMany({ where: { id: ctx.reservationId } });
  }
  if (ctx.copyId) {
    await prisma.gameCopy.updateMany({
      where: { id: ctx.copyId },
      data: { status: "AVAILABLE" },
    });
  }
  const auditCandidates = await prisma.auditLog.findMany({
    where: {
      OR: [
        ctx.reservationId ? { entityId: ctx.reservationId } : {},
        ctx.loanId ? { entityId: ctx.loanId } : {},
      ],
    },
  });
  const auditIds = auditCandidates
    .filter((l) => auditMatchesRun(l.metadata, ctx.runId))
    .map((l) => l.id);
  if (auditIds.length) {
    await prisma.auditLog.deleteMany({ where: { id: { in: auditIds } } });
  }
}

export async function runLibraryFlowTest(prisma: PrismaClient): Promise<void> {
  const runId = `verify-flow-${Date.now()}`;
  const ctx: FlowContext = {
    runId,
    tag: "verify-flow",
    userId: "",
    librarianId: "",
    gameId: "",
    copyId: "",
  };

  let cleaned = false;

  try {
    await assertDbConnection(prisma);
    await assertSeedAccounts(prisma);

    const user = await prisma.profile.findUniqueOrThrow({
      where: { email: VERIFY_FLOW_EMAILS.user },
    });
    const librarian = await prisma.profile.findUniqueOrThrow({
      where: { email: VERIFY_FLOW_EMAILS.librarian },
    });
    ctx.userId = user.id;
    ctx.librarianId = librarian.id;

    const game = await findAvailableGame(prisma);
    ctx.gameId = game.gameId;
    ctx.copyId = game.copyId;

    console.log(`▶ runId=${runId}`);
    console.log(`▶ gra: ${game.gameTitle}, egzemplarz: ${ctx.copyId}`);

    ctx.reservationId = await flowCreateReservation(prisma, ctx);
    await flowAssertReservationPending(prisma, ctx.reservationId, ctx.copyId);

    await flowApproveReservation(prisma, ctx, ctx.reservationId);
    await flowMarkReadyForPickup(prisma, ctx, ctx.reservationId);

    ctx.loanId = await flowIssueLoan(prisma, ctx, ctx.reservationId);
    await flowAssertBorrowedState(prisma, ctx.reservationId, ctx.loanId, ctx.copyId);

    await flowReturnLoan(prisma, ctx, ctx.loanId);
    await flowAssertReturnedState(prisma, ctx.reservationId, ctx.loanId, ctx.copyId);

    await flowAssertAuditLogs(prisma, ctx.reservationId, ctx.loanId, runId);
  } finally {
    if (!cleaned && ctx.reservationId) {
      await flowCleanup(prisma, ctx);
      cleaned = true;
      console.log("▶ posprzątano dane testowe (runId)");
    }
  }
}
