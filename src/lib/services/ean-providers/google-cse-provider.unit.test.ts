import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { buildGoogleCseCoverQuery, isGoogleCseConfigured } from "./google-cse-provider";

describe("google-cse-provider", () => {
  it("buildGoogleCseCoverQuery zawiera tytuł i EAN", () => {
    const q = buildGoogleCseCoverQuery("5 sekund bez cenzury", "5900511015591");
    assert.match(q, /5 sekund bez cenzury/);
    assert.match(q, /5900511015591/);
    assert.match(q, /gra planszowa/i);
  });

  it("isGoogleCseConfigured wymaga obu zmiennych", () => {
    const prevKey = process.env.GOOGLE_CSE_API_KEY;
    const prevCx = process.env.GOOGLE_CSE_CX;
    process.env.GOOGLE_CSE_API_KEY = "k";
    delete process.env.GOOGLE_CSE_CX;
    assert.equal(isGoogleCseConfigured(), false);
    process.env.GOOGLE_CSE_CX = "cx";
    assert.equal(isGoogleCseConfigured(), true);
    if (prevKey === undefined) delete process.env.GOOGLE_CSE_API_KEY;
    else process.env.GOOGLE_CSE_API_KEY = prevKey;
    if (prevCx === undefined) delete process.env.GOOGLE_CSE_CX;
    else process.env.GOOGLE_CSE_CX = prevCx;
  });
});
