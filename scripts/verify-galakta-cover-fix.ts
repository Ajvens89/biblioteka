/**
 * Verify Galakta EAN cover fix (live network).
 * Run: npx tsx scripts/verify-galakta-cover-fix.ts
 */
import "dotenv/config";
import { lookupExternalCoverCandidates } from "../src/lib/services/ean-providers/external-cover-providers";
import { lookupPlanszeoCoverUrl } from "../src/lib/services/ean-providers/planszeo-provider";
import { lookupAleplanszowkiByEan } from "../src/lib/services/ean-providers/aleplanszowki-provider";

async function assertCover(label: string, ok: boolean, detail?: string) {
  if (!ok) {
    console.error("FAIL", label, detail ?? "");
    process.exitCode = 1;
    return;
  }
  console.log("OK  ", label, detail ?? "");
}

async function main() {
  const adeleEan = "5902259207450";
  const tenefyrEan = "5902259207054";
  const wrongGeminiEan = "5902254005297";

  const adele = await lookupAleplanszowkiByEan(adeleEan);
  await assertCover(
    "ALEplanszówki ADELE by EAN",
    Boolean(adele?.coverUrl && /a\.?d\.?e\.?l\.?e/i.test(adele.title)),
    adele ? `${adele.title} → ${adele.coverUrl.slice(0, 60)}` : "null",
  );

  const tenefyr = await lookupAleplanszowkiByEan(tenefyrEan);
  await assertCover(
    "ALEplanszówki Tenefyr by EAN",
    Boolean(tenefyr?.coverUrl && /tenefyr/i.test(tenefyr.title)),
    tenefyr ? `${tenefyr.title} → ${tenefyr.coverUrl.slice(0, 60)}` : "null",
  );

  const planszeo = await lookupPlanszeoCoverUrl("Bohaterowie Tenefyru", wrongGeminiEan);
  await assertCover(
    "Planszeo PL title → EN slug (wrong Gemini EAN)",
    Boolean(planszeo?.coverUrl && planszeo.slug === "heroes-of-tenefyr"),
    planszeo ? `${planszeo.slug} ${planszeo.title}` : "null",
  );

  const externalAdele = await lookupExternalCoverCandidates(adeleEan);
  const adeleHit = externalAdele.candidates.find((c) => c.coverImageUrl);
  await assertCover(
    "external EAN-only ADELE",
    Boolean(adeleHit?.coverImageUrl && adeleHit.title),
    adeleHit ? `${adeleHit.source}: ${adeleHit.title}` : JSON.stringify(externalAdele.attempts),
  );

  const externalTenefyr = await lookupExternalCoverCandidates(tenefyrEan);
  const tenHit = externalTenefyr.candidates.find((c) => c.coverImageUrl);
  await assertCover(
    "external EAN-only Tenefyr",
    Boolean(tenHit?.coverImageUrl),
    tenHit ? `${tenHit.source}: ${tenHit.title}` : JSON.stringify(externalTenefyr.attempts),
  );

  const externalWrong = await lookupExternalCoverCandidates(wrongGeminiEan, "Bohaterowie Tenefyru");
  const wrongHit = externalWrong.candidates.find((c) => c.coverImageUrl);
  await assertCover(
    "external wrong EAN + title Tenefyr",
    Boolean(wrongHit?.coverImageUrl),
    wrongHit ? `${wrongHit.source}: ${wrongHit.title}` : JSON.stringify(externalWrong.attempts),
  );

  if (process.exitCode) {
    console.error("\nSome checks failed.");
  } else {
    console.log("\nAll checks passed.");
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
