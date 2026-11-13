import { defineConfig, devices } from "@playwright/test";

const PORT = 3100;

/**
 * E2E runs against the production build (`next start`), so run `pnpm build` first (CI already has).
 *
 * The tests cover the story: scroll position -> active chapter. They do not touch the map on purpose: Mapbox
 * needs WebGL and a token, which a CI runner does not have, and the story state is independent of both (it
 * lives in a store and in data attributes on the page). The map is checked by hand and documented in the PRs.
 */
export default defineConfig({
  testDir: "./e2e",
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: "list",
  use: { baseURL: `http://localhost:${PORT}`, trace: "retain-on-failure" },
  projects: [
    {
      name: "desktop",
      use: { ...devices["Desktop Chrome"], viewport: { width: 1280, height: 800 } },
    },
    { name: "mobile", use: { ...devices["Pixel 5"] } },
  ],
  webServer: {
    command: `pnpm start -p ${PORT}`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
});
