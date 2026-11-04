import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { PrismaClient } from "@prisma/client";
import { resolveGamePublisher } from "./games";

describe("owner-entered publisher", () => {
  it("keeps an explicitly selected publisher and does not create unnecessary records", async () => {
    const db = new Proxy({}, { get: () => { throw new Error("No DB read required"); } }) as PrismaClient;
    assert.equal(await resolveGamePublisher(db, { publisherId: "selected-id", publisherName: "ignored" }), "selected-id");
    assert.equal(await resolveGamePublisher(db, { publisherName: "  " }), null);
  });

  it("reuses an existing name case-insensitively and normalizes repeated whitespace", async () => {
    let searched = "";
    const db = { publisher: {
      findFirst: async ({ where }: { where: { name: { equals: string; mode: string } } }) => {
        searched = where.name.equals;
        assert.equal(where.name.mode, "insensitive");
        return { id: "existing-publisher" };
      },
    } } as unknown as PrismaClient;
    assert.equal(await resolveGamePublisher(db, { publisherName: "  Rebel   Studio  " }), "existing-publisher");
    assert.equal(searched, "Rebel Studio");
  });

  it("creates the publisher with a unique slug when a normalized slug is already taken", async () => {
    const slugs: string[] = [];
    const db = { publisher: {
      findFirst: async () => null,
      findUnique: async ({ where }: { where: { slug: string } }) => where.slug === "swiat-gier" ? { id: "clash" } : null,
      create: async ({ data }: { data: { name: string; slug: string } }) => {
        assert.equal(data.name, "Świat Gier"); slugs.push(data.slug); return { id: "new-publisher" };
      },
    } } as unknown as PrismaClient;
    assert.equal(await resolveGamePublisher(db, { publisherName: "Świat Gier" }), "new-publisher");
    assert.deepEqual(slugs, ["swiat-gier-2"]);
  });

  it("rejects oversized names before any database operation", async () => {
    const db = new Proxy({}, { get: () => { throw new Error("No DB access permitted"); } }) as PrismaClient;
    await assert.rejects(resolveGamePublisher(db, { publisherName: "x".repeat(201) }), /200/);
  });
});
