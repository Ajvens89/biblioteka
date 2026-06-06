import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { scoreTitleMatch } from "./upcitemdb-provider";

describe("upcitemdb-provider", () => {
  it("scoreTitleMatch preferuje pełne dopasowanie", () => {
    assert.ok(scoreTitleMatch("Azul", "Plan B Azul Board Game") >= 75);
    assert.ok(scoreTitleMatch("5 sekund bez cenzury", "Gra 5 Sekund Bez Cenzury Trefl") >= 50);
  });

  it("scoreTitleMatch odrzuca zupełnie obce tytuły", () => {
    assert.ok(scoreTitleMatch("Azul", "Monopoly Classic") < 35);
  });
});
