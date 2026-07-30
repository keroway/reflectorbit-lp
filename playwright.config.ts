import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests",
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: "list",
  use: {
    baseURL: "http://localhost:4322",
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
      grepInvert: /@mobile/,
    },
    {
      // 320px = 実測でモバイル横スクロール回帰が最も顕著になる幅。
      name: "mobile-320",
      use: { ...devices["Pixel 5"], viewport: { width: 320, height: 640 } },
      grep: /@mobile/,
    },
  ],
  webServer: {
    command: "pnpm run preview --port 4322",
    url: "http://localhost:4322",
    reuseExistingServer: false,
    timeout: 120000,
  },
});
