import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { getAppUrl } from "./site-url";

describe("getAppUrl", () => {
  const origApp = process.env.APP_URL;
  const origPublic = process.env.NEXT_PUBLIC_APP_URL;

  it("preferuje APP_URL", () => {
    process.env.APP_URL = "https://example.com/";
    process.env.NEXT_PUBLIC_APP_URL = "https://other.com";
    assert.equal(getAppUrl(), "https://example.com");
  });

  it("fallback na NEXT_PUBLIC_APP_URL", () => {
    delete process.env.APP_URL;
    process.env.NEXT_PUBLIC_APP_URL = "https://public.example.com";
    assert.equal(getAppUrl(), "https://public.example.com");
  });

  it("fallback lokalny bez env", () => {
    delete process.env.APP_URL;
    delete process.env.NEXT_PUBLIC_APP_URL;
    assert.equal(getAppUrl(), "http://localhost:3001");
  });

  it("usuwa końcowy slash", () => {
    process.env.APP_URL = "https://example.com/";
    assert.equal(getAppUrl(), "https://example.com");
  });

  if (origApp !== undefined) process.env.APP_URL = origApp;
  else delete process.env.APP_URL;
  if (origPublic !== undefined) process.env.NEXT_PUBLIC_APP_URL = origPublic;
  else delete process.env.NEXT_PUBLIC_APP_URL;
});
