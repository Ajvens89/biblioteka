import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { fetchCoverForGame } from "../src/lib/services/cover-fetch";

const EANS = ["9788395802034", "9788393057122", "9788364198144", "9788396134837"];

async function main() {
  const prisma = new PrismaClient();
  for (const ean of EANS) {
    const game = await prisma.game.findFirst({
      where: { ean, deletedAt: null },
      select: { id: true, title: true, coverImageUrl: true },
    });
    if (!game) {
      console.log(`${ean} — brak w bazie`);
      continue;
    }
    if (game.coverImageUrl?.trim()) {
      console.log(`${ean} — ma okładkę: ${game.coverImageUrl}`);
      continue;
    }
    const fetched = await fetchCoverForGame({ title: game.title, ean });
    if (!fetched.coverImageUrl) {
      console.log(`${ean} — nie znaleziono okładki`);
      continue;
    }
    await prisma.game.update({
      where: { id: game.id },
      data: {
        coverImageUrl: fetched.coverImageUrl,
        coverImageSource: fetched.coverImageSource,
      },
    });
    console.log(`${ean} — OK ${fetched.coverImageUrl} (${fetched.coverImageSource})`);
  }
  await prisma.$disconnect();
}

main();
