import { expect, type Page } from "@playwright/test";
import { CREDENTIALS } from "./constants";

export async function login(page: Page, email: string, password: string) {
  await page.goto("/login");
  await page.getByTestId("login-email").fill(email);
  await page.getByTestId("login-password").fill(password);
  await page.getByTestId("login-submit").click();
  await page.waitForURL(/\/(moje-rezerwacje|moje-konto|katalog)(\?|$)/, { timeout: 15_000 });
}

export async function loginAsUser(page: Page) {
  await login(page, CREDENTIALS.user.email, CREDENTIALS.user.password);
}

export async function loginAsLibrarian(page: Page) {
  await login(page, CREDENTIALS.librarian.email, CREDENTIALS.librarian.password);
}

export async function loginAsAdmin(page: Page) {
  await login(page, CREDENTIALS.admin.email, CREDENTIALS.admin.password);
}

export async function logout(page: Page) {
  await page.getByTestId("logout-button").click();
  await page.waitForURL((url) => !url.pathname.startsWith("/admin"), { timeout: 15_000 });
}

export async function expectToast(page: Page, text: string | RegExp) {
  const toast = page.locator("[data-sonner-toast]").filter({ hasText: text });
  await expect(toast.first()).toBeVisible({ timeout: 10_000 });
}

export function adminReservationRow(page: Page, gameTitle: string) {
  return page
    .locator('[data-testid="admin-reservation-row"]')
    .filter({ hasText: gameTitle });
}

export function adminActiveLoanRow(page: Page, gameTitle: string) {
  return page
    .locator('[data-testid="admin-loan-row"]')
    .filter({ hasText: gameTitle })
    .filter({ hasText: "Aktywne" });
}

export async function openFirstAvailableGameFromCatalog(page: Page): Promise<string> {
  await page.goto("/katalog?availability=available");
  const card = page.locator('[data-testid="game-card"][data-available="true"]').first();
  await expect(card).toBeVisible({ timeout: 15_000 });
  const title = (await card.locator("h3").innerText()).trim();
  await card.getByRole("link", { name: "Szczegóły" }).click();
  await page.waitForURL(/\/gry\//);
  return title;
}
