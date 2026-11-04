"use server";

import { revalidatePath } from "next/cache";
import { logAudit } from "@/lib/audit";
import { isActorResult, requireActorAdmin } from "@/lib/auth/actor";
import { prisma } from "@/lib/db";
import {
  formatGamesImportReport,
  importGamesData,
  parseGamesJson,
  type ImportGamesJsonStats,
} from "@/lib/services/games-json";
import { loadDefaultGamesJsonFile, resolveDefaultGamesJsonPath } from "@/lib/services/games-json-default-file";
import { fail, ok, type ActionResult } from "@/lib/actions/utils";

export async function importGamesJsonDefaultAction(
  dryRun: boolean,
  noOverwrite = false,
): Promise<ActionResult<{ stats: ImportGamesJsonStats; report: string }>> {
  const actorResult = await requireActorAdmin();
  if (!isActorResult(actorResult)) return actorResult;

  try {
    const source = await loadDefaultGamesJsonFile();
    if (!source) {
      return fail(
        "Nie znaleziono games.json. Umieść plik w ./data/games.json lub prześlij plik poniżej.",
      );
    }
    const stats = await importGamesData(prisma, source.data, {
      dryRun, noOverwrite, sourceName: source.filePath,
    });
    const report = formatGamesImportReport(stats);

    if (!dryRun) {
      await logAudit({
        actorId: actorResult.id,
        action: "IMPORT",
        entityType: "games_json",
        metadata: { ...stats },
      });
      revalidatePath("/admin/gry");
      revalidatePath("/admin/import");
      revalidatePath("/katalog");
    }

    return ok({ stats, report });
  } catch (e) {
    return fail(e instanceof Error ? e.message : "Błąd importu games.json");
  }
}

export async function importGamesJsonUploadAction(
  formData: FormData,
  dryRun: boolean,
  noOverwrite = false,
): Promise<ActionResult<{ stats: ImportGamesJsonStats; report: string }>> {
  const actorResult = await requireActorAdmin();
  if (!isActorResult(actorResult)) return actorResult;

  const file = formData.get("file");
  if (!(file instanceof File)) return fail("Wybierz plik games.json.");

  try {
    const data = parseGamesJson(await file.text());
    const stats = await importGamesData(prisma, data, { dryRun, noOverwrite, sourceName: file.name });
    const report = formatGamesImportReport(stats);

    if (!dryRun) {
      await logAudit({
        actorId: actorResult.id,
        action: "IMPORT",
        entityType: "games_json",
        metadata: { sourceFileName: file.name, ...stats },
      });
      revalidatePath("/admin/gry");
      revalidatePath("/admin/import");
      revalidatePath("/katalog");
    }

    return ok({ stats, report });
  } catch (e) {
    return fail(e instanceof Error ? e.message : "Błąd importu games.json");
  }
}

export async function getDefaultGamesJsonPath(): Promise<ActionResult<{ path: string | null }>> {
  const actorResult = await requireActorAdmin();
  if (!isActorResult(actorResult)) return actorResult;
  return ok({ path: resolveDefaultGamesJsonPath() });
}
