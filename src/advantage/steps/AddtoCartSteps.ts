import test, { Page } from "@playwright/test";
import UIActions from "@uiActions/UIActions";
import Assert from "@asserts/Assert";
import CommonConstants from "@uiConstants/CommonConstants";
import AddtoCartConstants from "@uiConstants/AddtoCartConstants";
import AddtoCartPage from "@pages/AddtoCartPage";

export default class AddtoCartSteps {
    private ui: UIActions;

    constructor(private page: Page) {
        this.ui = new UIActions(page);
    }

    /**
     * Launch the AddtoCart page
     */
    public async launchPage() {
        await test.step(`Launching AddtoCart page`, async () => {
            await this.ui.goto("http://advantageonlineshopping.com/#/", AddtoCartConstants.PAGE_TITLE);
        });
    }

    /**
     * Select option from element with selector "[id="16"]"
     */
    public async clickElement(option: string) {
        await test.step(`Select option from element with selector "[id="16"]"`, async () => {
            await this.ui.dropdown(AddtoCartPage.ELEMENT, AddtoCartConstants.ELEMENT).selectByValue(option);
        });
    }

    /**
     * Validate element with selector "[id="16"]" is visible
     */
    public async validateElement(expectedText?: string) {
        await test.step(`Validate element with selector "[id="16"]"${expectedText ? ' contains: ' + expectedText : ' is visible'}`, async () => {
            const element = this.ui.element(AddtoCartPage.ELEMENT, AddtoCartConstants.ELEMENT);
            const isVisible = await element.isVisible(60);
            Assert.assertTrue(isVisible, AddtoCartConstants.ELEMENT);
            if (expectedText) {
                const actualText = await element.getTextContent();
                Assert.assertContains(actualText || '', expectedText, AddtoCartConstants.ELEMENT);
            }
        });
    }

    /**
     * Click on ADD TO CART button
     */
    public async clickAddToCartButton() {
        await test.step(`Click on ADD TO CART button`, async () => {
            await this.ui.element(AddtoCartPage.ADD_TO_CART_BUTTON, AddtoCartConstants.ADD_TO_CART_BUTTON).click();
        });
    }

    /**
     * Validate ADD TO CART button is visible
     */
    public async validateAddToCartButton(expectedText?: string) {
        await test.step(`Validate ADD TO CART button${expectedText ? ' contains: ' + expectedText : ' is visible'}`, async () => {
            const element = this.ui.element(AddtoCartPage.ADD_TO_CART_BUTTON, AddtoCartConstants.ADD_TO_CART_BUTTON);
            const isVisible = await element.isVisible(60);
            Assert.assertTrue(isVisible, AddtoCartConstants.ADD_TO_CART_BUTTON);
            if (expectedText) {
                const actualText = await element.getTextContent();
                Assert.assertContains(actualText || '', expectedText, AddtoCartConstants.ADD_TO_CART_BUTTON);
            }
        });
    }
}
