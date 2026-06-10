import { fetchWithTimeout, probeImageUrl } from "../src/lib/services/ean-providers/image-utils";

const PAGES = [
  "https://www.taniaksiazka.pl/zestaw-do-bitwy-na-wodzie-p-2211166.html",
  "https://www.taniaksiazka.pl/zestaw-do-bitwy-na-wodzie-p-1702772.html",
  "https://poszukiwaczefrajdy.pl/dmuchane-klody-drewna-do-walki-w-wodzie-106-cm-poprezentacyjne.html",
  "https://www.empik.com/szukaj?q=zestaw+bitwy+na+wodzie+5609288361190",
];

async function scrape(pageUrl: string) {
  const res = await fetchWithTimeout(pageUrl, { headers: { "User-Agent": "Mozilla/5.0" } }, 15000);
  const html = await res.text();
  console.log("\n===", pageUrl);
  console.log("has EAN:", html.includes("5609288361190"));
  const og = html.match(/property="og:image" content="([^"]+)"/);
  if (og) {
    const ok = await probeImageUrl(og[1]);
    console.log(ok ? "og OK" : "og FAIL", og[1]);
  }
  const imgs = [
    ...html.matchAll(/(?:https?:)?\/\/cf-(?:bee|tk)\.statiki\.pl\/[^"'\s]+\.(?:webp|jpg)/gi),
    ...html.matchAll(/https:\/\/[^"'\s]+\.(?:jpg|jpeg|png|webp)/gi),
  ].map((m) => {
    let u = m[1] ?? m[0];
    if (u.startsWith("//")) u = `https:${u}`;
    return u;
  });
  for (const img of [...new Set(imgs)]) {
    if (img.includes("logo") || img.includes("icon") || img.includes("sprite")) continue;
    if (await probeImageUrl(img)) {
      console.log("OK", img.slice(0, 130));
    }
  }
}

async function main() {
  for (const p of PAGES) await scrape(p);
}

main().catch(console.error);
