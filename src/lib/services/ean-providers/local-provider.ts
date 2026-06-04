import type { PrismaClient } from "@prisma/client";
import { findGameByEan } from "@/lib/services/game-by-ean";
import { validateCoverImageUrl } from "./image-utils";
import type { CoverCandidate } from "./types";

/** Plan A — games.ean w lokalnej bazie. */
export async function lookupLocalProvider(
  prisma: PrismaClient,
  normalizedEan: string,
): Promise<{ candidate?: CoverCandidate; game?: NonNullable<Awaited<ReturnType<typeof findGameByEan>>> }> {
  const game = await findGameByEan(prisma, normalizedEan);
  if (!game) return {};

  const cover = validateCoverImageUrl(game.coverImageUrl);

  return {
    game,
    candidate: {
      source: "local",
      title: game.title,
      description: game.description ?? undefined,
      authors: game.designer ? [game.designer.name] : undefined,
      publisher: game.publisher?.name,
      year: game.yearPublished ?? undefined,
      coverImageUrl: cover ?? undefined,
      thumbnailUrl: cover ?? undefined,
      sourceUrl: `/admin/gry/${game.id}`,
      externalId: game.id,
      confidence: "high",
      collectionTypeSuggestion: game.collectionType,
      notes: "Ta gra już jest w bibliotece. Możesz dodać kolejny egzemplarz.",
    },
  };
}
