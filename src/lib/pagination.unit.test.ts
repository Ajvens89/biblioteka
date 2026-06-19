import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  buildPageQueryString,
  dbSkipTake,
  paginate,
  parsePageParams,
  totalPagesFromCount,
} from "./pagination";

describe("parsePageParams", () => {
  it("domyślnie page=1 i pageSize=25", () => {
    const p = parsePageParams({});
    assert.equal(p.page, 1);
    assert.equal(p.pageSize, 25);
  });

  it("parsuje page z query", () => {
    const p = parsePageParams({ page: "3", pageSize: "10" });
    assert.equal(p.page, 3);
    assert.equal(p.pageSize, 10);
  });
});

describe("paginate", () => {
  it("dzieli tablicę na strony", () => {
    const items = ["a", "b", "c", "d", "e"];
    const r = paginate(items, 2, 2);
    assert.deepEqual(r.items, ["c", "d"]);
    assert.equal(r.total, 5);
    assert.equal(r.totalPages, 3);
  });
});

describe("dbSkipTake", () => {
  it("liczy skip/take", () => {
    assert.deepEqual(dbSkipTake(2, 25), { skip: 25, take: 25 });
  });
});

describe("totalPagesFromCount", () => {
  it("minimum 1 strona", () => {
    assert.equal(totalPagesFromCount(0, 25), 1);
    assert.equal(totalPagesFromCount(26, 25), 2);
  });
});

describe("buildPageQueryString", () => {
  it("zachowuje filtry i ustawia page", () => {
    const qs = buildPageQueryString({ q: "test", status: "PENDING", page: "1" }, 2);
    assert.equal(qs, "q=test&status=PENDING&page=2");
  });
});
