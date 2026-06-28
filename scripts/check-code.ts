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
  {
    label: "test:e2e",
    command: "npm",
    args: ["run", "test:e2e:ci"],
    needsDb: true,
    env: { PLAYWRIGHT_FORCE_WEBSERVER: "1", CI: "1" },
  },
  { label: "Production build", command: "npm", args: ["run", "build"] },
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
