import { test, expect } from '@playwright/test';
import * as path from 'path';

test('Demo Browser Launch - Show Browser Running', async ({ page }) => {
  // Navigate to local demo page
  const demoPagePath = 'file://' + path.resolve(__dirname, '../../demo-page.html');
  await page.goto(demoPagePath);
  
  // Verify the page loaded
  await expect(page).toHaveTitle(/Playwright Browser Launch Demo/);
  
  // Wait a bit to ensure everything is rendered
  await page.waitForTimeout(2000);
  
  // Take a screenshot
  await page.screenshot({ path: 'test-results/demo-browser-screenshot.png', fullPage: true });
  
  console.log('✅ Browser launched successfully!');
  console.log('✅ Local demo page loaded');
  console.log('✅ Screenshot saved as test-results/demo-browser-screenshot.png');
});
