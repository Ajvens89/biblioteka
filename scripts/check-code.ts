/**
 * Weryfikacja kodu przed commitem / deployem (bez audytów danych).
 * npm run check:code
 */
import { runCheckSteps, type CheckStep } from "./lib/run-check-steps";

const steps: CheckStep[] = [
  { label: "Prisma validate", command: "npx", args: ["prisma", "validate"] },
  { label: "ESLint", command: "npm", args: ["run", "lint"] },
  { label: "Testy jednostkowe", command: "npm", args: ["run", "test:unit"] },
  { label: "verify:flow", command: "npm", args: ["run", "verify:flow"], needsDb: true },
  { label: "verify:race", command: "npm", args: ["run", "verify:race"], needsDb: true },
  { label: "verify:ean", command: "npm", args: ["run", "verify:ean"], needsDb: true },
  // Klient Prisma generowany jest DOKŁADNIE RAZ przed e2e. Serwer Playwright
  // (build:e2e + next start) już nie wywołuje `prisma generate`, dzięki czemu
  // nie dochodzi do kolizji EPERM na zablokowanym silniku Prisma (Windows/OneDrive).
  { label: "Prisma generate", command: "npm", args: ["run", "prisma:generate"] },
  {
    label: "test:e2e",
    command: "npm",
    args: ["run", "test:e2e:ci"],
    needsDb: true,
    env: { PLAYWRIGHT_FORCE_WEBSERVER: "1", CI: "1" },
  },
  // Klient Prisma jest już wygenerowany powyżej — produkcyjny build to samo
  // `next build` (bez ponownego `prisma generate`).
  { label: "Production build", command: "npm", args: ["run", "build:e2e"] },
];

runCheckSteps({
  title: "check:code — weryfikacja kodu Biblioteka Zakątka Fantastyki",
  steps,
  retryHint: "npm run check:code",
})
  .then((code) => process.exit(code))
  .catch((e) => {
    console.error(e instanceof Error ? e.message : e);
    process.exit(1);
  });
