"use server";

import { revalidatePath } from "next/cache";
import slugify from "slugify";
import { logAudit } from "@/lib/audit";
import { isActorResult, requireActorAdmin, requireActorStaff } from "@/lib/auth/actor";
import { prisma } from "@/lib/db";
import { assertBarcodeNotProductEan } from "@/lib/services/copy-barcode";
import {
  assertEanNotDuplicate,
  createGameFromEan,
  lookupByEan,
  lookupEanByTitle,
  type EanLookupResult,
  type TitleToEanResult,
} from "@/lib/services/games";
import { isServiceError } from "@/lib/services/errors";
import { normalizeEan, validateEanChecksum } from "@/lib/services/ean";
import {
  gameSchema,
  copySchema,
  lookupEanSchema,
  lookupEanByTitleSchema,
  type GameInput,
  type CopyInput,
} from "@/lib/validations/game";
import { gameIdSchema, uuidSchema } from "@/lib/validations/ids";
import { z } from "zod";
import { fail, ok, type ActionResult } from "@/lib/actions/utils";

function makeSlug(title: string) {
  return slugify(title, { lower: true, strict: true, locale: "pl" });
}

export async function lookupEanAction(
  ean: string,
  titleHint?: string,
  collectionType?: "BOARD_GAME" | "RPG",
): Promise<ActionResult<EanLookupResult>> {
  const actorResult = await requireActorStaff();
  if (!isActorResult(actorResult)) return actorResult;

  const parsed = lookupEanSchema.safeParse({ ean, titleHint, collectionType });
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Błąd walidacji");

  const result = await lookupByEan(prisma, parsed.data.ean, {
    titleHint: parsed.data.titleHint,
    collectionType: parsed.data.collectionType,
  });
  return ok(result);
}

export async function lookupEanByTitleAction(
  title: string,
): Promise<ActionResult<TitleToEanResult>> {
  const actorResult = await requireActorStaff();
  if (!isActorResult(actorResult)) return actorResult;

  const parsed = lookupEanByTitleSchema.safeParse({ title });
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Błąd walidacji");

  const result = await lookupEanByTitle(prisma, parsed.data.title);
  return ok(result);
}

export async function createGame(input: GameInput): Promise<ActionResult<{ id: string }>> {
  const actorResult = await requireActorAdmin();
  if (!isActorResult(actorResult)) return actorResult;

  const parsed = gameSchema.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Błąd walidacji");

  try {
    const game = await createGameFromEan(prisma, parsed.data, actorResult.id);
    revalidatePath("/admin/gry");
    revalidatePath("/katalog");
    return ok({ id: game.id });
  } catch (e) {
    if (isServiceError(e)) return fail(e.message);
    throw e;
  }
}

export async function updateGame(id: string, input: GameInput): Promise<ActionResult> {
  const idParsed = gameIdSchema.safeParse({ id });
  if (!idParsed.success) return fail(idParsed.error.issues[0]?.message ?? "Błąd walidacji");

  const actorResult = await requireActorAdmin();
  if (!isActorResult(actorResult)) return actorResult;

  const parsed = gameSchema.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Błąd walidacji");
  const data = parsed.data;

  try {
    if (data.ean?.trim()) {
      const normalized = normalizeEan(data.ean);
      if (!data.skipEanChecksum && !validateEanChecksum(normalized)) {
        return fail("Suma kontrolna EAN jest nieprawidłowa. Zaznacz „Zapisz mimo ostrzeżenia”.");
      }
      await assertEanNotDuplicate(prisma, normalized, idParsed.data.id);
    }

    await prisma.$transaction(async (tx) => {
      await tx.gameCategory.deleteMany({ where: { gameId: idParsed.data.id } });
      await tx.gameTag.deleteMany({ where: { gameId: idParsed.data.id } });

      const normalizedEan = data.ean?.trim() ? normalizeEan(data.ean) : null;

      await tx.game.update({
        where: { id: idParsed.data.id },
        data: {
          title: data.title,
          slug: data.slug || makeSlug(data.title),
          ean: normalizedEan,
          collectionType: data.collectionType,
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
        coverImageSource: data.coverImageSource || null,
        coverImageExternalId: data.coverImageExternalId || null,
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
  } catch (e) {
    if (isServiceError(e)) return fail(e.message);
    throw e;
  }
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

  try {
    await assertBarcodeNotProductEan(prisma, parsed.data.gameId, parsed.data.barcode);
  } catch (e) {
    if (isServiceError(e)) return fail(e.message);
    throw e;
  }

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

  try {
    await assertBarcodeNotProductEan(prisma, parsed.data.gameId, parsed.data.barcode);
  } catch (e) {
    if (isServiceError(e)) return fail(e.message);
    throw e;
  }

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
