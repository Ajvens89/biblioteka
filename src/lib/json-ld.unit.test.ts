import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { serializeJsonLd } from "./json-ld";

describe("JSON-LD script serialization", () => {
  it("prevents catalog text from terminating the JSON script while preserving its value", () => {
    const data = {
      name: "Gra </script><script>alert('title')</script>",
      description: "Zażółć gęślą jaźń <img src=x onerror=alert(1)>",
    };
    const serialized = serializeJsonLd(data);
    assert.equal(serialized.includes("<"), false);
    assert.equal(serialized.includes("</script>"), false);
    assert.deepEqual(JSON.parse(serialized), data);
  });

  it("retains nested schema values and ordinary quotes", () => {
    const data = { "@type": "Game", name: 'Gra "A&B"', publisher: { name: "<Wydawca>" } };
    assert.deepEqual(JSON.parse(serializeJsonLd(data)), data);
  });
});
