import { fetchWithTimeout, probeImageUrl } from "../src/lib/services/ean-providers/image-utils";

async function main() {
  const url = "https://poszukiwaczefrajdy.pl/dmuchane-klody-drewna-do-walki-w-wodzie-106-cm-poprezentacyjne.html";
  const r = await fetchWithTimeout(url, { headers: { "User-Agent": "Mozilla/5.0" } }, 15000);
  const h = await r.text();
  const ids = [...h.matchAll(/picasso\/(?:thumb\/)?([a-z0-9]+)\.(jpg|png|webp)/gi)].map((m) => m[1]);
  console.log("ids", [...new Set(ids)]);
  for (const id of [...new Set(ids)]) {
    for (const path of [
      `https://poszukiwaczefrajdy.pl/services/picasso/${id}.jpg`,
      `https://poszukiwaczefrajdy.pl/services/picasso/${id}.png`,
      `https://poszukiwaczefrajdy.pl/services/picasso/thumb/${id}.jpg`,
    ]) {
      const ok = await probeImageUrl(path);
      if (ok) console.log("OK", path);
    }
  }
  const og = h.match(/property="og:image" content="([^"]+)"/);
  if (og) console.log("og", og[1], await probeImageUrl(og[1]));
}

main().catch(console.error);
