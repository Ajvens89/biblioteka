import type { PrismaClient } from "@prisma/client";
import { normalizeEan, validateEanChecksum } from "@/lib/services/ean";
import { isValidBarcodeLength } from "@/lib/services/import-products";

export type EanAuditWarning = {
  code: string;
  message: string;
  details?: Record<string, unknown>;
};

export type EanAuditReport = {
  ok: boolean;
  warnings: EanAuditWarning[];
  stats: {
    gamesWithEan: number;
    gamesWithoutEan: number;
    boardGame: number;
    rpg: number;
    importedCopies: number;
    duplicateActiveEan: number;
    softDeletedEanConflicts: number;
    similarTitlePairs: number;
    eanAsCopyBarcode: number;
    invalidEanGames: number;
  };
};

function digitsOnly(raw: string): string {
  return raw.replace(/\D/g, "");
}

function productEanKey(ean: string): string {
  try {
    return normalizeEan(ean);
  } catch {
    return digitsOnly(ean);
  }
}

function copyMatchesProductEan(copyBarcode: string, gameEan: string): boolean {
  try {
    return normalizeEan(copyBarcode) === productEanKey(gameEan);
  } catch {
    return digitsOnly(copyBarcode) === digitsOnly(gameEan);
  }
}

export async function runEanAudit(prisma: PrismaClient): Promise<EanAuditReport> {
  const warnings: EanAuditWarning[] = [];

  const activeGames = await prisma.game.findMany({
    where: { deletedAt: null },
    select: {
      id: true,
      title: true,
      slug: true,
      ean: true,
      collectionType: true,
      createdAt: true,
      copies: {
        select: {
          id: true,
          inventoryNumber: true,
          barcode: true,
          notes: true,
        },
      },
      _count: { select: { copies: true, reservations: true } },
    },
  });

  const softDeletedWithEan = await prisma.game.findMany({
    where: { deletedAt: { not: null }, ean: { not: null } },
    select: { id: true, title: true, ean: true, deletedAt: true },
  });

  const byEan = new Map<string, typeof activeGames>();
  for (const g of activeGames) {
    if (!g.ean) continue;
    const list = byEan.get(g.ean) ?? [];
    list.push(g);
    byEan.set(g.ean, list);
  }

  let duplicateActiveEan = 0;
  for (const [ean, games] of byEan.entries()) {
    if (games.length <= 1) continue;
    duplicateActiveEan += 1;
    warnings.push({
      code: "DUPLICATE_ACTIVE_EAN",
      message: `EAN ${ean} występuje w ${games.length} aktywnych grach`,
      details: {
        ean,
        games: games.map((g) => ({
          id: g.id,
          title: g.title,
          slug: g.slug,
          copies: g._count.copies,
        })),
      },
    });
  }

  const activeEanSet = new Set(activeGames.filter((g) => g.ean).map((g) => g.ean!));
  let softDeletedEanConflicts = 0;
  for (const g of softDeletedWithEan) {
    if (!g.ean || !activeEanSet.has(g.ean)) continue;
    softDeletedEanConflicts += 1;
    warnings.push({
      code: "SOFT_DELETED_EAN_CONFLICT",
      message: `EAN ${g.ean} jest też na aktywnej grze i na soft-deleted „${g.title}”`,
      details: { ean: g.ean, softDeletedId: g.id, deletedAt: g.deletedAt },
    });
  }

  const withoutEan = activeGames.filter((g) => !g.ean);
  const withEan = activeGames.filter((g) => g.ean);
  let similarTitlePairs = 0;

  for (const a of withoutEan) {
    for (const b of withEan) {
      if (a.title.trim().toLowerCase() === b.title.trim().toLowerCase()) {
        similarTitlePairs += 1;
        warnings.push({
          code: "SIMILAR_TITLE_EAN_MISMATCH",
          message: `Tytuł „${a.title}” — gra bez EAN (${a.id}) i gra z EAN ${b.ean} (${b.id})`,
          details: { withoutEanId: a.id, withEanId: b.id, ean: b.ean },
        });
      }
    }
  }

  let eanAsCopyBarcode = 0;
  for (const g of withEan) {
    if (!g.ean) continue;
    for (const c of g.copies) {
      if (!c.barcode?.trim()) continue;
      if (copyMatchesProductEan(c.barcode, g.ean)) {
        eanAsCopyBarcode += 1;
        warnings.push({
          code: "EAN_AS_COPY_BARCODE",
          message: `Egzemplarz ${c.inventoryNumber} ma barcode = EAN produktu gry „${g.title}”`,
          details: {
            gameId: g.id,
            copyId: c.id,
            ean: g.ean,
            barcode: c.barcode,
          },
        });
      }
    }
  }

  let invalidEanGames = 0;
  for (const g of withEan) {
    if (!g.ean) continue;
    const raw = g.ean;
    const digits = digitsOnly(raw);
    const issues: string[] = [];
    if (raw !== digits && /[^0-9\s-]/.test(raw)) issues.push("niedozwolone znaki");
    if (!isValidBarcodeLength(digits) && digits.length !== 13 && digits.length !== 8) {
      issues.push(`długość ${digits.length}`);
    }
    if (digits.length === 13 || digits.length === 8) {
      try {
        const n = normalizeEan(digits);
        if (!validateEanChecksum(n)) issues.push("błędna suma kontrolna");
      } catch {
        issues.push("niepoprawny format");
      }
    }
    if (issues.length > 0) {
      invalidEanGames += 1;
      warnings.push({
        code: "INVALID_EAN",
        message: `Gra „${g.title}” ma problematyczny EAN: ${raw}`,
        details: { gameId: g.id, ean: raw, issues },
      });
    }
  }

  const importedCopies = await prisma.gameCopy.count({
    where: {
      OR: [
        { inventoryNumber: { startsWith: "ZF-EGZ-IMP-" } },
        { inventoryNumber: { startsWith: "IMP-" } },
        { notes: { contains: "Import products.json" } },
      ],
    },
  });

  const boardGame = activeGames.filter((g) => g.collectionType === "BOARD_GAME").length;
  const rpg = activeGames.filter((g) => g.collectionType === "RPG").length;

  return {
    ok: warnings.length === 0,
    warnings,
    stats: {
      gamesWithEan: withEan.length,
      gamesWithoutEan: withoutEan.length,
      boardGame,
      rpg,
      importedCopies,
      duplicateActiveEan,
      softDeletedEanConflicts,
      similarTitlePairs,
      eanAsCopyBarcode,
      invalidEanGames,
    },
  };
}

