import type { PrismaClient } from "@prisma/client";
import { validateEanChecksum } from "@/lib/services/ean";

export type CatalogQualityIssue = {
  id: string;
  title: string;
  slug: string;
  issue: string;
  category: string;
};

export type CatalogQualityReport = {
  missingEan: CatalogQualityIssue[];
  invalidEan: CatalogQualityIssue[];
  missingAuthor: CatalogQualityIssue[];
  missingPublisher: CatalogQualityIssue[];
  missingDescription: CatalogQualityIssue[];
  missingYear: CatalogQualityIssue[];
  missingPlayers: CatalogQualityIssue[];
  missingPlayTime: CatalogQualityIssue[];
  missingAge: CatalogQualityIssue[];
  slugMismatch: CatalogQualityIssue[];
  noCopies: CatalogQualityIssue[];
  typeMismatch: CatalogQualityIssue[];
  totals: Record<string, number>;
};

function baseIssue(g: { id: string; title: string; slug: string }, issue: string, category: string): CatalogQualityIssue {
  return { id: g.id, title: g.title, slug: g.slug, issue, category };
}

export async function buildCatalogQualityReport(db: PrismaClient): Promise<CatalogQualityReport> {
  const games = await db.game.findMany({
    where: { deletedAt: null, isActive: true },
    include: {
      publisher: true,
      designer: true,
      copies: { select: { id: true } },
    },
  });

  const missingEan: CatalogQualityIssue[] = [];
  const invalidEan: CatalogQualityIssue[] = [];
  const missingAuthor: CatalogQualityIssue[] = [];
  const missingPublisher: CatalogQualityIssue[] = [];
  const missingDescription: CatalogQualityIssue[] = [];
  const missingYear: CatalogQualityIssue[] = [];
  const missingPlayers: CatalogQualityIssue[] = [];
  const missingPlayTime: CatalogQualityIssue[] = [];
  const missingAge: CatalogQualityIssue[] = [];
  const slugMismatch: CatalogQualityIssue[] = [];
  const noCopies: CatalogQualityIssue[] = [];
  const typeMismatch: CatalogQualityIssue[] = [];

  for (const g of games) {
    if (!g.ean) {
      missingEan.push(baseIssue(g, "Brak EAN/ISBN", "ean"));
    } else if (!validateEanChecksum(g.ean.replace(/\D/g, ""))) {
      invalidEan.push(baseIssue(g, `Błędna suma kontrolna: ${g.ean}`, "ean"));
    }

    if (!g.designerId) missingAuthor.push(baseIssue(g, "Brak autora/projektanta", "author"));
    if (!g.publisherId) missingPublisher.push(baseIssue(g, "Brak wydawcy", "publisher"));
    if (!g.description?.trim()) missingDescription.push(baseIssue(g, "Brak opisu", "description"));
    if (!g.yearPublished) missingYear.push(baseIssue(g, "Brak roku wydania", "year"));
    if (g.minPlayers <= 0 || g.maxPlayers <= 0) missingPlayers.push(baseIssue(g, "Brak danych graczy", "players"));
    if (g.minPlayTime <= 0 && g.maxPlayTime <= 0) missingPlayTime.push(baseIssue(g, "Brak czasu rozgrywki", "playtime"));
    if (g.minAge <= 0) missingAge.push(baseIssue(g, "Brak wieku", "age"));
    if (g.copies.length === 0) noCopies.push(baseIssue(g, "Brak egzemplarzy", "copies"));

    const slugNorm = g.slug.toLowerCase().replace(/-/g, "");
    const titleNorm = g.title.toLowerCase().replace(/[^a-z0-9ąćęłńóśźż]/gi, "").slice(0, 8);
    if (titleNorm.length >= 4 && !slugNorm.includes(titleNorm.slice(0, 4)) && !titleNorm.includes(slugNorm.slice(0, 4))) {
      slugMismatch.push(baseIssue(g, `Slug „${g.slug}” nie pasuje do tytułu`, "slug"));
    }

    if (g.type === "RPG" && g.collectionType === "BOARD_GAME") {
      typeMismatch.push(baseIssue(g, "type=RPG przy collectionType=BOARD_GAME", "type"));
    }
  }

  const report: CatalogQualityReport = {
    missingEan,
    invalidEan,
    missingAuthor,
    missingPublisher,
    missingDescription,
    missingYear,
    missingPlayers,
    missingPlayTime,
    missingAge,
    slugMismatch,
    noCopies,
    typeMismatch,
    totals: {
      missingEan: missingEan.length,
      invalidEan: invalidEan.length,
      missingAuthor: missingAuthor.length,
      missingPublisher: missingPublisher.length,
      missingDescription: missingDescription.length,
      missingYear: missingYear.length,
      missingPlayers: missingPlayers.length,
      missingPlayTime: missingPlayTime.length,
      missingAge: missingAge.length,
      slugMismatch: slugMismatch.length,
      noCopies: noCopies.length,
      typeMismatch: typeMismatch.length,
    },
  };

  return report;
}

export function reportToCsv(report: CatalogQualityReport): string {
  const rows = ["id,title,slug,category,issue"];
  const all = [
    ...report.missingEan,
    ...report.invalidEan,
    ...report.missingAuthor,
    ...report.missingPublisher,
    ...report.missingDescription,
    ...report.missingYear,
    ...report.missingPlayers,
    ...report.missingPlayTime,
    ...report.missingAge,
    ...report.slugMismatch,
    ...report.noCopies,
    ...report.typeMismatch,
  ];
  for (const r of all) {
    rows.push(
      `"${r.id}","${r.title.replace(/"/g, '""')}","${r.slug}","${r.category}","${r.issue.replace(/"/g, '""')}"`,
    );
  }
  return rows.join("\n");
}
