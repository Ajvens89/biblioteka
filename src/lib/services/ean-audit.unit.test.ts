import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { formatEanAuditText } from "./ean-audit";

describe("ean-audit", () => {
  it("format zawiera komunikat o braku zmian w bazie", () => {
    const text = formatEanAuditText({
      ok: true,
      warnings: [],
      stats: {
        gamesWithEan: 1,
        gamesWithoutEan: 0,
        boardGame: 1,
        rpg: 0,
        importedCopies: 0,
        duplicateActiveEan: 0,
        softDeletedEanConflicts: 0,
        similarTitlePairs: 0,
        eanAsCopyBarcode: 0,
        invalidEanGames: 0,
      },
    });
    assert.match(text, /EAN AUDIT OK/);
    assert.match(text, /Nic nie zostało zmienione w bazie/);
  });
});
