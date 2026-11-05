import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import vm from "node:vm";

const source = readFileSync(path.join(process.cwd(), "deployment/wordpress/zakatek-game-library.js"), "utf8");
const appOrigin = "https://biblioteka-seven.vercel.app";

function parentFrame(top = -320, scrollY = 900) {
  const callbacks = new Map<string, (event: unknown) => void>();
  const messages: { data: Record<string, unknown>; targetOrigin: string }[] = [];
  const frameWindow = {
    postMessage(data: Record<string, unknown>, targetOrigin: string) {
      messages.push({ data: { ...data }, targetOrigin });
    },
  };
  const scrolls: { top: number; behavior: string }[] = [];
  const frame = {
    dataset: {} as Record<string, string>,
    style: { height: "1200px" }, contentWindow: frameWindow as typeof frameWindow | null,
    getBoundingClientRect: () => ({ top, bottom: top + 1200 }),
    addEventListener() {},
  };
  let nextId = 0;
  const scheduled = new Map<number, () => void>();
  vm.runInNewContext(source, {
    document: { getElementById: () => frame },
    window: {
      scrollY, innerHeight: 800,
      addEventListener: (name: string, callback: (event: unknown) => void) => callbacks.set(name, callback),
      scrollTo: (options: { top: number; behavior: string }) => scrolls.push({ ...options }),
    },
    requestAnimationFrame: (callback: () => void) => { scheduled.set(++nextId, callback); return nextId; },
    cancelAnimationFrame: (id: number) => scheduled.delete(id),
  });
  return {
    frame, frameWindow, scrolls, messages,
    setTop(value: number) { top = value; },
    flush() {
      const work = [...scheduled.values()];
      scheduled.clear();
      work.forEach((callback) => callback());
    },
    message(data: unknown, origin = appOrigin, sender: unknown = frameWindow) {
      callbacks.get("message")!({ data, origin, source: sender });
    },
  };
}

test("a trusted pathname-change marker reveals the iframe top without animation", () => {
  const parent = parentFrame();
  assert.equal(parent.scrolls.length, 0, "initial frame setup must not scroll");
  parent.message({ type: "zakatek-library:navigate" });
  parent.flush();
  assert.deepEqual(parent.scrolls, [], "wait for browser layout before scrolling");
  parent.flush();
  assert.deepEqual(parent.scrolls, [{ top: 468, behavior: "instant" }]);
  assert.equal(parent.frame.style.height, "1200px", "navigation does not change the resize contract");
});

test("navigation messages require the exact application origin and the actual iframe source", () => {
  const parent = parentFrame();
  parent.message({ type: "zakatek-library:navigate" }, appOrigin + ".example.com");
  parent.message({ type: "zakatek-library:navigate" }, "https://example.com");
  parent.message({ type: "zakatek-library:navigate" }, appOrigin, {});
  parent.message({ type: "unknown" });
  parent.message(null);
  assert.deepEqual(parent.scrolls, []);
  parent.frame.contentWindow = null;
  parent.message({ type: "zakatek-library:navigate" }, appOrigin, null);
  assert.deepEqual(parent.scrolls, []);
});

test("initial ready does not scroll, but ready after a full iframe reload reveals the detail page", () => {
  const parent = parentFrame();
  parent.message({ type: "zakatek-library:ready" });
  assert.deepEqual(parent.scrolls, []);
  parent.message({ type: "zakatek-library:ready" });
  parent.flush(); parent.flush();
  assert.deepEqual(parent.scrolls, [{ top: 468, behavior: "instant" }]);
});

test("untrusted ready messages cannot scroll or prime the ready state", () => {
  const parent = parentFrame();
  parent.message({ type: "zakatek-library:ready" }, "https://example.com");
  parent.message({ type: "zakatek-library:ready" }, appOrigin, {});
  parent.message({ type: "zakatek-library:ready" });
  assert.deepEqual(parent.scrolls, [], "spoofed ready must not count as the initial ready");
  parent.message({ type: "zakatek-library:ready" }, "https://example.com");
  parent.message({ type: "zakatek-library:ready" }, appOrigin, {});
  assert.deepEqual(parent.scrolls, []);
  parent.message({ type: "zakatek-library:ready" });
  parent.flush(); parent.flush();
  assert.deepEqual(parent.scrolls, [{ top: 468, behavior: "instant" }]);
});

