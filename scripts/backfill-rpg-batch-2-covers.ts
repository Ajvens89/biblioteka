import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { downloadCoverToPublic } from "../src/lib/services/cover-download";

/** Ręcznie zweryfikowane URL-e (trpg.pl, sklepy, Open Library, RPGGeek). */
const PATCHES: Array<{ slug: string; coverUrls: string[] }> = [
  {
    slug: "afterglow",
    coverUrls: [
      "https://cf.geekdo-images.com/bDScKsWpHC0j7dJXbB5NHQ__opengraph/img/D-m6WZtVN_5SzIe53_cqDRyNYJY=/fit-in/1200x630/filters:strip_icc()/pic3194626.jpg",
    ],
  },
  {
    slug: "savage-worlds-edycja-polska-2015",
    coverUrls: [
      "https://trpg.pl/wp-content/uploads/2022/06/savage-worlds-2015.jpg",
      "https://s.lubimyczytac.pl/upload/books/4980000/4980937/923122-352x500.jpg",
    ],
  },
  {
    slug: "savage-worlds-nemezis",
    coverUrls: ["https://trpg.pl/wp-content/uploads/2022/06/Nemezis-podrecznik-scaled.jpg"],
  },
  {
    slug: "savage-worlds-horror-companion",
    coverUrls: ["https://trpg.pl/wp-content/uploads/2022/06/sw_horror.jpg"],
  },
  {
    slug: "dungeon-world-podziemia-i-potwory",
    coverUrls: [
      "https://trpg.pl/wp-content/uploads/2025/09/Dungeon-World-podziemia-i-potwory-scaled.jpg",
      "https://rgfk.pl/6173-large_default/podrecznik-dungeon-world-podziemia-i-potwory-limitowana-oprawa.webp",
    ],
  },
  {
    slug: "kult-boskosc-utracona",
    coverUrls: ["https://trpg.pl/wp-content/uploads/2025/10/kult-boskosc-utracona.jpg"],
  },
  {
    slug: "armie-apokalipsy",
    coverUrls: ["https://trpg.pl/wp-content/uploads/2022/06/armie-apokalipsy.jpg"],
  },
  {
    slug: "klanarchia",
    coverUrls: ["https://trpg.pl/wp-content/uploads/2022/05/Klanarchia-scaled.jpg"],
  },
  {
    slug: "modern-age-podrecznik-podstawowy",
    coverUrls: [
      "https://covers.openlibrary.org/b/id/8807783-L.jpg",
      "https://covers.openlibrary.org/b/isbn/9781934547915-L.jpg",
    ],
  },
  {
    slug: "ashen-stars",
    coverUrls: [
      "https://cf.geekdo-images.com/VawIcgquaq2ox9pFejv6_w__opengraph/img/3gWqvtATzKb-aMFTW_Y1KKdZdsc=/0x0:640x336/fit-in/1200x630/filters:strip_icc()/pic1569708.png",
    ],
  },
  {
    slug: "blades-in-the-dark",
    coverUrls: [
      "https://s.lubimyczytac.pl/upload/books/4947000/4947083/863973-352x500.jpg",
      "https://www.stingershop.pl/wp-content/uploads/2024/01/SP_podrecznik_promo_FB_cena_ostrza-2026_normal.jpg",
    ],
  },
  {
    slug: "monster-of-the-week-druga-edycja",
    coverUrls: ["https://trpg.pl/wp-content/uploads/2025/09/potwor-tygodnia.webp"],
  },
  {
    slug: "dune-adventures-in-the-imperium",
    coverUrls: [
      "https://strefamtg.pl/106444-large_default/diuna-przygody-w-imperium-podrecznik-glowny-pl-.jpg",
      "https://matfel.pl/hpeciai/6a5641ca1ddfa8a744af3b1bde959c7c/pol_pl_Diuna-Podrecznik-podstawowy-edycja-Retail-1298751_1.webp",
    ],
  },
];

async function main() {
  const prisma = new PrismaClient();
  let ok = 0;
  let fail = 0;

  for (const p of PATCHES) {
    const game = await prisma.game.findFirst({
      where: { slug: p.slug, deletedAt: null },
      select: { id: true, title: true, coverImageUrl: true },
    });
    if (!game) {
      console.log(`✗ brak w bazie: ${p.slug}`);
      fail++;
      continue;
    }

    let local: string | null = null;
    for (const url of p.coverUrls) {
      local = await downloadCoverToPublic(url, game.title);
      if (local) break;
    }

    if (!local) {
      console.log(`✗ ${game.title} — pobranie nieudane`);
      fail++;
      continue;
    }

    await prisma.game.update({
      where: { id: game.id },
      data: { coverImageUrl: local, coverImageSource: "manual" },
    });
    console.log(`+ ${game.title} → ${local}`);
    ok++;
  }

  console.log(`\nGotowe: ${ok}/${PATCHES.length}, błędy: ${fail}`);
  await prisma.$disconnect();
}

main();
