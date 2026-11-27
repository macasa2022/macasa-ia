import { defineConfig, devices } from "@playwright/test";

// Testes e2e (npx playwright test). O site tem de estar a correr em localhost:8080.
export default defineConfig({
  testDir: "./e2e",
  outputDir: "./test-results",
  reporter: [["html", { outputFolder: "e2e-relatorio", open: "never" }]],
  use: { baseURL: "http://localhost:8080", trace: "on-first-retry" },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
});
