import test, { Page } from "@playwright/test";
import UIActions from "@uiActions/UIActions";
import Assert from "@asserts/Assert";
import CommonConstants from "@uiConstants/CommonConstants";
import ContactUsConstants from "@uiConstants/ContactUsConstants";
import ContactUsPage from "@pages/ContactUsPage";

export default class ContactUsSteps {
    private ui: UIActions;

    constructor(private page: Page) {
        this.ui = new UIActions(page);
    }

    /**
     * Launch the ContactUs page
     */
    public async launchPage() {
        await test.step(`Launching ContactUs page`, async () => {
            await this.ui.goto("http://advantageonlineshopping.com/#/", ContactUsConstants.PAGE_TITLE);
        });
    }

    /**
     * Click on CONTACT US link
     */
    public async clickContactUsLink() {
        await test.step(`Click on CONTACT US link`, async () => {
            await this.ui.element(ContactUsPage.CONTACT_US_LINK, ContactUsConstants.CONTACT_US_LINK).click();
        });
    }

    /**
     * Validate CONTACT US link is visible
     */
    public async validateContactUsLink(expectedText?: string) {
        await test.step(`Validate CONTACT US link${expectedText ? ' contains: ' + expectedText : ' is visible'}`, async () => {
            const element = this.ui.element(ContactUsPage.CONTACT_US_LINK, ContactUsConstants.CONTACT_US_LINK);
            const isVisible = await element.isVisible(60);
            Assert.assertTrue(isVisible, ContactUsConstants.CONTACT_US_LINK);
            if (expectedText) {
                const actualText = await element.getTextContent();
                Assert.assertContains(actualText || '', expectedText, ContactUsConstants.CONTACT_US_LINK);
            }
        });
    }

    /**
     * Select option from categoryListboxContactUs dropdown
     */
    public async clickCategorylistboxcontactus(option: string) {
        await test.step(`Select option from categoryListboxContactUs dropdown`, async () => {
            await this.ui.dropdown(ContactUsPage.CATEGORYLISTBOXCONTACTUS, ContactUsConstants.CATEGORYLISTBOXCONTACTUS).selectByValue(option);
        });
    }

    /**
     * Validate categoryListboxContactUs dropdown is visible
     */
    public async validateCategorylistboxcontactus(expectedText?: string) {
        await test.step(`Validate categoryListboxContactUs dropdown${expectedText ? ' contains: ' + expectedText : ' is visible'}`, async () => {
            const element = this.ui.element(ContactUsPage.CATEGORYLISTBOXCONTACTUS, ContactUsConstants.CATEGORYLISTBOXCONTACTUS);
            const isVisible = await element.isVisible(60);
            Assert.assertTrue(isVisible, ContactUsConstants.CATEGORYLISTBOXCONTACTUS);
            if (expectedText) {
                const actualText = await element.getTextContent();
                Assert.assertContains(actualText || '', expectedText, ContactUsConstants.CATEGORYLISTBOXCONTACTUS);
            }
        });
    }

    /**
     * Select option from productListboxContactUs field
     */
    public async clickProductlistboxcontactus(option: string) {
        await test.step(`Select option from productListboxContactUs field`, async () => {
            await this.ui.dropdown(ContactUsPage.PRODUCTLISTBOXCONTACTUS, ContactUsConstants.PRODUCTLISTBOXCONTACTUS).selectByValue(option);
        });
    }

    /**
     * Validate productListboxContactUs field is visible
     */
    public async validateProductlistboxcontactus(expectedText?: string) {
        await test.step(`Validate productListboxContactUs field${expectedText ? ' contains: ' + expectedText : ' is visible'}`, async () => {
            const element = this.ui.element(ContactUsPage.PRODUCTLISTBOXCONTACTUS, ContactUsConstants.PRODUCTLISTBOXCONTACTUS);
            const isVisible = await element.isVisible(60);
            Assert.assertTrue(isVisible, ContactUsConstants.PRODUCTLISTBOXCONTACTUS);
            if (expectedText) {
                const actualText = await element.getTextContent();
                Assert.assertContains(actualText || '', expectedText, ContactUsConstants.PRODUCTLISTBOXCONTACTUS);
            }
        });
    }

    /**
     * Fill emailContactUs field
     */
    public async fillEmailcontactus(text: string) {
        await test.step(`Fill emailContactUs field`, async () => {
            await this.ui.editBox(ContactUsPage.EMAILCONTACTUS, ContactUsConstants.EMAILCONTACTUS).fill(text);
        });
    }

