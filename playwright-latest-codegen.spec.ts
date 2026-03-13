import { test, expect } from '@playwright/test';

test('test', async ({ page }) => {
  await page.goto('http://advantageonlineshopping.com/#/');
  await page.getByRole('link', { name: 'CONTACT US' }).click();
  await page.locator('textarea[name="subjectTextareaContactUs"]').click();
  await page.locator('textarea[name="subjectTextareaContactUs"]').fill('shshjdb');
});