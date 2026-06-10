import "dotenv/config";
import { loadHurtCatalog } from "../src/lib/hurt-catalog-loader";
import { findHurtProductByEan, mapHurtProductToGameData, canonicalHurtEan } from "../src/lib/hurt-catalog";

const GAMES = [
  ["Proszę wsiadać! Nowy Jork i Londyn", "3760175518263"],
  ["Circadians: Nowy Świt - Specjaliści", "5902560387629"],
  ["Eleven: Edycja Polska", "5902560386981"],
  ["Dead by Daylight: Gra planszowa", "5902560387278"],
  ["Wyprawa Darwina / Darwin's Journey", "5902560384338"],
  ["Monolith Arena", "5902560381580"],
  ["Niezbadana Planeta", "5902560387322"],
  ["Niezbadana Planeta: Superksiężyc", "5905794220151"],
  ["Resurgence", "5902560387681"],
  ["Circadians: Ład Chaosu", "5902560384857"],
  ["Circadians: Ład Chaosu - Heroldowie", "5902560388121"],
  ["Potwory w Tokio", "5902560384079"],
  ["Potwory w Tokio: Halloween", "5902560384529"],
  ["Nowy świt", "5905965251502"],
  ["Niezbadana planeta: Zestaw ulepszeń", "5902560387599"],
] as const;

async function main() {
  const cat = await loadHurtCatalog();
  for (const [title, raw] of GAMES) {
    const ean = canonicalHurtEan(raw);
    const p = findHurtProductByEan(ean, cat);
    if (p) {
      const m = mapHurtProductToGameData(p);
      console.log(`OK ${ean} => ${m.title}`);
      console.log(`   opis: ${m.shortDescription?.slice(0, 60) ?? "brak"}...`);
      console.log(`   okładka: ${m.imageUrl ?? m.thumbnailUrl ?? "brak"}`);
    } else {
      console.log(`MISS ${ean} — ${title}`);
    }
  }
}
main();
