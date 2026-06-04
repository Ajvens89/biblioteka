import type { Prisma, PrismaClient } from "@prisma/client";
import { EanError, normalizeEan } from "@/lib/services/ean";
import { ServiceError } from "@/lib/services/errors";

type Db = PrismaClient | Prisma.TransactionClient;

/**
 * EAN produktu (games.ean) nie może trafić do game_copies.barcode.
 * Barcode egzemplarza to osobna naklejka / kod wewnętrzny biblioteki.
 */
export async function assertBarcodeNotProductEan(
  prisma: Db,
  gameId: string,
  barcode: string | null | undefined,
) {
  const raw = barcode?.trim();
  if (!raw) return;

  const game = await prisma.game.findUnique({
    where: { id: gameId },
    select: { ean: true, title: true },
  });
  if (!game?.ean) return;

  try {
    const productEan = normalizeEan(game.ean);
    const asEan = normalizeEan(raw);
    if (productEan === asEan) {
      throw new ServiceError(
        `Kod egzemplarza nie może być tym samym co EAN produktu gry „${game.title}”. ` +
          `EAN zapisuje się przy grze; egzemplarz ma własny kod (np. z naklejki biblioteki).`,
        "BARCODE_IS_PRODUCT_EAN",
      );
    }
  } catch (e) {
    if (e instanceof ServiceError) throw e;
    if (e instanceof EanError) {
      /* barcode nie wygląda na EAN — OK */
      return;
    }
    throw e;
  }
}
