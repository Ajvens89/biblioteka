import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { hashRateLimitKey } from "./pg-rate-limit";
import { generateResetToken, hashResetToken } from "../services/password-reset";

describe("hashRateLimitKey", () => {
  it("produkuje stały hash dla tego samego wejścia", () => {
    const a = hashRateLimitKey("test-key");
    const b = hashRateLimitKey("test-key");
    assert.equal(a, b);
    assert.equal(a.length, 64);
  });

  it("różni się dla różnych kluczy", () => {
    assert.notEqual(hashRateLimitKey("a"), hashRateLimitKey("b"));
  });
});

describe("password reset token", () => {
  it("generateResetToken zwraca unikalny token", () => {
    const t1 = generateResetToken();
    const t2 = generateResetToken();
    assert.notEqual(t1, t2);
    assert.ok(t1.length >= 32);
  });

  it("hashResetToken jest deterministyczny", () => {
    const token = "abc123";
    assert.equal(hashResetToken(token), hashResetToken(token));
  });
});

describe("passwordResetConfirmSchema", async () => {
  const { passwordResetConfirmSchema, passwordResetRequestSchema } = await import(
    "../validations/password-reset"
  );

  it("wymaga hasła z literą i cyfrą", () => {
    const bad = passwordResetConfirmSchema.safeParse({
      token: "x".repeat(20),
      password: "abcdefgh",
      confirmPassword: "abcdefgh",
    });
    assert.equal(bad.success, false);

    const tooShort = passwordResetConfirmSchema.safeParse({
      token: "x".repeat(20),
      password: "abc12345",
      confirmPassword: "abc12345",
    });
    assert.equal(tooShort.success, false);

    const good = passwordResetConfirmSchema.safeParse({
      token: "x".repeat(20),
      password: "abc12345xyz!",
      confirmPassword: "abc12345xyz!",
    });
    assert.equal(good.success, true);
  });

  it("request schema wymaga email", () => {
    assert.equal(passwordResetRequestSchema.safeParse({ email: "bad" }).success, false);
    assert.equal(passwordResetRequestSchema.safeParse({ email: "a@b.pl" }).success, true);
  });
});
