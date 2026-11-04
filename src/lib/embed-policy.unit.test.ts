import assert from "node:assert/strict";
import test from "node:test";
import { librarySecurityHeaders, LIBRARY_PARENT_ORIGINS, PUBLIC_LIBRARY_PATHS } from "./embed-policy";

test("public framing is restricted to the Foundation's exact HTTPS origins", () => {
  assert.deepEqual(LIBRARY_PARENT_ORIGINS, [
    "https://zakatekfantastyki.pl",
    "https://www.zakatekfantastyki.pl",
  ]);
  const rules = librarySecurityHeaders();
  for (const path of PUBLIC_LIBRARY_PATHS) {
    const rule = rules.find((entry) => entry.source === path);
    assert.equal(rule?.headers.find((h) => h.key === "Content-Security-Policy")?.value,
      "frame-ancestors https://zakatekfantastyki.pl https://www.zakatekfantastyki.pl");
    assert.equal(rule?.headers.some((h) => h.key === "X-Frame-Options"), false);
  }
});

test("private pages keep frame denial and scanner access remains same-origin", () => {
  const rules = librarySecurityHeaders();
  const defaults = rules[0].headers;
  assert.equal(defaults.find((h) => h.key === "Content-Security-Policy")?.value, "frame-ancestors 'none'");
  assert.equal(defaults.find((h) => h.key === "Permissions-Policy")?.value,
    "camera=(self), microphone=(), geolocation=()");
  for (const path of ["/admin/:path*", "/login", "/reset-hasla/:path*", "/api/:path*"]) {
    assert.equal(rules.find((r) => r.source === path)?.headers.find((h) => h.key === "X-Frame-Options")?.value, "DENY");
  }
});
