import test, { Page } from "@playwright/test";
import UIActions from "@uiActions/UIActions";
import Assert from "@asserts/Assert";
import PopularItemsConstants from "@uiConstants/PopularItemsConstants";
import PopularItemsPage from "@pages/PopularItemsPage";

export default class PopularItemsSteps {
    private ui: UIActions;

    constructor(private page: Page) {
        this.ui = new UIActions(page);
    }

    public async launchPage() {
        await test.step(`Launching Popular Items page`, async () => {
            await this.ui.goto("http://advantageonlineshopping.com/#/", PopularItemsConstants.PAGE_TITLE);
        });
    }

    public async clickPopularItemsLink() {
        await test.step(`Click on POPULAR ITEMS link`, async () => {
            await this.ui.element(PopularItemsPage.POPULAR_ITEMS_LINK, PopularItemsConstants.POPULAR_ITEMS_LINK).click();
        });
    }

    public async validatePopularItemsLink(expectedText?: string) {
        await test.step(`Validate POPULAR ITEMS link${expectedText ? ' contains: ' + expectedText : ' is visible'}`, async () => {
            const element = this.ui.element(PopularItemsPage.POPULAR_ITEMS_LINK, PopularItemsConstants.POPULAR_ITEMS_LINK);
            const isVisible = await element.isVisible(60);
            Assert.assertTrue(isVisible, PopularItemsConstants.POPULAR_ITEMS_LINK);
            if (expectedText) {
                const actualText = await element.getTextContent();
                Assert.assertContains(actualText || '', expectedText, PopularItemsConstants.POPULAR_ITEMS_LINK);
            }
        });
    }

    public async clickViewDetailsLink1() {
        await test.step(`Click on View Details link at index 1`, async () => {
            await this.ui.element(PopularItemsPage.VIEW_DETAILS_LINK_1, PopularItemsConstants.VIEW_DETAILS_LINK_1).click();
        });
    }

    public async validateViewDetailsLink1(expectedText?: string) {
        await test.step(`Validate View Details link at index 1${expectedText ? ' contains: ' + expectedText : ' is visible'}`, async () => {
            const element = this.ui.element(PopularItemsPage.VIEW_DETAILS_LINK_1, PopularItemsConstants.VIEW_DETAILS_LINK_1);
            const isVisible = await element.isVisible(60);
            Assert.assertTrue(isVisible, PopularItemsConstants.VIEW_DETAILS_LINK_1);
            if (expectedText) {
                const actualText = await element.getTextContent();
                Assert.assertContains(actualText || '', expectedText, PopularItemsConstants.VIEW_DETAILS_LINK_1);
            }
        });
    }
}