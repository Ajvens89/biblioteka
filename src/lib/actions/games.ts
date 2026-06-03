"use server";

import { revalidatePath } from "next/cache";
import slugify from "slugify";
import { logAudit } from "@/lib/audit";
import { isActorResult, requireActorAdmin, requireActorStaff } from "@/lib/auth/actor";
import { prisma } from "@/lib/db";
import { gameSchema, copySchema, type GameInput, type CopyInput } from "@/lib/validations/game";
import { gameIdSchema, uuidSchema } from "@/lib/validations/ids";
import { z } from "zod";
import { fail, ok, type ActionResult } from "@/lib/actions/utils";

function makeSlug(title: string) {
  return slugify(title, { lower: true, strict: true, locale: "pl" });
}

export async function createGame(input: GameInput): Promise<ActionResult<{ id: string }>> {
  const actorResult = await requireActorAdmin();
  if (!isActorResult(actorResult)) return actorResult;

  const parsed = gameSchema.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Błąd walidacji");

  const data = parsed.data;
  const slug = data.slug || makeSlug(data.title);

  const game = await prisma.game.create({
    data: {
      title: data.title,
      slug,
      description: data.description,
      shortDescription: data.shortDescription,
      minPlayers: data.minPlayers,
      maxPlayers: data.maxPlayers,
      minAge: data.minAge,
      minPlayTime: data.minPlayTime,
      maxPlayTime: data.maxPlayTime,
      difficulty: data.difficulty,
      type: data.type,
      publisherId: data.publisherId || null,
      designerId: data.designerId || null,
      yearPublished: data.yearPublished ?? null,
      coverImageUrl: data.coverImageUrl || null,
      instructionUrl: data.instructionUrl || null,
      isActive: data.isActive ?? true,
      isFeatured: data.isFeatured ?? false,
      categories: data.categoryIds?.length
        ? { create: data.categoryIds.map((categoryId) => ({ categoryId })) }
        : undefined,
      tags: data.tagIds?.length
        ? { create: data.tagIds.map((tagId) => ({ tagId })) }
        : undefined,
    },
  });

  await logAudit({
    actorId: actorResult.id,
    action: "CREATE",
    entityType: "game",
    entityId: game.id,
  });

  revalidatePath("/admin/gry");
  revalidatePath("/katalog");
  return ok({ id: game.id });
}

export async function updateGame(id: string, input: GameInput): Promise<ActionResult> {
  const idParsed = gameIdSchema.safeParse({ id });
  if (!idParsed.success) return fail(idParsed.error.issues[0]?.message ?? "Błąd walidacji");

  const actorResult = await requireActorAdmin();
  if (!isActorResult(actorResult)) return actorResult;

  const parsed = gameSchema.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Błąd walidacji");
  const data = parsed.data;

  await prisma.$transaction(async (tx) => {
    await tx.gameCategory.deleteMany({ where: { gameId: idParsed.data.id } });
    await tx.gameTag.deleteMany({ where: { gameId: idParsed.data.id } });

    await tx.game.update({
      where: { id: idParsed.data.id },
      data: {
        title: data.title,
        slug: data.slug || makeSlug(data.title),
        description: data.description,
        shortDescription: data.shortDescription,
        minPlayers: data.minPlayers,
        maxPlayers: data.maxPlayers,
        minAge: data.minAge,
        minPlayTime: data.minPlayTime,
        maxPlayTime: data.maxPlayTime,
        difficulty: data.difficulty,
        type: data.type,
        publisherId: data.publisherId || null,
        designerId: data.designerId || null,
        yearPublished: data.yearPublished ?? null,
        coverImageUrl: data.coverImageUrl || null,
        instructionUrl: data.instructionUrl || null,
        isActive: data.isActive,
        isFeatured: data.isFeatured,
        categories: data.categoryIds?.length
          ? { create: data.categoryIds.map((categoryId) => ({ categoryId })) }
          : undefined,
        tags: data.tagIds?.length
          ? { create: data.tagIds.map((tagId) => ({ tagId })) }
          : undefined,
      },
    });
  });

  await logAudit({
    actorId: actorResult.id,
    action: "UPDATE",
    entityType: "game",
    entityId: idParsed.data.id,
  });
  revalidatePath("/admin/gry");
  revalidatePath("/katalog");
  return ok();
}

export async function archiveGame(id: string): Promise<ActionResult> {
  const idParsed = gameIdSchema.safeParse({ id });
  if (!idParsed.success) return fail(idParsed.error.issues[0]?.message ?? "Błąd walidacji");

  const actorResult = await requireActorAdmin();
  if (!isActorResult(actorResult)) return actorResult;

  await prisma.game.update({
    where: { id: idParsed.data.id },
    data: { deletedAt: new Date(), isActive: false },
  });

  await logAudit({
    actorId: actorResult.id,
    action: "DELETE",
    entityType: "game",
    entityId: idParsed.data.id,
  });
  revalidatePath("/admin/gry");
  return ok();
}

export async function createCopy(input: CopyInput): Promise<ActionResult<{ id: string }>> {
  const actorResult = await requireActorStaff();
  if (!isActorResult(actorResult)) return actorResult;

  const parsed = copySchema.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Błąd walidacji");

  const copy = await prisma.gameCopy.create({ data: parsed.data });

  await logAudit({
    actorId: actorResult.id,
    action: "CREATE",
    entityType: "game_copy",
    entityId: copy.id,
  });

  revalidatePath("/admin/egzemplarze");
  return ok({ id: copy.id });
}

export async function updateCopy(id: string, input: CopyInput): Promise<ActionResult> {
  const idParsed = z.object({ id: uuidSchema }).safeParse({ id });
  if (!idParsed.success) return fail(idParsed.error.issues[0]?.message ?? "Błąd walidacji");

  const actorResult = await requireActorStaff();
  if (!isActorResult(actorResult)) return actorResult;

  const parsed = copySchema.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Błąd walidacji");

  await prisma.gameCopy.update({ where: { id: idParsed.data.id }, data: parsed.data });

  await logAudit({
    actorId: actorResult.id,
    action: "UPDATE",
    entityType: "game_copy",
    entityId: idParsed.data.id,
  });

  revalidatePath("/admin/egzemplarze");
  return ok();
}
