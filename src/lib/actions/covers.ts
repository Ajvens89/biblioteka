"use server";

import { revalidatePath } from "next/cache";
import { logAudit } from "@/lib/audit";
import { isActorResult, requireActorAdmin } from "@/lib/auth/actor";
import { prisma } from "@/lib/db";
import {
  backfillMissingCovers,
  formatCoverBackfillReport,
  isBggConfigured,
  type CoverBackfillStats,
} from "@/lib/services/cover-fetch";
import { fail, ok, type ActionResult } from "@/lib/actions/utils";

export async function fetchMissingCoversAction(
  limit = 30,
  dryRun = false,
): Promise<ActionResult<{ stats: CoverBackfillStats; report: string; bggConfigured: boolean }>> {
  const actorResult = await requireActorAdmin();
  if (!isActorResult(actorResult)) return actorResult;

  const safeLimit = Math.min(Math.max(1, limit), 100);

  try {
    const games = await prisma.game.findMany({
      where: { deletedAt: null, isActive: true },
      select: { id: true, title: true, coverImageUrl: true, ean: true, collectionType: true },
      orderBy: { title: "asc" },
    });

    const stats = await backfillMissingCovers(games, {
      limit: safeLimit,
      dryRun,
      update: async (id, coverImageUrl, source) => {
        await prisma.game.update({
          where: { id },
          data: { coverImageUrl, coverImageSource: source },
        });
      },
    });

    const report = formatCoverBackfillReport(stats, dryRun);

    if (!dryRun && stats.updated > 0) {
      await logAudit({
        actorId: actorResult.id,
        action: "UPDATE",
        entityType: "game_covers",
        metadata: { ...stats, limit: safeLimit },
      });
      revalidatePath("/admin/gry");
      revalidatePath("/admin/import");
      revalidatePath("/katalog");
      revalidatePath("/");
    }

    return ok({ stats, report, bggConfigured: isBggConfigured() });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Nie udało się pobrać okładek.";
    return fail(msg);
  }
}
