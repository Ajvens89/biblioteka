import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { profileSchema } from "./auth";

describe("profileSchema emailNotificationsEnabled", () => {
  it("parsuje zaznaczony checkbox", () => {
    const parsed = profileSchema.safeParse({
      fullName: "Jan Kowalski",
      emailNotificationsEnabled: "on",
    });
    assert.equal(parsed.success, true);
    if (parsed.success) {
      assert.equal(parsed.data.emailNotificationsEnabled, true);
    }
  });

  it("brak pola = false (wyłączone przy zapisie formularza)", () => {
    const parsed = profileSchema.safeParse({ fullName: "Jan" });
    assert.equal(parsed.success, true);
    if (parsed.success) {
      assert.equal(parsed.data.emailNotificationsEnabled, false);
    }
  });
});
