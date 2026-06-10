import { fetchWithTimeout, probeImageUrl } from "../src/lib/services/ean-providers/image-utils";

const CZUCZU_PAGES: Record<string, string> = {
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
};

async function bestImage(ean: string, url: string): Promise<string | null> {
  const res = await fetchWithTimeout(url, { headers: { "User-Agent": "Mozilla/5.0" } }, 15000);
  const html = await res.text();
  const imgs = [...html.matchAll(/https:\/\/czuczu\.pl\/wp-content\/uploads\/[^"'\s]+\.(?:jpg|jpeg|png|webp)/gi)].map(
    (m) => m[0],
  );
  const unique = [...new Set(imgs)].filter((u) => !u.includes("powiadomienie_o_produkce"));
  const byEan = unique.find((u) => u.includes(ean));
  if (byEan && (await probeImageUrl(byEan))) return byEan;
  for (const u of unique) {
    if (await probeImageUrl(u)) return u;
  }
  return null;
}

async function main() {
  for (const [ean, url] of Object.entries(CZUCZU_PAGES)) {
    const img = await bestImage(ean, url);
    console.log(`${ean}\t${img ? "OK" : "FAIL"}\t${img ?? "—"}`);
  }
}

main().catch(console.error);
