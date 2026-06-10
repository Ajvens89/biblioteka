import { probeImageUrl, fetchWithTimeout } from "../src/lib/services/ean-providers/image-utils";

const EANS = [
  "6416739594620", "9788396341679", "5666816442127", "5902983491996", "5902983492009",
  "5902983493761", "5902983492207", "5609288361183", "5902560386981", "4005556268122",
  "5036905042086", "8005125411658", "5902768336429", "5904262950187", "5905794220151",
  "5902983493617", "5902983493839", "9788365773531", "3760175518263", "9788366762374",
  "5902983493792", "5902983493785", "5902983491842", "5902983491835", "5902983493204",
  "5902983493808", "5902983493846", "5902983490807", "5902983490791", "5411068842733",
  "5010994773274", "5900511182538",
];

const FOLDERS = ["2A0", "32D", "EAB", "113", "FF9", "130", "2B0", "3A1", "4C2", "5D3"];

async function probeEan(ean: string) {
  const bases = [
    "https://bigimg.bee.pl/images/popups",
    "https://bigimg.taniaksiazka.pl/images/popups",
  ];
  for (const base of bases) {
    for (const folder of FOLDERS) {
      for (const ext of ["jpg", "webp"]) {
        const url = `${base}/${folder}/${ean}.${ext}`;
        if (await probeImageUrl(url)) {
          console.log(`${ean} OK ${url}`);
          return;
        }
      }
    }
  }
  // TK search
  try {
    const res = await fetchWithTimeout(
      `https://www.taniaksiazka.pl/szukaj/?q=${ean}`,
      { headers: { "User-Agent": "Mozilla/5.0" } },
      12000,
    );
    const html = await res.text();
    const link = html.match(/href="(\/[^"]+-p-\d+\.html)"/i)?.[1];
    if (link) {
      const page = await fetchWithTimeout(
        `https://www.taniaksiazka.pl${link}`,
        { headers: { "User-Agent": "Mozilla/5.0" } },
        12000,
      );
      const ph = await page.text();
      const img =
        ph.match(/https:\/\/bigimg\.taniaksiazka\.pl\/images\/popups\/[^"']+\.(?:jpg|webp)/i)?.[0] ??
        ph.match(/https:\/\/cf-tk\.statiki\.pl\/images\/popups\/[^"']+\.(?:jpg|webp)/i)?.[0];
      if (img && (await probeImageUrl(img))) {
        console.log(`${ean} TK ${img}`);
        return;
      }
    }
  } catch { /* ignore */ }
  console.log(`${ean} FAIL`);
}

async function main() {
  for (const ean of EANS) await probeEan(ean);
}

main().catch(console.error);
