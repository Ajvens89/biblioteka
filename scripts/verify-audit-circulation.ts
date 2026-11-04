/** Destructive integration fixtures are permitted only in the explicitly named local audit DB. */
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { PrismaClient, type Prisma } from "@prisma/client";
import { cancelReservation, extendPickupDeadline } from "../src/lib/services/reservations";
import { extendLoan, issueLoanFromReservation, issueWalkInLoan, returnLoan } from "../src/lib/services/loans";
import { approveExtensionRequest } from "../src/lib/services/extension-requests";
import { markOverdueLoansJob } from "../src/lib/jobs/loan-maintenance";
import { createPasswordResetToken, resetPasswordWithToken } from "../src/lib/services/password-reset";
import { expireReservations } from "../src/lib/jobs/expire-reservations";
import { updateCopyIfUnchanged } from "../src/lib/services/copy-update";

function requireIsolatedDatabase() {
  const url = new URL(process.env.DATABASE_URL ?? "");
  assert.equal(url.protocol, "postgresql:");
  assert.equal(url.hostname, "127.0.0.1");
  assert.equal(url.port, "51222");
  assert.equal(url.pathname, "/biblioteka_audit_20261104");
  assert.equal(url.searchParams.get("schema"), "library_audit_20261104");
  assert.equal(url.searchParams.get("connection_limit"), "1");
  assert.equal(process.env.DIRECT_URL, process.env.DATABASE_URL);
}

