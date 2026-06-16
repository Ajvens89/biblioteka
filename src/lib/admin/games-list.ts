import type { CopyStatus, GameCollectionType, Prisma } from "@prisma/client";
import { countAvailableCopies } from "@/lib/games/availability";
import { normalizeEan } from "@/lib/services/ean";

export type AdminGamesSearchParams = {
  q?: string;
  ean?: string;
  collectionType?: string;
  missingEan?: string;
  missingCover?: string;
  missingCopies?: string;
  availability?: string;
  sort?: string;
};

export function buildAdminGamesWhere(params: AdminGamesSearchParams): Prisma.GameWhereInput {
  const where: Prisma.GameWhereInput = { deletedAt: null };

  if (params.q?.trim()) {
    where.title = { contains: params.q.trim(), mode: "insensitive" };
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
    where.OR = [{ coverImageUrl: null }, { coverImageUrl: "" }];
  }

  if (params.missingCopies === "1") {
    where.copies = { none: {} };
  }

  if (params.availability === "available") {
    where.copies = { some: { status: "AVAILABLE" } };
  } else if (params.availability === "unavailable") {
    where.NOT = { copies: { some: { status: "AVAILABLE" } } };
    where.copies = { some: {} };
  }

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
