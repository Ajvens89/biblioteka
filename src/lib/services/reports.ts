import type { PrismaClient } from "@prisma/client";
import { buildCatalogQualityReport } from "@/lib/services/catalog-quality";

export type WeeklyReportRow = {
  category: string;
  count: number;
  sampleTitle: string;
  sampleSlug: string;
};

export async function buildWeeklyDataGapsReport(db: PrismaClient): Promise<{
  generatedAt: string;
  rows: WeeklyReportRow[];
  totals: Record<string, number>;
}> {
  const report = await buildCatalogQualityReport(db);
  const rows: WeeklyReportRow[] = [];

  const sections: Array<{ key: keyof typeof report.totals; label: string; items: { title: string; slug: string }[] }> = [
    { key: "missingEan", label: "Brak EAN", items: report.missingEan },
    { key: "invalidEan", label: "Błędny EAN", items: report.invalidEan },
    { key: "missingDescription", label: "Brak opisu", items: report.missingDescription },
    { key: "missingAuthor", label: "Brak autora", items: report.missingAuthor },
    { key: "missingPublisher", label: "Brak wydawcy", items: report.missingPublisher },
    { key: "noCopies", label: "Brak egzemplarzy", items: report.noCopies },
    { key: "slugMismatch", label: "Niespójny slug", items: report.slugMismatch },
    { key: "typeMismatch", label: "Niespójny typ", items: report.typeMismatch },
  ];

  for (const section of sections) {
    if (section.items.length === 0) continue;
    rows.push({
      category: section.label,
      count: section.items.length,
      sampleTitle: section.items[0]?.title ?? "",
      sampleSlug: section.items[0]?.slug ?? "",
    });
  }

  return {
    generatedAt: new Date().toISOString(),
    rows,
    totals: report.totals,
  };
}

export function reportRowsToCsv(rows: WeeklyReportRow[]): string {
  const header = "kategoria,liczba,przyklad_tytul,przyklad_slug";
  const lines = rows.map(
    (r) =>
      `"${r.category.replace(/"/g, '""')}",${r.count},"${r.sampleTitle.replace(/"/g, '""')}","${r.sampleSlug.replace(/"/g, '""')}"`,
  );
  return [header, ...lines].join("\n");
}
