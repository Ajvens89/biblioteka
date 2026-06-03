import Papa from "papaparse";
import type { Difficulty, GameType } from "@prisma/client";

export type GameCsvRow = {
  title: string;
  slug?: string;
  description?: string;
  shortDescription?: string;
  minPlayers?: string;
  maxPlayers?: string;
  minAge?: string;
  minPlayTime?: string;
  maxPlayTime?: string;
  difficulty?: Difficulty;
  type?: GameType;
  yearPublished?: string;
  publisher?: string;
  designer?: string;
  categories?: string;
  tags?: string;
};

export function gamesToCsv(
  games: Array<{
    title: string;
    slug: string;
    description: string | null;
    shortDescription: string | null;
    minPlayers: number;
    maxPlayers: number;
    minAge: number;
    minPlayTime: number;
    maxPlayTime: number;
    difficulty: string;
    type: string;
    yearPublished: number | null;
    publisher?: { name: string } | null;
    designer?: { name: string } | null;
  }>,
) {
  const rows = games.map((g) => ({
    title: g.title,
    slug: g.slug,
    description: g.description ?? "",
    shortDescription: g.shortDescription ?? "",
    minPlayers: g.minPlayers,
    maxPlayers: g.maxPlayers,
    minAge: g.minAge,
    minPlayTime: g.minPlayTime,
    maxPlayTime: g.maxPlayTime,
    difficulty: g.difficulty,
    type: g.type,
    yearPublished: g.yearPublished ?? "",
    publisher: g.publisher?.name ?? "",
    designer: g.designer?.name ?? "",
  }));
  return Papa.unparse(rows);
}

export function parseGamesCsv(content: string): GameCsvRow[] {
  const result = Papa.parse<GameCsvRow>(content, { header: true, skipEmptyLines: true });
  if (result.errors.length) {
    throw new Error(result.errors[0]?.message ?? "Błąd parsowania CSV");
  }
  return result.data.filter((r) => r.title?.trim());
}
