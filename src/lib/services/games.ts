import type { GameCollectionType, PrismaClient } from "@prisma/client";
import slugify from "slugify";
import { logAudit } from "@/lib/audit";
import { normalizeEan, validateEanChecksum } from "@/lib/services/ean";
import {
  lookupGameByEanWithFallback,
  type EanLookupOptions,
  type EanLookupResult,
} from "@/lib/services/ean-providers";
import { validateCoverImageUrl } from "@/lib/services/ean-providers/image-utils";
import { assertBarcodeNotProductEan } from "@/lib/services/copy-barcode";
import { ServiceError } from "@/lib/services/errors";
import type { GameInput } from "@/lib/validations/game";

export type { EanLookupResult } from "@/lib/services/ean-providers";
export { findGameByEan } from "@/lib/services/game-by-ean";

/** Wyszukiwanie EAN — deleguje do providerów (kolejność w ean-providers/index). */
export async function lookupByEan(
  prisma: PrismaClient,
  rawEan: string,
  options?: EanLookupOptions,
): Promise<EanLookupResult> {
  return lookupGameByEanWithFallback(prisma, rawEan, options);
}

export { lookupGameByEanWithFallback };

/** @deprecated Użyj lookupByEan */
export const lookupExternalByEan = lookupByEan;

export async function assertEanNotDuplicate(
  prisma: PrismaClient,
  ean: string | null | undefined,
  excludeGameId?: string,
) {
  if (!ean?.trim()) return;
  const normalized = normalizeEan(ean);
  const other = await prisma.game.findFirst({
    where: {
      ean: normalized,
      deletedAt: null,
      ...(excludeGameId ? { id: { not: excludeGameId } } : {}),
    },
    select: { id: true, title: true, slug: true },
  });
  if (other) {
    throw new ServiceError(
      `Gra z tym kodem EAN już istnieje: ${other.title}`,
      "EAN_DUPLICATE",
    );
  }
}

export type CreateGameFromEanInput = GameInput & {
  ean?: string | null;
  collectionType: GameCollectionType;
  skipEanChecksum?: boolean;
  addCopy?: boolean;
  copyInventoryNumber?: string;
  copyBarcode?: string;
};

function makeSlug(title: string) {
  return slugify(title, { lower: true, strict: true, locale: "pl" });
}

export async function createGameFromEan(
  prisma: PrismaClient,
  input: CreateGameFromEanInput,
  actorId: string,
) {
  let normalizedEan: string | null = null;
  if (input.ean?.trim()) {
    normalizedEan = normalizeEan(input.ean);
    if (!input.skipEanChecksum && !validateEanChecksum(normalizedEan)) {
      throw new ServiceError(
        "Suma kontrolna EAN jest nieprawidłowa. Zaznacz „Zapisz mimo ostrzeżenia” lub popraw kod.",
        "EAN_CHECKSUM",
      );
    }
    await assertEanNotDuplicate(prisma, normalizedEan);
  }

  const slug = input.slug || makeSlug(input.title);

  const game = await prisma.$transaction(async (tx) => {
    const created = await tx.game.create({
      data: {
        title: input.title,
        slug,
        ean: normalizedEan,
        collectionType: input.collectionType,
        description: input.description || null,
        shortDescription: input.shortDescription || null,
        minPlayers: input.minPlayers,
        maxPlayers: input.maxPlayers,
        minAge: input.minAge,
        minPlayTime: input.minPlayTime,
        maxPlayTime: input.maxPlayTime,
        difficulty: input.difficulty,
        type: input.type,
        publisherId: input.publisherId || null,
        designerId: input.designerId || null,
        yearPublished: input.yearPublished ?? null,
        coverImageUrl: validateCoverImageUrl(input.coverImageUrl || "") || null,
        coverImageSource: input.coverImageSource || null,
        coverImageExternalId: input.coverImageExternalId || null,
        instructionUrl: input.instructionUrl || null,
        isActive: input.isActive ?? true,
        isFeatured: input.isFeatured ?? false,
        categories: input.categoryIds?.length
          ? { create: input.categoryIds.map((categoryId) => ({ categoryId })) }
          : undefined,
        tags: input.tagIds?.length
          ? { create: input.tagIds.map((tagId) => ({ tagId })) }
          : undefined,
      },
    });

    if (input.addCopy && input.copyInventoryNumber?.trim()) {
      await assertBarcodeNotProductEan(tx, created.id, input.copyBarcode);
      await tx.gameCopy.create({
        data: {
          gameId: created.id,
          inventoryNumber: input.copyInventoryNumber.trim(),
          barcode: input.copyBarcode?.trim() || null,
          status: "AVAILABLE",
          condition: input.copyCondition ?? "GOOD",
          location: input.copyLocation?.trim() || null,
        },
      });
    }

    return created;
  });

  await logAudit({
    actorId,
    action: "CREATE",
    entityType: "game",
    entityId: game.id,
    metadata: { ean: normalizedEan, collectionType: input.collectionType, via: "ean" },
  });

  return game;
}
