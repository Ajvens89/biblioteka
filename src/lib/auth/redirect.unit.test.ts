import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { safeRedirectPath } from "./redirect";

describe("safeRedirectPath (SEC-003)", () => {
  const fallback = "/moje-konto";

  it("akceptuje /moje-konto", () => {
    assert.equal(safeRedirectPath("/moje-konto"), "/moje-konto");
  });

  it("akceptuje /moje-rezerwacje", () => {
    assert.equal(safeRedirectPath("/moje-rezerwacje"), "/moje-rezerwacje");
  });

  it("akceptuje /katalog", () => {
    assert.equal(safeRedirectPath("/katalog"), "/katalog");
  });

  it("akceptuje wewnętrzną kartę gry z hash", () => {
    assert.equal(safeRedirectPath("/gry/catan#rezerwacja"), "/gry/catan#rezerwacja");
  });

  it("odrzuca zewnętrzny https", () => {
    assert.equal(safeRedirectPath("https://evil.example"), fallback);
  });

  it("odrzuca //evil.example", () => {
    assert.equal(safeRedirectPath("//evil.example"), fallback);
  });

  it("odrzuca /\\evil.example", () => {
    assert.equal(safeRedirectPath("/\\evil.example"), fallback);
  });

  it("odrzaca zakodowany zewnętrzny adres", () => {
    assert.equal(safeRedirectPath("%2F%2Fevil.example"), fallback);
  });

  it("odrzuca javascript:alert(1)", () => {
    assert.equal(safeRedirectPath("javascript:alert(1)"), fallback);
  });

  it("odrzuca pusty redirect", () => {
    assert.equal(safeRedirectPath(""), fallback);
    assert.equal(safeRedirectPath(null), fallback);
    assert.equal(safeRedirectPath(undefined), fallback);
  });

  it("odrzuca nieznaną ścieżkę spoza allowlist/prefiksów", () => {
    assert.equal(safeRedirectPath("/admin/secret"), fallback);
  });

  it("odrzuca ścieżkę z @ (open redirect)", () => {
    assert.equal(safeRedirectPath("/@evil.com"), fallback);
    assert.equal(safeRedirectPath("@evil.com"), fallback);
  });
});
