import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { assertProductionAuthSafe } from "./production-guard";
import { mutableEnv, setTestEnv } from "@/lib/test/env";

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
    snap[key] = mutableEnv[key];
  }
  return snap;
}

function restoreEnv(snap: EnvSnapshot) {
  for (const key of ENV_KEYS) {
    setTestEnv(key, snap[key]);
  }
}

describe("assertProductionAuthSafe", () => {
  let envSnap: EnvSnapshot;

  beforeEach(() => {
    envSnap = snapshotEnv();
    delete mutableEnv.NEXT_PUBLIC_SUPABASE_URL;
    delete mutableEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    delete mutableEnv.ALLOW_LOCAL_AUTH_IN_PRODUCTION;
  });

  afterEach(() => {
    restoreEnv(envSnap);
  });

  it("nie blokuje w development", () => {
    setTestEnv("NODE_ENV", "development");
    setTestEnv("AUTH_PROVIDER", "local");
    assertProductionAuthSafe();
  });

  it("nie blokuje podczas next build (phase-production-build)", () => {
    setTestEnv("NODE_ENV", "production");
    setTestEnv("NEXT_PHASE", "phase-production-build");
    setTestEnv("AUTH_PROVIDER", "local");
    setTestEnv("NEXT_PUBLIC_SUPABASE_URL", "https://real.supabase.co");
    setTestEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9");
    assertProductionAuthSafe();
  });

  it("pozwala local auth bez Supabase (Firebase + Neon)", () => {
    setTestEnv("NODE_ENV", "production");
    setTestEnv("NEXT_PHASE", undefined);
    setTestEnv("AUTH_PROVIDER", "local");
    assertProductionAuthSafe();
  });

  it("pozwala local auth z Supabase gdy ALLOW_LOCAL_AUTH_IN_PRODUCTION=true", () => {
    setTestEnv("NODE_ENV", "production");
    setTestEnv("NEXT_PHASE", undefined);
    setTestEnv("AUTH_PROVIDER", "local");
    setTestEnv("ALLOW_LOCAL_AUTH_IN_PRODUCTION", "true");
    setTestEnv("NEXT_PUBLIC_SUPABASE_URL", "https://real.supabase.co");
    setTestEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9");
    assertProductionAuthSafe();
  });

  it("blokuje local auth w produkcji z Supabase bez ALLOW_*", () => {
    setTestEnv("NODE_ENV", "production");
    setTestEnv("NEXT_PHASE", undefined);
    setTestEnv("AUTH_PROVIDER", "local");
    setTestEnv("ALLOW_LOCAL_AUTH_IN_PRODUCTION", undefined);
    setTestEnv("NEXT_PUBLIC_SUPABASE_URL", "https://real.supabase.co");
    setTestEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9");

    assert.throws(() => assertProductionAuthSafe(), /AUTH_PROVIDER=local jest zablokowany/);
  });
});
