"use server";

import { revalidatePath } from "next/cache";
import { isActorResult, requireActor } from "@/lib/auth/actor";
import { prisma } from "@/lib/db";
import { fail, ok, type ActionResult } from "@/lib/actions/utils";
import { gameIdSchema } from "@/lib/validations/ids";
import { z } from "zod";

const ratingSchema = z.object({
  gameId: z.string().uuid(),
  rating: z.coerce.number().int().min(1).max(5),
  comment: z.string().max(1000).optional(),
});

export async function submitGameRatingAction(
  gameId: string,
  rating: number,
  comment?: string,
): Promise<ActionResult> {
  const parsed = ratingSchema.safeParse({ gameId, rating, comment });
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Błąd walidacji");

  const user = await requireActor();
  if (!isActorResult(user)) return user;

  const game = await prisma.game.findFirst({
    where: { id: parsed.data.gameId, deletedAt: null, isActive: true },
    select: { id: true },
  });
  if (!game) return fail("Gra nie istnieje.");

  await prisma.gameRating.upsert({
    where: { userId_gameId: { userId: user.id, gameId: parsed.data.gameId } },
    create: {
      userId: user.id,
      gameId: parsed.data.gameId,
      rating: parsed.data.rating,
      comment: parsed.data.comment?.trim() || null,
    },
    update: {
      rating: parsed.data.rating,
      comment: parsed.data.comment?.trim() || null,
    },
  });

  revalidatePath(`/gry/[slug]`, "page");
  revalidatePath("/moje-konto");
  return ok(undefined, "Ocena zapisana.");
}

export async function getGameRatingSummary(gameId: string) {
  const parsed = gameIdSchema.safeParse({ id: gameId });
  if (!parsed.success) return { average: 0, count: 0 };

  const agg = await prisma.gameRating.aggregate({
    where: { gameId: parsed.data.id },
    _avg: { rating: true },
    _count: { rating: true },
  });

  return {
    average: agg._avg.rating ?? 0,
    count: agg._count.rating,
  };
}

export async function getUserGameRating(gameId: string, userId: string) {
  return prisma.gameRating.findUnique({
    where: { userId_gameId: { userId, gameId } },
  });
}
