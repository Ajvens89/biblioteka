/**
 * Audyty jakości danych (nie blokują check:code).
 * npm run audit:data
 */
import { runCheckSteps, type CheckStep } from "./lib/run-check-steps";

const steps: CheckStep[] = [
  { label: "audit:ean", command: "npm", args: ["run", "audit:ean"], needsDb: true },
  { label: "audit:covers", command: "npm", args: ["run", "audit:covers"], needsDb: true },
  { label: "audit:catalog-stats", command: "npm", args: ["run", "audit:catalog-stats"], needsDb: true },
  { label: "audit:seed-accounts", command: "npm", args: ["run", "audit:seed-accounts"], needsDb: true },
  { label: "audit:rpg-batch2", command: "npm", args: ["run", "audit:rpg-batch2"], needsDb: true },
];

runCheckSteps({
  title: "audit:data — audyty danych Biblioteka Zakątka Fantastyki",
  steps,
  retryHint: "npm run audit:data",
})
  .then((code) => process.exit(code))
  .catch((e) => {
    console.error(e instanceof Error ? e.message : e);
    process.exit(1);
  });
