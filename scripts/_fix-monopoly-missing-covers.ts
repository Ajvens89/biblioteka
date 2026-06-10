/**
 * Ręczne uzupełnienie brakujących okładek Monopoly.
 *   npx tsx scripts/_fix-monopoly-missing-covers.ts
 */
import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { downloadCoverToPublic } from "../src/lib/services/cover-download";
import { probeImageUrl } from "../src/lib/services/ean-providers/image-utils";

const prisma = new PrismaClient();

type Entry = {
  match: { ean?: string; slug?: string; titleContains?: string };
  localPath?: string;
  urls?: string[];
  source?: "manual" | "rebel" | "planszeo" | "upcitemdb";
};

const ENTRIES: Entry[] = [
  {
    match: { slug: "monopoly-polska-jest-piekna" },
    localPath: "/covers/monopoly-polska.dde7ee1545.jpg",
    source: "rebel",
  },
  {
    match: { slug: "monopoly-psy" },
    localPath: "/covers/monopoly-dog-artist.29e71d1841.jpg",
    source: "rebel",
  },
  {
    match: { slug: "monopoly-edycja-kott" },
    localPath: "/covers/monopoly-edycja-katowice.da66959233.jpg",
    source: "rebel",
  },
  {
    match: { slug: "monopoly-hello-kitty-edition" },
    localPath: "/covers/monopoly-hello-kitty-edition.054a4578b4.jpg",
    source: "rebel",
  },
  {
    match: { ean: "5010994153687" },
    urls: [
      "https://static1.srcdn.com/wordpress/wp-content/uploads/2022/02/Bridgerton-Monopoly.jpg",
      "https://target.scene7.com/is/image/Target/GUEST_8f5e8b5e-8b5e-4b5e-8b5e-8b5e8b5e8b5e",
    ],
    source: "manual",
  },
  {
    match: { ean: "5036905022484" },
    urls: [
      "https://staticl.poczytaj.pl/317000/monopoly-transformers,317525-l.jpg",
      "https://ksiegarniainternetowa.co.uk/img/product_images_new/013/226013_01_monopoly_transformers.300.jpg",
      "https://bigimg.bee.pl/images/popups/2A0/5036905022484.jpg",
    ],
    source: "manual",
  },
  {
    match: { ean: "5036905054461" },
    urls: [
      "https://bulinexlebork.pl/32482-large_default/monopoly-cuda-swiata-pr.jpg",
      "https://bigimg.bee.pl/images/popups/2A0/5036905054461.jpg",
    ],
    source: "manual",
  },
  {
    match: { ean: "5036905032995" },
    urls: ["https://bigimg.bee.pl/images/popups/2A0/5036905032995.jpg"],
    source: "manual",
  },
  {
    match: { ean: "5036905027571" },
    urls: [
      "https://gryplanszowe.pl/hpeciai/ac93746523c59c2acb2d5010c5415b06/pol_pl_Monopoly-PRL-3491_1.jpg",
      "https://bigimg.bee.pl/images/popups/2A0/5036905027571.jpg",
    ],
    source: "manual",
  },
  {
    match: { ean: "5010993623945" },
    urls: ["https://bigimg.taniaksiazka.pl/images/popups/32D/5010993623945.jpg"],
    source: "manual",
  },
  {
    match: { ean: "5900511016857" },
    urls: ["https://bigimg.taniaksiazka.pl/images/popups/EAB/5900511016857.jpg"],
    source: "manual",
  },
];

async function firstWorkingUrl(urls: string[]): Promise<string | null> {
  for (const url of urls) {
    if (await probeImageUrl(url)) return url;
  }
  return null;
}

async function findGame(entry: Entry) {
  const { ean, slug, titleContains } = entry.match;
  if (ean) {
    const byEan = await prisma.game.findFirst({
      where: { ean, deletedAt: null },
      select: { id: true, title: true, ean: true },
    });
    if (byEan) return byEan;
  }
  if (slug) {
    const bySlug = await prisma.game.findFirst({
      where: { slug, deletedAt: null },
      select: { id: true, title: true, ean: true },
    });
    if (bySlug) return bySlug;
  }
  if (titleContains) {
    return prisma.game.findFirst({
      where: { title: { contains: titleContains, mode: "insensitive" }, deletedAt: null },
      select: { id: true, title: true, ean: true },
    });
  }
  return null;
}

async function main() {
  let ok = 0;
  let fail = 0;

  for (const entry of ENTRIES) {
    const game = await findGame(entry);
    if (!game) {
      console.log("? brak gry w bazie:", JSON.stringify(entry.match));
      fail += 1;
      continue;
    }

    let coverPath: string | null = entry.localPath ?? null;

    if (!coverPath && entry.urls?.length) {
      const remote = await firstWorkingUrl(entry.urls);
      if (remote) {
        coverPath = await downloadCoverToPublic(remote, game.title);
      }
    }

    if (!coverPath) {
      console.log(`— ${game.title}: brak okładki`);
      fail += 1;
      continue;
    }

    if (!process.argv.includes("--dry-run")) {
      await prisma.game.update({
        where: { id: game.id },
        data: {
          coverImageUrl: coverPath,
          coverImageSource: entry.source ?? "manual",
        },
      });
    }
    console.log(`+ ${game.title} → ${coverPath}`);
    ok += 1;
  }

  console.log(`\nGotowe: ${ok} ok, ${fail} bez okładki`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
