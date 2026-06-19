import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";

describe("markOverdueLoans / sendReturnReminders (SEC-002)", () => {
  let source: string;

  it("plik loans.ts ładuje się", async () => {
    source = await readFile(path.join(process.cwd(), "src/lib/actions/loans.ts"), "utf8");
    assert.ok(source.length > 0);
  });

  it("markOverdueLoans wymaga requireActorAdmin przed zapytaniem", async () => {
    if (!source) {
      source = await readFile(path.join(process.cwd(), "src/lib/actions/loans.ts"), "utf8");
    }
    const fnBody = source.slice(source.indexOf("export async function markOverdueLoans"));
    const adminCheck = fnBody.indexOf("requireActorAdmin");
    const firstJob = fnBody.indexOf("markOverdueLoansJob");
    assert.ok(adminCheck >= 0);
    assert.ok(adminCheck < firstJob, "auth przed wywołaniem job");
  });

  it("sendReturnReminders wymaga requireActorAdmin przed zapytaniem", async () => {
    if (!source) {
      source = await readFile(path.join(process.cwd(), "src/lib/actions/loans.ts"), "utf8");
    }
    const fnBody = source.slice(source.indexOf("export async function sendReturnReminders"));
    const adminCheck = fnBody.indexOf("requireActorAdmin");
    const firstJob = fnBody.indexOf("sendReturnRemindersJob");
    assert.ok(adminCheck >= 0);
    assert.ok(adminCheck < firstJob, "auth przed wywołaniem job");
  });
});
