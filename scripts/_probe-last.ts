import { fetchWithTimeout, probeImageUrl } from "../src/lib/services/ean-providers/image-utils";

const PAGES: Array<{ ean: string; url: string }> = [
  { ean: "5666816442127", url: "https://jokomisiada.pl/product-eng-8693-New-gay-game-Boom-Boom-Balloon-GR0097.html" },
  { ean: "5036905042086", url: "https://www.collect-world.com/puzzle-500-pieces-harry-potter-la-grande-salle.html" },
  { ean: "5902983493839", url: "https://www.poczytaj.pl/zabawka/puzzlove-czuczu-polskie-gory-1000-el,638664" },
  { ean: "5902983493839", url: "https://czuczu.pl/sklep/puzzlove-polskie-gory-1000/" },
  { ean: "5902983493808", url: "https://czuczu.pl/sklep/puzzle-tak-dziala-straz-pozarna/" },
  { ean: "5900511182538", url: "https://www.trefl.com/puzzle-frozen-ii-1000-el-12081" },
  { ean: "5010994773274", url: "https://www.kroger.com/p/elefun-and-friends-mouse-trap-game/0065356991073" },
  { ean: "5411068842733", url: "https://www.taniaksiazka.pl/harry-potter-quidditch-tryouts-p-2211166.html" },
  { ean: "9788365773531", url: "https://www.taniaksiazka.pl/poznaje-cyfry-zabawa-kreatywna-p-2211166.html" },
  { ean: "9788366762374", url: "https://www.taniaksiazka.pl/puzzle-logiczne-p-2211166.html" },
  { ean: "5902768336429", url: "https://www.taniaksiazka.pl/mini-puzzle-niedzwiedki-p-2211166.html" },
  { ean: "8005125411658", url: "https://www.taniaksiazka.pl/kubus-puchatek-drewniane-klocki-p-2211166.html" },
  { ean: "5609288361183", url: "https://www.taniaksiazka.pl/elefun-skill-gamepad-hasbro-p-2211166.html" },
  { ean: "5609288361190", url: "https://www.taniaksiazka.pl/zestaw-do-bitwy-na-wodzie-p-2211166.html" },
  { ean: "5906018013467", url: "https://www.taniaksiazka.pl/taogeam-gry-i-zabawy-edukacyjne-p-2211166.html" },
];

async function extract(html: string): string[] {
  const out: string[] = [];
  for (const m of html.matchAll(/(?:https?:)?\/\/[^"'\s]+\.(?:jpg|jpeg|png|webp)/gi)) {
    let u = m[0];
    if (u.startsWith("//")) u = `https:${u}`;
    if (!u.includes("logo") && !u.includes("icon") && !u.includes("cookie")) out.push(u);
  }
  return [...new Set(out)];
}

async function main() {
  for (const { ean, url } of PAGES) {
    try {
      const res = await fetchWithTimeout(url, { headers: { "User-Agent": "Mozilla/5.0" } }, 15000);
      const html = await res.text();
      if (!html.includes(ean) && !url.includes("kroger") && !url.includes("jokomisiada") && !url.includes("collect-world")) {
        console.log(`${ean} SKIP no ean on page ${url.split("/")[2]}`);
        continue;
      }
      for (const img of await extract(html)) {
        if (await probeImageUrl(img)) {
          console.log(`${ean} OK ${img.slice(0, 100)}`);
          break;
        }
      }
    } catch (e) {
      console.log(`${ean} ERR ${e instanceof Error ? e.message : e}`);
    }
  }
}

main().catch(console.error);
