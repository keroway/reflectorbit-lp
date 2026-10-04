import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

test("トップページが axe-core a11y 違反 0 件で通る", async ({ page }) => {
  await page.goto("/");
  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations).toEqual([]);
});

test("prefers-reduced-motion: reduce でも axe-core a11y 違反 0 件で通る（How to Play 動画の controls 分岐を含む）", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations).toEqual([]);
});

test("Trailer をクリックして動的生成された video を含めても axe-core a11y 違反 0 件で通る", async ({
  page,
}) => {
  await page.goto("/");

  const section = page.locator("section#trailer");
  await section.locator("#trailer-play").click();
  await expect(section.locator("video")).toHaveCount(1);

  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations).toEqual([]);
});

test("Playable Demo をクリックして動的生成された iframe を含めても axe-core a11y 違反 0 件で通る", async ({
  page,
}) => {
  await page.goto("/");

  const section = page.locator("section#demo");
  const frameEl = section.locator("#demo-frame");
  const playUrl = await frameEl.getAttribute("data-play-url");
  expect(playUrl).toBeTruthy();

  // 実際の外部サイト（reflectorbit.pages.dev）への依存を避け、axe が
  // iframe 内コンテンツの解析待ちで長時間ブロックされないよう軽量な HTML で即応する。
  await page.route(playUrl ?? "", async (route) => {
    await route.fulfill({
      contentType: "text/html",
      body: "<!doctype html><title>stub</title>",
    });
  });

  await section.locator("#demo-launch").click();
  await expect(section.locator("iframe")).toHaveCount(1);

  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations).toEqual([]);
});

test("失敗パネルは role=alert で、Trailer 読み込み失敗後も再試行と代替導線が使える", async ({
  page,
}) => {
  await page.goto("/");

  // 3 つの失敗パネルは hidden 解除で表示されるため、支援技術へ通知する role を持つ。
  for (const id of ["trailer-error", "how-to-play-error", "demo-error"]) {
    await expect(page.locator(`#${id}`)).toHaveAttribute("role", "alert");
  }

  const section = page.locator("section#trailer");
  await section.locator("#trailer-play").click();

  // 実ブラウザの media error 発火は環境依存なので、smoke.test.ts と同様に合成イベントで失敗させる。
  await section
    .locator("video")
    .evaluate((el: HTMLVideoElement) => el.dispatchEvent(new Event("error")));

  const panel = section.locator("#trailer-error");
  await expect(panel).toBeVisible();
  await expect(panel.getByRole("button", { name: "再試行" })).toBeVisible();
  await expect(panel.getByRole("link")).toBeVisible();

  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations).toEqual([]);
});

test("存在しないパス(404ページ)が axe-core a11y 違反 0 件で通る", async ({
  page,
}) => {
  const response = await page.goto("/__nonexistent_path__/");
  expect(response?.status()).toBe(404);

  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations).toEqual([]);
});
