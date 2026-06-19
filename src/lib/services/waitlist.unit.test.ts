import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { ServiceError } from "./errors";

describe("waitlist join guards", () => {
  it("ServiceError AVAILABLE gdy gra ma wolne egzemplarze", () => {
    const err = new ServiceError("Gra jest dostępna — zarezerwuj ją zamiast kolejki.", "AVAILABLE");
    assert.equal(err.code, "AVAILABLE");
    assert.match(err.message, /dostępna/i);
  });

  it("ServiceError DUPLICATE dla istniejącej prośby o przedłużenie", () => {
    const err = new ServiceError("Masz już oczekującą prośbę o przedłużenie.", "DUPLICATE");
    assert.equal(err.code, "DUPLICATE");
  });
});
