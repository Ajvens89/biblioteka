"use server";

import { revalidatePath } from "next/cache";
import { getActorFromDb, isActorResult, requireActor } from "@/lib/auth/actor";
import { prisma } from "@/lib/db";
import { fail, fromServiceError, ok, type ActionResult } from "@/lib/actions/utils";
import { gameIdSchema } from "@/lib/validations/ids";
import * as waitlistService from "@/lib/services/waitlist";

export async function joinWaitlistAction(gameId: string): Promise<ActionResult<{ position: number }>> {
  const parsed = gameIdSchema.safeParse({ id: gameId });
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Błąd walidacji");

  const user = await requireActor();
  if (!isActorResult(user)) return user;

  try {
    const { position } = await waitlistService.joinWaitlist(prisma, user.id, parsed.data.id);
    revalidatePath(`/gry/[slug]`, "page");
    revalidatePath("/moje-konto");
    return ok({ position }, `Jesteś na liście oczekujących (pozycja ${position}).`);
  } catch (e) {
    return fromServiceError<{ position: number }>(e);
  }
}

export async function leaveWaitlistAction(gameId: string): Promise<ActionResult> {
  const parsed = gameIdSchema.safeParse({ id: gameId });
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Błąd walidacji");

  const user = await requireActor();
  if (!isActorResult(user)) return user;

  try {
    await waitlistService.leaveWaitlist(prisma, user.id, parsed.data.id);
    revalidatePath(`/gry/[slug]`, "page");
    revalidatePath("/moje-konto");
    return ok(undefined, "Usunięto z listy oczekujących.");
  } catch (e) {
    return fromServiceError(e);
  }
}

export async function getWaitlistStatusAction(
  gameId: string,
): Promise<{ position: number; status: string } | null> {
  const user = await getActorFromDb();
  if (!user) return null;
  const parsed = gameIdSchema.safeParse({ id: gameId });
  if (!parsed.success) return null;
  return waitlistService.getWaitlistPosition(prisma, user.id, parsed.data.id);
}
