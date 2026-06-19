"use server";

import { revalidatePath } from "next/cache";
import { isActorResult, requireActorAdmin } from "@/lib/auth/actor";
import { prisma } from "@/lib/db";
import { fail, fromServiceError, ok, type ActionResult } from "@/lib/actions/utils";
import { buildCatalogQualityReport, reportToCsv } from "@/lib/services/catalog-quality";
import { findDuplicateCandidates } from "@/lib/services/duplicate-detection";
import { fixSlugMismatch, mergeGames } from "@/lib/services/merge-games";
import { z } from "zod";
import { uuidSchema } from "@/lib/validations/ids";

export async function getCatalogQualityReportAction() {
  const actor = await requireActorAdmin();
  if (!isActorResult(actor)) return null;
  return buildCatalogQualityReport(prisma);
}

export async function exportCatalogQualityCsvAction(): Promise<ActionResult<{ csv: string }>> {
  const actor = await requireActorAdmin();
  if (!isActorResult(actor)) return actor;
  const report = await buildCatalogQualityReport(prisma);
  return ok({ csv: reportToCsv(report) });
}

export async function getDuplicateCandidatesAction() {
  const actor = await requireActorAdmin();
  if (!isActorResult(actor)) return [];
  return findDuplicateCandidates(prisma);
}

export async function mergeGamesAction(
  primaryGameId: string,
  secondaryGameId: string,
): Promise<ActionResult> {
  const parsed = z
    .object({ primaryGameId: uuidSchema, secondaryGameId: uuidSchema })
    .safeParse({ primaryGameId, secondaryGameId });
  if (!parsed.success) return fail("Nieprawidłowe identyfikatory gier.");

  const actor = await requireActorAdmin();
  if (!isActorResult(actor)) return actor;

  try {
    await mergeGames(prisma, {
      primaryGameId: parsed.data.primaryGameId,
      secondaryGameId: parsed.data.secondaryGameId,
      actorId: actor.id,
    });
    revalidatePath("/admin/gry");
    revalidatePath("/admin/duplikaty");
    return ok();
  } catch (e) {
    return fromServiceError(e);
  }
}

export async function fixGameSlugAction(gameId: string): Promise<ActionResult<{ newSlug: string }>> {
  const parsed = z.object({ gameId: uuidSchema }).safeParse({ gameId });
  if (!parsed.success) return fail("Nieprawidłowy identyfikator.");

  const actor = await requireActorAdmin();
  if (!isActorResult(actor)) return actor;

  try {
    const { newSlug } = await fixSlugMismatch(prisma, parsed.data.gameId);
    revalidatePath("/admin/jakosc-danych");
    revalidatePath("/katalog");
    return ok({ newSlug });
  } catch (e) {
    return fromServiceError(e);
  }
}
