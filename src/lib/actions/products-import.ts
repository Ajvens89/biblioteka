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
  importProductsFromContent,
  importProductsFromFile,
  parseProductsJson,
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
  if (!(file instanceof File) || file.size === 0) {
    return fail("Wybierz niepusty plik products.json albo użyj wklejania JSON powyżej.");
  }

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

export async function importProductsPasteAction(
  jsonContent: string,
  dryRun: boolean,
): Promise<ActionResult<{ stats: ImportProductsStats; report: string }>> {
  const actorResult = await requireActorAdmin();
  if (!isActorResult(actorResult)) return actorResult;

  if (!jsonContent?.trim()) {
    return fail("Wklej zawartość pliku JSON (Ctrl+A w Notatniku → Ctrl+C → Ctrl+V tutaj).");
  }

  try {
    const stats = await importProductsFromContent(prisma, jsonContent, { dryRun });
    const report = formatImportReport(stats);

    if (!dryRun) {
      await logAudit({
        actorId: actorResult.id,
        action: "IMPORT",
        entityType: "products_json",
        metadata: { source: "paste", ...stats },
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

/** Zapisuje wklejony JSON jako data/products.json (kolejny import bez wklejania). */
export async function saveProductsJsonToProjectAction(
  jsonContent: string,
): Promise<ActionResult<{ path: string }>> {
  const actorResult = await requireActorAdmin();
  if (!isActorResult(actorResult)) return actorResult;

  if (!jsonContent?.trim()) {
    return fail("Brak treści do zapisania.");
  }

  let parsed: ReturnType<typeof parseProductsJson>;
  try {
    parsed = parseProductsJson(jsonContent.trim());
  } catch (e) {
    return fail(e instanceof Error ? e.message : "Niepoprawny JSON");
  }

  const target = path.resolve("./data/products.json");
  await mkdir(path.dirname(target), { recursive: true });
  await writeFile(target, JSON.stringify(parsed, null, 2), "utf8");

  revalidatePath("/admin/import");
  return ok({ path: target });
}

export async function getDefaultProductsPath(): Promise<string | null> {
  return resolveProductsFilePath([]);
}

export async function getProductsFileInfo(): Promise<{
  path: string;
  sizeBytes: number;
  sizeLabel: string;
} | null> {
  const filePath = resolveProductsFilePath([]);
  if (!filePath) return null;
  const { stat } = await import("node:fs/promises");
  const info = await stat(filePath);
  const kb = info.size / 1024;
  const sizeLabel =
    info.size === 0
      ? "0 B (PUSTY — skopiuj plik ponownie)"
      : kb < 1
        ? `${info.size} B`
        : `${kb.toFixed(1)} KB`;
  return { path: filePath, sizeBytes: info.size, sizeLabel };
}
