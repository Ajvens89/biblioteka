/**
 * Ręczne uzupełnienie 34 brakujących okładek.
 *   npx tsx scripts/_fix-missing-covers-batch.ts
 *   npx tsx scripts/_fix-missing-covers-batch.ts --dry-run
 */
import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { downloadCoverToPublic } from "../src/lib/services/cover-download";
import {
  fetchWithTimeout,
  probeImageUrl,
  resolveOpenLibraryCover,
} from "../src/lib/services/ean-providers/image-utils";

const prisma = new PrismaClient();
const dryRun = process.argv.includes("--dry-run");

type Entry = { ean: string; urls: string[]; source?: string };

/** Zweryfikowane URL-e (EAN musi się zgadzać z produktem). */
const CURATED: Entry[] = [
  { ean: "6416739594620", urls: ["https://cf-bee.statiki.pl/images/popups/DEF/6416739594620.webp"], source: "manual" },
  { ean: "9788396341679", urls: ["https://staticl.poczytaj.pl/646000/amanda-black-i-niebezpieczne-dziedzictwo-gomezjurado,646809-l.jpg"], source: "open_library" },
  { ean: "5902560386981", urls: [
    "https://cf-bee.statiki.pl/images/popups/5FC/5902560386981.webp",
    "https://aleplanszowki.pl/36946-large_default/eleven-edycja-polska.jpg",
  ], source: "manual" },
  { ean: "5905794220151", urls: ["https://sklep.portalgames.pl/environment/cache/images/productGfx_13894_500_500/NP_Supermoon_PNG_box_600x600.png"], source: "manual" },
  { ean: "3760175518263", urls: ["https://sklep.portalgames.pl/environment/cache/images/productGfx_7752_500_500/PW_pudelko.jpg"], source: "manual" },
  { ean: "5904262950187", urls: ["https://staticl.poczytaj.pl/368000/mob-town-devine-danny,368886-l.jpg"], source: "manual" },
  { ean: "4005556268122", urls: [
    "https://homegadget.pl/public/upload/catalog/product/5471/minigallery/a838c49746c18eadc40e1bcd4292.jpg",
    "https://homegadget.pl/public/upload/catalog/product/5471/minigallery/thumb_a838c49746c18eadc40e1bcd4292.jpg",
  ], source: "manual" },
  { ean: "5902983491996", urls: ["https://czuczu.pl/wp-content/uploads/2022/07/Puzzle-kontrastowe-Do-pary-5.jpg"], source: "manual" },
  { ean: "5902983492009", urls: ["https://czuczu.pl/wp-content/uploads/2022/07/Puzzle-kontrastowe-Tu-pasuje-4.jpg"], source: "manual" },
  { ean: "5902983493761", urls: ["https://czuczu.pl/wp-content/uploads/2023/12/Moje-pierwsze-puzzle-Do-pary-15m-1.jpg"], source: "manual" },
  { ean: "5902983492207", urls: ["https://czuczu.pl/wp-content/uploads/2022/11/Czuczulotto-Zakupy-2023_7.jpg"], source: "manual" },
  { ean: "5902983493617", urls: ["https://czuczu.pl/wp-content/uploads/2024/11/5902983493617_1.jpg"], source: "manual" },
  { ean: "5902983493792", urls: ["https://czuczu.pl/wp-content/uploads/2025/02/5902983493792_3.jpg"], source: "manual" },
  { ean: "5902983493785", urls: ["https://czuczu.pl/wp-content/uploads/2025/02/5902983493785_1.jpg"], source: "manual" },
  { ean: "5902983491842", urls: ["https://czuczu.pl/wp-content/uploads/2022/01/Puzzle-progresywne-Pojazdy-na-budowie-1.jpg"], source: "manual" },
  { ean: "5902983490807", urls: ["https://czuczu.pl/wp-content/uploads/2021/05/10-Puzzle-z-dziurka-Maluchy-18m-1.jpg"], source: "manual" },
  { ean: "5902983490791", urls: ["https://czuczu.pl/wp-content/uploads/2021/09/PzD_Przyjaciele_DSF1234.jpg"], source: "manual" },
  { ean: "5902983493204", urls: ["https://czuczu.pl/wp-content/uploads/2024/12/5902983493204_5.jpg"], source: "manual" },
  { ean: "5666816442127", urls: [
    "https://jokomisiada.pl/hpeciai/d28e0c2894f2b816967fefdbd6250a90/eng_pl_New-gay-game-Boom-Boom-Balloon-GR0097,3.jpg",
    "https://jokomisiada.pl/product-eng-8693-New-gay-game-Boom-Boom-Balloon-GR0097.html",
  ], source: "manual" },
  { ean: "5036905042086", urls: ["https://www.collect-world.com/media/catalog/product/0/1/01005.jpg"], source: "manual" },
  { ean: "5902983493839", urls: [
    "https://czuczu.pl/wp-content/uploads/2025/01/5902983493839_1.jpg",
    "https://staticl.poczytaj.pl/638000/puzzlove-czuczu-polskie-gory-1000-el,638664-l.jpg",
    "https://czuczu.pl/sklep/puzzlove-polskie-gory-1000/",
  ], source: "manual" },
  { ean: "5902983493808", urls: [
    "https://czuczu.pl/wp-content/uploads/2025/01/5902983493808_1.jpg",
    "https://staticl.poczytaj.pl/636000/czuczu-puzzle-tak-dziala-straz-pozarna,636794-l.jpg",
    "https://czuczu.pl/sklep/puzzle-straz-pozarna/",
    "https://www.poczytaj.pl/zabawka/czuczu-puzzle-tak-dziala-straz-pozarna,636794",
  ], source: "manual" },
  { ean: "5411068842733", urls: [
    "https://www.taniaksiazka.pl/gra-shuffle-plus-games-harry-potter-cartamundi-p-1519628.html",
  ], source: "manual" },
  { ean: "5010994773274", urls: [
    "https://www.kroger.com/product/images/large/front/0065356991073",
  ], source: "manual" },
  { ean: "5900511182538", urls: [
    "https://cdn.arena.pl/a86d59097007348fe26388e55206c094-product_lightbox.jpg",
    "https://gryizabawki.pl/k,ks_832223,Puzzle-30:-Frozen-2-Odwaga-siostr-18253.html",
  ], source: "manual" },
  { ean: "9788365773531", urls: [
    "https://czuczu.pl/sklep/poznaje-cyfry-zabawy-edukacyjne-z-pisakiem-zmazywakiem/",
    "https://sklep.wsip.pl/produkty/czuczu-poznaje-cyfry-zabawy-edukacyjne-z-pisakiem-zmazywakiem-3,176443",
  ], source: "open_library" },
  { ean: "9788366762374", urls: [
    "https://czuczu.pl/sklep/czuczu-uczy-zabawy-logiczne-5-6/",
    "https://ksiegarniainternetowa.co.uk/tv/czuczu_uczy_zabawy_logiczne_5-6-9788366762374?selected_currency=pln",
  ], source: "open_library" },
  { ean: "5609288361183", urls: [
    "https://kropkasklep.pl/pl/p/Elefun-Animal-Gamepad-gra-zrecznosciowa-interaktywna-dla-dzieci-3-/10389",
  ], source: "manual" },
  { ean: "8719075976371", urls: [
    "https://bilardmarket.pl/pl/sizalowe/9186-tarcza-sizalowa-do-darta-bull-s-advantage-701-8719075976371.html",
    "https://sklep.bilardkaz.pl/1928-tarcza-sizalowa-bull-s-advantage-701.html",
  ], source: "manual" },
  { ean: "8005125411658", urls: [
    "https://ksiegarniainternetowa.co.uk/img/product_images_new/440/233440_01_klocki_cubes_12_kubus_puchatek.300.jpg",
    "https://ksiegarniainternetowa.co.uk/tv/klocki_cubes_12_kubus_puchatek-8005125411658?selected_currency=pln",
  ], source: "manual" },
  { ean: "5902768336429", urls: [
    "https://webimage.pl/pics/429/6/d739895.jpg",
    "https://gryizabawki.pl/k,ks_440874,Czuczu:-Mini-puzzle-Niedzwiadki-6429.html",
  ], source: "manual" },
  { ean: "5902983493846", urls: [
    "https://czuczu.pl/wp-content/uploads/2025/02/5902983493846_1.jpg",
    "https://czuczu.pl/sklep/puzzle-odkrywcy-uklad-sloneczny/",
  ], source: "manual" },
  { ean: "5906018013467", urls: [
    "https://edukacyjna.pl/24178-home_default/tangram-gra-i-zabawka-edukacyjna-big.jpg",
    "https://grim24.pl/tangram-gra-logiczna-ukladanka-klocki-alexander-p-1080.html",
  ], source: "manual" },
  { ean: "5609288361190", urls: [
    "https://poszukiwaczefrajdy.pl/services/picasso/thumb/iwqwhkzb.jpg",
    "https://poszukiwaczefrajdy.pl/dmuchane-klody-drewna-do-walki-w-wodzie-106-cm-poprezentacyjne.html",
  ], source: "manual" },
];

