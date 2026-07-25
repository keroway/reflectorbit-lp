import { expect, test } from "@playwright/test";

test("トップページが HTTP 200 を返す", async ({ page }) => {
  const response = await page.goto("/");
  expect(response?.status()).toBe(200);
});

test("主要セクションが存在する", async ({ page }) => {
  await page.goto("/");

  await expect(page.locator("section#top")).toBeVisible();
  await expect(page.locator("section#concept")).toBeVisible();
  await expect(page.locator("section#trailer")).toBeVisible();
  await expect(page.locator("section#screenshots")).toBeVisible();
  await expect(page.locator("section#how-to-play")).toBeVisible();
  await expect(page.locator("section#demo")).toBeVisible();
  await expect(page.locator("section#download")).toBeVisible();
  await expect(page.locator("footer")).toBeVisible();
});

test("Trailer セクションはクリックまで video をロードしない（ファサード方式）", async ({
  page,
}) => {
  await page.goto("/");

  const section = page.locator("section#trailer");
  const playButton = section.locator("#trailer-play");
  await expect(playButton).toBeVisible();
  // クリック前は <video> 要素が存在しない = 動画ファイルはロードされない
  await expect(section.locator("video")).toHaveCount(0);

  await playButton.click();

  const video = section.locator("video");
  await expect(video).toHaveCount(1);
  await expect(video).toHaveAttribute("muted", "");
  await expect(video).toHaveAttribute("playsinline", "");
  await expect(video).toHaveAttribute("controls", "");
});

test("Playable Demo セクションはクリックまで iframe をロードしない（ファサード方式）", async ({
  page,
}) => {
  await page.goto("/");

  const section = page.locator("section#demo");
  const launchButton = section.locator("#demo-launch");
  await expect(launchButton).toBeVisible();
  // クリック前は <iframe> 要素が存在しない = 埋め込みはロードされない
  await expect(section.locator("iframe")).toHaveCount(0);

  await launchButton.click();

  await expect(section.locator("iframe")).toHaveCount(1);
});

test("How to Play セクションに図解動画が表示される", async ({ page }) => {
  await page.goto("/");

  const video = page.locator("section#how-to-play video.how-to-play-video");
  await expect(video).toBeVisible();
  await expect(video).toHaveAttribute("muted", "");
  await expect(video).toHaveAttribute("loop", "");
  await expect(video).toHaveAttribute(
    "poster",
    "/videos/how-to-play-poster.jpg"
  );
});

test("prefers-reduced-motion: reduce では図解動画の自動再生・ループが止まる", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");

  const video = page.locator("section#how-to-play video.how-to-play-video");
  await expect(video).toBeVisible();
  await expect(video).toHaveAttribute("controls", "");
  await expect(video).not.toHaveAttribute("autoplay", "");
  await expect(video).not.toHaveAttribute("loop", "");
});

test("存在しないパスは HTTP 404 を返し、検索エンジン向けメタデータを含まない", async ({
  page,
}) => {
  const response = await page.goto("/__nonexistent_path__/");
  expect(response?.status()).toBe(404);

  await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
    "content",
    "noindex, nofollow"
  );
  await expect(page.locator('link[rel="canonical"]')).toHaveCount(0);
  await expect(page.locator('script[type="application/ld+json"]')).toHaveCount(
    0
  );
});

test("トップページは VideoGame の JSON-LD を保持する", async ({ page }) => {
  await page.goto("/");

  await expect(page.locator('link[rel="canonical"]')).toHaveCount(1);
  await expect(page.locator('script[type="application/ld+json"]')).toHaveCount(
    1
  );
});

test("@mobile 320px 幅でページが横スクロールしない", async ({ page }) => {
  await page.goto("/");

  const { scrollWidth, clientWidth } = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
  }));
  expect(scrollWidth).toBeLessThanOrEqual(clientWidth);

  // 見出しが見切れずビューポート内に収まっていること
  const box = await page.locator("section#top h1").boundingBox();
  if (box === null) {
    throw new Error("Hero見出しの boundingBox が取得できませんでした");
  }
  expect(box.x).toBeGreaterThanOrEqual(0);
  expect(box.x + box.width).toBeLessThanOrEqual(clientWidth);
});
