import { fetchWithTimeout, probeImageUrl } from "../src/lib/services/ean-providers/image-utils";
import { lookupUpcitemdbByEan } from "../src/lib/services/ean-providers/upcitemdb-provider";
import { lookupGoogleBooksProvider } from "../src/lib/services/ean-providers/google-books-provider";
import { resolveOpenLibraryCover } from "../src/lib/services/ean-providers/image-utils";

const NEED = [
  "5666816442127", "5609288361183", "4005556268122", "5036905042086", "8005125411658",
  "5902768336429", "5904262950187", "3760175518263", "9788365773531", "9788366762374",
  "5411068842733", "5010994773274", "5900511182538", "5906018013467", "8719075976371",
  "5609288361190", "5902983493839", "5902983491835", "5902983493808", "5902983493846",
];

async function beeSearch(ean: string): Promise<string | null> {
  const res = await fetchWithTimeout(
    `https://www.bee.pl/szukaj?query=${ean}`,
    { headers: { "User-Agent": "Mozilla/5.0" } },
    12000,
  );
  const html = await res.text();
  const re = new RegExp(`(?:https?:)?//cf-bee\\.statiki\\.pl/images/popups/[^"'\\s]+/${ean}\\.webp`, "i");
  const m = html.match(re)?.[0];
  if (!m) return null;
  const url = m.startsWith("//") ? `https:${m}` : m;
  return (await probeImageUrl(url)) ? url : null;
}

async function main() {
  for (const ean of NEED) {
    const bee = await beeSearch(ean);
    if (bee) {
      console.log(`${ean}\tBEE\t${bee}`);
      continue;
    }
    const upc = await lookupUpcitemdbByEan(ean);
    for (const h of upc) {
      const url = h.coverImageUrl ?? h.thumbnailUrl;
      if (url && (await probeImageUrl(url))) {
        console.log(`${ean}\tUPC\t${url}`);
        break;
      }
    }
    if (upc.length) continue;
    if (ean.startsWith("978")) {
      const ol = await resolveOpenLibraryCover(ean);
      if (ol && (await probeImageUrl(ol))) {
        console.log(`${ean}\tOL\t${ol}`);
        continue;
      }
      const books = await lookupGoogleBooksProvider(ean);
      for (const b of books) {
        const url = b.coverImageUrl ?? b.thumbnailUrl;
        if (url && (await probeImageUrl(url))) {
          console.log(`${ean}\tGB\t${url}`);
          break;
        }
      }
      continue;
    }
    console.log(`${ean}\tFAIL`);
  }
}

main().catch(console.error);
