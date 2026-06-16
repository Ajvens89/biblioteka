import { test, expect } from "@playwright/test";
import {
  E2E_ADMIN_COPY_INVENTORY,
  E2E_ADMIN_GAME_TITLE,
  E2E_EAN_RPG_CODE,
  E2E_EAN_RPG_TITLE,
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
import { cleanupE2eAdminGame, cleanupE2eEanRpgGame } from "./db-cleanup";

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
    await page.getByTestId("wizard-step-1").click();
    await page.getByRole("button", { name: "Dodaj ręcznie" }).click();
    await page.getByRole("button", { name: "Dalej" }).click();
    await page.getByTestId("wizard-step-3").click();

    await page.getByTestId("game-form-title").fill(E2E_ADMIN_GAME_TITLE);
    await page.getByTestId("game-form-description").fill("Gra utworzona w teście E2E Playwright.");
    await page.getByTestId("wizard-step-6").click();
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

  test("scenariusz 5: admin dodaje grę przez EAN z okładką i wyszukuje w katalogu", async ({ page }) => {
    const E2E_COVER_URL = "https://placehold.co/200x280?text=E2E+Cover";
    await cleanupE2eEanRpgGame();
    await loginAsAdmin(page);
    await page.goto("/admin/gry/nowa?mode=ean");
    await page.getByTestId("wizard-step-2").click();
    await page.getByTestId("ean-input").fill(E2E_EAN_RPG_CODE);
    await page.getByTestId("ean-lookup-button").click();
    await page.getByTestId("collection-type-select").selectOption("RPG");

    const candidateCard = page.getByTestId("cover-candidate-card").first();
    if (await candidateCard.isVisible({ timeout: 5000 }).catch(() => false)) {
      await candidateCard.getByRole("button", { name: "Użyj tej okładki" }).click();
    } else {
      await page.getByTestId("custom-cover-url").fill(E2E_COVER_URL);
    }

    await page.getByTestId("wizard-step-3").click();
    await page.getByTestId("game-form-title").fill(E2E_EAN_RPG_TITLE);
    await page.getByTestId("game-form-description").fill("Test E2E — gra fabularna dodana po kodzie EAN.");
    await page.getByTestId("wizard-step-6").click();
    await page.getByTestId("game-form-submit").click();
    await expect(page).toHaveURL(/\/admin\/gry$/);
    await expectToast(page, "Utworzono grę");

    await page.goto(`/katalog?ean=${E2E_EAN_RPG_CODE}`);
    const card = page.locator('[data-testid="game-card"]').filter({ hasText: E2E_EAN_RPG_TITLE });
    await expect(card).toBeVisible({ timeout: 15_000 });
    await expect(page.getByTestId("game-type-badge").first()).toContainText("Gry fabularne");
    await expect(card.locator("img").first()).toBeVisible();
  });

  test("katalog: ładuje karty gier", async ({ page }) => {
    await page.goto("/katalog");
    await expect(page.getByRole("heading", { name: "Katalog gier" })).toBeVisible();
    await expect(page.getByTestId("game-card").first()).toBeVisible({ timeout: 15_000 });
  });

  test("katalog: filtr RPG działa", async ({ page }) => {
    await page.goto("/katalog");
    await page.getByTestId("collection-type-tab-rpg").click();
    await expect(page).toHaveURL(/collectionType=RPG/);
    const badges = page.getByTestId("game-type-badge");
    const count = await badges.count();
    if (count > 0) {
      await expect(badges.first()).toContainText(/fabularne/i);
    }
  });

  test("katalog: wyszukiwanie po EAN działa", async ({ page }) => {
    await page.goto(`/katalog?ean=${E2E_EAN_RPG_CODE}`);
    const card = page.locator('[data-testid="game-card"]').filter({ hasText: E2E_EAN_RPG_TITLE });
    await expect(card).toBeVisible({ timeout: 15_000 });
  });

  test("katalog: autocomplete sugestii po tytule", async ({ page }) => {
    await page.goto("/katalog");
    const input = page.getByTestId("catalog-search-input");
    await input.fill("E2E");
    await expect(page.getByTestId("game-search-suggestions")).toBeVisible({ timeout: 10_000 });
    await expect(page.getByTestId("game-search-suggestions").getByRole("option").first()).toBeVisible();
  });

  test("katalog: filtry gatunkowe zmieniają URL", async ({ page }) => {
    await page.goto("/katalog");
    await expect(page.getByTestId("catalog-genre-filters")).toBeVisible();
    await page.getByTestId("catalog-genre-filters").getByRole("button", { name: "Strategiczne" }).click();
    await expect(page).toHaveURL(/category=strategia/);
  });

  test("katalog: filtry trudności zmieniają URL", async ({ page }) => {
    await page.goto("/katalog");
    await expect(page.getByTestId("catalog-difficulty-filters")).toBeVisible();
    await page.getByTestId("catalog-difficulty-filters").getByRole("button", { name: "Łatwa" }).click();
    await expect(page).toHaveURL(/difficulty=EASY/);
  });

  test("katalog: puste wyniki pokazują empty state", async ({ page }) => {
    await page.goto("/katalog?q=xyzxyzxyz-brak-wynikow-e2e");
    await expect(page.getByTestId("catalog-empty")).toBeVisible({ timeout: 10_000 });
    await expect(page.getByTestId("catalog-empty")).toContainText(/Nie znaleziono/i);
  });

  test("header: wyszukiwarka przekierowuje do katalogu", async ({ page }) => {
    await page.goto("/");
    const input = page.getByTestId("header-search-input");
    await expect(input).toBeVisible();
    await input.fill("E2E");
    await input.press("Enter");
    await expect(page).toHaveURL(/\/katalog\?q=/);
  });

  test("szczegóły gry: pokazuje EAN i typ zbioru", async ({ page }) => {
    await page.goto(`/gry/${E2E_FLOW_GAME_SLUG}`);
    await expect(page.getByTestId("game-collection-type")).toBeVisible();
    await expect(page.getByTestId("game-collection-type")).toContainText(/planszowe|fabularne/i);
  });

  test("mobile: katalog bez poziomego scrolla (390px)", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/katalog");
    await expect(page.getByRole("heading", { name: "Katalog gier" })).toBeVisible();
    await expect(page.getByTestId("catalog-toolbar")).toBeVisible();
    const overflow = await page.evaluate(() => {
      const doc = document.documentElement;
      return doc.scrollWidth > doc.clientWidth + 2;
    });
    expect(overflow).toBe(false);
  });

  test("admin: dashboard pokazuje szybkie akcje", async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto("/admin");
    await expect(page.getByTestId("admin-quick-actions")).toBeVisible();
    await expect(page.getByTestId("admin-quick-add-game")).toBeVisible();
    await expect(page.getByTestId("admin-quick-import")).toBeVisible();
  });

  test("admin: filtruje gry po Brak EAN", async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto("/admin/gry");
    await page.getByTestId("admin-filter-no-ean").click();
    await expect(page).toHaveURL(/missingEan=1/);
  });

  test("admin: filtruje gry po RPG", async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto("/admin/gry");
    await page.getByTestId("collection-type-filter").selectOption("RPG");
    await expect(page).toHaveURL(/collectionType=RPG/);
  });

  test("admin: otwiera kreator dodawania gry", async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto("/admin/gry/nowa");
    await expect(page.getByTestId("game-wizard")).toBeVisible();
    await expect(page.getByTestId("wizard-step-1")).toBeVisible();
  });

  test("admin: formularz — EAN w kroku 2 kreatora", async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto("/admin/gry/nowa?mode=ean");
    await page.getByTestId("wizard-step-2").click();
    await expect(page.getByTestId("ean-input")).toBeVisible();
    await expect(page.getByTestId("collection-type-select")).toBeVisible();
  });

  test("admin: dodaje egzemplarz do istniejącej gry (EAN)", async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto("/admin/gry/nowa?mode=ean");
    await page.getByTestId("wizard-step-2").click();
    await page.getByTestId("ean-input").fill(E2E_EAN_RPG_CODE);
    await page.getByTestId("ean-lookup-button").click();
    await expect(page.getByTestId("ean-add-copy-button")).toBeVisible({ timeout: 15_000 });
    await page.getByTestId("ean-add-copy-button").click();
    await expect(page).toHaveURL(/\/admin\/egzemplarze\?gameId=/);
  });

  test("zwykły user nie ma dostępu do /admin/import", async ({ page }) => {
    await loginAsUser(page);
    await page.goto("/admin/import");
    await expect(page).toHaveURL(/\?error=brak-uprawnien|\/$/);
    await expect(page.getByTestId("admin-import-page")).not.toBeVisible();
  });

  test("scenariusz 6: ponowny EAN nie tworzy duplikatu gry", async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto("/admin/gry/nowa?mode=ean");
    await page.getByTestId("wizard-step-2").click();

    await page.getByTestId("ean-input").fill(E2E_EAN_RPG_CODE);
    await page.getByTestId("ean-lookup-button").click();

    await expect(page.getByText(/Ta gra już jest w bibliotece/i)).toBeVisible({ timeout: 15_000 });
    await expect(page.getByTestId("ean-add-copy-button")).toBeVisible();
    await expect(page.getByTestId("game-form-submit")).toBeDisabled();
  });
});
