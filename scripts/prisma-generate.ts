/**
 * Bezpieczny `prisma generate` dla Windows + OneDrive.
 *
 * Problem: na Windows `prisma generate` zapisuje silnik zapytań jako
 * `query_engine-windows.dll.node.tmp`, a następnie zmienia jego nazwę na
 * docelowy `.dll.node`. Gdy plik docelowy jest chwilowo zablokowany (przez
 * synchronizację OneDrive, antywirus lub jeszcze niezwolniony uchwyt po
 * poprzednim procesie Node), operacja rename kończy się błędem
 * `EPERM: operation not permitted, rename ...`.
 *
 * Rozwiązanie: ponawiamy `prisma generate` kilka razy z rosnącym opóźnieniem,
 * dając systemowi czas na zwolnienie blokady. Na Linux/CI pierwsza próba i tak
 * kończy się sukcesem, więc zachowanie tam pozostaje bez zmian.
 */
import { spawnSync } from "node:child_process";

const MAX_ATTEMPTS = 5;
const BASE_DELAY_MS = 1500;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function runGenerate(): { ok: boolean; output: string } {
  const result = spawnSync("npx", ["prisma", "generate"], {
    shell: process.platform === "win32",
    encoding: "utf8",
    env: process.env,
  });
  const output = `${result.stdout ?? ""}${result.stderr ?? ""}`;
  if (result.stdout) process.stdout.write(result.stdout);
  if (result.stderr) process.stderr.write(result.stderr);
  return { ok: result.status === 0, output };
}

function isTransientLockError(output: string): boolean {
  return /EPERM|EBUSY|operation not permitted|resource busy or locked/i.test(output);
}

async function main() {
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    const { ok, output } = runGenerate();
    if (ok) {
      if (attempt > 1) console.log(`✓ prisma generate OK (próba ${attempt}/${MAX_ATTEMPTS})`);
      return;
    }

    if (!isTransientLockError(output) || attempt === MAX_ATTEMPTS) {
      console.error(`❌ prisma generate nie powiódł się (próba ${attempt}/${MAX_ATTEMPTS}).`);
      process.exit(1);
    }

    const delay = BASE_DELAY_MS * attempt;
    console.warn(
      `⚠️  prisma generate — blokada pliku (EPERM/EBUSY). ` +
        `Czekam ${delay}ms i ponawiam (próba ${attempt + 1}/${MAX_ATTEMPTS})…`,
    );
    await sleep(delay);
  }
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
