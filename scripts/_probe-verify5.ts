import { fetchWithTimeout, probeImageUrl } from "../src/lib/services/ean-providers/image-utils";

async function main() {
  const url = "https://ksiegarniainternetowa.co.uk/tv/klocki_cubes_12_kubus_puchatek-8005125411658?selected_currency=pln";
  const r = await fetchWithTimeout(url, { headers: { "User-Agent": "Mozilla/5.0" } }, 15000);
  const h = await r.text();
  const imgs = [...h.matchAll(/https:\/\/ksiegarniainternetowa\.co\.uk\/img\/[^"'\s]+/gi)].map((m) => m[0]);
  for (const img of [...new Set(imgs)]) {
    const ok = await probeImageUrl(img);
    console.log(ok ? "OK" : "FAIL", img);
  }

  const gry = "https://gryizabawki.pl/k,ks_440874,Czuczu:-Mini-puzzle-Niedzwiadki-6429.html";
  const gr = await fetchWithTimeout(gry, { headers: { "User-Agent": "Mozilla/5.0" } }, 15000);
  const gh = await gr.text();
  console.log("gry ean", gh.includes("5902768336429"));
  const gimgs = [...gh.matchAll(/https:\/\/webimage\.pl\/[^"'\s]+/gi)].map((m) => m[0]);
  for (const img of gimgs) {
    const ok = await probeImageUrl(img);
    console.log(ok ? "OK" : "FAIL", img);
  }

  const thumb = "https://poszukiwaczefrajdy.pl/services/picasso/thumb/iwqwhkzb.jpg?size=800x800";
  console.log("thumb", await probeImageUrl(thumb));
  const full = "https://poszukiwaczefrajdy.pl/services/picasso/iwqwhkzb.jpg";
  console.log("full", await probeImageUrl(full));
}

main().catch(console.error);