const CZUCZU_PAGES: Record<string, string> = {
  "5902983491835": "https://czuczu.pl/sklep/puzzle-progresywne-zwierzatka-w-lesie/",
};

const SKIP_IMG = ["newsletter", "kropki-formularz", "powiadomienie_o_produkce", "logo", "icon"];

async function firstWorkingUrl(urls: string[]): Promise<string | null> {
  for (const url of urls) {
    if (await probeImageUrl(url)) return url;
  }
  return null;
}

async function imagesFromHtml(html: string, ean: string): Promise<string[]> {
  const out: string[] = [];
  const patterns = [
    /(?:https?:)?\/\/cf-(?:bee|tk)\.statiki\.pl\/images\/popups\/[^"'\s]+\.(?:webp|jpg)/gi,
    /https:\/\/staticl?\.poczytaj\.pl\/[^"'\s]+\.(?:jpg|webp)/gi,
    /https:\/\/czuczu\.pl\/wp-content\/uploads\/[^"'\s]+\.(?:jpg|png|webp)/gi,
    /https:\/\/sklep\.portalgames\.pl\/environment\/cache\/images\/[^"'\s]+\.(?:jpg|png|webp)/gi,
    /https:\/\/aleplanszowki\.pl\/[^"'\s]+(?:large|home)_default\/[^"'\s]+\.(?:jpg|png|webp)/gi,
    /https:\/\/[^"'\s]*smyk\.com[^"'\s]+\.(?:jpg|png|webp)/gi,
    /https:\/\/[^"'\s]*bonito\.pl[^"'\s]+\.(?:jpg|png|webp)/gi,
    /https:\/\/[^"'\s]*bilard[^"'\s]+\.(?:jpg|png|webp)/gi,
    /https:\/\/homegadget\.pl\/public\/upload\/[^"'\s]+\.(?:jpg|png|webp)/gi,
    /content="(https:\/\/[^"]+\.(?:jpg|png|webp))"/gi,
    /data-src="(https:\/\/[^"]+\.(?:jpg|png|webp))"/gi,
  ];
  for (const p of patterns) {
    for (const m of html.matchAll(p)) {
      let u = m[1] ?? m[0];
      if (u.startsWith("//")) u = `https:${u}`;
      if (SKIP_IMG.some((s) => u.includes(s))) continue;
      if (u.includes("5902560386981") && ean !== "5902560386981") continue;
      if (u.match(/\/\d{13}\./) && !u.includes(ean)) continue;
      out.push(u);
    }
  }
  const eanImg = out.find((u) => u.includes(ean));
  return eanImg ? [eanImg, ...out.filter((u) => u !== eanImg)] : [...new Set(out)];
}

async function czuczuImage(ean: string, pageUrl: string): Promise<string | null> {
  const res = await fetchWithTimeout(pageUrl, { headers: { "User-Agent": "Mozilla/5.0" } }, 15000);
  const imgs = await imagesFromHtml(await res.text(), ean);
  for (const img of imgs) {
    if (await probeImageUrl(img)) return img;
  }
  for (let i = 1; i <= 5; i++) {
    for (const folder of ["2024/12", "2024/11", "2025/02", "2023/12", "2022/01", "2021/05"]) {
      const url = `https://czuczu.pl/wp-content/uploads/${folder}/${ean}_${i}.jpg`;
      if (await probeImageUrl(url)) return url;
    }
  }
  return null;
}

async function tkVerifiedImage(ean: string): Promise<string | null> {
  const res = await fetchWithTimeout(
    `https://www.taniaksiazka.pl/szukaj/?q=${ean}`,
    { headers: { "User-Agent": "Mozilla/5.0" } },
    12000,
  );
  const html = await res.text();
  const links = [...html.matchAll(/href="(\/[^"]+-p-\d+\.html)"/gi)].map((m) => m[1]);
  const unique = [...new Set(links)].slice(0, 8);

  for (const link of unique) {
    const pageUrl = `https://www.taniaksiazka.pl${link}`;
    const page = await fetchWithTimeout(pageUrl, { headers: { "User-Agent": "Mozilla/5.0" } }, 12000);
    const ph = await page.text();
    if (!ph.includes(ean)) continue;
    const imgs = await imagesFromHtml(ph, ean);
    for (const img of imgs) {
      if (img.includes(ean) || img.includes(`/${ean}.`)) {
        if (await probeImageUrl(img)) return img;
      }
    }
    for (const img of imgs) {
      if (await probeImageUrl(img)) return img;
    }
  }
  return null;
}

async function pageImage(ean: string, pageUrl: string): Promise<string | null> {
  const res = await fetchWithTimeout(pageUrl, { headers: { "User-Agent": "Mozilla/5.0" } }, 15000);
  const imgs = await imagesFromHtml(await res.text(), ean);
  for (const img of imgs) {
    if (await probeImageUrl(img)) return img;
  }
  return null;
}

async function resolveCover(ean: string, urls: string[]): Promise<{ url: string; source: string } | null> {
  const direct = await firstWorkingUrl(urls.filter((u) => u.startsWith("http")));
  if (direct) return { url: direct, source: "manual" };

  for (const page of urls.filter((u) => u.includes(".html") || u.includes(".pl/"))) {
    const img = await pageImage(ean, page);
    if (img) return { url: img, source: "manual" };
  }

  if (CZUCZU_PAGES[ean]) {
    const img = await czuczuImage(ean, CZUCZU_PAGES[ean]);
    if (img) return { url: img, source: "manual" };
  }

  const tk = await tkVerifiedImage(ean);
  if (tk) return { url: tk, source: "manual" };

  if (ean.startsWith("978")) {
    const ol = await resolveOpenLibraryCover(ean);
    if (ol && (await probeImageUrl(ol))) return { url: ol, source: "open_library" };
  }

  return null;
}

async function main() {
  const missing = await prisma.game.findMany({
    where: { deletedAt: null, OR: [{ coverImageUrl: null }, { coverImageUrl: "" }] },
    select: { id: true, title: true, ean: true },
    orderBy: { title: "asc" },
  });

  const byEan = new Map(CURATED.map((e) => [e.ean, e]));
  let ok = 0;
  let fail = 0;

  for (const game of missing) {
    const ean = game.ean?.replace(/\D/g, "") ?? "";
    if (!ean) {
      console.log(`— ${game.title}: brak EAN`);
      fail += 1;
      continue;
    }

    const entry = byEan.get(ean);
    const urls = entry?.urls ?? [];
    process.stdout.write(`${game.title} (${ean})… `);

    const resolved = await resolveCover(ean, urls);
    if (!resolved) {
      console.log("BRAK");
      fail += 1;
      continue;
    }

    const local = await downloadCoverToPublic(resolved.url, game.title);
    if (!local) {
      console.log(`FAIL download ${resolved.url}`);
      fail += 1;
      continue;
    }

    if (!dryRun) {
      await prisma.game.update({
        where: { id: game.id },
        data: {
          coverImageUrl: local,
          coverImageSource: entry?.source ?? resolved.source,
        },
      });
    }
    console.log(`OK → ${local}`);
    ok += 1;
  }

  console.log(`\nGotowe: ${ok} ok, ${fail} bez okładki${dryRun ? " (dry-run)" : ""}`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
