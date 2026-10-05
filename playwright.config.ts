import { defineConfig, devices } from "@playwright/test";

// WebGL in headless Chromium runs on SwiftShader (software). Set
// PW_CHROMIUM_PATH to use a pre-installed Chromium instead of a downloaded one.
const launchOptions = {
  executablePath: process.env.PW_CHROMIUM_PATH || undefined,
  args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"],
};

export default defineConfig({
  testDir: "tests/e2e",
  timeout: 90_000,
  expect: { timeout: 30_000 },
  fullyParallel: false,
  workers: 1,
  reporter: [["list"]],
  use: {
    baseURL: process.env.E2E_BASE_URL || "http://localhost:3100",
    reducedMotion: "reduce",
    launchOptions,
  },
  projects: [
    { name: "masaustu", use: { ...devices["Desktop Chrome"], viewport: { width: 1280, height: 800 }, launchOptions } },
    { name: "telefon", use: { ...devices["Pixel 7"], launchOptions } },
  ],
  webServer: process.env.E2E_BASE_URL
    ? undefined
    : {
        command: "npm run build && npm run start -- -p 3100",
        url: "http://localhost:3100",
        timeout: 300_000,
        reuseExistingServer: true,
        // demo panel user for the panel tests (production build has no default)
        env: { PANEL_DEMO_EMAIL: "demo@ormen.local", PANEL_DEMO_PASSWORD: "ormen-demo", PANEL_SESSION_SECRET: "e2e-only-session-secret-0123456789abcdef" },
      },
});