export function formatEanAuditText(report: EanAuditReport): string {
  const lines: string[] = [];
  lines.push(report.ok ? "\n✅ EAN AUDIT OK" : "\n⚠️ EAN AUDIT WARNINGS");
  lines.push("");
  lines.push("=== Statystyki ===");
  lines.push(`Gry z EAN: ${report.stats.gamesWithEan}`);
  lines.push(`Gry bez EAN: ${report.stats.gamesWithoutEan}`);
  lines.push(`BOARD_GAME: ${report.stats.boardGame}`);
  lines.push(`RPG: ${report.stats.rpg}`);
  lines.push(`Egzemplarze z importu products: ${report.stats.importedCopies}`);
  lines.push(`Duplikaty aktywnych EAN: ${report.stats.duplicateActiveEan}`);
  lines.push(`Konflikty EAN ze soft-deleted: ${report.stats.softDeletedEanConflicts}`);
  lines.push(`Pary tytuł z/bez EAN: ${report.stats.similarTitlePairs}`);
  lines.push(`EAN w barcode egzemplarza: ${report.stats.eanAsCopyBarcode}`);
  lines.push(`Gry z błędnym EAN: ${report.stats.invalidEanGames}`);

  if (report.warnings.length > 0) {
    lines.push("");
    lines.push("=== Ostrzeżenia ===");
    for (const w of report.warnings.slice(0, 30)) {
      lines.push(`[${w.code}] ${w.message}`);
    }
    if (report.warnings.length > 30) {
      lines.push(`… i ${report.warnings.length - 30} kolejnych (użyj --json)`);
    }
  }

  lines.push("");
  lines.push("Nic nie zostało zmienione w bazie. To tylko audyt.");
  return lines.join("\n");
}
