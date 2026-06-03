import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import {
  CREDENTIALS,
  E2E_ADMIN_COPY_INVENTORY,
  E2E_ADMIN_GAME_SLUG,
  E2E_FLOW_COPY_INVENTORY,
  E2E_FLOW_GAME_SLUG,
  E2E_FLOW_GAME_TITLE,
  E2E_PREFIX,
} from "./constants";

export async function ensureE2eFlowFixture() {
  const prisma = new PrismaClient();
  try {
    const game = await prisma.game.upsert({
      where: { slug: E2E_FLOW_GAME_SLUG },
      create: {
        title: E2E_FLOW_GAME_TITLE,
        slug: E2E_FLOW_GAME_SLUG,
        description: "Fixture E2E — rezerwacja i wypożyczenie.",
        minPlayers: 2,
        maxPlayers: 4,
        minAge: 8,
        minPlayTime: 30,
        maxPlayTime: 60,
        isActive: true,
      },
      update: { isActive: true, deletedAt: null, title: E2E_FLOW_GAME_TITLE },
    });

    await prisma.gameCopy.upsert({
      where: { inventoryNumber: E2E_FLOW_COPY_INVENTORY },
      create: {
        gameId: game.id,
        inventoryNumber: E2E_FLOW_COPY_INVENTORY,
        status: "AVAILABLE",
        location: "E2E",
      },
      update: { gameId: game.id, status: "AVAILABLE" },
    });

    await prisma.reservation.deleteMany({ where: { gameId: game.id } });
    const copy = await prisma.gameCopy.findUnique({
      where: { inventoryNumber: E2E_FLOW_COPY_INVENTORY },
    });
    if (copy) {
      await prisma.loan.deleteMany({ where: { copyId: copy.id } });
    }
  } finally {
    await prisma.$disconnect();
  }
}

/** Czyści blokady seeda (przeterminowane wypożyczenie, limity rezerwacji). */
export async function prepareE2eUserState() {
  const prisma = new PrismaClient();
  try {
    const user = await prisma.profile.findUnique({
      where: { email: CREDENTIALS.user.email },
    });
    if (!user) return;

    const activeLoans = await prisma.loan.findMany({
      where: { userId: user.id, status: { in: ["ACTIVE", "OVERDUE"] } },
    });
    for (const loan of activeLoans) {
      await prisma.$transaction(async (tx) => {
        await tx.loan.update({
          where: { id: loan.id },
          data: { status: "RETURNED", returnedAt: new Date() },
        });
        await tx.gameCopy.update({
          where: { id: loan.copyId },
          data: { status: "AVAILABLE" },
        });
        if (loan.reservationId) {
          await tx.reservation.update({
            where: { id: loan.reservationId },
            data: { status: "RETURNED" },
          });
        }
      });
    }

    const activeReservations = await prisma.reservation.findMany({
      where: {
        userId: user.id,
        status: {
          in: ["PENDING", "APPROVED", "READY_FOR_PICKUP", "BORROWED"],
        },
      },
      include: { copy: true },
    });
    for (const r of activeReservations) {
      await prisma.$transaction(async (tx) => {
        await tx.reservation.update({
          where: { id: r.id },
          data: { status: "CANCELLED", cancelledAt: new Date() },
        });
        if (r.copyId) {
          await tx.gameCopy.update({
            where: { id: r.copyId },
            data: { status: "AVAILABLE" },
          });
        }
      });
    }
  } finally {
    await prisma.$disconnect();
  }
}

export async function cleanupE2eData() {
  const prisma = new PrismaClient();
  try {
    const games = await prisma.game.findMany({
      where: {
        OR: [
          { slug: { startsWith: E2E_PREFIX } },
          { title: { startsWith: "E2E " } },
        ],
      },
      select: { id: true },
    });

    for (const { id: gameId } of games) {
      const copyIds = (
        await prisma.gameCopy.findMany({
          where: { gameId },
          select: { id: true },
        })
      ).map((c) => c.id);

      if (copyIds.length > 0) {
        await prisma.loanExtension.deleteMany({
          where: { loan: { copyId: { in: copyIds } } },
        });
        await prisma.loan.deleteMany({ where: { copyId: { in: copyIds } } });
      }

      await prisma.reservation.deleteMany({ where: { gameId } });
      await prisma.gameCopy.deleteMany({ where: { gameId } });
      await prisma.gameImage.deleteMany({ where: { gameId } });
      await prisma.gameCategory.deleteMany({ where: { gameId } });
      await prisma.gameTag.deleteMany({ where: { gameId } });
      await prisma.game.delete({ where: { id: gameId } });
    }

    await prisma.gameCopy.deleteMany({
      where: { inventoryNumber: { startsWith: "E2E-" } },
    });
  } finally {
    await prisma.$disconnect();
  }
}

export async function cleanupE2eAdminGame() {
  const prisma = new PrismaClient();
  try {
    const game = await prisma.game.findUnique({
      where: { slug: E2E_ADMIN_GAME_SLUG },
      include: { copies: true },
    });
    if (!game) return;

    const copyIds = game.copies.map((c) => c.id);
    if (copyIds.length > 0) {
      await prisma.loanExtension.deleteMany({
        where: { loan: { copyId: { in: copyIds } } },
      });
      await prisma.loan.deleteMany({ where: { copyId: { in: copyIds } } });
    }
    await prisma.reservation.deleteMany({ where: { gameId: game.id } });
    await prisma.gameCopy.deleteMany({ where: { gameId: game.id } });
    await prisma.gameCategory.deleteMany({ where: { gameId: game.id } });
    await prisma.gameTag.deleteMany({ where: { gameId: game.id } });
    await prisma.gameImage.deleteMany({ where: { gameId: game.id } });
    await prisma.game.delete({ where: { id: game.id } });
  } finally {
    await prisma.$disconnect();
  }
}

export async function ensureE2eAdminGameRemoved() {
  const prisma = new PrismaClient();
  try {
    await prisma.gameCopy.deleteMany({
      where: { inventoryNumber: E2E_ADMIN_COPY_INVENTORY },
    });
  } finally {
    await prisma.$disconnect();
  }
}
