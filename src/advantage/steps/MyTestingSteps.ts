import test, { Page } from "@playwright/test";
import UIActions from "@uiActions/UIActions";
import Assert from "@asserts/Assert";
import CommonConstants from "@uiConstants/CommonConstants";
import MyTestingConstants from "@uiConstants/MyTestingConstants";
import MyTestingPage from "@pages/MyTestingPage";

export default class MyTestingSteps {    
    private ui: UIActions;

    constructor(private page: Page) {
        this.ui = new UIActions(page);
    }

    /**
     * Add your step methods here
     * Example method:
     */
    // public async performAction() {
    //     await test.step(`Performing action`, async () => {
    //         await this.ui.element(MyTestingPage.ELEMENT_SELECTOR, MyTestingConstants.ELEMENT_NAME).click();
    //     });
    // }

    /**
     * Launch the MyTesting page
     */
    public async launchPage() {
        await test.step(`Launching MyTesting page`, async () => {
            await this.ui.goto("http://advantageonlineshopping.com/#/", MyTestingConstants.PAGE_TITLE);
        });
    }

    /**
     * Click on POPULAR ITEMS link
     */
    public async clickPopularitemslink() {
        await test.step(`Click on POPULAR ITEMS link`, async () => {
            await this.ui.element(MyTestingPage.POPULAR_ITEMS_LINK, MyTestingConstants.POPULAR_ITEMS_LINK).click();
        });
    }

    /**
     * Click on CONTACT US link
     */
    public async clickContactuslink() {
        await test.step(`Click on CONTACT US link`, async () => {
            await this.ui.element(MyTestingPage.CONTACT_US_LINK, MyTestingConstants.CONTACT_US_LINK).click();
        });
    }

    /**
     * Click on * Subject text
     */
    public async clickSubjecttext() {
        await test.step(`Click on * Subject text`, async () => {
            await this.ui.element(MyTestingPage._SUBJECT_TEXT, MyTestingConstants._SUBJECT_TEXT).click();
        });
    }

    /**
     * Select option from category dropdown
     */
    public async selectCategorylistboxcontactus(option: string) {
        await test.step(`Select option from category dropdown`, async () => {
            await this.ui.element(MyTestingPage.CATEGORYLISTBOXCONTACTUS, MyTestingConstants.CATEGORYLISTBOXCONTACTUS).selectOption(option);
        });
    }

    /**
     * Click on subject textarea
     */
    public async clickSubjecttextareacontactus() {
        await test.step(`Click on subject textarea`, async () => {
            await this.ui.element(MyTestingPage.SUBJECTTEXTAREACONTACTUS, MyTestingConstants.SUBJECTTEXTAREACONTACTUS).click();
        });
    }

    /**
     * Click on Special-offer link
     */
    public async clickSpecialofferlink() {
        await test.step(`Click on Special-offer link`, async () => {
            await this.ui.element(MyTestingPage.SPECIAL_OFFER_LINK, MyTestingConstants.SPECIAL_OFFER_LINK).click();
        });
    }

    /**
     * Click on View Details link
     */
    public async clickViewdetailslink() {
        await test.step(`Click on View Details link`, async () => {
            await this.ui.element(MyTestingPage.VIEW_DETAILS_LINK, MyTestingConstants.VIEW_DETAILS_LINK).click();
        });
    }

    /**
     * Click on HP ELITEPAD 1000 G2 TABLET heading
     */
    public async clickHpelitepad1000g2tabletheading() {
        await test.step(`Click on HP ELITEPAD 1000 G2 TABLET heading`, async () => {
            await this.ui.element(MyTestingPage.HP_ELITEPAD_1000_G2_TABLET_HEADING, MyTestingConstants.HP_ELITEPAD_1000_G2_TABLET_HEADING).click();
        });
    }

    /**
     * Click on HP ELITEPAD 1000 G2 TABLET text
     */
    public async clickHpelitepad1000g2tablettext() {
        await test.step(`Click on HP ELITEPAD 1000 G2 TABLET text`, async () => {
            await this.ui.element(MyTestingPage.HP_ELITEPAD_1000_G2_TABLET_TEXT, MyTestingConstants.HP_ELITEPAD_1000_G2_TABLET_TEXT).click();
        });
    }
}
