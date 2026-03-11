import { test, expect } from '@playwright/test';

/**
 * Test Case: TC_01_SecondModule
 * Description: Testing the second module
 * Module: SecondModule
 * Type: UI
 * Browser: Chrome
 * URL: http://advantageonlineshopping.com/
 * Generated: 11/3/2026, 10:10:58 pm
 */

test('test', async ({ page }) => {
  await page.goto('http://advantageonlineshopping.com/#/');
  await page.getByRole('link', { name: 'POPULAR ITEMS' }).click();
  await page.getByRole('link', { name: 'CONTACT US' }).click();
});
