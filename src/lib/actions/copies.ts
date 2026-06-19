"use server";

import { revalidatePath } from "next/cache";
import { isActorResult, requireActorStaff } from "@/lib/auth/actor";
import { logAudit } from "@/lib/audit";
import { prisma } from "@/lib/db";
import { fail, fromServiceError, ok, type ActionResult } from "@/lib/actions/utils";
import { assertBarcodeNotProductEan } from "@/lib/services/copy-barcode";
import { assertCopyStatusTransition } from "@/lib/services/copy-status";
import { isServiceError } from "@/lib/services/errors";
import { copyIdSchema, editCopySchema } from "@/lib/validations/ids";
import type { CopyInput } from "@/lib/validations/game";

const ACTIVE_LOAN_STATUSES = ["ACTIVE", "OVERDUE"] as const;
const ACTIVE_RES_STATUSES = ["PENDING", "APPROVED", "READY_FOR_PICKUP"] as const;

async function getCopyStatusContext(copyId: string) {
  const [activeLoan, activeReservation] = await Promise.all([
    prisma.loan.findFirst({
      where: { copyId, status: { in: [...ACTIVE_LOAN_STATUSES] } },
      select: { id: true },
    }),
    prisma.reservation.findFirst({
      where: { copyId, status: { in: [...ACTIVE_RES_STATUSES] } },
      select: { id: true },
    }),
  ]);
  return {
    hasActiveLoan: Boolean(activeLoan),
    hasActiveReservation: Boolean(activeReservation),
  };
}

export async function editCopy(input: CopyInput & { copyId: string }): Promise<ActionResult> {
  const parsed = editCopySchema.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Błąd walidacji");

  const actorResult = await requireActorStaff();
  if (!isActorResult(actorResult)) return actorResult;

  const existing = await prisma.gameCopy.findUnique({
    where: { id: parsed.data.copyId },
    select: { id: true, gameId: true, status: true, inventoryNumber: true },
  });
  if (!existing) return fail("Egzemplarz nie istnieje.");

  const ctx = await getCopyStatusContext(parsed.data.copyId);
  try {
    assertCopyStatusTransition(existing.status, parsed.data.status, ctx);
  } catch (e) {
    return fromServiceError(e);
  }

  if (parsed.data.inventoryNumber !== existing.inventoryNumber) {
    const duplicate = await prisma.gameCopy.findFirst({
      where: {
        inventoryNumber: parsed.data.inventoryNumber,
        NOT: { id: parsed.data.copyId },
      },
      select: { id: true },
    });
    if (duplicate) return fail("Ten numer inwentarzowy jest już używany.");
  }

  const barcode = parsed.data.barcode?.trim() || null;
  if (barcode) {
    const duplicateBarcode = await prisma.gameCopy.findFirst({
      where: { barcode, NOT: { id: parsed.data.copyId } },
      select: { id: true },
    });
    if (duplicateBarcode) return fail("Ten kod egzemplarza jest już używany.");
  }

  try {
    await assertBarcodeNotProductEan(prisma, existing.gameId, barcode ?? undefined);
  } catch (e) {
    if (isServiceError(e)) return fail(e.message);
    throw e;
  }

  await prisma.gameCopy.update({
    where: { id: parsed.data.copyId },
    data: {
      inventoryNumber: parsed.data.inventoryNumber,
      barcode,
      status: parsed.data.status,
      condition: parsed.data.condition,
      location: parsed.data.location?.trim() || null,
      notes: parsed.data.notes?.trim() || null,
    },
  });

  await logAudit({
    actorId: actorResult.id,
    action: "UPDATE",
    entityType: "game_copy",
    entityId: parsed.data.copyId,
    metadata: {
      inventoryNumber: parsed.data.inventoryNumber,
      status: parsed.data.status,
      condition: parsed.data.condition,
    },
  });

  revalidatePath("/admin/egzemplarze");
  revalidatePath(`/admin/egzemplarze/${parsed.data.copyId}`);
  return ok(undefined, "Zapisano egzemplarz.");
}

export async function getCopyForEdit(copyId: string) {
  const parsed = copyIdSchema.safeParse({ copyId });
  if (!parsed.success) return null;

  const actorResult = await requireActorStaff();
  if (!isActorResult(actorResult)) return null;

  const copy = await prisma.gameCopy.findUnique({
    where: { id: parsed.data.copyId },
    include: {
      game: { select: { id: true, title: true, slug: true, ean: true } },
      loans: {
        where: { status: { in: [...ACTIVE_LOAN_STATUSES] } },
        take: 1,
        include: { user: { select: { fullName: true, email: true } } },
      },
      reservations: {
        where: { status: { in: [...ACTIVE_RES_STATUSES] } },
        take: 1,
        include: { user: { select: { fullName: true, email: true } } },
      },
    },
  });
  if (!copy) return null;

  const ctx = await getCopyStatusContext(copy.id);
  return { copy, ctx };
}
