import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";

const ADMIN_PAGES = [
  "src/app/admin/page.tsx",
  "src/app/admin/rezerwacje/page.tsx",
  "src/app/admin/wypozyczenia/page.tsx",
  "src/app/admin/statystyki/page.tsx",
  "src/app/admin/egzemplarze/page.tsx",
  "src/app/admin/gry/page.tsx",
  "src/app/admin/gry/nowa/page.tsx",
  "src/app/admin/gry/[id]/page.tsx",
  "src/app/admin/uzytkownicy/page.tsx",
  "src/app/admin/import/page.tsx",
  "src/app/admin/ustawienia/page.tsx",
  "src/app/admin/logi/page.tsx",
];

describe("Admin access control (odczyt /admin)", () => {
  it("layout wymaga requireStaffFromDb dla wszystkich stron /admin", async () => {
    const layout = await readFile(
      path.join(process.cwd(), "src/app/admin/layout.tsx"),
      "utf8",
    );
    assert.match(layout, /requireStaffFromDb\(\)/);
  });

  it("strony ADMIN-only mają requireAdmin()", async () => {
    const adminOnly = [
      "src/app/admin/gry/page.tsx",
      "src/app/admin/uzytkownicy/page.tsx",
      "src/app/admin/import/page.tsx",
      "src/app/admin/logi/page.tsx",
      "src/app/admin/ustawienia/page.tsx",
    ];
    for (const file of adminOnly) {
      const src = await readFile(path.join(process.cwd(), file), "utf8");
      assert.match(src, /requireAdmin\(\)/, `${file} brak requireAdmin()`);
    }
  });

  it("strony staff bez własnego guarda są pod layoutem staff", async () => {
    const staffViaLayout = [
      "src/app/admin/page.tsx",
      "src/app/admin/rezerwacje/page.tsx",
      "src/app/admin/wypozyczenia/page.tsx",
      "src/app/admin/statystyki/page.tsx",
    ];
    for (const file of staffViaLayout) {
      const src = await readFile(path.join(process.cwd(), file), "utf8");
      assert.doesNotMatch(src, /requireAdmin\(\)/);
      assert.doesNotMatch(src, /requireStaff\(\)/);
    }
    assert.equal(staffViaLayout.length, 4);
  });

  it("API export wymaga roli ADMIN", async () => {
    for (const file of [
      "src/app/api/admin/games/export/route.ts",
      "src/app/api/admin/games/export-json/route.ts",
    ]) {
      const src = await readFile(path.join(process.cwd(), file), "utf8");
      assert.match(src, /role !== "ADMIN"|user\.role !== "ADMIN"/);
    }
  });

  it("requireStaffFromDb redirectuje USER (guards.ts)", async () => {
    const guards = await readFile(
      path.join(process.cwd(), "src/lib/auth/guards.ts"),
      "utf8",
    );
    assert.match(guards, /requireStaff[\s\S]*isStaff\(user\.role\)/);
    assert.match(guards, /brak-uprawnien/);
  });

  it("isBlocked blokuje logowanie (local-auth)", async () => {
    const auth = await readFile(
      path.join(process.cwd(), "src/lib/auth/local-auth.ts"),
      "utf8",
    );
    assert.match(auth, /isBlocked/);
    assert.match(auth, /Konto jest zablokowane/);
  });
});

describe("Admin pages inventory", () => {
  it("wszystkie strony admin istnieją w audycie", async () => {
    for (const file of ADMIN_PAGES) {
      const src = await readFile(path.join(process.cwd(), file), "utf8");
      assert.ok(src.length > 0, file);
    }
  });
});
