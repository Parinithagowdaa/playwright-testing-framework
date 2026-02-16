import { test, expect } from '@playwright/test';

test('test', async ({ page }) => {
  await page.goto('http://advantageonlineshopping.com/#/');
  await page.getByRole('link', { name: 'HeadphonesCategoryTxt' }).click();
  await page.getByRole('button', { name: 'BUY NOW' }).click();
  await page.locator('e-sec-plus-minus').click();
  await page.locator('e-sec-plus-minus').click();
  await page.goto('http://advantageonlineshopping.com/#/category/Headphones/2');
  await page.getByText('$179.99').nth(1).click();
  await page.locator('.plus').click();
  await page.locator('.plus').click();
  await page.getByRole('button', { name: 'ADD TO CART' }).click();
  await page.getByRole('button', { name: 'CHECKOUT ($539.97)' }).click();
});