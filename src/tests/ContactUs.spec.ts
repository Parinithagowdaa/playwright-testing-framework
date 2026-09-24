import ContactUsSteps from "@uiSteps/ContactUsSteps";
import { test } from "@base-test";
import Allure from "@allure";

let contactus: ContactUsSteps;
test.beforeEach(async ({ page }) => {
    contactus = new ContactUsSteps(page);
});
/**
 * Test Case: Tc_Login_with_Invaid_emailId
 * Description: Verif that the user is getting invalid email id error after click on Send button
 * Module: Contact Us
 * Type: Functional
 * Browser: Chrome
 * URL: http://advantageonlineshopping.com/
 * Generated: 4/22/2026, 2:43:05 PM
 */
test('Tc_Login_with_Invaid_emailId - Verif that the user is getting invalid email id error after click on Send button', async () => {
    Allure.attachDetails('Verif that the user is getting invalid email id error after click on Send button', 'Tc_Login_with_Invaid_emailId');
    await contactus.launchPage();
});


/**
 * Test Case: Tc_02_Contact us
 * Description: Verify that user can click on Continue shopping button after enter contact us details
 * Module: Contact Us
 * Type: Functional
 * Browser: Chrome
 * URL: http://advantageonlineshopping.com/
 * Generated: 9/23/2026, 3:51:58 PM
 */
test('Tc_02_Contact_us - Verify that user can click on Continue shopping button after enter contact us details', async () => {
    Allure.attachDetails('Verify that user can click on Continue shopping button after enter contact us details', 'Tc_02_Contact_us');
    await contactus.launchPage();
    await contactus.clickContactUsLink();
    await contactus.clickSubjecttextareacontactus();
    await contactus.fillSubjecttextareacontactus('Test sub');
    await contactus.clickCategorylistboxcontactus('object:60');
    await contactus.clickProductlistboxcontactus('object:136');
    await contactus.clickEmailcontactus();
    await contactus.fillEmailcontactus('test@gmail.com');
    await contactus.clickSendButton();
    await contactus.clickContinueShoppingLink();
});
