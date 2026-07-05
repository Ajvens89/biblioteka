import { fetchWithTimeout, probeImageUrl } from "../src/lib/services/ean-providers/image-utils";

const PAGES: Array<{ ean: string; url: string }> = [
  { ean: "8005125411658", url: "https://ksiegarniainternetowa.co.uk/tv/klocki_cubes_12_kubus_puchatek-8005125411658?selected_currency=pln" },
  { ean: "5902768336429", url: "https://edugaleria.pl/czuczu-mini-puzzle-niedzwiadki" },
  { ean: "5902768336429", url: "https://gryizabawki.pl/k,ks_440874,Czuczu:-Mini-puzzle-Niedzwiadki-6429.html" },
  { ean: "5902983493846", url: "https://czuczu.pl/sklep/puzzle-odkrywcy-uklad-sloneczny/" },
  { ean: "5902983493846", url: "https://czuczu.pl/wp-content/uploads/2025/01/5902983493846_1.jpg" },
  { ean: "5906018013467", url: "https://edukacyjna.pl/tangram-gra-i-zabawka-edukacyjna-big" },
  { ean: "5906018013467", url: "https://grim24.pl/tangram-gra-logiczna-ukladanka-klocki-alexander-p-1080.html" },
  { ean: "5609288361190", url: "https://poszukiwaczefrajdy.pl/dmuchane-klody-drewna-do-walki-w-wodzie-106-cm-poprezentacyjne.html" },
];

async function main() {
  for (const { ean, url } of PAGES) {
    if (url.match(/\.(jpg|png|webp)$/i)) {
      const ok = await probeImageUrl(url);
      console.log(`${ean} ${ok ? "OK" : "FAIL"} ${url}`);
      continue;
    }
    const res = await fetchWithTimeout(url, { headers: { "User-Agent": "Mozilla/5.0" } }, 15000);
    const html = await res.text();
    const imgs = [...html.matchAll(/https?:\/\/[^"'\s]+\.(?:jpg|jpeg|png|webp)/gi)].map((m) => m[0]);
    let found = false;
    for (const img of [...new Set(imgs)].slice(0, 15)) {
      if (img.includes("logo") || img.includes("icon")) continue;
      if (await probeImageUrl(img)) {
        console.log(`${ean} OK ${img.slice(0, 100)}`);
        found = true;
        break;
      }
    }
    if (!found) console.log(`${ean} FAIL ${url.split("/")[2]}`);
  }
}

main().catch(console.error);
