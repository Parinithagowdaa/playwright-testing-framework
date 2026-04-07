const { chromium } = require('playwright');
const path = require('path');

(async () => {
    console.log('🚀 Launching Microsoft Edge with Dashboard...\n');
    
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

    // Get the dashboard path
    const dashboardPath = path.join(__dirname, 'dashboard.html');
    console.log(`📂 Loading dashboard from: ${dashboardPath}\n`);

    // Navigate to the dashboard
    await page.goto(`file://${dashboardPath}`);

    // Wait for the page to load
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Take a screenshot
    const screenshotPath = path.join(__dirname, 'dashboard-edge-screenshot.png');
    await page.screenshot({ 
        path: screenshotPath,
        fullPage: true 
    });

    console.log('✅ Dashboard launched successfully in Microsoft Edge!\n');
    console.log('📸 Screenshot saved to:', screenshotPath, '\n');
    console.log('🔍 Browser Details:');
    console.log('   - Browser: Microsoft Edge');
    console.log('   - Dashboard: Playwright Testing Framework Dashboard');
    console.log('   - Status: Successfully Loaded\n');

    // Keep the browser open for a bit to show it's running
    await page.waitForTimeout(5000);

    await browser.close();
    console.log('✅ Test completed successfully!\n');
})();
