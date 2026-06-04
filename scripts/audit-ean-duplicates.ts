/** @deprecated Użyj: npm run audit:ean */
import { spawnSync } from "node:child_process";
spawnSync("npx", ["tsx", "scripts/audit-ean.ts", ...process.argv.slice(2)], {
  stdio: "inherit",
  shell: true,
});
