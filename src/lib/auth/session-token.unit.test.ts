import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { after, before, describe, it } from "node:test";
import { SESSION_TTL_SECONDS, signProfileSession, verifyProfileSession } from "./session-token";

const profileId = "c6682209-f84a-4bec-942b-61aa5b521018";
const otherId = "4a258fd6-f0bf-4d18-a764-2e7e5ef02bfe";
const now = 1_790_000_000_000;
const testSecret = "unit-test-session-secret-which-is-at-least-32-characters";
const previousSecret = process.env.AUTH_SECRET;

before(() => { process.env.AUTH_SECRET = testSecret; });
after(() => {
  if (previousSecret === undefined) delete process.env.AUTH_SECRET;
  else process.env.AUTH_SECRET = previousSecret;
});

describe("server-enforced session expiry", () => {
  it("accepts a valid signed session until its exact expiry", async () => {
    const token = await signProfileSession(profileId, now);
    assert.equal(await verifyProfileSession(token, now), profileId);
    const expiry = (Math.floor(now / 1000) + SESSION_TTL_SECONDS) * 1000;
    assert.equal(await verifyProfileSession(token, expiry - 1), profileId);
    assert.equal(await verifyProfileSession(token, expiry), null);
    assert.equal(await verifyProfileSession(token, expiry + 1_000), null);
  });

  it("rejects tampered identity, expiry, signature, and version", async () => {
    const token = await signProfileSession(profileId, now);
    const parts = token.split(".");
    for (const altered of [
      token.replace(profileId, otherId),
      [parts[0], parts[1], Number(parts[2]) + 86_400, parts[3]].join("."),
      `${token.slice(0, -1)}${token.endsWith("a") ? "b" : "a"}`,
      token.replace(/^v1\./, "v2."),
    ]) assert.equal(await verifyProfileSession(altered, now), null);
  });

  it("rejects old non-expiring cookies even with their valid old HMAC", async () => {
    const oldSignature = createHmac("sha256", testSecret).update(profileId).digest("hex");
    assert.equal(await verifyProfileSession(`${profileId}.${oldSignature}`, now), null);
  });

  it("fails closed on malformed tokens and noncanonical expiry", async () => {
    const token = await signProfileSession(profileId, now);
    const [version, id, expiry, signature] = token.split(".");
    for (const invalid of [
      undefined, "", "x".repeat(200), `${token}.extra`,
      [version, "------------------------------------", expiry, signature].join("."),
      [version, id, `0${expiry}`, signature].join("."),
      [version, id, "Infinity", signature].join("."),
      [version, id, expiry, signature.toUpperCase()].join("."),
    ]) assert.equal(await verifyProfileSession(invalid, now), null);
  });

  it("does not sign a malformed profile or invalid clock", async () => {
    await assert.rejects(() => signProfileSession("------------------------------------", now));
    await assert.rejects(() => signProfileSession(profileId, Number.NaN));
  });
});
