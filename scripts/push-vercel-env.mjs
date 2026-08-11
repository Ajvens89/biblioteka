/**
 * Push selected keys from local .env to Vercel Production (+ Preview).
 * Does not print secret values.
 *
 * Usage: node --require ./scripts/vercel-ascii-preload.cjs scripts/push-vercel-env.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const preload = path.join(__dirname, "vercel-ascii-preload.cjs");
const require = createRequire(import.meta.url);
let vc;
try {
  vc = require.resolve("vercel/dist/vc.js");
} catch {
  vc = path.join(
    process.env.LOCALAPPDATA || "",
    "npm-cache/_npx/7d2828e2bd6720ce/node_modules/vercel/dist/vc.js",
  );
}
if (!fs.existsSync(vc)) {
  console.error("vercel CLI not found at", vc);
  process.exit(1);
}

const KEYS = [
  "DATABASE_URL",
  "DIRECT_URL",
  "AUTH_PROVIDER",
  "AUTH_SECRET",
  "ALLOW_LOCAL_AUTH_IN_PRODUCTION",
  "APP_URL",
  "NEXT_PUBLIC_APP_URL",
  "GOOGLE_GEMINI_API_KEY",
  "GOOGLE_GEMINI_MODEL",
  "GOOGLE_CSE_API_KEY",
  "GOOGLE_CSE_CX",
  "RESEND_API_KEY",
  "EMAIL_FROM",
  "CRON_SECRET",
];

function parseEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return {};
  const out = {};
  for (const line of fs.readFileSync(filePath, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq < 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let val = trimmed.slice(eq + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    out[key] = val;
  }
  return out;
}

function runVercel(args, input) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, ["--require", preload, vc, ...args], {
      cwd: root,
      env: {
        ...process.env,
        VERCEL_ASCII_HOST: "localhost",
        VERCEL_ASCII_USER: "ajven",
      },
      stdio: ["pipe", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (d) => {
      stdout += d.toString();
    });
    child.stderr.on("data", (d) => {
      stderr += d.toString();
    });
    if (input != null) {
      child.stdin.write(input);
      child.stdin.end();
    } else {
      child.stdin.end();
    }
    child.on("exit", (code) => {
      resolve({ code: code ?? 1, stdout, stderr });
    });
    child.on("error", reject);
  });
}

async function upsertEnv(key, value, environment) {
  // Remove existing (ignore failures)
  await runVercel(["env", "rm", key, environment, "--yes"]);
  const add = await runVercel(["env", "add", key, environment, "--sensitive"], value);
  if (add.code !== 0) {
    // fallback without --sensitive for older CLI quirks
    await runVercel(["env", "rm", key, environment, "--yes"]);
    const add2 = await runVercel(["env", "add", key, environment], value);
    if (add2.code !== 0) {
      console.error(`FAIL ${key} [${environment}]`, add2.stderr.slice(0, 200));
      return false;
    }
  }
  console.log(`OK ${key} → ${environment}`);
  return true;
}

async function main() {
  const local = {
    ...parseEnvFile(path.join(root, ".env")),
    ...parseEnvFile(path.join(root, ".env.production.local")),
  };

  // Production public URL for this project
  const prodUrl = "https://biblioteka-seven.vercel.app";
  local.APP_URL = prodUrl;
  local.NEXT_PUBLIC_APP_URL = prodUrl;
  local.AUTH_PROVIDER = local.AUTH_PROVIDER || "local";
  local.ALLOW_LOCAL_AUTH_IN_PRODUCTION = "true";

  if (!local.EMAIL_FROM) {
    local.EMAIL_FROM = "Biblioteka Zakątka Fantastyki <biblioteka@zakatekfantastyki.pl>";
  }

  const missing = KEYS.filter((k) => !local[k] || !String(local[k]).trim());
  console.log("Missing optional/required keys (empty):", missing.join(", ") || "(none)");

  for (const key of KEYS) {
    const value = local[key];
    if (!value || !String(value).trim()) {
      console.log(`SKIP ${key} (empty)`);
      continue;
    }
    for (const env of ["production", "preview"]) {
      await upsertEnv(key, String(value), env);
    }
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
