import test, { Page } from "@playwright/test";
import UIActions from "@uiActions/UIActions";
import Assert from "@asserts/Assert";
import CommonConstants from "@uiConstants/CommonConstants";
import SearchConstants from "@uiConstants/SearchConstants";
import SearchPage from "@pages/SearchPage";

export default class SearchSteps {
    private ui: UIActions;

    constructor(private page: Page) {
        this.ui = new UIActions(page);
    }

    /**
     * Launch the Search page
     */
    public async launchPage() {
        await test.step(`Launching Search page`, async () => {
            await this.ui.goto("http://advantageonlineshopping.com/#/", SearchConstants.PAGE_TITLE);
        });
    }

    /**
     * Fill Search textbox
     */
    public async fillSearchTextbox(text: string) {
        await test.step(`Fill Search textbox`, async () => {
            await this.ui.editBox(SearchPage.SEARCH_TEXTBOX, SearchConstants.SEARCH_TEXTBOX).fill(text);
        });
    }

    /**
     * Click on Search textbox
     */
    public async clickSearchTextbox() {
        await test.step(`Click on Search textbox`, async () => {
            await this.ui.element(SearchPage.SEARCH_TEXTBOX, SearchConstants.SEARCH_TEXTBOX).click();
        });
    }

    /**
     * Validate Search textbox is visible
     */
    public async validateSearchTextbox(expectedText?: string) {
        await test.step(`Validate Search textbox${expectedText ? ' contains: ' + expectedText : ' is visible'}`, async () => {
            const element = this.ui.element(SearchPage.SEARCH_TEXTBOX, SearchConstants.SEARCH_TEXTBOX);
            const isVisible = await element.isVisible(60);
            Assert.assertTrue(isVisible, SearchConstants.SEARCH_TEXTBOX);
            if (expectedText) {
                const actualText = await element.getTextContent();
                Assert.assertContains(actualText || '', expectedText, SearchConstants.SEARCH_TEXTBOX);
            }
        });
    }

    /**
     * Click on HP PAVILION 15T TOUCH LAPTOP $ link
     */
    public async clickHpPavilion15tTouchLaptopLink() {
        await test.step(`Click on HP PAVILION 15T TOUCH LAPTOP $ link`, async () => {
            await this.ui.element(SearchPage.HP_PAVILION_15T_TOUCH_LAPTOP__LINK, SearchConstants.HP_PAVILION_15T_TOUCH_LAPTOP__LINK).click();
        });
    }

    /**
     * Validate HP PAVILION 15T TOUCH LAPTOP $ link is visible
     */
    public async validateHpPavilion15tTouchLaptopLink(expectedText?: string) {
        await test.step(`Validate HP PAVILION 15T TOUCH LAPTOP $ link${expectedText ? ' contains: ' + expectedText : ' is visible'}`, async () => {
            const element = this.ui.element(SearchPage.HP_PAVILION_15T_TOUCH_LAPTOP__LINK, SearchConstants.HP_PAVILION_15T_TOUCH_LAPTOP__LINK);
            const isVisible = await element.isVisible(60);
            Assert.assertTrue(isVisible, SearchConstants.HP_PAVILION_15T_TOUCH_LAPTOP__LINK);
            if (expectedText) {
                const actualText = await element.getTextContent();
                Assert.assertContains(actualText || '', expectedText, SearchConstants.HP_PAVILION_15T_TOUCH_LAPTOP__LINK);
            }
        });
    }

    /**
     * Click on BOSE SOUNDLINK AROUND-EAR link
     */
    public async clickBoseSoundlinkAroundEarLink() {
        await test.step(`Click on BOSE SOUNDLINK AROUND-EAR link`, async () => {
            await this.ui.element(SearchPage.BOSE_SOUNDLINK_AROUND_EAR_LINK, SearchConstants.BOSE_SOUNDLINK_AROUND_EAR_LINK).click();
        });
    }

    /**
     * Validate BOSE SOUNDLINK AROUND-EAR link is visible
     */
    public async validateBoseSoundlinkAroundEarLink(expectedText?: string) {
        await test.step(`Validate BOSE SOUNDLINK AROUND-EAR link${expectedText ? ' contains: ' + expectedText : ' is visible'}`, async () => {
            const element = this.ui.element(SearchPage.BOSE_SOUNDLINK_AROUND_EAR_LINK, SearchConstants.BOSE_SOUNDLINK_AROUND_EAR_LINK);
            const isVisible = await element.isVisible(60);
            Assert.assertTrue(isVisible, SearchConstants.BOSE_SOUNDLINK_AROUND_EAR_LINK);
            if (expectedText) {
                const actualText = await element.getTextContent();
                Assert.assertContains(actualText || '', expectedText, SearchConstants.BOSE_SOUNDLINK_AROUND_EAR_LINK);
            }
        });
    }

    /**
     * Click on ADD TO CART button
     */
    public async clickAddToCartButton() {
        await test.step(`Click on ADD TO CART button`, async () => {
            await this.ui.element(SearchPage.ADD_TO_CART_BUTTON, SearchConstants.ADD_TO_CART_BUTTON).click();
        });
    }

    /**
     * Validate ADD TO CART button is visible
     */
    public async validateAddToCartButton(expectedText?: string) {
        await test.step(`Validate ADD TO CART button${expectedText ? ' contains: ' + expectedText : ' is visible'}`, async () => {
            const element = this.ui.element(SearchPage.ADD_TO_CART_BUTTON, SearchConstants.ADD_TO_CART_BUTTON);
            const isVisible = await element.isVisible(60);
            Assert.assertTrue(isVisible, SearchConstants.ADD_TO_CART_BUTTON);
            if (expectedText) {
                const actualText = await element.getTextContent();
                Assert.assertContains(actualText || '', expectedText, SearchConstants.ADD_TO_CART_BUTTON);
            }
        });
    }
}
