"use server";

import { revalidatePath } from "next/cache";
import { isActorResult, requireActor, requireActorStaff } from "@/lib/auth/actor";
import { prisma } from "@/lib/db";
import { fail, fromServiceError, ok, type ActionResult } from "@/lib/actions/utils";
import { loanIdSchema, uuidSchema } from "@/lib/validations/ids";
import { z } from "zod";
import * as extensionService from "@/lib/services/extension-requests";

const requestSchema = z.object({
  loanId: uuidSchema,
  reason: z.string().max(500).optional(),
  requestedDays: z.coerce.number().int().min(1).max(21).default(7),
});

export async function requestLoanExtensionAction(
  loanId: string,
  reason?: string,
  requestedDays = 7,
): Promise<ActionResult<{ requestId: string }>> {
  const parsed = requestSchema.safeParse({ loanId, reason, requestedDays });
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Błąd walidacji");

  const user = await requireActor();
  if (!isActorResult(user)) return user;

  try {
    const { requestId } = await extensionService.requestLoanExtension(
      prisma,
      user.id,
      parsed.data.loanId,
      parsed.data.reason,
      parsed.data.requestedDays,
    );
    revalidatePath("/moje-konto");
    revalidatePath("/moje-rezerwacje");
    revalidatePath("/admin/wypozyczenia");
    return ok({ requestId }, "Prośba o przedłużenie wysłana do bibliotekarza.");
  } catch (e) {
    return fromServiceError<{ requestId: string }>(e);
  }
}

export async function approveExtensionRequestAction(requestId: string): Promise<ActionResult> {
  const parsed = z.object({ requestId: uuidSchema }).safeParse({ requestId });
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Błąd walidacji");

  const actor = await requireActorStaff();
  if (!isActorResult(actor)) return actor;

  try {
    await extensionService.approveExtensionRequest(prisma, parsed.data.requestId, actor.id);
    revalidatePath("/admin/wypozyczenia");
    revalidatePath("/admin/prosby-przedluzenia");
    revalidatePath("/moje-konto");
    return ok(undefined, "Przedłużenie zatwierdzone.");
  } catch (e) {
    return fromServiceError(e);
  }
}

export async function rejectExtensionRequestAction(requestId: string): Promise<ActionResult> {
  const parsed = z.object({ requestId: uuidSchema }).safeParse({ requestId });
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Błąd walidacji");

  const actor = await requireActorStaff();
  if (!isActorResult(actor)) return actor;

  try {
    await extensionService.rejectExtensionRequest(prisma, parsed.data.requestId, actor.id);
    revalidatePath("/admin/wypozyczenia");
    revalidatePath("/admin/prosby-przedluzenia");
    revalidatePath("/moje-konto");
    return ok(undefined, "Prośba odrzucona.");
  } catch (e) {
    return fromServiceError(e);
  }
}

export async function getPendingExtensionRequests() {
  const actor = await requireActorStaff();
  if (!isActorResult(actor)) return [];

  return prisma.loanExtensionRequest.findMany({
    where: { status: "PENDING" },
    include: {
      user: true,
      loan: { include: { copy: { include: { game: true } } } },
    },
    orderBy: { createdAt: "asc" },
    take: 50,
  });
}

export async function getUserPendingExtension(loanId: string) {
  const parsed = loanIdSchema.safeParse({ loanId });
  if (!parsed.success) return null;

  const user = await requireActor();
  if (!isActorResult(user)) return null;

  return prisma.loanExtensionRequest.findFirst({
    where: { loanId: parsed.data.loanId, userId: user.id, status: "PENDING" },
  });
}
