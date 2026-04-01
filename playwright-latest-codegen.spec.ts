import { test, expect } from '@playwright/test';

test('test', async ({ page }) => {
  await page.goto('http://advantageonlineshopping.com/#/');
  await page.getByRole('link', { name: 'POPULAR ITEMS' }).click();
  await page.getByRole('link', { name: 'View Details' }).nth(2).click();
  await page.locator('e-sec-plus-minus div').nth(3).click();
});