import { fetchWithTimeout, probeImageUrl } from "../src/lib/services/ean-providers/image-utils";

const PREFIXES = ["DEF", "D03", "5FC", "A1B", "C2D", "E4F", "123", "000", "836", "119", "560"];

async function main() {
  const ean = "5609288361190";
  for (const prefix of PREFIXES) {
    for (const base of [
      `https://cf-bee.statiki.pl/images/popups/${prefix}/${ean}.webp`,
      `https://cf-tk.statiki.pl/images/popups/${prefix}/${ean}.webp`,
      `https://bigimg.taniaksiazka.pl/images/popups/${prefix}/${ean}.jpg`,
    ]) {
      if (await probeImageUrl(base)) console.log("OK", base);
    }
  }

  const pages = [
    "https://poszukiwaczefrajdy.pl/dmuchane-klody-drewna-do-walki-w-wodzie-106-cm-poprezentacyjne.html",
    "https://www.empik.com/szukaj?q=5609288361190",
    "https://www.morele.net/search/?q=5609288361190",
    "https://www.x-kom.pl/szukaj?q=5609288361190",
    "https://gryizabawki.pl/k,ks_,5609288361190",
  ];

  for (const url of pages) {
    try {
      const res = await fetchWithTimeout(url, { headers: { "User-Agent": "Mozilla/5.0" } }, 15000);
      const html = await res.text();
      const productLinks = [...html.matchAll(/href="([^"]*(?:5609288361190|bitwy|klody|wodzie)[^"]*)"/gi)].map((m) => m[1]).slice(0, 5);
      console.log("\n", url.split("/")[2], "links:", productLinks);
      const imgs = [...html.matchAll(/(?:src|data-src|content)="([^"]+\.(?:jpg|jpeg|png|webp)[^"]*)"/gi)].map((m) => m[1]);
      for (const raw of [...new Set(imgs)]) {
        const img = raw.startsWith("//") ? `https:${raw}` : raw.startsWith("/") ? new URL(raw, url).href : raw;
        if (img.includes("logo") || img.includes("icon") || img.includes("sprite")) continue;
        if (await probeImageUrl(img)) {
          console.log("IMG", img.slice(0, 120));
        }
      }
    } catch (e) {
      console.log("ERR", url);
    }
  }
}

main().catch(console.error);
