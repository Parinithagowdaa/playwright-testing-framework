const { chromium } = require('playwright');
const path = require('path');

async function launchDashboard() {
  console.log('Starting Microsoft Edge browser...');
  
  // Launch Edge browser
  const browser = await chromium.launch({
    channel: 'msedge',
    headless: false,
    args: [
      '--start-maximized',
      '--no-sandbox',
      '--disable-setuid-sandbox'
    ]
  });

  console.log('✓ Edge browser launched successfully');

  // Create a new page
  const context = await browser.newContext({
    viewport: null // Use full window size
  });
  const page = await context.newPage();

  // Get the absolute path to dashboard.html
  const dashboardPath = path.join(__dirname, 'dashboard.html');
  const dashboardUrl = `file://${dashboardPath}`;

  console.log(`Loading dashboard from: ${dashboardUrl}`);

  // Navigate to the dashboard
  await page.goto(dashboardUrl, { waitUntil: 'networkidle' });

  console.log('✓ Dashboard loaded successfully');

  // Wait for the page to be fully rendered
  await page.waitForTimeout(2000);

  // Take a full-page screenshot
  const screenshotPath = path.join(__dirname, 'dashboard-edge-screenshot.png');
  await page.screenshot({ 
    path: screenshotPath, 
    fullPage: true 
  });

  console.log(`✓ Screenshot saved to: ${screenshotPath}`);

  // Get screenshot file size
  const fs = require('fs');
  const stats = fs.statSync(screenshotPath);
  const fileSizeInBytes = stats.size;
  const fileSizeInKB = (fileSizeInBytes / 1024).toFixed(0);

  // Get page dimensions
  const dimensions = await page.evaluate(() => {
    return {
      width: document.documentElement.scrollWidth,
      height: document.documentElement.scrollHeight
    };
  });

  console.log(`✓ Screenshot details: ${fileSizeInKB} KB, ${dimensions.width}x${dimensions.height} pixels`);

  // Keep the browser open for a few seconds to verify
  await page.waitForTimeout(3000);

  await browser.close();
  console.log('✓ Browser closed');
}

launchDashboard().catch(error => {
  console.error('Error launching dashboard:', error);
  process.exit(1);
});
