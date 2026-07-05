import { fetchWithTimeout, probeImageUrl } from "../src/lib/services/ean-providers/image-utils";

async function ogFromPage(url: string): Promise<string | null> {
  const res = await fetchWithTimeout(url, { headers: { "User-Agent": "Mozilla/5.0" } }, 15000);
  const html = await res.text();
  const m =
    html.match(/property="og:image"\s+content="([^"]+)"/i)?.[1] ??
    html.match(/content="([^"]+)"\s+property="og:image"/i)?.[1];
  if (m) return m;
  const img = html.match(/(https?:\/\/[^"'\s]+\.(?:jpg|jpeg|png|webp))/i)?.[1];
  return img ?? null;
}

const PAGES: Record<string, string> = {
  "5902983491996": "https://czuczu.pl/sklep/puzzle-kontrastowe-do-pary/",
  "5902983492009": "https://czuczu.pl/sklep/puzzle-kontrastowe-tu-pasuje/",
  "5902983493761": "https://czuczu.pl/sklep/moje-pierwsze-puzzle/",
  "5902983492207": "https://czuczu.pl/sklep/czuczulotto-zakupy/",
  "5902983493617": "https://czuczu.pl/sklep/pierwsze-puzzle-pojazdy/",
  "5902983493839": "https://czuczu.pl/sklep/polskie-gory-puzzle/",
  "5902983493792": "https://czuczu.pl/sklep/puzzle-myszka-i-przyjaciele/",
  "5902983493785": "https://czuczu.pl/sklep/puzzle-pojazdy-male-i-duze/",
  "5902983491842": "https://czuczu.pl/sklep/puzzle-progresywne-pojazdy/",
  "5902983491835": "https://czuczu.pl/sklep/puzzle-progresywne-zwierzeta-lesne/",
  "5902983493204": "https://czuczu.pl/sklep/puzzle-ptaki-polski/",
  "5902983493808": "https://czuczu.pl/sklep/puzzle-tak-dziala-straz-pozarna/",
  "5902983493846": "https://czuczu.pl/sklep/puzzle-uklad-sloneczny/",
  "5902983490807": "https://czuczu.pl/sklep/puzzle-z-dziurka-maluchy/",
  "5902983490791": "https://czuczu.pl/sklep/puzzle-z-dziurka-przyjaciele/",
  "5902560386981": "https://www.rebel.pl/gry-planszowe/eleven-edycja-polska-2014142.html",
  "3760175518263": "https://www.rebel.pl/gry-planszowe/prosze-wsiadac-nowy-jork-i-londyn-2013593.html",
  "5905794220151": "https://www.rebel.pl/gry-planszowe/niezbadana-planeta-superksiezyc-2026902.html",
  "4005556268122": "https://www.taniaksiazka.pl/gravitrax-zestaw-startowy-ravensburger-p-1309603.html",
  "6416739594620": "https://www.taniaksiazka.pl/alias-przejdzie-ci-przez-gardlo-trefl-p-1309603.html",
  "9788396341679": "https://www.taniaksiazka.pl/amanda-black-p-1132111.html",
  "5036905042086": "https://www.taniaksiazka.pl/harry-potter-puzzle-trefl-p-1309603.html",
  "5900511182538": "https://www.taniaksiazka.pl/trefl-puzzle-frozen-ii-p-1309603.html",
  "5010994773274": "https://www.taniaksiazka.pl/mousetrap-hasbro-p-1309603.html",
  "5902768336429": "https://www.taniaksiazka.pl/mini-puzzle-niedzwiedki-p-1309603.html",
};

async function main() {
  for (const [ean, url] of Object.entries(PAGES)) {
    try {
      const img = await ogFromPage(url);
      const ok = img ? await probeImageUrl(img) : false;
      console.log(ean, ok ? "OK" : "FAIL", img?.slice(0, 90) ?? "—", url.split("/")[2]);
    } catch (e) {
      console.log(ean, "ERR", e instanceof Error ? e.message : e);
    }
  }
}

main().catch(console.error);
