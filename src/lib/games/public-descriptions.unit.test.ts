import assert from "node:assert/strict";
import test from "node:test";
import { getPublicGameDescriptions } from "./public-descriptions";

test("exact seed descriptions are omitted from public presentation without mutating the game", () => {
  const game = {
    title: "Azul",
    description: "  Azul — przykładowa gra w bibliotece Zakątka Fantastyki.\n",
    shortDescription: "Popularna gra planszowa: Azul.",
  };
  assert.deepEqual(getPublicGameDescriptions(game), { description: null, shortDescription: null });
  assert.equal(game.shortDescription, "Popularna gra planszowa: Azul.");
});

test("a seed short lead does not hide a real full description", () => {
  const description = "Carcassonne polega na układaniu kafelków i budowaniu wspólnej mapy.";
  assert.deepEqual(getPublicGameDescriptions({
    title: "Carcassonne",
    description,
    shortDescription: "Popularna gra planszowa: Carcassonne.",
  }), { description, shortDescription: null });
});

test("legitimate examples, narrative descriptions and nonmatching titles remain visible", () => {
  for (const description of [
    "Przykładowa gra pozwala wyjaśnić zasady; poniżej opisujemy pełny przebieg rozgrywki.",
    "Chińczyk to popularna gra planszowa dla rodziny.",
    "Azul — przykładowa gra w bibliotece Zakątka Fantastyki. W tej edycji opis uzupełniono o reguły.",
    "Popularna gra planszowa: Inny tytuł.",
  ]) {
    assert.equal(getPublicGameDescriptions({ title: "Azul", description }).description, description);
  }
});
