import { fetchWithTimeout, probeImageUrl } from "../src/lib/services/ean-providers/image-utils";

async function main() {
  const urls = [
    "https://poszukiwaczefrajdy.pl/services/picasso/thumb/iwqwhkzb.jpg",
    "https://poszukiwaczefrajdy.pl/services/picasso/thumb/inct5dyh.jpg?size=227x204",
    "https://poszukiwaczefrajdy.pl/services/picasso/thumb/inct5dyh.jpg",
  ];
  for (const u of urls) console.log(u, await probeImageUrl(u));

  const empik = await fetchWithTimeout(
    "https://www.empik.com/szukaj?q=5609288361190",
    { headers: { "User-Agent": "Mozilla/5.0" } },
    15000,
  );
  const html = await empik.text();
  const links = [...html.matchAll(/href="(\/[^"]+5609288361190[^"]*)"/gi), ...html.matchAll(/href="(\/[^"]*bitwy[^"]*wodzie[^"]*)"/gi)].map((m) => m[1]);
  console.log("empik links", [...new Set(links)].slice(0, 10));
  const productImgs = [...html.matchAll(/https:\/\/media\.empik\.com\/content\/[^"'\s]+\.(?:jpg|png|webp)/gi)].map((m) => m[0]);
  for (const img of [...new Set(productImgs)].slice(0, 20)) {
    if (img.includes("footer") || img.includes("cpl/2009")) continue;
    const ok = await probeImageUrl(img);
    if (ok) console.log("empik img", img);
  }
}

main().catch(console.error);
