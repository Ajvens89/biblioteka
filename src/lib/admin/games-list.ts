import type { CopyStatus, GameCollectionType, Prisma } from "@prisma/client";
import { countAvailableCopies } from "@/lib/games/availability";
import { normalizeEan } from "@/lib/services/ean";
import { CATALOG_ONLY_MODE } from "@/lib/catalog-mode";

export type AdminGamesSearchParams = {
  q?: string;
  ean?: string;
  collectionType?: string;
  missingEan?: string;
  missingCover?: string;
  missingDescription?: string;
  missingCopies?: string;
  availability?: string;
  sort?: string;
};

export function buildAdminGamesWhere(params: AdminGamesSearchParams): Prisma.GameWhereInput {
  const where: Prisma.GameWhereInput = { deletedAt: null };
  const clauses: Prisma.GameWhereInput[] = [];

  if (params.q?.trim()) {
    clauses.push({ OR: [
      { title: { contains: params.q.trim(), mode: "insensitive" } },
      { publisher: { name: { contains: params.q.trim(), mode: "insensitive" } } },
    ] });
  }

  if (params.ean?.trim()) {
    try {
      where.ean = normalizeEan(params.ean);
    } catch {
      where.ean = "__none__";
    }
  }

  if (params.collectionType === "BOARD_GAME" || params.collectionType === "RPG") {
    where.collectionType = params.collectionType as GameCollectionType;
  }

  if (params.missingEan === "1") {
    where.ean = null;
  }

  if (params.missingCover === "1") {
    clauses.push({ OR: [{ coverImageUrl: null }, { coverImageUrl: "" }] });
  }
  if (params.missingDescription === "1") {
    clauses.push({ OR: [{ description: null }, { description: "" }] });
  }

  if (!CATALOG_ONLY_MODE && params.missingCopies === "1") {
    where.copies = { none: {} };
  }

  if (!CATALOG_ONLY_MODE && params.availability === "available") {
    where.copies = { some: { status: "AVAILABLE" } };
  } else if (!CATALOG_ONLY_MODE && params.availability === "unavailable") {
    where.NOT = { copies: { some: { status: "AVAILABLE" } } };
    where.copies = { some: {} };
  }

  if (clauses.length) where.AND = clauses;
  return where;
}

export function buildAdminGamesOrderBy(
  sort?: string,
): Prisma.GameOrderByWithRelationInput | Prisma.GameOrderByWithRelationInput[] {
  switch (sort) {
    case "newest":
      return { createdAt: "desc" };
    case "missingEan":
      return [{ ean: "asc" }, { title: "asc" }];
    case "missingCover":
      return [{ coverImageUrl: "asc" }, { title: "asc" }];
    case "missingCopies":
      return [{ title: "asc" }];
    default:
      return { title: "asc" };
  }
}

export function gameAvailabilityLabel(copies: { status: CopyStatus }[]) {
  const available = countAvailableCopies(copies);
  const total = copies.length;
  if (total === 0) return { label: "Brak egzemplarzy", variant: "secondary" as const };
  if (available > 0) return { label: `${available} dostępne`, variant: "success" as const };
  return { label: "Niedostępna", variant: "warning" as const };
}
