import { expect, test } from "@playwright/test";
import { DOWNLOAD_AVAILABLE, SOURCE_AVAILABLE } from "../src/consts";

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

  const iframe = section.locator("iframe");
  await expect(iframe).toHaveCount(1);

  // #demo-loading は iframe より前面（z-index）にあり、隠れない
  const loading = section.locator("#demo-loading");
  const loadingZIndex = await loading.evaluate(
    (el) => getComputedStyle(el).zIndex
  );
  const iframeZIndex = await iframe.evaluate(
    (el) => getComputedStyle(el).zIndex
  );
  expect(Number(loadingZIndex)).toBeGreaterThan(Number(iframeZIndex));
});

test("SiteNav の各リンクをクリックすると対象セクションへ遷移する", async ({
  page,
}) => {
  await page.goto("/");

  const targets = [
    { label: "Concept", id: "concept" },
    { label: "Trailer", id: "trailer" },
    { label: "Screenshots", id: "screenshots" },
    { label: "How to Play", id: "how-to-play" },
    { label: "Playable Demo", id: "demo" },
    { label: "Download", id: "download" },
  ];

  const nav = page.locator('nav[aria-label="サイト内ナビゲーション"]');
  for (const { label, id } of targets) {
    const link = nav.getByRole("link", { name: label, exact: true });
    await expect(link).toHaveAttribute("href", `#${id}`);
    await link.click();
    await expect(page).toHaveURL(new RegExp(`#${id}$`));
    await expect(page.locator(`section#${id}`)).toBeInViewport();
  }
});

test("PlayableDemo の常設フォールバックリンクは起動前から表示され PLAY_URL を指す", async ({
  page,
}) => {
  await page.goto("/");

  const section = page.locator("section#demo");
  // 起動前（iframe ロード前）から存在すること
  await expect(section.locator("iframe")).toHaveCount(0);

  const fallbackLink = section.getByRole("link", {
    name: "ブラウザ版を別タブで開く",
  });
  await expect(fallbackLink).toBeVisible();
  await expect(fallbackLink).toHaveAttribute("target", "_blank");
  await expect(fallbackLink).toHaveAttribute("rel", "noopener");

  const frameEl = section.locator("#demo-frame");
  const playUrl = await frameEl.getAttribute("data-play-url");
  expect(playUrl).toBeTruthy();
  await expect(fallbackLink).toHaveAttribute("href", playUrl ?? "");
});

test("PlayableDemo は iframe の読み込みが 8 秒経っても完了しない場合、遅延フォールバックに切り替わる", async ({
  page,
}) => {
  await page.clock.install();
  await page.goto("/");

  const section = page.locator("section#demo");
  const frameEl = section.locator("#demo-frame");
  const playUrl = await frameEl.getAttribute("data-play-url");
  expect(playUrl).toBeTruthy();

  // iframe のドキュメント読み込みを止め、load イベントを発火させない
  await page.route(playUrl ?? "", async (_route) => {
    // レスポンスを返さないまま握り続け、load が完了しない状態を模す
    await new Promise(() => {});
  });

  await section.locator("#demo-launch").click();

  const loading = section.locator("#demo-loading");
  await expect(loading).toBeVisible();
  await expect(loading.getByRole("link", { name: "別タブで開く" })).toHaveCount(
    0
  );

  await page.clock.fastForward(8000);

  const fallbackLink = loading.getByRole("link", { name: "別タブで開く" });
  await expect(fallbackLink).toBeVisible();
  await expect(fallbackLink).toHaveAttribute("href", playUrl ?? "");
  await expect(fallbackLink).toHaveAttribute("target", "_blank");
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

test("prefers-reduced-motion: reduce では Hero 背景 SVG の SMIL アニメーションが止まる", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");

  const paused = await page.evaluate(() => {
    const svg = document.querySelector<SVGSVGElement>(".hero-svg");
    return svg?.animationsPaused();
  });
  expect(paused).toBe(true);
});

test("通常時は Hero 背景 SVG の SMIL アニメーションが再生されている", async ({
  page,
}) => {
  await page.goto("/");

  const paused = await page.evaluate(() => {
    const svg = document.querySelector<SVGSVGElement>(".hero-svg");
    return svg?.animationsPaused();
  });
  expect(paused).toBe(false);
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

// ─────────── ソースリポジトリ公開ゲート (SOURCE_AVAILABLE) の不変条件 ───────────
//
// SOURCE_AVAILABLE は SiteFooter / Layout の sameAs にまたがる。
// 未公開側・公開側の両方を対で置く。フラグを倒した瞬間に、倒し忘れた箇所が
// 落ちて分かるようにするため。片側だけだと「倒したら全部 skip されて緑」に
// なり、検証していないのと同じになる。
//
// 注意: DOWNLOAD_URL は keroway/reflectorbit-releases（配布専用の公開ミラー）を指し、
// リポジトリ名が "reflectorbit" の前方一致になる。部分一致の contain チェックは
// ミラー URL を本体リポ URL と誤検知するため、href の完全一致で見ること。

test("本体ソース非公開の間、到達不能な本体リポ URL へリンクしない", async ({
  page,
}) => {
  test.skip(SOURCE_AVAILABLE, "公開後は本体リポ URL が載るのが正");
  await page.goto("/");

  await expect(
    page.locator("a[href='https://github.com/keroway/reflectorbit']")
  ).toHaveCount(0);

  const ld = JSON.parse(
    await page.locator('script[type="application/ld+json"]').innerText()
  );
  expect(ld.sameAs).toEqual(["https://github.com/keroway"]);
});

test("本体ソース公開後は本体リポへリンクし JSON-LD sameAs に含める", async ({
  page,
}) => {
  test.skip(!SOURCE_AVAILABLE, "非公開の間は載せないのが正");
  await page.goto("/");

  await expect(
    page.locator("a[href='https://github.com/keroway/reflectorbit']")
  ).not.toHaveCount(0);

  const ld = JSON.parse(
    await page.locator('script[type="application/ld+json"]').innerText()
  );
  expect(ld.sameAs).toEqual(["https://github.com/keroway/reflectorbit"]);
});

// ─────────── ダウンロード公開ゲート (DOWNLOAD_AVAILABLE) の不変条件 ───────────

test("ダウンロード未公開の間、ダウンロード CTA は disabled でリリース URL へリンクせず offers も出さない", async ({
  page,
}) => {
  test.skip(DOWNLOAD_AVAILABLE, "公開後はリンクが有効になるのが正");
  await page.goto("/");

  await expect(
    page.locator("section#download [aria-disabled='true']")
  ).toBeVisible();
  await expect(
    page.locator("section#top [aria-disabled='true']")
  ).toBeVisible();
  await expect(page.locator("a[href*='releases/latest']")).toHaveCount(0);

  const ld = JSON.parse(
    await page.locator('script[type="application/ld+json"]').innerText()
  );
  // 到達できない商品を InStock と主張しないこと。件数ではなく中身を見る。
  expect(ld.offers).toBeUndefined();
});

test("ダウンロード公開後はリリース URL へリンクし JSON-LD に InStock の offers を持つ", async ({
  page,
}) => {
  test.skip(!DOWNLOAD_AVAILABLE, "未公開の間は載せないのが正");
  await page.goto("/");

  await expect(page.locator("a[href*='releases/latest']")).not.toHaveCount(0);
  await expect(page.locator("[aria-disabled='true']")).toHaveCount(0);

  const ld = JSON.parse(
    await page.locator('script[type="application/ld+json"]').innerText()
  );
  expect(ld.offers).toMatchObject({
    availability: "https://schema.org/InStock",
  });
});
