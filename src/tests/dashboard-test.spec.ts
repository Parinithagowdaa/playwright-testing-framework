import { test, expect } from '@playwright/test';
import path from 'path';

test.describe('Dashboard Test in Microsoft Edge', () => {
  test('should launch dashboard in Edge browser and capture screenshot', async ({ page }) => {
    // Get the absolute path to dashboard.html
    const dashboardPath = path.join(process.cwd(), 'dashboard.html');
    const dashboardUrl = `file://${dashboardPath}`;

    // Navigate to the dashboard
    await page.goto(dashboardUrl, { waitUntil: 'networkidle' });

    // Verify the page loaded
    await expect(page).toHaveTitle(/Playwright Testing Framework Dashboard/);

    // Wait for content to render
    await page.waitForTimeout(2000);

    // Take a screenshot
    await page.screenshot({ 
      path: 'dashboard-edge-screenshot.png', 
      fullPage: true 
    });

    // Verify key elements are visible
    const heading = page.locator('h1, h2').first();
    await expect(heading).toBeVisible();
  });
});
