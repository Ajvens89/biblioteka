import { fetchWithTimeout, probeImageUrl } from "../src/lib/services/ean-providers/image-utils";

const NEED = [
  "5666816442127", "5609288361183", "4005556268122", "5036905042086", "8005125411658",
  "5902768336429", "5904262950187", "3760175518263", "9788365773531", "9788366762374",
  "5411068842733", "5010994773274", "5900511182538", "5906018013467", "8719075976371",
  "5609288361190", "5902983493839", "5902983491835", "5902983493808", "5902983493846",
];

async function aleSearch(ean: string): Promise<string | null> {
  const res = await fetchWithTimeout(
    `https://aleplanszowki.pl/szukaj?controller=search&s=${ean}`,
    { headers: { "User-Agent": "Mozilla/5.0" } },
    15000,
  );
  const html = await res.text();
  const link = html.match(new RegExp(`href="([^"]+${ean}\\.html)"`, "i"))?.[1];
  if (!link) return null;
  const page = await fetchWithTimeout(
    link.startsWith("http") ? link : `https://aleplanszowki.pl${link}`,
    { headers: { "User-Agent": "Mozilla/5.0" } },
    15000,
  );
  const ph = await page.text();
  const img =
    ph.match(/https:\/\/aleplanszowki\.pl\/[^"']+\.(?:jpg|png|webp)/i)?.[0] ??
    ph.match(/content="(https:\/\/[^"]+\.(?:jpg|png|webp))"/i)?.[1];
  if (!img) return null;
  return (await probeImageUrl(img)) ? img : null;
}

async function czuczuEanImg(ean: string): Promise<string | null> {
  for (let i = 1; i <= 5; i++) {
    for (const folder of ["2024/12", "2024/11", "2025/02", "2023/12", "2022/01", "2021/05"]) {
      const url = `https://czuczu.pl/wp-content/uploads/${folder}/${ean}_${i}.jpg`;
      if (await probeImageUrl(url)) return url;
    }
  }
  return null;
}

async function main() {
  for (const ean of NEED) {
    let img = await aleSearch(ean);
    if (!img && ean.startsWith("590298349")) img = await czuczuEanImg(ean);
    console.log(`${ean}\t${img ? "OK" : "FAIL"}\t${img ?? "—"}`);
  }
}

main().catch(console.error);