test("a viewport handshake answers only the trusted iframe and never primes navigation scrolling", () => {
  const parent = parentFrame();
  parent.flush();
  assert.equal(parent.messages.length, 1);
  parent.message({ type: "zakatek-library:request-viewport" }, "https://example.com");
  parent.message({ type: "zakatek-library:request-viewport" }, appOrigin, {});
  parent.flush();
  assert.equal(parent.messages.length, 1);
  parent.message({ type: "zakatek-library:request-viewport" });
  parent.flush();
  assert.equal(parent.messages.length, 2);
  assert.deepEqual(parent.messages[1], {
    data: { type: "zakatek-library:viewport", top: 320, height: 800 }, targetOrigin: appOrigin,
  });
  assert.deepEqual(parent.scrolls, []);
  parent.message({ type: "zakatek-library:ready" });
  assert.deepEqual(parent.scrolls, [], "a viewport request is not an initial-ready event");
});

test("the header margin never requests a negative document scroll position", () => {
  const parent = parentFrame(20, 0);
  parent.message({ type: "zakatek-library:navigate" });
  parent.flush(); parent.flush();
  assert.deepEqual(parent.scrolls, [{ top: 0, behavior: "instant" }]);
});

test("navigation waits for a late resize and uses the resulting layout", () => {
  const parent = parentFrame();
  parent.message({ type: "zakatek-library:navigate" });
  parent.flush();
  assert.equal(parent.frame.dataset.libraryNavigation, "pending");
  parent.setTop(-80);
  parent.message({ type: "zakatek-library:resize", height: 2100 });
  parent.flush();
  assert.deepEqual(parent.scrolls, []);
  parent.flush();
  assert.deepEqual(parent.scrolls, [{ top: 708, behavior: "instant" }]);
  assert.equal(parent.frame.dataset.libraryNavigation, "settled");
  assert.equal(parent.frame.dataset.libraryScrollTarget, "708");
});

test("a received layout establishes readiness when the early ready message was missed", () => {
  const parent = parentFrame();
  parent.message({ type: "zakatek-library:resize", height: 1900 });
  parent.flush(); parent.flush();
  assert.deepEqual(parent.scrolls, [], "the initial layout must not scroll");
  parent.message({ type: "zakatek-library:ready" });
  parent.flush(); parent.flush();
  assert.deepEqual(parent.scrolls, [{ top: 468, behavior: "instant" }]);
});

test("a streamed loading view cannot finalize navigation before the actual page arrives", () => {
  const parent = parentFrame();
  parent.message({ type: "zakatek-library:navigate" });
  parent.message({ type: "zakatek-library:resize", height: 700, contentReady: false });
  parent.flush(); parent.flush();
  assert.equal(parent.frame.dataset.libraryNavigation, "pending");
  parent.setTop(-80);
  parent.message({ type: "zakatek-library:resize", height: 2800, contentReady: true });
  parent.flush(); parent.flush();
  assert.equal(parent.frame.dataset.libraryNavigation, "settled");
  assert.equal(parent.frame.dataset.libraryScrollTarget, "708");
  assert.deepEqual(parent.scrolls.at(-1), { top: 708, behavior: "instant" });
});

test("resize keeps working and invalid resize messages neither resize nor navigate", () => {
  const parent = parentFrame();
  parent.message({ type: "zakatek-library:resize", height: 1800 });
  assert.equal(parent.frame.style.height, "1802px");
  assert.deepEqual(parent.scrolls, []);
  for (const height of [NaN, Infinity, -1, 99, 100.5, 40001, "1800"]) {
    parent.message({ type: "zakatek-library:resize", height });
  }
  parent.message({ type: "zakatek-library:resize", height: 2000 }, "https://example.com");
  parent.message({ type: "zakatek-library:resize", height: 2000 }, appOrigin, {});
  assert.equal(parent.frame.style.height, "1802px");
  assert.deepEqual(parent.scrolls, []);
});
