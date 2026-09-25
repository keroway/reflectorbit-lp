import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests",
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  // CI では github reporter で失敗を PR の diff にインライン注釈し、html reporter で
  // playwright-report/ を生成する（従来は list のみだったため、CI の失敗時アーティファクト
  // アップロードが playwright-report/ を拾えず test-results/ 頼みで空振りしていた）。
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : "list",
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
    // astro 7.3 は AI エージェント環境(このセッション含む)を自動検知すると
    // `astro preview` を強制的にバックグラウンドデーモン化し、フォアグラウンド
    // プロセスが即 exit 0 するため webServer が "exited early" と誤判定する
    // (reflectorbit-lp#263)。ASTRO_PREVIEW_BACKGROUND を設定するとこの自動検知が
    // 無効化され、明示的な --background フラグが無い限りフォアグラウンドで
    // 起動するようになる(astro/dist/cli/preview/index.js の agentDetected 判定)。
    env: { ASTRO_PREVIEW_BACKGROUND: "false" },
    url: "http://localhost:4322",
    reuseExistingServer: false,
    timeout: 120000,
  },
});
