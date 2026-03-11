import { test, expect } from '@playwright/test';

test('test', async ({ page }) => {
  await page.goto('http://advantageonlineshopping.com/#/');
  await page.getByRole('link', { name: 'POPULAR ITEMS' }).click();
  await page.getByText('HP ELITEPAD 1000 G2 TABLET').click();
  await page.getByRole('link', { name: 'Special-offer' }).first().click();
  await page.getByRole('link', { name: 'View Details' }).first().click();
  await page.getByRole('heading', { name: 'HP ELITEPAD 1000 G2 TABLET' }).click();
});