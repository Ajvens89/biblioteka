import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { hasMinRole } from "./guards";
import { isAdmin, isStaff } from "./session";

describe("hasMinRole", () => {
  it("USER nie ma roli LIBRARIAN", () => {
    assert.equal(hasMinRole("USER", "LIBRARIAN"), false);
  });

  it("LIBRARIAN ma rolę LIBRARIAN", () => {
    assert.equal(hasMinRole("LIBRARIAN", "LIBRARIAN"), true);
  });

  it("ADMIN ma rolę LIBRARIAN", () => {
    assert.equal(hasMinRole("ADMIN", "LIBRARIAN"), true);
  });

  it("GUEST nie ma roli USER", () => {
    assert.equal(hasMinRole("GUEST", "USER"), false);
  });
});

describe("isStaff / isAdmin", () => {
  it("USER nie jest staff ani admin", () => {
    assert.equal(isStaff("USER"), false);
    assert.equal(isAdmin("USER"), false);
  });

  it("LIBRARIAN jest staff, nie admin", () => {
    assert.equal(isStaff("LIBRARIAN"), true);
    assert.equal(isAdmin("LIBRARIAN"), false);
  });

  it("ADMIN jest staff i admin", () => {
    assert.equal(isStaff("ADMIN"), true);
    assert.equal(isAdmin("ADMIN"), true);
  });
});
