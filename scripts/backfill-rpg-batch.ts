/**
 * Uzupełnia okładki i opisy dla gier po EAN (Google Books, Rebel, hurt).
 *   npx tsx scripts/backfill-rpg-batch.ts
 */
import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { downloadCoverToPublic } from "../src/lib/services/cover-download";
import { fetchCoverForGame } from "../src/lib/services/cover-fetch";
import { lookupGoogleBooksProvider } from "../src/lib/services/ean-providers/google-books-provider";
import { lookupOpenLibraryProvider } from "../src/lib/services/ean-providers/open-library-provider";

const EANS = [
  "9788395802034",
  "9788393057122",
  "9788364198342",
  "9788364198533",
  "9788364198144",
  "9788364198410",
  "9788395672002",
  "9788396134837",
  "9788396566362",
];

async function main() {
  const prisma = new PrismaClient();
  let updated = 0;

  for (const ean of EANS) {
    const game = await prisma.game.findFirst({
      where: { ean, deletedAt: null },
      select: { id: true, title: true, coverImageUrl: true, description: true },
    });
    if (!game) {
      console.log(`⏭  ${ean} — brak w bazie`);
      continue;
    }

    const needsCover = !game.coverImageUrl?.trim();
    const needsDesc = !game.description?.trim();
    if (!needsCover && !needsDesc) {
      console.log(`✓  ${ean} — kompletne: „${game.title}”`);
      continue;
    }

    let description = game.description;
    let shortDescription: string | null = null;
    let coverUrl = game.coverImageUrl;
    let coverSource: string | null = null;

    const google = await lookupGoogleBooksProvider(ean);
    const openLib = google[0]?.description ? [] : await lookupOpenLibraryProvider(ean, { googleHadCover: false });
    const meta = google[0] ?? openLib[0];

    if (needsDesc && meta?.description) {
      description = meta.description;
      shortDescription = meta.authors?.join(", ") ?? null;
    }

    if (needsCover) {
      if (meta?.coverImageUrl) {
        const local = await downloadCoverToPublic(meta.coverImageUrl, game.title);
        if (local) {
          coverUrl = local;
          coverSource = meta.source;
        }
      }
      if (!coverUrl) {
        const fetched = await fetchCoverForGame({ title: game.title, ean });
        if (fetched.coverImageUrl) {
          coverUrl = fetched.coverImageUrl;
          coverSource = fetched.coverImageSource;
        }
      }
    }

    await prisma.game.update({
      where: { id: game.id },
      data: {
        description: description || undefined,
        shortDescription: shortDescription || undefined,
        coverImageUrl: coverUrl || undefined,
        coverImageSource: coverSource || undefined,
      },
    });

    console.log(
      `↑  ${ean} — „${game.title}” | okładka: ${coverUrl ? "tak" : "nie"} | opis: ${description ? "tak" : "nie"}`,
    );
    updated += 1;
  }

  console.log(`\nZaktualizowano: ${updated}`);
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
