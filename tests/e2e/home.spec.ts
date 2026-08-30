import { test, expect } from '@playwright/test';

test('home page lets the visitor pick a location', async ({ page }) => {
  await page.goto('/');

  const select = page.locator('select');
  await expect(select).toBeVisible();
  await expect(select.locator('option[value=""]')).toHaveText('Where are you surfing?');
  await expect(select.locator('option[value="st-augustine"]')).toHaveText('St. Augustine, FL');
});
