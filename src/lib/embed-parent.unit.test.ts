import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import vm from "node:vm";

const source = readFileSync(path.join(process.cwd(), "deployment/wordpress/zakatek-game-library.js"), "utf8");
const appOrigin = "https://biblioteka-seven.vercel.app";

function parentFrame(top = -320, scrollY = 900) {
  const callbacks = new Map<string, (event: unknown) => void>();
  const frameWindow = { postMessage() {} };
  const scrolls: { top: number; behavior: string }[] = [];
  const frame = {
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
    frame, frameWindow, scrolls,
    message(data: unknown, origin = appOrigin, sender: unknown = frameWindow) {
      callbacks.get("message")!({ data, origin, source: sender });
    },
  };
}

test("a trusted pathname-change marker reveals the iframe top without animation", () => {
  const parent = parentFrame();
  assert.equal(parent.scrolls.length, 0, "initial frame setup must not scroll");
  parent.message({ type: "zakatek-library:navigate" });
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

test("the header margin never requests a negative document scroll position", () => {
  const parent = parentFrame(20, 0);
  parent.message({ type: "zakatek-library:navigate" });
  assert.deepEqual(parent.scrolls, [{ top: 0, behavior: "instant" }]);
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
