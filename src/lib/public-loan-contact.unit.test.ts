import assert from "node:assert/strict";
import test from "node:test";
import { buildBorrowContact } from "./public-loan-contact";

test("mail link safely encodes punctuation and Polish text while preserving the configured recipient", () => {
  const contact = buildBorrowContact({
    gameTitle: "Cień & kość? #2 + RPG",
    gameUrl: "https://biblioteka.example/gry/cien-i-kosc",
    email: "biblioteka@example.org",
  });
  const link = new URL(contact.mailto);
  assert.equal(link.pathname, "biblioteka@example.org");
  assert.equal(link.searchParams.get("subject"), "Wypożyczenie: Cień & kość? #2 + RPG");
  assert.match(link.searchParams.get("body")!, /Karta gry: https:\/\/biblioteka.example\/gry\/cien-i-kosc/);
  assert.match(contact.message, /^Do: biblioteka@example.org\nTemat: Wypożyczenie:/);
  assert.match(contact.message, /Proszę o potwierdzenie dostępności/);
});

test("a missing game URL does not create an undefined link in a borrowed-message fallback", () => {
  const contact = buildBorrowContact({ gameTitle: "Azul", email: "kontakt@example.org" });
  assert.doesNotMatch(contact.message, /undefined|Karta gry:/);
  assert.match(contact.message, /Proponowany termin odbioru/);
});
