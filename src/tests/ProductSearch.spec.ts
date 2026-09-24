import ProductSearchSteps from "@uiSteps/ProductSearchSteps";
import { test } from "@base-test";
import Allure from "@allure";

let productsearch: ProductSearchSteps;
test.beforeEach(async ({ page }) => {
    productsearch = new ProductSearchSteps(page);
});

/**
 * Test Case: TC_Search for Productr_01
 * Description: Verifying User can search for the product
 * Module: Product Search
 * Type: Functional
 * Browser: Chrome
 * URL: http://advantageonlineshopping.com/
 * Generated: 4/23/2026, 2:12:50 PM
 */
test('TC_Search_for_Productr_01 - Verifying User can search for the product', async () => {
    Allure.attachDetails('Verifying User can search for the product', 'TC_Search_for_Productr_01');
    await productsearch.launchPage();
    await productsearch.clickSpeakerscategorytxtLink();
    await productsearch.clickElement('20');
});
