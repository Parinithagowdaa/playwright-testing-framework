import { test, expect } from '@playwright/test';

test('test', async ({ page }) => {
  await page.goto('http://advantageonlineshopping.com/#/');
  await page.getByRole('link', { name: 'POPULAR ITEMS' }).click();
  await page.getByRole('link', { name: 'View Details' }).first().click();
  await expect(page.locator('#Description')).toContainText('HP ELITEPAD 1000 G2 TABLET');
});