async function main() {
  requireIsolatedDatabase();
  const db = new PrismaClient();
  (globalThis as typeof globalThis & { prisma?: PrismaClient }).prisma = db;
  const run = randomUUID();
  const user = await db.profile.create({ data: {
    authUserId: `audit-race:${run}`, email: `audit-race-${run}@example.invalid`,
    role: "USER", emailNotificationsEnabled: false,
  } });
  const audit = { actorId: user.id };
  const gameIds: string[] = [];
  const results: Array<{ scenario: string; passed: number }> = [];
  let sequence = 0;
  async function fixture(expired = false) {
    sequence++;
    const game = await db.game.create({ data: { title: "Audit race fixture", slug: `audit-race-${run}-${sequence}` } });
    gameIds.push(game.id);
    const copy = await db.gameCopy.create({ data: {
      gameId: game.id, inventoryNumber: `AUDIT-${run}-${sequence}`, status: "RESERVED",
    } });
    const reservation = await db.reservation.create({ data: {
      userId: user.id, gameId: game.id, copyId: copy.id, status: "PENDING",
      pickupDeadline: new Date(Date.now() + (expired ? -86_400_000 : 86_400_000)),
    } });
    return { game, copy, reservation };
  }
  function scopedExpiryDb(reservationId: string) {
    return new Proxy(db, {
      get(target, property) {
        if (property === "reservation") return new Proxy(target.reservation, {
          get(delegate, method) {
            if (method === "findMany") return (args: Prisma.ReservationFindManyArgs) => delegate.findMany({
              ...args, where: { AND: [args.where ?? {}, { id: reservationId }] },
            });
            const value = Reflect.get(delegate, method);
            return typeof value === "function" ? value.bind(delegate) : value;
          },
        });
        const value = Reflect.get(target, property);
        return typeof value === "function" ? value.bind(target) : value;
      },
    });
  }
  try {
    for (let i = 0; i < 10; i++) {
      const { reservation, copy } = await fixture();
      const outcomes = await Promise.allSettled([
        issueLoanFromReservation(db, reservation.id, audit),
        cancelReservation(db, reservation.id, copy.id, audit),
      ]);
      assert.equal(outcomes.filter((outcome) => outcome.status === "fulfilled").length, 1);
      const current = await db.reservation.findUniqueOrThrow({ where: { id: reservation.id } });
      const stock = await db.gameCopy.findUniqueOrThrow({ where: { id: copy.id } });
      const active = await db.loan.count({ where: { copyId: copy.id, status: { in: ["ACTIVE", "OVERDUE"] } } });
      assert.ok(current.status === "BORROWED" || current.status === "CANCELLED");
      assert.equal(stock.status, current.status === "BORROWED" ? "BORROWED" : "AVAILABLE");
      assert.equal(active, current.status === "BORROWED" ? 1 : 0);
    }
    results.push({ scenario: "issue versus cancel", passed: 10 });

    for (let i = 0; i < 5; i++) {
      const { reservation, copy } = await fixture();
      const { loanId } = await issueLoanFromReservation(db, reservation.id, audit);
      const outcomes = await Promise.allSettled([returnLoan(db, loanId, audit), returnLoan(db, loanId, audit)]);
      assert.equal(outcomes.filter((outcome) => outcome.status === "fulfilled").length, 1);
      const newLoan = await issueWalkInLoan(db, user.id, copy.id, audit);
      await assert.rejects(() => returnLoan(db, loanId, audit));
      assert.equal((await db.gameCopy.findUniqueOrThrow({ where: { id: copy.id } })).status, "BORROWED");
      assert.equal((await db.loan.findUniqueOrThrow({ where: { id: newLoan.loanId } })).status, "ACTIVE");
    }
    results.push({ scenario: "double return followed by new issue", passed: 5 });

    const { token } = await createPasswordResetToken(db, user.id);
    const resets = await Promise.allSettled([
      resetPasswordWithToken(db, token, "Audit password attempt one!"),
      resetPasswordWithToken(db, token, "Audit password attempt two!"),
    ]);
    assert.equal(resets.filter((outcome) => outcome.status === "fulfilled").length, 1);
    await assert.rejects(() => resetPasswordWithToken(db, token, "Cannot reuse this token!"));
    results.push({ scenario: "concurrent password-reset token use", passed: 1 });

    for (let i = 0; i < 10; i++) {
      const { reservation, copy } = await fixture(true);
      const [issue, expiry] = await Promise.allSettled([
        issueLoanFromReservation(db, reservation.id, audit),
        expireReservations(scopedExpiryDb(reservation.id), { actorId: user.id }),
      ]);
      assert.equal(expiry.status, "fulfilled");
      const current = await db.reservation.findUniqueOrThrow({ where: { id: reservation.id } });
      const stock = await db.gameCopy.findUniqueOrThrow({ where: { id: copy.id } });
      assert.equal(current.status, issue.status === "fulfilled" ? "BORROWED" : "EXPIRED");
      assert.equal(stock.status, issue.status === "fulfilled" ? "BORROWED" : "AVAILABLE");
    }
    results.push({ scenario: "issue versus expiry job", passed: 10 });

    for (let i = 0; i < 5; i++) {
      const { reservation, copy } = await fixture(true);
      const [extension, expiry] = await Promise.allSettled([
        extendPickupDeadline(db, reservation.id, 7, audit),
        expireReservations(scopedExpiryDb(reservation.id), { actorId: user.id }),
      ]);
      assert.equal(expiry.status, "fulfilled");
      const current = await db.reservation.findUniqueOrThrow({ where: { id: reservation.id } });
      const stock = await db.gameCopy.findUniqueOrThrow({ where: { id: copy.id } });
      if (extension.status === "fulfilled") {
        assert.equal(current.status, "PENDING");
        assert.ok(current.pickupDeadline && current.pickupDeadline > new Date());
        assert.equal(stock.status, "RESERVED");
      } else {
        assert.equal(current.status, "EXPIRED");
        assert.equal(stock.status, "AVAILABLE");
      }
    }
    results.push({ scenario: "pickup extension versus expiry", passed: 5 });

    for (let i = 0; i < 5; i++) {
      const { reservation, copy } = await fixture();
      const { loanId } = await issueLoanFromReservation(db, reservation.id, audit);
      const [, returned] = await Promise.allSettled([
        extendLoan(db, loanId, 7, audit), returnLoan(db, loanId, audit),
      ]);
      assert.equal(returned.status, "fulfilled");
      assert.equal((await db.loan.findUniqueOrThrow({ where: { id: loanId } })).status, "RETURNED");
      assert.equal((await db.gameCopy.findUniqueOrThrow({ where: { id: copy.id } })).status, "AVAILABLE");
    }
    results.push({ scenario: "staff extension versus return", passed: 5 });

    for (let i = 0; i < 5; i++) {
      const { reservation, copy } = await fixture();
      const { loanId } = await issueLoanFromReservation(db, reservation.id, audit);
      const request = await db.loanExtensionRequest.create({ data: { loanId, userId: user.id, requestedDays: 7 } });
      const [, returned] = await Promise.allSettled([
        approveExtensionRequest(db, request.id, user.id), returnLoan(db, loanId, audit),
      ]);
      assert.equal(returned.status, "fulfilled");
      assert.equal((await db.loan.findUniqueOrThrow({ where: { id: loanId } })).status, "RETURNED");
      assert.equal((await db.gameCopy.findUniqueOrThrow({ where: { id: copy.id } })).status, "AVAILABLE");
    }
    results.push({ scenario: "extension approval versus return", passed: 5 });

    for (let i = 0; i < 5; i++) {
      const { reservation } = await fixture();
      const { loanId } = await issueLoanFromReservation(db, reservation.id, audit);
      await db.loan.update({ where: { id: loanId }, data: { dueAt: new Date(Date.now() - 86_400_000) } });
      const oldCandidate = await db.loan.findUniqueOrThrow({
        where: { id: loanId }, include: { user: true, copy: { include: { game: true } } },
      });
      await extendLoan(db, loanId, 7, audit);
      const staleJobDb = new Proxy(db, { get(target, property) {
        if (property === "loan") return new Proxy(target.loan, { get(delegate, method) {
          if (method === "findMany") return async () => [oldCandidate];
          const value = Reflect.get(delegate, method);
          return typeof value === "function" ? value.bind(delegate) : value;
        } });
        const value = Reflect.get(target, property);
        return typeof value === "function" ? value.bind(target) : value;
      } });
      assert.deepEqual(await markOverdueLoansJob(staleJobDb, { actorId: user.id }), { marked: 0 });
      assert.equal((await db.loan.findUniqueOrThrow({ where: { id: loanId } })).status, "ACTIVE");
    }
    results.push({ scenario: "overdue stale snapshot after a deadline extension", passed: 5 });

    const { copy } = await fixture();
    await assert.rejects(() => updateCopyIfUnchanged(db, copy.id, "AVAILABLE", { status: "AVAILABLE", notes: "stale" }));
    await assert.rejects(() => updateCopyIfUnchanged(db, copy.id, "RESERVED", { status: "AVAILABLE" }));
    assert.equal((await db.gameCopy.findUniqueOrThrow({ where: { id: copy.id } })).status, "RESERVED");
    results.push({ scenario: "stale or actively reserved copy edit", passed: 2 });
    console.log(JSON.stringify({ allPassed: true, checks: 48, results }, null, 2));
  } finally {
    // Delete only this run's generated rows, never seeded catalog or other audit fixtures.
    await db.notification.deleteMany({ where: { userId: user.id } });
    await db.passwordResetToken.deleteMany({ where: { userId: user.id } });
    await db.auditLog.deleteMany({ where: { actorId: user.id } });
    await db.loanExtensionRequest.deleteMany({ where: { userId: user.id } });
    await db.loanExtension.deleteMany({ where: { loan: { userId: user.id } } });
    await db.loan.deleteMany({ where: { userId: user.id } });
    await db.reservation.deleteMany({ where: { userId: user.id } });
    await db.game.deleteMany({ where: { id: { in: gameIds } } });
    await db.profile.delete({ where: { id: user.id } });
    await db.$disconnect();
  }
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
