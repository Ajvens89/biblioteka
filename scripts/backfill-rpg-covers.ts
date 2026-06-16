/**
 * Uzupełnia brakujące okładki dla partii 20 gier RPG (hurt → Rebel → ręczne URL → fetch).
 *   npx tsx scripts/backfill-rpg-covers.ts
 *   npx tsx scripts/backfill-rpg-covers.ts --dry-run
 */
import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import {
  findHurtProductByEan,
  findHurtProductByTitle,
  mapHurtProductToGameData,
  canonicalHurtEan,
} from "../src/lib/hurt-catalog";
import { loadHurtCatalog } from "../src/lib/hurt-catalog-loader";
import { downloadCoverToPublic } from "../src/lib/services/cover-download";
import { fetchCoverForGame } from "../src/lib/services/cover-fetch";
import { lookupPlanszeoCoverUrl } from "../src/lib/services/ean-providers/planszeo-provider";
import { lookupRebelCoverUrl } from "../src/lib/services/ean-providers/rebel-images-provider";

const EANS = [
  "9788395409523",
  "9788395802034",
  "9788395409592",
  "9788395802027",
  "9788395409547",
  "9788396103109",
  "9788393057122",
  "9788364198045",
  "9788364198175",
  "9788364198342",
  "9788364198892",
  "9788367619028",
  "9788364198533",
  "9788364198144",
  "9788364198496",
  "9788364198410",
  "9788395672002",
  "9788397264588",
  "9788396134837",
  "9788396566362",
];

/** Ręczne URL gdy hurt/Rebel nie zwracają okładki. */
const MANUAL_COVER_URL: Record<string, string> = {
  "9788395802034":
    "https://sklep.portalgames.pl/environment/cache/images/productGfx_2280_500_500/miami.png",
  "9788393057122": "https://static.polter.pl/sub/Afterbomb-Madness-druga-edycja-bn45995.jpg",
  "9788364198144": "https://static.polter.pl/sub/Zew-Cthulhu-Uslysz-Zew-Cthulhu-bn51219.jpg",
  "9788396134837": "https://static.polter.pl/sub/Wampir-Sabat-Czarna-Reka-bn54559.jpg",
  "9788397264588":
    "https://files.rebel.pl/products/1065/5759/_2028630/wampir-maskarada-camarilla-okladka.png",
  "9788395672002":
    "https://files.rebel.pl/products/1065/6922/_2030066/wampir-maskarada-120x160-ffffff.png",
};

const dryRun = process.argv.includes("--dry-run");

async function resolveCover(
  title: string,
  ean: string,
  hurtImage: string | null,
): Promise<{ url: string | null; source: string | null }> {
  if (hurtImage) {
    const local = await downloadCoverToPublic(hurtImage, title);
    if (local) return { url: local, source: "hurt" };
  }
  const rebel = await lookupRebelCoverUrl(title, ean);
  if (rebel?.coverUrl) {
    const local = await downloadCoverToPublic(rebel.coverUrl, title);
    if (local) return { url: local, source: "rebel" };
  }
  const manual = MANUAL_COVER_URL[ean];
  if (manual) {
    const local = await downloadCoverToPublic(manual, title);
    if (local) return { url: local, source: "manual" };
  }
  const planszeo = await lookupPlanszeoCoverUrl(title, ean);
  if (planszeo?.coverUrl) {
    const local = await downloadCoverToPublic(planszeo.coverUrl, title);
    if (local) return { url: local, source: "planszeo" };
  }
  const fetched = await fetchCoverForGame({ title, ean, collectionType: "RPG" });
  if (fetched.coverImageUrl) {
    return { url: fetched.coverImageUrl, source: fetched.coverImageSource };
  }
  return { url: null, source: null };
}

async function main() {
  const prisma = new PrismaClient();
  const catalog = await loadHurtCatalog();
  let updated = 0;
  let skipped = 0;
  let failed = 0;

  try {
    for (const eanRaw of EANS) {
      const ean = canonicalHurtEan(eanRaw);
      const game = await prisma.game.findFirst({
        where: { ean, deletedAt: null },
        select: { id: true, title: true, coverImageUrl: true },
      });
      if (!game) {
        console.log(`✗ ${ean} — brak w bazie`);
        failed += 1;
        continue;
      }
      if (game.coverImageUrl?.trim()) {
        console.log(`○ ${game.title} — ma okładkę`);
        skipped += 1;
        continue;
      }

      const hurtProduct =
        (catalog ? findHurtProductByEan(ean, catalog) : null) ??
        (catalog ? findHurtProductByTitle(game.title, catalog)?.product : null);
      const hurtMapped = hurtProduct ? mapHurtProductToGameData(hurtProduct) : null;
      const hurtImage = hurtMapped?.imageUrl ?? hurtMapped?.thumbnailUrl ?? null;

      const cover = await resolveCover(game.title, ean, hurtImage);
      if (!cover.url) {
        console.log(`✗ ${game.title} — nie znaleziono okładki`);
        failed += 1;
        continue;
      }

      console.log(`+ ${game.title} → ${cover.url} (${cover.source})`);

      if (!dryRun) {
        await prisma.game.update({
          where: { id: game.id },
          data: {
            coverImageUrl: cover.url,
            coverImageSource: cover.source,
          },
        });
      }
      updated += 1;
    }

    console.log(
      `\n${dryRun ? "[dry-run] " : ""}Uzupełniono: ${updated}, pominięto: ${skipped}, błędy: ${failed}`,
    );
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
