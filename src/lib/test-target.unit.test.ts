import assert from "node:assert/strict";
import test from "node:test";
import { skipE2eDatabaseChanges } from "../../e2e/test-target";

test("remote and explicitly read-only E2E runs skip both setup and destructive cleanup", () => {
  for (const base of ["https://biblioteka-seven.vercel.app", "https://localhost.example.com", "not a URL"]) {
    assert.equal(skipE2eDatabaseChanges({PLAYWRIGHT_BASE_URL: base}), true);
  }
  assert.equal(skipE2eDatabaseChanges({PLAYWRIGHT_SKIP_DB_SETUP: "1"}), true);
  assert.equal(skipE2eDatabaseChanges({PLAYWRIGHT_SKIP_DB_SETUP: "1", PLAYWRIGHT_BASE_URL: "http://localhost:3104"}), true);
});

test("the existing local fixture workflow still runs", () => {
  for (const base of ["http://localhost:3104", "http://127.0.0.1:3104", "http://[::1]:3104"]) {
    assert.equal(skipE2eDatabaseChanges({PLAYWRIGHT_BASE_URL: base}), false);
  }
  assert.equal(skipE2eDatabaseChanges({}), false);
});
