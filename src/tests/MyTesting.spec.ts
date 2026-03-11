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


/**
 * Test Case: TC_03_MyTesting
 * Description: Verifying the page objects is created or not
 * Module: MyTesting
 * Type: UI
 * Browser: Chrome
 * URL: http://advantageonlineshopping.com/
 * Generated: 11/3/2026, 10:34:49 pm
 */

test('test', async ({ page }) => {
  await page.goto('http://advantageonlineshopping.com/#/');
  await page.getByRole('link', { name: 'POPULAR ITEMS' }).click();
  await page.getByRole('link', { name: 'CONTACT US' }).click();
});


/**
 * Test Case: TC_05_MyTesting
 * Description: Think the page objects
 * Module: MyTesting
 * Type: UI
 * Browser: Chrome
 * URL: http://advantageonlineshopping.com/
 * Generated: 11/3/2026, 10:58:50 pm
 */

test('test', async ({ page }) => {
  await page.goto('http://advantageonlineshopping.com/#/');
  await page.getByRole('link', { name: 'CONTACT US' }).click();
  await page.locator('select[name="categoryListboxContactUs"]').selectOption('object:62');
});


/**
 * Test Case: TC_06_MyTesting
 * Description: Double checking
 * Module: MyTesting
 * Type: UI
 * Browser: Chrome
 * URL: http://advantageonlineshopping.com/
 * Generated: 11/3/2026, 11:24:31 pm
 */

test('test', async ({ page }) => {
  await page.goto('http://advantageonlineshopping.com/#/');
  await page.getByRole('link', { name: 'CONTACT US' }).click();
  await page.locator('select[name="categoryListboxContactUs"]').selectOption('object:63');
  await page.locator('textarea[name="subjectTextareaContactUs"]').click();
  await page.getByText('* Subject').click();
});


/**
 * Test Case: TC_07_MyTesting
 * Description: ensure of functionality
 * Module: MyTesting
 * Type: UI
 * Browser: Chrome
 * URL: http://advantageonlineshopping.com/
 * Generated: 11/3/2026, 11:50:54 pm
 */

test('test', async ({ page }) => {
  await page.goto('http://advantageonlineshopping.com/#/');
  await page.getByRole('link', { name: 'POPULAR ITEMS' }).click();
  await page.getByText('HP ELITEPAD 1000 G2 TABLET').click();
  await page.getByRole('link', { name: 'Special-offer' }).first().click();
  await page.getByRole('link', { name: 'View Details' }).first().click();
  await page.getByRole('heading', { name: 'HP ELITEPAD 1000 G2 TABLET' }).click();
});
