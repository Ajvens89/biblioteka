import path from "node:path";
import {
  isStrictTitleCoverMatch,
  scoreTitleMatch,
} from "@/lib/services/ean-providers/upcitemdb-provider";
import { isPublicCoverAvailable } from "@/lib/services/import-products";

export type CoverIssueCode =
  | "missing_cover"
  | "missing_file"
  | "hex_import_path"
  | "remote_url"
  | "low_title_match"
  | "strict_mismatch"
  | "series_mismatch"
  | "book_game_mismatch"
  | "puzzle_mismatch";

export type CoverAuditRow = {
  id: string;
  title: string;
  slug: string;
  ean: string | null;
  coverImageUrl: string | null;
  coverImageSource: string | null;
  coverSlug: string;
  matchScore: number;
  issues: CoverIssueCode[];
  severity: number;
  needsFix: boolean;
};

const FIX_ISSUES: CoverIssueCode[] = [
  "series_mismatch",
  "puzzle_mismatch",
  "book_game_mismatch",
  "missing_file",
  "missing_cover",
];

export function coverPathToSlug(coverUrl: string): string {
  const base = path.basename(coverUrl).replace(/\.[a-z0-9]+$/i, "");
  const withoutHash = base.replace(/\.[a-f0-9]{8,12}$/i, "");
  return withoutHash.replace(/-/g, " ");
}

function isHexImportPath(coverUrl: string): boolean {
  const base = path.basename(coverUrl);
  return /^[0-9a-f]{20,}\./i.test(base) || base.includes(".full.");
}

function detectSeriesMismatch(title: string, coverSlug: string): boolean {
  const t = title.toLowerCase();
  const c = coverSlug.toLowerCase();
  const series = ["monopoly", "catan", "scrabble", "risk", "cluedo", "bang", "uno"];
  for (const s of series) {
    if (t.includes(s) !== c.includes(s)) return true;
  }
  return false;
}

export function auditGameCover(
  game: {
    id: string;
    title: string;
    slug: string;
    ean: string | null;
    coverImageUrl: string | null;
    coverImageSource: string | null;
  },
  minScore = 50,
): CoverAuditRow | null {
  const issues: CoverIssueCode[] = [];
  let severity = 0;

  if (!game.coverImageUrl?.trim()) {
    return {
      ...game,
      coverSlug: "",
      matchScore: 0,
      issues: ["missing_cover"],
      severity: 1,
      needsFix: true,
    };
  }

  const cover = game.coverImageUrl.trim();

  if (cover.startsWith("http")) {
    issues.push("remote_url");
    severity += 2;
  }

  if (cover.startsWith("/") && !isPublicCoverAvailable(cover)) {
    issues.push("missing_file");
    severity += 4;
  }

  if (isHexImportPath(cover) || game.coverImageSource === "products_import") {
    issues.push("hex_import_path");
    severity += 3;
  }

  const coverSlug = coverPathToSlug(cover);
  const matchScore = scoreTitleMatch(game.title, coverSlug);

  if (matchScore < minScore) {
    issues.push("low_title_match");
    severity += 5;
  }

  if (!isStrictTitleCoverMatch(game.title, coverSlug, 60)) {
    issues.push("strict_mismatch");
    severity += 4;
  }

  if (detectSeriesMismatch(game.title, coverSlug)) {
    issues.push("series_mismatch");
    severity += 6;
  }

  const isbn = game.ean?.startsWith("978");
  const gameSeriesInCover = /monopoly|scrabble|catan|risk|cluedo|bang|unmatched|burgundy|obsession/i.test(
    coverSlug,
  );
  if ((isbn || /książka|powieść/i.test(game.title)) && gameSeriesInCover) {
    issues.push("book_game_mismatch");
    severity += 8;
  }

  const titlePuzzle = /puzzle/i.test(game.title);
  const coverPuzzle = /puzzle|paw.?patrol|trefl/i.test(coverSlug);
  if (titlePuzzle && !coverPuzzle && matchScore < 40) {
    issues.push("puzzle_mismatch");
    severity += 7;
  }

  const needsFix = issues.some((i) => FIX_ISSUES.includes(i));

  if (!needsFix && issues.length === 0) return null;
  if (!needsFix && issues.length === 1 && issues[0] === "remote_url") return null;
  if (!needsFix) return null;

  return {
    ...game,
    coverSlug,
    matchScore,
    issues,
    severity,
    needsFix,
  };
}

export function gameNeedsCoverFixFromAudit(
  game: {
    id: string;
    title: string;
    slug: string;
    ean: string | null;
    coverImageUrl: string | null;
    coverImageSource: string | null;
  },
): boolean {
  return auditGameCover(game)?.needsFix ?? false;
}
