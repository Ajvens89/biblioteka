#!/usr/bin/env node
/**
 * Run Vercel CLI with ASCII hostname/user preload (Windows non-ASCII hostname fix).
 * Usage: node scripts/vercel-run.mjs <vercel-args...>
 */
import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const preload = path.join(__dirname, "vercel-ascii-preload.cjs");
const require = createRequire(import.meta.url);

let vc;
try {
  vc = require.resolve("vercel/dist/vc.js");
} catch {
  // fall back to npx cache used during setup
  vc = path.join(
    process.env.LOCALAPPDATA || "",
    "npm-cache/_npx/7d2828e2bd6720ce/node_modules/vercel/dist/vc.js",
  );
}

const child = spawn(
  process.execPath,
  ["--require", preload, vc, ...process.argv.slice(2)],
  {
    stdio: "inherit",
    env: {
      ...process.env,
      VERCEL_ASCII_HOST: process.env.VERCEL_ASCII_HOST || "localhost",
      VERCEL_ASCII_USER: process.env.VERCEL_ASCII_USER || "ajven",
    },
    cwd: path.join(__dirname, ".."),
  },
);

child.on("exit", (code) => process.exit(code ?? 1));
