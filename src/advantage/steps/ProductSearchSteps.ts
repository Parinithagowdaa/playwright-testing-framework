import test, { Page } from "@playwright/test";
import UIActions from "@uiActions/UIActions";
import Assert from "@asserts/Assert";
import CommonConstants from "@uiConstants/CommonConstants";
import ProductSearchConstants from "@uiConstants/ProductSearchConstants";
import ProductSearchPage from "@pages/ProductSearchPage";

export default class ProductSearchSteps {
    private ui: UIActions;

    constructor(private page: Page) {
        this.ui = new UIActions(page);
    }

    /**
     * Launch the ProductSearch page
     */
    public async launchPage() {
        await test.step(`Launching ProductSearch page`, async () => {
            await this.ui.goto("http://advantageonlineshopping.com/#/", ProductSearchConstants.PAGE_TITLE);
        });
    }

    /**
     * Click on SpeakersCategoryTxt link
     */
    public async clickSpeakerscategorytxtLink() {
        await test.step(`Click on SpeakersCategoryTxt link`, async () => {
            await this.ui.element(ProductSearchPage.SPEAKERSCATEGORYTXT_LINK, ProductSearchConstants.SPEAKERSCATEGORYTXT_LINK).click();
        });
    }

    /**
     * Validate SpeakersCategoryTxt link is visible
     */
    public async validateSpeakerscategorytxtLink(expectedText?: string) {
        await test.step(`Validate SpeakersCategoryTxt link${expectedText ? ' contains: ' + expectedText : ' is visible'}`, async () => {
            const element = this.ui.element(ProductSearchPage.SPEAKERSCATEGORYTXT_LINK, ProductSearchConstants.SPEAKERSCATEGORYTXT_LINK);
            const isVisible = await element.isVisible(60);
            Assert.assertTrue(isVisible, ProductSearchConstants.SPEAKERSCATEGORYTXT_LINK);
            if (expectedText) {
                const actualText = await element.getTextContent();
                Assert.assertContains(actualText || '', expectedText, ProductSearchConstants.SPEAKERSCATEGORYTXT_LINK);
            }
        });
    }

    /**
     * Select option from element with selector "[id="20"]"
     */
    public async clickElement(option: string) {
        await test.step(`Select option from element with selector "[id="20"]"`, async () => {
            await this.ui.dropdown(ProductSearchPage.ELEMENT, ProductSearchConstants.ELEMENT).selectByValue(option);
        });
    }

    /**
     * Validate element with selector "[id="20"]" is visible
     */
    public async validateElement(expectedText?: string) {
        await test.step(`Validate element with selector "[id="20"]"${expectedText ? ' contains: ' + expectedText : ' is visible'}`, async () => {
            const element = this.ui.element(ProductSearchPage.ELEMENT, ProductSearchConstants.ELEMENT);
            const isVisible = await element.isVisible(60);
            Assert.assertTrue(isVisible, ProductSearchConstants.ELEMENT);
            if (expectedText) {
                const actualText = await element.getTextContent();
                Assert.assertContains(actualText || '', expectedText, ProductSearchConstants.ELEMENT);
            }
        });
    }
}
