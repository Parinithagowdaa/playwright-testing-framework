import { test, expect } from '@playwright/test';


/**
 * Test Case: TC_01_MyTesting
 * Description: Verify the first testing
 * Module: MyTesting
 * Type: UI
 * Browser: Chrome
 * URL: http://advantageonlineshopping.com/
 * Generated: 11/3/2026, 9:59:27 pm
 */

test('test', async ({ page }) => {
  await page.goto('http://advantageonlineshopping.com/#/');
  await page.getByRole('link', { name: 'POPULAR ITEMS' }).click();
  await page.getByRole('link', { name: 'POPULAR ITEMS' }).click();
});


/**
 * Test Case: TC_02_MyTesting
 * Description: Testing the second scenario
 * Module: MyTesting
 * Type: UI
 * Browser: Chrome
 * URL: http://advantageonlineshopping.com/
 * Generated: 11/3/2026, 10:08:50 pm
 */

test('test', async ({ page }) => {
  await page.goto('http://advantageonlineshopping.com/#/');
  await page.getByRole('link', { name: 'POPULAR ITEMS' }).click();
});
