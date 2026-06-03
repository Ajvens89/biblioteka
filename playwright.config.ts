import { defineConfig, devices } from "@playwright/test";

const skipWebServer =
  process.env.PLAYWRIGHT_SKIP_WEBSERVER === "1" ||
  (!process.env.CI && process.env.PLAYWRIGHT_FORCE_WEBSERVER !== "1");
const port = process.env.PLAYWRIGHT_PORT ?? (skipWebServer ? "3001" : "3099");
const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? `http://localhost:${port}`;

export default defineConfig({
  testDir: "./e2e",
  testMatch: "**/*.spec.ts",
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  timeout: 60_000,
  expect: { timeout: 10_000 },
  reporter: [["list"]],
  use: {
    ...devices["Desktop Chrome"],
    baseURL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  webServer: skipWebServer
    ? undefined
    : {
        command: `npm run build && npx next start -p ${port}`,
        url: baseURL,
        reuseExistingServer: !!process.env.PLAYWRIGHT_REUSE_SERVER,
        timeout: 300_000,
        env: {
          ...process.env,
          APP_URL: baseURL,
          NEXT_PUBLIC_APP_URL: baseURL,
        },
      },
  globalSetup: "./e2e/global-setup.ts",
  globalTeardown: "./e2e/global-teardown.ts",
});
