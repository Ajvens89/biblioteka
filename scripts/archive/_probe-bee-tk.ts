import { fetchWithTimeout, probeImageUrl } from "../src/lib/services/ean-providers/image-utils";

const EANS = [
  "5666816442127", "5609288361183", "5036905042086", "8005125411658", "5902768336429",
  "5902983493839", "9788365773531", "9788366762374", "5902983493808", "5411068842733",
  "5906018013467", "5900511182538", "5609288361190", "5010994773274",
];

async function searchShop(base: string, ean: string): Promise<string | null> {
  const q = base.includes("bee") ? `query=${ean}` : `q=${ean}`;
  const res = await fetchWithTimeout(`${base}/szukaj?${q}`, { headers: { "User-Agent": "Mozilla/5.0" } }, 12000);
  const html = await res.text();
  if (!html.includes(ean)) return null;
  const re = new RegExp(`(?:https?:)?//cf-${base.includes("bee") ? "bee" : "tk"}\\.statiki\\.pl/images/popups/[^"'\\s]+/${ean}\\.webp`, "i");
  const m = html.match(re)?.[0];
  if (!m) return null;
  const url = m.startsWith("//") ? `https:${m}` : m;
  return (await probeImageUrl(url)) ? url : null;
}

async function main() {
  for (const ean of EANS) {
    const bee = await searchShop("https://www.bee.pl", ean);
    if (bee) { console.log(`${ean} BEE ${bee}`); continue; }
    const tk = await searchShop("https://www.taniaksiazka.pl", ean);
    if (tk) { console.log(`${ean} TK ${tk}`); continue; }
    console.log(`${ean} FAIL`);
  }
}

main().catch(console.error);
