import { fetchWithTimeout, probeImageUrl } from "../src/lib/services/ean-providers/image-utils";

async function ogFromPage(url: string): Promise<string | null> {
  const res = await fetchWithTimeout(url, { headers: { "User-Agent": "Mozilla/5.0" } }, 15000);
  const html = await res.text();
  const m =
    html.match(/property="og:image"\s+content="([^"]+)"/i)?.[1] ??
    html.match(/content="([^"]+)"\s+property="og:image"/i)?.[1];
  if (m && !m.includes("powiadomienie_o_produkce")) return m;
  const eanImg = html.match(/(https:\/\/czuczu\.pl\/wp-content\/uploads\/[^"']+\.(?:jpg|png|webp))/gi);
  if (eanImg) {
    const best = eanImg.find((u) => !u.includes("powiadomienie")) ?? eanImg[0];
    return best;
  }
  const tk = html.match(/https:\/\/(?:bigimg\.taniaksiazka\.pl|cf-tk\.statiki\.pl)\/images\/popups\/[^"']+\.(?:jpg|webp)/i)?.[0];
  if (tk) return tk.startsWith("http") ? tk : `https:${tk}`;
  const bee = html.match(/https:\/\/bigimg\.bee\.pl\/images\/popups\/[^"']+\.(?:jpg|webp)/i)?.[0];
  if (bee) return bee;
  const img = html.match(/(https?:\/\/[^"'\s]+\.(?:jpg|jpeg|png|webp))/i)?.[1];
  return img ?? null;
}

const PAGES: Record<string, string> = {
  "6416739594620": "https://www.taniaksiazka.pl/alias-przejdzie-ci-przez-gardlo-trefl-p-1702772.html",
  "9788396341679": "https://www.taniaksiazka.pl/amanda-black-i-niebezpieczne-dziedzictwo-juan-gomez-jurado-p-1702772.html",
  "5666816442127": "https://www.taniaksiazka.pl/boom-boom-balloon-granna-p-1702772.html",
  "5609288361183": "https://www.taniaksiazka.pl/elefun-skill-gamepad-hasbro-p-1702772.html",
  "5902560386981": "https://www.bee.pl/eleven-edycja-polska-portal-games_p1912542.html",
  "4005556268122": "https://www.taniaksiazka.pl/gravitrax-zestaw-startowy-ravensburger-p-1309603.html",
  "5036905042086": "https://www.taniaksiazka.pl/harry-potter-puzzle-trefl-p-1309603.html",
  "8005125411658": "https://www.taniaksiazka.pl/kubus-puchatek-drewniane-klocki-p-1309603.html",
  "5902768336429": "https://www.taniaksiazka.pl/mini-puzzle-niedzwiedki-p-1309603.html",
  "5904262950187": "https://www.taniaksiazka.pl/mobtown-portal-games-p-1702772.html",
  "5905794220151": "https://sklep.portalgames.pl/niezbadana-planeta-superksiezyc-dodatek",
  "3760175518263": "https://www.taniaksiazka.pl/prosze-wsiadac-nowy-jork-i-londyn-gigamic-p-1702772.html",
  "9788365773531": "https://www.taniaksiazka.pl/poznaje-cyfry-zabawa-kreatywna-p-1702772.html",
  "9788366762374": "https://www.taniaksiazka.pl/puzzle-logiczne-p-1702772.html",
  "5411068842733": "https://www.taniaksiazka.pl/quidditch-tryouts-harry-potter-p-1702772.html",
  "5010994773274": "https://www.taniaksiazka.pl/mousetrap-hasbro-p-1309603.html",
  "5900511182538": "https://www.taniaksiazka.pl/trefl-puzzle-frozen-ii-p-1309603.html",
};

async function searchTk(ean: string): Promise<string | null> {
  const res = await fetchWithTimeout(
    `https://www.taniaksiazka.pl/szukaj/?q=${ean}`,
    { headers: { "User-Agent": "Mozilla/5.0" } },
    12000,
  );
  const html = await res.text();
  const link = html.match(/href="(\/[^"]+-p-\d+\.html)"/i)?.[1];
  if (!link) return null;
  return `https://www.taniaksiazka.pl${link}`;
}

async function main() {
  for (const [ean, urlOrEmpty] of Object.entries(PAGES)) {
    try {
      let url = urlOrEmpty;
      if (url.includes("1702772") || url.includes("1309603")) {
        const found = await searchTk(ean);
        if (found) url = found;
      }
      const img = await ogFromPage(url);
      const ok = img ? await probeImageUrl(img) : false;
      console.log(`${ean}\t${ok ? "OK" : "FAIL"}\t${img?.slice(0, 100) ?? "—"}\t${url.split("/")[2]}`);
    } catch (e) {
      console.log(`${ean}\tERR\t${e instanceof Error ? e.message : e}`);
    }
  }
}

main().catch(console.error);
