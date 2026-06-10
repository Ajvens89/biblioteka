import { fetchWithTimeout, probeImageUrl } from "../src/lib/services/ean-providers/image-utils";

async function imagesFromPage(url: string): Promise<string[]> {
  const res = await fetchWithTimeout(url, { headers: { "User-Agent": "Mozilla/5.0" } }, 15000);
  const html = await res.text();
  const out: string[] = [];
  const statiki = html.matchAll(/(?:https?:)?\/\/cf-(?:bee|tk)\.statiki\.pl\/images\/popups\/[^"'\s]+\.(?:webp|jpg)/gi);
  for (const m of statiki) {
    const u = m[0].startsWith("//") ? `https:${m[0]}` : m[0];
    out.push(u);
  }
  const bigimg = html.matchAll(/https:\/\/bigimg\.(?:bee|taniaksiazka)\.pl\/images\/popups\/[^"'\s]+\.(?:webp|jpg)/gi);
  for (const m of bigimg) out.push(m[0]);
  const og =
    html.match(/property="og:image"\s+content="([^"]+)"/i)?.[1] ??
    html.match(/content="([^"]+)"\s+property="og:image"/i)?.[1];
  if (og) out.push(og.startsWith("//") ? `https:${og}` : og);
  return [...new Set(out)];
}

const PAGES: Record<string, string[]> = {
  "6416739594620": ["https://www.bee.pl/alias-late-night-alias-hard-core-tactic_p2139799.html"],
  "9788396341679": ["https://www.poczytaj.pl/ksiazka/amanda-black-i-niebezpieczne-dziedzictwo-gomezjurado,646809"],
  "5666816442127": ["https://www.taniaksiazka.pl/boom-boom-balloon-granna-p-1702772.html"],
  "5609288361183": ["https://www.taniaksiazka.pl/elefun-skill-gamepad-hasbro-p-1702772.html"],
  "4005556268122": ["https://www.taniaksiazka.pl/gravitrax-zestaw-startowy-ravensburger-p-1309603.html"],
  "5036905042086": ["https://www.taniaksiazka.pl/harry-potter-puzzle-trefl-p-1309603.html"],
  "8005125411658": ["https://www.taniaksiazka.pl/kubus-puchatek-drewniane-klocki-p-1309603.html"],
  "5902768336429": ["https://www.taniaksiazka.pl/mini-puzzle-niedzwiedki-p-1309603.html"],
  "5904262950187": ["https://www.bee.pl/mobtown-portal-games_p1912542.html"],
  "3760175518263": ["https://www.taniaksiazka.pl/prosze-wsiadac-nowy-jork-i-londyn-gigamic-p-1702772.html"],
  "9788365773531": ["https://www.taniaksiazka.pl/poznaje-cyfry-zabawa-kreatywna-p-1702772.html"],
  "9788366762374": ["https://www.taniaksiazka.pl/puzzle-logiczne-p-1702772.html"],
  "5411068842733": ["https://www.taniaksiazka.pl/quidditch-tryouts-harry-potter-p-1702772.html"],
  "5010994773274": ["https://www.taniaksiazka.pl/mousetrap-hasbro-p-1309603.html"],
  "5900511182538": ["https://www.taniaksiazka.pl/trefl-puzzle-frozen-ii-p-1309603.html"],
  "5906018013467": ["https://www.taniaksiazka.pl/taogeam-gry-i-zabawy-edukacyjne-p-1702772.html"],
  "8719075976371": ["https://www.taniaksiazka.pl/tablica-sizalowa-bulls-p-1702772.html"],
  "5609288361190": ["https://www.taniaksiazka.pl/zestaw-do-bitwy-na-wodzie-p-1702772.html"],
  "5902983493839": ["https://czuczu.pl/sklep/polskie-gory-puzzle/", "https://www.bee.pl/polskie-gory-puzzle-czuczu_p2344008.html"],
  "5902983491835": ["https://czuczu.pl/sklep/puzzle-progresywne-zwierzeta-lesne/"],
  "5902983493204": ["https://czuczu.pl/sklep/puzzlove-ptaki-polski-200/", "https://www.bee.pl/puzzle-puzzlove-czuczu-ptaki-polski-200-el_p2344008.html"],
  "5902983493808": ["https://czuczu.pl/sklep/puzzle-tak-dziala-straz-pozarna/"],
  "5902983493846": ["https://czuczu.pl/sklep/puzzle-uklad-sloneczny/"],
};

async function searchTk(ean: string): Promise<string | null> {
  const res = await fetchWithTimeout(
    `https://www.taniaksiazka.pl/szukaj/?q=${ean}`,
    { headers: { "User-Agent": "Mozilla/5.0" } },
    12000,
  );
  const html = await res.text();
  const link = html.match(new RegExp(`href="(/[^"]+-p-\\d+\\.html)"[^>]*>[\\s\\S]*?${ean}`, "i"))?.[1]
    ?? html.match(/href="(\/[^"]+-p-\d+\.html)"/i)?.[1];
  return link ? `https://www.taniaksiazka.pl${link}` : null;
}

async function main() {
  for (const [ean, pages] of Object.entries(PAGES)) {
    const tk = await searchTk(ean);
    const allPages = tk ? [tk, ...pages] : pages;
    let found = false;
    for (const page of allPages) {
      try {
        const imgs = await imagesFromPage(page);
        for (const img of imgs) {
          if (img.includes("5902560386981") && ean !== "5902560386981") continue;
          if (await probeImageUrl(img)) {
            console.log(`${ean}\tOK\t${img}\t${page.split("/")[2]}`);
            found = true;
            break;
          }
        }
        if (found) break;
      } catch (e) {
        console.log(`${ean}\tERR\t${e instanceof Error ? e.message : e}`);
      }
    }
    if (!found) console.log(`${ean}\tFAIL`);
  }
}

main().catch(console.error);
