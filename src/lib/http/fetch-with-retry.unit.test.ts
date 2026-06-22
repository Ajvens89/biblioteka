import { describe, it, mock } from "node:test";
import assert from "node:assert/strict";
import { fetchWithRetry } from "./fetch-with-retry";

describe("fetchWithRetry", () => {
  it("zwraca odpowiedź przy sukcesie", async () => {
    const original = global.fetch;
    const fetchMock = mock.fn(async () => new Response("ok", { status: 200 }));
    global.fetch = fetchMock as unknown as typeof fetch;
    try {
      const res = await fetchWithRetry("/test");
      assert.equal(res.status, 200);
      assert.equal(fetchMock.mock.calls.length, 1);
    } finally {
      global.fetch = original;
    }
  });

  it("ponawia przy 503", async () => {
    const original = global.fetch;
    let calls = 0;
    const fetchMock = mock.fn(async () => {
      calls++;
      if (calls === 1) return new Response("", { status: 503 });
      return new Response("ok", { status: 200 });
    });
    global.fetch = fetchMock as unknown as typeof fetch;
    try {
      const res = await fetchWithRetry("/test", { retryDelayMs: 1 });
      assert.equal(res.status, 200);
      assert.equal(calls, 2);
    } finally {
      global.fetch = original;
    }
  });
});
