import { test, expect } from "@playwright/test";
import {
  E2E_ADMIN_COPY_INVENTORY,
  E2E_ADMIN_GAME_TITLE,
  E2E_FLOW_GAME_SLUG,
  E2E_FLOW_GAME_TITLE,
  STATUS_PENDING_LABEL,
  STATUS_RETURNED_LABEL,
  TOAST_SUCCESS_RESERVATION,
} from "./constants";
import {
  adminActiveLoanRow,
  adminReservationRow,
  expectToast,
  loginAsAdmin,
  loginAsLibrarian,
  loginAsUser,
} from "./helpers";
import { cleanupE2eAdminGame } from "./db-cleanup";

test.describe.configure({ mode: "serial" });

test.describe("Biblioteka — E2E", () => {
  test("scenariusz 1: użytkownik rezerwuje grę z katalogu", async ({ page }) => {
    await page.goto("/login");
    await expect(page.getByTestId("login-page")).toBeVisible();

    await loginAsUser(page);
    await expect(page).toHaveURL(/\/moje-rezerwacje/);

    await page.goto("/katalog");
    await expect(page.getByRole("heading", { name: "Katalog gier" })).toBeVisible();
    await expect(
      page.locator('[data-testid="game-card"]').filter({ hasText: E2E_FLOW_GAME_TITLE }),
    ).toBeVisible();

    await page.goto(`/gry/${E2E_FLOW_GAME_SLUG}`);
    await expect(page.getByRole("heading", { name: E2E_FLOW_GAME_TITLE })).toBeVisible();

    await expect(page.getByTestId("reserve-button")).toBeVisible();
    await page.getByTestId("reserve-button").click();
    await expectToast(page, TOAST_SUCCESS_RESERVATION);

    await page.goto("/moje-rezerwacje");
    const item = page
      .locator('[data-testid="reservation-item"]')
      .filter({ hasText: E2E_FLOW_GAME_TITLE })
      .first();
    await expect(item).toBeVisible();
    await expect(item).toContainText(STATUS_PENDING_LABEL);
    await expect(item).toHaveAttribute("data-status", "PENDING");
  });

  test("scenariusz 2: zwykły user nie wchodzi do panelu admin", async ({ page }) => {
    await loginAsUser(page);
    await page.goto("/admin");
    await expect(page).toHaveURL(/\?error=brak-uprawnien|\/$/);
    await expect(page.getByRole("heading", { name: "Dashboard" })).not.toBeVisible();
  });

  test("scenariusz 3: bibliotekarz obsługuje rezerwację do zwrotu", async ({ page }) => {
    await loginAsLibrarian(page);
    await page.goto("/admin/rezerwacje");
    await expect(page.getByRole("heading", { name: "Rezerwacje" })).toBeVisible();

    const flowRow = adminReservationRow(page, E2E_FLOW_GAME_TITLE).first();
    await expect(flowRow).toBeVisible({ timeout: 15_000 });
    await expect(flowRow).toContainText(STATUS_PENDING_LABEL);

    await flowRow.getByTestId("approve-reservation").click();
    await expectToast(page, "Zaktualizowano");
    await expect(flowRow).toContainText("Zatwierdzona");

    await flowRow.getByTestId("mark-ready-reservation").click();
    await expectToast(page, "Zaktualizowano");
    await expect(flowRow).toContainText("Gotowa do odbioru");

    await flowRow.getByTestId("issue-loan").click();
    await expectToast(page, "Zaktualizowano");
    await expect(flowRow).toContainText("Wypożyczona");

    await page.goto("/admin/wypozyczenia");
    await page.waitForLoadState("networkidle");
    const loanRow = adminActiveLoanRow(page, E2E_FLOW_GAME_TITLE).first();
    await expect(loanRow).toBeVisible({ timeout: 15_000 });
    await loanRow.getByTestId("return-loan").click();
    await expectToast(page, "Zwrot przyjęty");

    await expect(
      page
        .locator('[data-testid="admin-loan-row"]')
        .filter({ hasText: E2E_FLOW_GAME_TITLE })
        .filter({ hasText: STATUS_RETURNED_LABEL })
        .first(),
    ).toBeVisible();
  });

  test("scenariusz 4: admin dodaje grę i egzemplarz w katalogu", async ({ page }) => {
    await cleanupE2eAdminGame();
    await loginAsAdmin(page);
    await page.goto("/admin/gry");
    await page.getByTestId("admin-new-game-link").click();

    await page.getByTestId("game-form-title").fill(E2E_ADMIN_GAME_TITLE);
    await page.getByTestId("game-form-description").fill("Gra utworzona w teście E2E Playwright.");
    await page.getByTestId("game-form-submit").click();
    await expect(page).toHaveURL(/\/admin\/gry$/);
    await expectToast(page, "Utworzono grę");

    await page.goto("/admin/egzemplarze");
    const gameSelect = page.getByTestId("copy-form-game");
    await gameSelect.selectOption({ label: E2E_ADMIN_GAME_TITLE });
    await page.getByTestId("copy-form-inventory").fill(E2E_ADMIN_COPY_INVENTORY);
    await page.getByTestId("copy-form-submit").click();
    await expectToast(page, "Zapisano egzemplarz");

    await page.goto("/katalog");
    await expect(page.locator('[data-testid="game-card"]').filter({ hasText: E2E_ADMIN_GAME_TITLE })).toBeVisible({
      timeout: 15_000,
    });
  });
});
