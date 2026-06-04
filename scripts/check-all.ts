/**
 * Pełna weryfikacja przed commitem / deployem.
 * npm run check:all
 */
import { spawnSync } from "node:child_process";
import { checkDatabaseConnection, hasDatabaseUrl } from "./lib/db-check";

type Step = {
  label: string;
  command: string;
  args: string[];
  needsDb?: boolean;
  env?: Record<string, string>;
};

const steps: Step[] = [
  { label: "Prisma validate", command: "npx", args: ["prisma", "validate"] },
  { label: "ESLint", command: "npm", args: ["run", "lint"] },
  { label: "Testy jednostkowe", command: "npm", args: ["run", "test:unit"] },
  { label: "verify:flow", command: "npm", args: ["run", "verify:flow"], needsDb: true },
  { label: "verify:race", command: "npm", args: ["run", "verify:race"], needsDb: true },
  { label: "verify:ean", command: "npm", args: ["run", "verify:ean"], needsDb: true },
  { label: "audit:ean", command: "npm", args: ["run", "audit:ean"], needsDb: true },
  {
    label: "test:e2e",
    command: "npm",
    args: ["run", "test:e2e:ci"],
    needsDb: true,
    env: { PLAYWRIGHT_FORCE_WEBSERVER: "1", CI: "1" },
  },
  { label: "Production build", command: "npm", args: ["run", "build"] },
];

function runStep(step: Step): boolean {
  console.log(`\n▶ ${step.label}`);
  const result = spawnSync(step.command, step.args, {
    stdio: "inherit",
    shell: process.platform === "win32",
    env: { ...process.env, ...step.env },
  });
  if (result.status === 0) {
    console.log(`✅ ${step.label}`);
    return true;
  }
  console.error(`❌ ${step.label} — kod wyjścia ${result.status ?? "unknown"}`);
  return false;
}

async function main() {
  console.log("🔎 check:all — pełna weryfikacja Biblioteka Zakątka Fantastyki\n");

  let dbOk = false;
  if (hasDatabaseUrl()) {
    dbOk = await checkDatabaseConnection();
  } else {
    console.warn("⚠️  DATABASE_URL — pominięto testy wymagające bazy (kroki 4–8).\n");
  }

  const results: { label: string; status: "ok" | "fail" | "skip" }[] = [];

  for (const step of steps) {
    if (step.needsDb && !dbOk) {
      console.log(`\n⏭️  ${step.label} — pominięto (wymaga działającej bazy)`);
      results.push({ label: step.label, status: "skip" });
      continue;
    }
    const ok = runStep(step);
    results.push({ label: step.label, status: ok ? "ok" : "fail" });
    if (!ok) {
      console.error("\n⛔ Przerwano — napraw błąd powyżej i uruchom ponownie: npm run check:all\n");
      break;
    }
  }

  console.log("\n——— Podsumowanie ———");
  for (const r of results) {
    const icon = r.status === "ok" ? "✅" : r.status === "skip" ? "⏭️" : "❌";
    console.log(`${icon} ${r.label}`);
  }

  const failed = results.some((r) => r.status === "fail");
  const skipped = results.some((r) => r.status === "skip");

  if (failed) process.exit(1);
  if (skipped) {
    console.error("\n❌ check:all nieukończony — uruchom bazę i powtórz.\n");
    process.exit(1);
  }
  console.log("\n✅ check:all — wszystkie kroki zakończone pomyślnie.\n");
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
