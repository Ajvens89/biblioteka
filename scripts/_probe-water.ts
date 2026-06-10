import { fetchWithTimeout, probeImageUrl } from "../src/lib/services/ean-providers/image-utils";

const PAGES = [
  "https://www.bee.pl/szukaj?q=5609288361190",
  "https://www.taniaksiazka.pl/szukaj?q=5609288361190",
  "https://kropkasklep.pl/szukaj?controller=search&s=5609288361190",
  "https://www.google.com/search?q=5609288361190+bitwa+na+wodzie&tbm=isch",
  "https://cf-bee.statiki.pl/images/popups/DEF/5609288361190.webp",
  "https://cf-tk.statiki.pl/images/popups/DEF/5609288361190.webp",
];

async function main() {
  for (const url of PAGES) {
    if (url.match(/\.webp$/)) {
      const ok = await probeImageUrl(url);
      console.log(ok ? "OK" : "FAIL", url);
      continue;
    }
    try {
      const res = await fetchWithTimeout(url, { headers: { "User-Agent": "Mozilla/5.0" } }, 15000);
      const html = await res.text();
      if (html.includes("5609288361190")) console.log("EAN on page:", url.split("/")[2]);
      const imgs = [...html.matchAll(/https?:\/\/[^"'\s]+\.(?:jpg|jpeg|png|webp)/gi)].map((m) => m[0]);
      for (const img of [...new Set(imgs)].slice(0, 12)) {
        if (img.includes("logo") || img.includes("icon")) continue;
        if (await probeImageUrl(img)) {
          console.log("OK", img.slice(0, 120));
          break;
        }
      }
    } catch (e) {
      console.log("ERR", url);
    }
  }
}

main().catch(console.error);
