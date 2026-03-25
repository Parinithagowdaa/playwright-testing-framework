import { test, expect } from '@playwright/test';

test('test', async ({ page }) => {
  await page.goto('http://advantageonlineshopping.com/#/');
  await page.getByRole('link', { name: 'LaptopsCategory', exact: true }).click();
  await page.getByRole('button', { name: 'BUY NOW' }).click();
  await page.getByRole('button', { name: 'ADD TO CART' }).click();
  await page.getByRole('button', { name: 'CHECKOUT ($449.99)' }).click();
});