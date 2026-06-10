import { fetchWithTimeout, probeImageUrl } from "../src/lib/services/ean-providers/image-utils";

async function tkPage(ean: string) {
  const res = await fetchWithTimeout(
    `https://www.taniaksiazka.pl/szukaj/?q=${ean}`,
    { headers: { "User-Agent": "Mozilla/5.0" } },
    15000,
  );
  const html = await res.text();
  const links = [...html.matchAll(/href="(\/[^"]+-p-\d+\.html)"/gi)].map((m) => m[1]);
  console.log("links", [...new Set(links)].slice(0, 10));
  for (const link of [...new Set(links)].slice(0, 8)) {
    const pageUrl = `https://www.taniaksiazka.pl${link}`;
    const page = await fetchWithTimeout(pageUrl, { headers: { "User-Agent": "Mozilla/5.0" } }, 15000);
    const ph = await page.text();
    if (!ph.includes(ean)) continue;
    console.log("EAN page:", pageUrl);
    const imgs = [...ph.matchAll(/(?:https?:)?\/\/cf-(?:bee|tk)\.statiki\.pl\/[^"'\s]+\.(?:webp|jpg)/gi)].map((m) =>
      m[0].startsWith("//") ? `https:${m[0]}` : m[0],
    );
    for (const img of imgs) {
      const ok = await probeImageUrl(img);
      console.log(ok ? "OK" : "FAIL", img);
    }
    const og = ph.match(/property="og:image" content="([^"]+)"/);
    if (og) console.log("og:", og[1]);
  }
}

const pages = [
  "https://www.empik.com/szukaj?q=5609288361190",
  "https://www.smyk.com/search?q=5609288361190",
  "https://www.ceneo.pl/;szukaj-5609288361190",
  "https://www.amazon.pl/s?k=5609288361190",
  "https://www.7for7.pl/",
];

async function main() {
  await tkPage("5609288361190");
  for (const url of pages) {
    try {
      const res = await fetchWithTimeout(url, { headers: { "User-Agent": "Mozilla/5.0" } }, 15000);
      const html = await res.text();
      if (!html.includes("5609288361190") && !html.includes("8361190")) {
        console.log("no ean", url.split("/")[2]);
        continue;
      }
      console.log("found on", url.split("/")[2]);
      const imgs = [...html.matchAll(/https?:\/\/[^"'\s]+\.(?:jpg|jpeg|png|webp)/gi)].map((m) => m[0]);
      for (const img of [...new Set(imgs)].slice(0, 15)) {
        if (img.includes("logo") || img.includes("icon")) continue;
        if (await probeImageUrl(img)) {
          console.log("OK", img.slice(0, 120));
          break;
        }
      }
    } catch {
      console.log("ERR", url);
    }
  }
}

main().catch(console.error);
