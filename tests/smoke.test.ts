import { expect, test } from '@playwright/test';

test('トップページが HTTP 200 を返す', async ({ page }) => {
  const response = await page.goto('/');
  expect(response?.status()).toBe(200);
});

test('主要セクションが存在する', async ({ page }) => {
  await page.goto('/');

  await expect(page.locator('section#top')).toBeVisible();
  await expect(page.locator('section#concept')).toBeVisible();
  await expect(page.locator('section#how-to-play')).toBeVisible();
  await expect(page.locator('section#demo')).toBeVisible();
  await expect(page.locator('section#download')).toBeVisible();
  await expect(page.locator('footer')).toBeVisible();
});

test('How to Play セクションに図解動画が表示される', async ({ page }) => {
  await page.goto('/');

  const video = page.locator('section#how-to-play video.how-to-play-video');
  await expect(video).toBeVisible();
  await expect(video).toHaveAttribute('muted', '');
  await expect(video).toHaveAttribute('loop', '');
  await expect(video).toHaveAttribute(
    'poster',
    '/videos/how-to-play-poster.jpg'
  );
});
