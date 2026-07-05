import "dotenv/config";
import { spawnSync } from "node:child_process";

export type CheckStep = {
  label: string;
  command: string;
  args: string[];
  needsDb?: boolean;
  env?: Record<string, string>;
};

function hasDatabaseUrl(): boolean {
  const url = process.env.DATABASE_URL?.trim();
  return Boolean(url && !url.includes("[") && !url.includes("YOUR_"));
}

/**
 * Kontrola połączenia z bazą wykonywana w OSOBNYM procesie (npm run db:ping).
 *
 * Świadomie NIE importujemy tu @prisma/client ani nie tworzymy PrismaClient.
 * Orkiestrator check:code żyje przez cały przebieg — gdyby załadował silnik
 * Prisma (`query_engine-windows.dll.node`), na Windows zablokowałby plik na
 * stałe, a późniejszy krok `prisma generate` kończyłby się błędem
 * `EPERM: ... rename query_engine-windows.dll.node`. Krótki proces potomny
 * ładuje i zwalnia silnik samodzielnie.
 */
function checkDatabaseConnection(): boolean {
  const result = spawnSync("npm", ["run", "db:ping"], {
    stdio: "inherit",
    shell: process.platform === "win32",
    env: process.env,
  });
  return result.status === 0;
}

function runStep(step: CheckStep): boolean {
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

export async function runCheckSteps(options: {
  title: string;
  steps: CheckStep[];
  retryHint: string;
}): Promise<number> {
  console.log(`🔎 ${options.title}\n`);

  let dbOk = false;
  if (hasDatabaseUrl()) {
    console.log("▶ Kontrola połączenia z bazą (db:ping)");
    dbOk = checkDatabaseConnection();
  } else {
    console.warn("⚠️  DATABASE_URL — pominięto kroki wymagające bazy.\n");
  }

  const results: { label: string; status: "ok" | "fail" | "skip" }[] = [];

  for (const step of options.steps) {
    if (step.needsDb && !dbOk) {
      console.log(`\n⏭️  ${step.label} — pominięto (wymaga działającej bazy)`);
      results.push({ label: step.label, status: "skip" });
      continue;
    }
    const ok = runStep(step);
    results.push({ label: step.label, status: ok ? "ok" : "fail" });
    if (!ok) {
      console.error(`\n⛔ Przerwano — napraw błąd powyżej i uruchom ponownie: ${options.retryHint}\n`);
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

  if (failed) return 1;
  if (skipped) {
    console.error(`\n❌ ${options.title} nieukończony — uruchom bazę i powtórz.\n`);
    return 1;
  }
  console.log(`\n✅ ${options.title} — wszystkie kroki zakończone pomyślnie.\n`);
  return 0;
}
