import SearchSteps from "@uiSteps/SearchSteps";
import { test } from "@base-test";
import Allure from "@allure";

let search: SearchSteps;
test.beforeEach(async ({ page }) => {
    search = new SearchSteps(page);
});

/**
 * Test Case: TC_03_SearchForHeadphone
 * Description: Verify that user can search for the headphone successfully
 * Module: Search
 * Type: Functional
 * Browser: Chrome
 * URL: http://advantageonlineshopping.com/
 * Generated: 7/8/2026, 4:06:28 PM
 */
test('TC_03_SearchForHeadphone - Verify that user can search for the headphone successfully', async () => {
    Allure.attachDetails('Verify that user can search for the headphone successfully', 'TC_03_SearchForHeadphone');
    await search.launchPage();
    await search.fillSearchTextbox('headphone');
    await search.clickBoseSoundlinkAroundEarLink();
    await search.clickAddToCartButton();
});
