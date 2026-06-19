"use server";

import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { tmpdir } from "os";
import { revalidatePath } from "next/cache";
import { logAudit } from "@/lib/audit";
import { isActorResult, requireActorAdmin } from "@/lib/auth/actor";
import { prisma } from "@/lib/db";
import {
  formatGamesImportReport,
  importGamesFromFile,
  resolveGamesJsonPath,
  type ImportGamesJsonStats,
} from "@/lib/services/games-json";
import { fail, ok, type ActionResult } from "@/lib/actions/utils";

export async function importGamesJsonDefaultAction(
  dryRun: boolean,
): Promise<ActionResult<{ stats: ImportGamesJsonStats; report: string }>> {
  const actorResult = await requireActorAdmin();
  if (!isActorResult(actorResult)) return actorResult;

  const filePath = resolveGamesJsonPath([]);
  if (!filePath) {
    return fail(
      "Nie znaleziono games.json. Umieść plik w ./data/games.json lub prześlij plik poniżej.",
    );
  }

  try {
    const stats = await importGamesFromFile(prisma, filePath, { dryRun });
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
): Promise<ActionResult<{ stats: ImportGamesJsonStats; report: string }>> {
  const actorResult = await requireActorAdmin();
  if (!isActorResult(actorResult)) return actorResult;

  const file = formData.get("file");
  if (!(file instanceof File)) return fail("Wybierz plik games.json.");

  const dir = path.join(tmpdir(), "biblioteka-import");
  await mkdir(dir, { recursive: true });
  const filePath = path.join(dir, `games-${Date.now()}.json`);
  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(filePath, buffer);

  try {
    const stats = await importGamesFromFile(prisma, filePath, { dryRun });
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
  return ok({ path: resolveGamesJsonPath([]) });
}
