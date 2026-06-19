"use server";

import { revalidatePath } from "next/cache";
import { isActorResult, requireActor } from "@/lib/auth/actor";
import { prisma } from "@/lib/db";
import { fail, ok, type ActionResult } from "@/lib/actions/utils";
import { gameIdSchema } from "@/lib/validations/ids";

export async function toggleWishlistAction(gameId: string): Promise<ActionResult<{ onWishlist: boolean }>> {
  const parsed = gameIdSchema.safeParse({ id: gameId });
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Błąd walidacji");

  const user = await requireActor();
  if (!isActorResult(user)) return user;

  const existing = await prisma.wishlistItem.findUnique({
    where: { userId_gameId: { userId: user.id, gameId: parsed.data.id } },
  });

  if (existing) {
    await prisma.wishlistItem.delete({ where: { id: existing.id } });
    revalidatePath(`/gry/[slug]`, "page");
    revalidatePath("/moje-konto");
    return ok({ onWishlist: false }, "Usunięto z listy życzeń.");
  }

  const game = await prisma.game.findFirst({
    where: { id: parsed.data.id, deletedAt: null, isActive: true },
    select: { id: true },
  });
  if (!game) return fail("Gra nie istnieje.");

  await prisma.wishlistItem.create({
    data: { userId: user.id, gameId: parsed.data.id },
  });

  revalidatePath(`/gry/[slug]`, "page");
  revalidatePath("/moje-konto");
  return ok({ onWishlist: true }, "Dodano do listy życzeń.");
}

export async function isOnWishlistAction(gameId: string): Promise<boolean> {
  const user = await requireActor();
  if (!isActorResult(user)) return false;

  const parsed = gameIdSchema.safeParse({ id: gameId });
  if (!parsed.success) return false;

  const item = await prisma.wishlistItem.findUnique({
    where: { userId_gameId: { userId: user.id, gameId: parsed.data.id } },
  });
  return Boolean(item);
}

export async function removeWishlistItemAction(gameId: string): Promise<ActionResult> {
  const parsed = gameIdSchema.safeParse({ id: gameId });
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Błąd walidacji");

  const user = await requireActor();
  if (!isActorResult(user)) return user;

  await prisma.wishlistItem.deleteMany({
    where: { userId: user.id, gameId: parsed.data.id },
  });

  revalidatePath("/moje-konto");
  return ok();
}
