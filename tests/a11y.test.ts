import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

test('トップページが axe-core a11y 違反 0 件で通る', async ({ page }) => {
  await page.goto('/');
  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations).toEqual([]);
});
