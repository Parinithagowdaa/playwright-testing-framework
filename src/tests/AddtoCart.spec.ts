import AddtoCartSteps from "@uiSteps/AddtoCartSteps";
import { test } from "@base-test";
import Allure from "@allure";

let addtocart: AddtoCartSteps;
test.beforeEach(async ({ page }) => {
    addtocart = new AddtoCartSteps(page);
});

/**
 * Test Case: TC_02_Add to Cart
 * Description: Verify that user can successfully Add Item to the Cart
 * Module: Add to Cart
 * Type: Integration
 * Browser: Chrome
 * URL: http://advantageonlineshopping.com/
 * Generated: 5/10/2026, 3:26:25 PM
 */
test('TC_02_Add_to_Cart - Verify that user can successfully Add Item to the Cart', async () => {
    Allure.attachDetails('Verify that user can successfully Add Item to the Cart', 'TC_02_Add_to_Cart');
    await addtocart.launchPage();
    await addtocart.clickElement('16');
    await addtocart.clickAddToCartButton();
});
