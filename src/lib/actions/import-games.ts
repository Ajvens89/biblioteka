"use server";

import slugify from "slugify";
import { revalidatePath } from "next/cache";
import { logAudit } from "@/lib/audit";
import { isActorResult, requireActorAdmin } from "@/lib/auth/actor";
import { parseCsvCollectionType, parseGamesCsv } from "@/lib/csv/games";
import type { GameCollectionType } from "@prisma/client";
import { prisma } from "@/lib/db";
import { assertEanNotDuplicate } from "@/lib/services/games";
import { normalizeEan } from "@/lib/services/ean";
import { isServiceError } from "@/lib/services/errors";
import { fail, ok, type ActionResult } from "@/lib/actions/utils";

export async function importGamesCsv(formData: FormData): Promise<ActionResult<{ count: number }>> {
  const actorResult = await requireActorAdmin();
  if (!isActorResult(actorResult)) return actorResult;
  const user = actorResult;

  const file = formData.get("file");
  if (!(file instanceof File)) return fail("Brak pliku CSV.");

  const content = await file.text();
  let rows;
  try {
    rows = parseGamesCsv(content);
  } catch (e) {
    return fail(e instanceof Error ? e.message : "Błąd CSV");
  }

  let count = 0;
  for (const row of rows) {
    const slug =
      row.slug ||
      slugify(row.title, { lower: true, strict: true, locale: "pl" });

    let ean: string | null = null;
    if (row.ean?.trim()) {
      try {
        ean = normalizeEan(row.ean);
        await assertEanNotDuplicate(prisma, ean);
      } catch (e) {
        if (isServiceError(e) && e.code === "EAN_DUPLICATE") {
          const existing = await prisma.game.findFirst({ where: { ean, deletedAt: null } });
          if (existing?.slug === slug) {
            await prisma.game.update({
              where: { slug },
              data: {
                title: row.title,
                description: row.description,
                shortDescription: row.shortDescription,
                collectionType: parseCsvCollectionType(row.collectionType),
              },
            });
            count++;
            continue;
          }
          return fail(e.message);
        }
        return fail(e instanceof Error ? e.message : "Błąd EAN w CSV");
      }
    }

    let collectionType: GameCollectionType = "BOARD_GAME";
    try {
      collectionType = parseCsvCollectionType(row.collectionType);
    } catch (e) {
      return fail(e instanceof Error ? e.message : "Błąd typu zbioru");
    }

    await prisma.game.upsert({
      where: { slug },
      create: {
        title: row.title,
        slug,
        ean,
        collectionType,
        description: row.description,
        shortDescription: row.shortDescription,
        minPlayers: Number(row.minPlayers) || 2,
        maxPlayers: Number(row.maxPlayers) || 4,
        minAge: Number(row.minAge) || 10,
        minPlayTime: Number(row.minPlayTime) || 30,
        maxPlayTime: Number(row.maxPlayTime) || 60,
        difficulty: (row.difficulty as "MEDIUM") || "MEDIUM",
        type: (row.type as "BOARD") || "BOARD",
        yearPublished: row.yearPublished ? Number(row.yearPublished) : null,
      },
      update: {
        title: row.title,
        ean: ean ?? undefined,
        collectionType,
        description: row.description,
        shortDescription: row.shortDescription,
      },
    });
    count++;
  }

  await logAudit({
    actorId: user.id,
    action: "IMPORT",
    entityType: "games",
    metadata: { count },
  });

  revalidatePath("/admin/gry");
  return ok({ count });
}
