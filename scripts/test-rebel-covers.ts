import {
  loadRebelImageIndex,
  lookupRebelCoverUrl,
} from "../src/lib/services/ean-providers/rebel-images-provider";

async function main() {
  const idx = await loadRebelImageIndex();
  console.log("Produktów w indeksie:", idx?.byProductId.size ?? 0);

  const tests: Array<[string, string | null]> = [
    ["Carcassonne", null],
    ["Ryzyk Fizyk", "5908215009229"],
    ["Azul", null],
    ["Gloomhaven", null],
    ["7 Wonders", null],
    ["Alias", null],
  ];

  for (const [title, ean] of tests) {
    const hit = await lookupRebelCoverUrl(title, ean);
    console.log(
      hit ? `✓ ${title} → #${hit.productId} …${hit.coverUrl.slice(-48)}` : `— ${title}`,
    );
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
