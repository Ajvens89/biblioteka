import { fetchWithTimeout, probeImageUrl } from "../src/lib/services/ean-providers/image-utils";

const PAGES: Array<{ ean: string; urls: string[] }> = [
  { ean: "4005556268122", urls: ["https://homegadget.pl/p/575/5471/zestaw-ravensburger-gravitrax-action-set-focus-gra-logiczna-64-el"] },
  { ean: "5666816442127", urls: ["https://www.bee.pl/boom-boom-balloon-granna_p2139799.html", "https://www.taniaksiazka.pl/boom-boom-balloon-granna-p-2181577.html"] },
  { ean: "5609288361183", urls: ["https://www.taniaksiazka.pl/elefun-skill-gamepad-hasbro-p-2181577.html"] },
  { ean: "5036905042086", urls: ["https://www.taniaksiazka.pl/harry-potter-puzzle-trefl-p-2181577.html"] },
  { ean: "5900511182538", urls: ["https://www.taniaksiazka.pl/trefl-puzzle-frozen-ii-p-2181577.html"] },
  { ean: "5010994773274", urls: ["https://www.taniaksiazka.pl/mousetrap-hasbro-p-2181577.html"] },
  { ean: "5904262950187", urls: ["https://www.poczytaj.pl/zabawka/mob-town-devine-danny,368886", "https://www.taniaksiazka.pl/mob-town-trefl-p-809995.html"] },
  { ean: "3760175518263", urls: ["https://sklep.portalgames.pl/prosze-wsiadac-nowy-jork-i-londyn", "https://aleplanszowki.pl/rodzinne/13627-prosze-wsiadac-nowy-jork-i-londyn-5902560384918.html"] },
  { ean: "5905794220151", urls: ["https://sklep.portalgames.pl/niezbadana-planeta-superksiezyc-dodatek", "https://abondegames.pl/product/niezbadana-planeta-superksiezyc/"] },
  { ean: "5902560386981", urls: ["https://aleplanszowki.pl/strategiczne/13145-eleven-edycja-polska-5902560386981.html"] },
  { ean: "9788365773531", urls: ["https://www.taniaksiazka.pl/poznaje-cyfry-zabawa-kreatywna-p-2181577.html"] },
  { ean: "9788366762374", urls: ["https://www.taniaksiazka.pl/puzzle-logiczne-p-2181577.html"] },
  { ean: "5411068842733", urls: ["https://www.taniaksiazka.pl/quidditch-tryouts-harry-potter-p-2181577.html"] },
  { ean: "5902768336429", urls: ["https://www.taniaksiazka.pl/mini-puzzle-niedzwiedki-p-2181577.html"] },
  { ean: "8005125411658", urls: ["https://www.taniaksiazka.pl/kubus-puchatek-drewniane-klocki-p-2181577.html"] },
  { ean: "5902983493839", urls: ["https://czuczu.pl/sklep/polskie-gory-puzzle/", "https://www.bee.pl/polskie-gory-puzzle-czuczu_p2344008.html"] },
  { ean: "5902983491835", urls: ["https://czuczu.pl/sklep/puzzle-progresywne-zwierzeta-lesne/"] },
  { ean: "5902983493808", urls: ["https://czuczu.pl/sklep/puzzle-tak-dziala-straz-pozarna/"] },
  { ean: "5902983493846", urls: ["https://czuczu.pl/sklep/puzzle-uklad-sloneczny/"] },
];

async function extract(html: string, ean: string): string[] {
  const out: string[] = [];
  const patterns = [
    /(?:https?:)?\/\/cf-(?:bee|tk)\.statiki\.pl\/images\/popups\/[^"'\s]+\.(?:webp|jpg)/gi,
    /https:\/\/staticl?\.poczytaj\.pl\/[^"'\s]+\.(?:jpg|webp)/gi,
    /https:\/\/czuczu\.pl\/wp-content\/uploads\/[^"'\s]+\.(?:jpg|png|webp)/gi,
    /https:\/\/sklep\.portalgames\.pl\/environment\/cache\/images\/[^"'\s]+\.(?:jpg|png|webp)/gi,
    /https:\/\/abondegames\.pl\/wp-content\/uploads\/[^"'\s]+\.(?:jpg|png|webp)/gi,
    /https:\/\/aleplanszowki\.pl\/[^"'\s]+\.(?:jpg|png|webp)/gi,
    /https:\/\/homegadget\.pl\/[^"'\s]+\.(?:jpg|png|webp)/gi,
    /content="(https:\/\/[^"]+\.(?:jpg|png|webp))"/gi,
  ];
  for (const p of patterns) {
    for (const m of html.matchAll(p)) {
      let u = m[1] ?? m[0];
      if (u.startsWith("//")) u = `https:${u}`;
      if (!u.includes("newsletter") && !u.includes("kropki-formularz") && !u.includes("powiadomienie_o_produkce")) {
        if (!u.includes("5902560386981") || ean === "5902560386981") out.push(u);
      }
    }
  }
  return [...new Set(out)];
}

async function searchTk(ean: string): Promise<string | null> {
  const res = await fetchWithTimeout(`https://www.taniaksiazka.pl/szukaj/?q=${ean}`, { headers: { "User-Agent": "Mozilla/5.0" } }, 12000);
  const html = await res.text();
  const idx = html.indexOf(ean);
  if (idx < 0) return null;
  const slice = html.slice(Math.max(0, idx - 500), idx + 200);
  const link = slice.match(/href="(\/[^"]+-p-\d+\.html)"/i)?.[1];
  return link ? `https://www.taniaksiazka.pl${link}` : null;
}

async function main() {
  for (const { ean, urls } of PAGES) {
    const tk = await searchTk(ean);
    const all = tk ? [tk, ...urls] : urls;
    let found = false;
    for (const page of all) {
      try {
        const res = await fetchWithTimeout(page, { headers: { "User-Agent": "Mozilla/5.0" } }, 15000);
        const imgs = await extract(await res.text(), ean);
        for (const img of imgs) {
          if (await probeImageUrl(img)) {
            console.log(`${ean}\tOK\t${img}`);
            found = true;
            break;
          }
        }
        if (found) break;
      } catch { /* next */ }
    }
    if (!found) console.log(`${ean}\tFAIL`);
  }
}

main().catch(console.error);
