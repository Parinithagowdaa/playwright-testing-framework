import PopularItemsSteps from "@uiSteps/PopularItemsSteps";
import { test } from "@base-test";
import Allure from "@allure";

let popularItems: PopularItemsSteps;
test.beforeEach(async ({ page }) => {
    popularItems = new PopularItemsSteps(page);
});

/**
 * Test Case: TC_01_View Details
 * Description: Verify that use can view the details of the product by navigating from Popular itms
 * Module: Popular Items
 * Type: Functional
 * Browser: Chrome
 * URL: http://advantageonlineshopping.com/
 * Generated: 9/23/2026, 4:08:18 PM
 */
test('TC_01_View_Details - Verify that use can view the details of the product by navigating from Popular itms', async () => {
    Allure.attachDetails('Verify that use can view the details of the product by navigating from Popular itms', 'TC_01_View_Details');
    await popularItems.launchPage();
    await popularItems.clickPopularItemsLink();
    await popularItems.clickViewDetailsLink1();
});