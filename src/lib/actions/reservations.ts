"use server";

import { revalidatePath } from "next/cache";
import { isActorResult, requireActor, requireActorStaff } from "@/lib/auth/actor";
import { prisma } from "@/lib/db";
import { readyForPickupEmail, reservationConfirmedEmail } from "@/lib/email";
import { notifyUser } from "@/lib/notifications";
import { fail, fromServiceError, ok, type ActionResult } from "@/lib/actions/utils";
import {
  createReservationSchema,
  reservationIdSchema,
} from "@/lib/validations/ids";
import * as reservationService from "@/lib/services/reservations";

export async function createReservation(
  gameId: string,
  override = false,
): Promise<ActionResult<{ id: string }>> {
  const parsed = createReservationSchema.safeParse({ gameId });
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Błąd walidacji");

  const actorResult = await requireActor();
  if (!isActorResult(actorResult)) return actorResult;
  const user = actorResult;

  try {
    await reservationService.assertCanUserReserve(prisma, user.id, {
      override: override || user.role === "ADMIN",
    });
  } catch (e) {
    return fromServiceError(e);
  }

  const game = await prisma.game.findFirst({
    where: { id: parsed.data.gameId, isActive: true, deletedAt: null },
  });
  if (!game) return fail("Gra nie została znaleziona.");

  try {
    const { reservationId } = await reservationService.reserveGame(prisma, {
      userId: user.id,
      gameId: parsed.data.gameId,
      incrementPopularity: true,
      audit: { actorId: user.id },
    });

    const email = reservationConfirmedEmail(game.title);
    await notifyUser({
      userId: user.id,
      email: user.email,
      type: "RESERVATION_CONFIRMED",
      title: "Rezerwacja przyjęta",
      body: `Zarezerwowałeś grę ${game.title}.`,
      emailSubject: email.subject,
      emailHtml: email.html,
    });

    revalidatePath("/moje-rezerwacje");
    revalidatePath(`/gry/${game.slug}`);
    revalidatePath("/katalog");
    revalidatePath("/admin/rezerwacje");

    return ok({ id: reservationId });
  } catch (e) {
    return fromServiceError<{ id: string }>(e);
  }
}

export async function cancelReservation(
  reservationId: string,
): Promise<ActionResult> {
  const parsed = reservationIdSchema.safeParse({ reservationId });
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Błąd walidacji");

  const actorResult = await requireActor();
  if (!isActorResult(actorResult)) return actorResult;
  const user = actorResult;

  const reservation = await prisma.reservation.findUnique({
    where: { id: parsed.data.reservationId },
    include: { game: true, copy: true },
  });
  if (!reservation) return fail("Rezerwacja nie istnieje.");

  const isOwner = reservation.userId === user.id;
  const isStaff = user.role === "LIBRARIAN" || user.role === "ADMIN";
  if (!isOwner && !isStaff) return fail("Brak uprawnień.");

  if (!["PENDING", "APPROVED", "READY_FOR_PICKUP"].includes(reservation.status)) {
    return fail("Nie można anulować tej rezerwacji.");
  }

  try {
    await reservationService.cancelReservation(
      prisma,
      parsed.data.reservationId,
      reservation.copyId,
      { actorId: user.id },
    );
  } catch (e) {
    return fromServiceError(e);
  }

  revalidatePath("/moje-rezerwacje");
  revalidatePath("/admin/rezerwacje");
  if (reservation.game) revalidatePath(`/gry/${reservation.game.slug}`);

  return ok();
}

export async function approveReservation(reservationId: string): Promise<ActionResult> {
  const parsed = reservationIdSchema.safeParse({ reservationId });
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Błąd walidacji");

  const actorResult = await requireActorStaff();
  if (!isActorResult(actorResult)) return actorResult;

  try {
    await reservationService.approveReservation(prisma, parsed.data.reservationId, {
      actorId: actorResult.id,
    });
  } catch (e) {
    return fromServiceError(e);
  }

  revalidatePath("/admin/rezerwacje");
  return ok();
}

export async function markReadyForPickup(reservationId: string): Promise<ActionResult> {
  const parsed = reservationIdSchema.safeParse({ reservationId });
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Błąd walidacji");

  const actorResult = await requireActorStaff();
  if (!isActorResult(actorResult)) return actorResult;

  try {
    const { gameTitle, userId, userEmail } = await reservationService.markReadyForPickup(
      prisma,
      parsed.data.reservationId,
      { actorId: actorResult.id, metadata: { status: "READY_FOR_PICKUP" } },
    );

    const email = readyForPickupEmail(gameTitle);
    await notifyUser({
      userId,
      email: userEmail,
      type: "READY_FOR_PICKUP",
      title: "Gotowe do odbioru",
      body: `Gra ${gameTitle} czeka na odbiór.`,
      emailSubject: email.subject,
      emailHtml: email.html,
    });
  } catch (e) {
    return fromServiceError(e);
  }

  revalidatePath("/admin/rezerwacje");
  revalidatePath("/moje-rezerwacje");
  return ok();
}
