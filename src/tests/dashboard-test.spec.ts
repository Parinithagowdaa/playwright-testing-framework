import { test } from '@playwright/test';
import { chromium } from '@playwright/test';
import * as path from 'path';
import * as fs from 'fs';

test('Launch Dashboard in Edge Browser', async () => {
    // Launch Edge browser
    const browser = await chromium.launch({
        channel: 'msedge',
        headless: false,
        args: ['--start-maximized', '--disable-extensions'],
    });

    const context = await browser.newContext({
        viewport: null,
    });

    const page = await context.newPage();

    // Read the dashboard HTML file
    const dashboardPath = path.join(__dirname, '../../dashboard.html');
    const dashboardContent = fs.readFileSync(dashboardPath, 'utf8');

    // Navigate to the dashboard
    await page.goto(`file://${dashboardPath}`);

    // Wait for the page to load
    await page.waitForTimeout(5000);

    // Take a screenshot to show the dashboard
    await page.screenshot({ 
        path: '../../dashboard-edge-screenshot.png',
        fullPage: true 
    });

    console.log('✅ Dashboard launched successfully in Microsoft Edge!');
    console.log('✅ Screenshot saved as dashboard-edge-screenshot.png');

    // Keep the browser open for a few seconds to demonstrate
    await page.waitForTimeout(3000);

    await browser.close();
});
