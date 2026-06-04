"use server";

import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { tmpdir } from "os";
import { revalidatePath } from "next/cache";
import { logAudit } from "@/lib/audit";
import { isActorResult, requireActorAdmin, requireActorStaff } from "@/lib/auth/actor";
import { prisma } from "@/lib/db";
import {
  formatEanAuditText,
  runEanAudit,
  type EanAuditReport,
} from "@/lib/services/ean-audit";
import {
  formatImportReport,
  importProductsFromFile,
  resolveProductsFilePath,
  type ImportProductsStats,
} from "@/lib/services/import-products";
import { fail, ok, type ActionResult } from "@/lib/actions/utils";

export async function importProductsDefaultAction(
  dryRun: boolean,
): Promise<ActionResult<{ stats: ImportProductsStats; report: string }>> {
  const actorResult = await requireActorAdmin();
  if (!isActorResult(actorResult)) return actorResult;

  const filePath = resolveProductsFilePath([]);
  if (!filePath) {
    return fail(
      "Nie znaleziono products.json. Umieść plik w ./data/products.json lub prześlij plik poniżej.",
    );
  }

  try {
    const stats = await importProductsFromFile(prisma, filePath, { dryRun });
    const report = formatImportReport(stats);

    if (!dryRun) {
      await logAudit({
        actorId: actorResult.id,
        action: "IMPORT",
        entityType: "products_json",
        metadata: { ...stats },
      });
      revalidatePath("/admin/gry");
      revalidatePath("/admin/import");
      revalidatePath("/katalog");
    }

    return ok({ stats, report });
  } catch (e) {
    return fail(e instanceof Error ? e.message : "Błąd importu");
  }
}

export async function importProductsUploadAction(
  formData: FormData,
  dryRun: boolean,
): Promise<ActionResult<{ stats: ImportProductsStats; report: string }>> {
  const actorResult = await requireActorAdmin();
  if (!isActorResult(actorResult)) return actorResult;

  const file = formData.get("file");
  if (!(file instanceof File)) return fail("Wybierz plik products.json.");

  const dir = path.join(tmpdir(), "biblioteka-import");
  await mkdir(dir, { recursive: true });
  const filePath = path.join(dir, `products-${Date.now()}.json`);
  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(filePath, buffer);

  try {
    const stats = await importProductsFromFile(prisma, filePath, { dryRun });
    const report = formatImportReport(stats);

    if (!dryRun) {
      await logAudit({
        actorId: actorResult.id,
        action: "IMPORT",
        entityType: "products_json",
        metadata: { sourceFileName: file.name, ...stats },
      });
      revalidatePath("/admin/gry");
      revalidatePath("/admin/import");
      revalidatePath("/katalog");
    }

    return ok({ stats, report });
  } catch (e) {
    return fail(e instanceof Error ? e.message : "Błąd importu");
  }
}

export async function runEanAuditAction(): Promise<
  ActionResult<{ report: EanAuditReport; text: string }>
> {
  const actorResult = await requireActorStaff();
  if (!isActorResult(actorResult)) return actorResult;

  try {
    const report = await runEanAudit(prisma);
    const text = formatEanAuditText(report);

    await logAudit({
      actorId: actorResult.id,
      action: "UPDATE",
      entityType: "ean_audit",
      metadata: { ok: report.ok, warnings: report.warnings.length, stats: report.stats },
    });

    revalidatePath("/admin/import");
    return ok({ report, text });
  } catch (e) {
    return fail(e instanceof Error ? e.message : "Błąd audytu EAN");
  }
}

export async function getDefaultProductsPath(): Promise<string | null> {
  return resolveProductsFilePath([]);
}
