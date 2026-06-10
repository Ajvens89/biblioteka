import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { assertProductionAuthSafe } from "./production-guard";

const ENV_KEYS = [
  "NODE_ENV",
  "NEXT_PHASE",
  "AUTH_PROVIDER",
  "ALLOW_LOCAL_AUTH_IN_PRODUCTION",
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
] as const;

type EnvSnapshot = Record<string, string | undefined>;

function snapshotEnv(): EnvSnapshot {
  const snap: EnvSnapshot = {};
  for (const key of ENV_KEYS) {
    snap[key] = process.env[key];
  }
  return snap;
}

function restoreEnv(snap: EnvSnapshot) {
  for (const key of ENV_KEYS) {
    const value = snap[key];
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
}

describe("assertProductionAuthSafe", () => {
  let envSnap: EnvSnapshot;

  beforeEach(() => {
    envSnap = snapshotEnv();
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    delete process.env.ALLOW_LOCAL_AUTH_IN_PRODUCTION;
  });

  afterEach(() => {
    restoreEnv(envSnap);
  });

  it("nie blokuje w development", () => {
    process.env.NODE_ENV = "development";
    process.env.AUTH_PROVIDER = "local";
    assertProductionAuthSafe();
  });

  it("nie blokuje podczas next build (phase-production-build)", () => {
    process.env.NODE_ENV = "production";
    process.env.NEXT_PHASE = "phase-production-build";
    process.env.AUTH_PROVIDER = "local";
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://real.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9";
    assertProductionAuthSafe();
  });

  it("pozwala local auth bez Supabase (Firebase + Neon)", () => {
    process.env.NODE_ENV = "production";
    delete process.env.NEXT_PHASE;
    process.env.AUTH_PROVIDER = "local";
    assertProductionAuthSafe();
  });

  it("pozwala local auth z Supabase gdy ALLOW_LOCAL_AUTH_IN_PRODUCTION=true", () => {
    process.env.NODE_ENV = "production";
    delete process.env.NEXT_PHASE;
    process.env.AUTH_PROVIDER = "local";
    process.env.ALLOW_LOCAL_AUTH_IN_PRODUCTION = "true";
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://real.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9";
    assertProductionAuthSafe();
  });

  it("blokuje local auth w produkcji z Supabase bez ALLOW_*", () => {
    process.env.NODE_ENV = "production";
    delete process.env.NEXT_PHASE;
    process.env.AUTH_PROVIDER = "local";
    delete process.env.ALLOW_LOCAL_AUTH_IN_PRODUCTION;
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://real.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9";

    assert.throws(() => assertProductionAuthSafe(), /AUTH_PROVIDER=local jest zablokowany/);
  });
});