    /**
     * Click on emailContactUs field
     */
    public async clickEmailcontactus() {
        await test.step(`Click on emailContactUs field`, async () => {
            await this.ui.element(ContactUsPage.EMAILCONTACTUS, ContactUsConstants.EMAILCONTACTUS).click();
        });
    }

    /**
     * Validate emailContactUs field is visible
     */
    public async validateEmailcontactus(expectedText?: string) {
        await test.step(`Validate emailContactUs field${expectedText ? ' contains: ' + expectedText : ' is visible'}`, async () => {
            const element = this.ui.element(ContactUsPage.EMAILCONTACTUS, ContactUsConstants.EMAILCONTACTUS);
            const isVisible = await element.isVisible(60);
            Assert.assertTrue(isVisible, ContactUsConstants.EMAILCONTACTUS);
            if (expectedText) {
                const actualText = await element.getTextContent();
                Assert.assertContains(actualText || '', expectedText, ContactUsConstants.EMAILCONTACTUS);
            }
        });
    }

    /**
     * Fill subjectTextareaContactUs field
     */
    public async fillSubjecttextareacontactus(text: string) {
        await test.step(`Fill subjectTextareaContactUs field`, async () => {
            await this.ui.editBox(ContactUsPage.SUBJECTTEXTAREACONTACTUS, ContactUsConstants.SUBJECTTEXTAREACONTACTUS).fill(text);
        });
    }

    /**
     * Click on subjectTextareaContactUs field
     */
    public async clickSubjecttextareacontactus() {
        await test.step(`Click on subjectTextareaContactUs field`, async () => {
            await this.ui.element(ContactUsPage.SUBJECTTEXTAREACONTACTUS, ContactUsConstants.SUBJECTTEXTAREACONTACTUS).click();
        });
    }

    /**
     * Validate subjectTextareaContactUs field is visible
     */
    public async validateSubjecttextareacontactus(expectedText?: string) {
        await test.step(`Validate subjectTextareaContactUs field${expectedText ? ' contains: ' + expectedText : ' is visible'}`, async () => {
            const element = this.ui.element(ContactUsPage.SUBJECTTEXTAREACONTACTUS, ContactUsConstants.SUBJECTTEXTAREACONTACTUS);
            const isVisible = await element.isVisible(60);
            Assert.assertTrue(isVisible, ContactUsConstants.SUBJECTTEXTAREACONTACTUS);
            if (expectedText) {
                const actualText = await element.getTextContent();
                Assert.assertContains(actualText || '', expectedText, ContactUsConstants.SUBJECTTEXTAREACONTACTUS);
            }
        });
    }

    /**
     * Click on SEND button
     */
    public async clickSendButton() {
        await test.step(`Click on SEND button`, async () => {
            await this.ui.element(ContactUsPage.SEND_BUTTON, ContactUsConstants.SEND_BUTTON).click();
        });
    }

    /**
     * Validate SEND button is visible
     */
    public async validateSendButton(expectedText?: string) {
        await test.step(`Validate SEND button${expectedText ? ' contains: ' + expectedText : ' is visible'}`, async () => {
            const element = this.ui.element(ContactUsPage.SEND_BUTTON, ContactUsConstants.SEND_BUTTON);
            const isVisible = await element.isVisible(60);
            Assert.assertTrue(isVisible, ContactUsConstants.SEND_BUTTON);
            if (expectedText) {
                const actualText = await element.getTextContent();
                Assert.assertContains(actualText || '', expectedText, ContactUsConstants.SEND_BUTTON);
            }
        });
    }

    /**
     * Click on CONTINUE SHOPPING link
     */
    public async clickContinueShoppingLink() {
        await test.step(`Click on CONTINUE SHOPPING link`, async () => {
            await this.ui.element(ContactUsPage.CONTINUE_SHOPPING_LINK, ContactUsConstants.CONTINUE_SHOPPING_LINK).click();
        });
    }

    /**
     * Validate CONTINUE SHOPPING link is visible
     */
    public async validateContinueShoppingLink(expectedText?: string) {
        await test.step(`Validate CONTINUE SHOPPING link${expectedText ? ' contains: ' + expectedText : ' is visible'}`, async () => {
            const element = this.ui.element(ContactUsPage.CONTINUE_SHOPPING_LINK, ContactUsConstants.CONTINUE_SHOPPING_LINK);
            const isVisible = await element.isVisible(60);
            Assert.assertTrue(isVisible, ContactUsConstants.CONTINUE_SHOPPING_LINK);
            if (expectedText) {
                const actualText = await element.getTextContent();
                Assert.assertContains(actualText || '', expectedText, ContactUsConstants.CONTINUE_SHOPPING_LINK);
            }
        });
    }
}
