/**
 * Pełna weryfikacja przed commitem / deployem: kod + audyty danych.
 * npm run check:all
 */
import { spawnSync } from "node:child_process";

function runNpmScript(script: string): number {
  console.log(`\n══════════════════════════════════════\n▶ npm run ${script}\n`);
  const result = spawnSync("npm", ["run", script], {
    stdio: "inherit",
    shell: process.platform === "win32",
    env: process.env,
  });
  return result.status ?? 1;
}

async function main() {
  console.log("🔎 check:all — pełna weryfikacja Biblioteka Zakątka Fantastyki\n");

  const codeExit = runNpmScript("check:code");
  if (codeExit !== 0) {
    console.error("\n⛔ check:all przerwany — check:code nie przeszedł.\n");
    process.exit(codeExit);
  }

  const auditExit = runNpmScript("audit:data");
  if (auditExit !== 0) {
    console.error("\n⛔ check:all przerwany — audit:data nie przeszedł.\n");
    process.exit(auditExit);
  }

  console.log("\n✅ check:all — check:code i audit:data zakończone pomyślnie.\n");
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
