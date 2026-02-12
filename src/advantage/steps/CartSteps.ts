import test, { Page } from "@playwright/test";
import UIActions from "@uiActions/UIActions";
import Assert from "@asserts/Assert";
import CommonConstants from "@uiConstants/CommonConstants";
import CartPage from "@pages/CartPage";
import CartPageConstants from "@uiConstants/CartPageConstants";

export default class CartSteps {
    private ui: UIActions;

    constructor(private page: Page) {
        this.ui = new UIActions(page);
    }

    /**
     * Click on Shopping Cart icon
     */
    public async openCart() {
        await test.step(`Click on Shopping Cart icon`, async () => {
            await this.ui.element(CartPage.CART_ICON, CartPageConstants.CART_ICON).click();
        });
    }

    /**
     * Click on Checkout button
     */
    public async clickCheckout() {
        await test.step(`Click on Checkout button`, async () => {
            await this.ui.element(CartPage.CHECKOUT_BUTTON, CartPageConstants.CHECKOUT_BUTTON).click();
        });
    }

    /**
     * Remove product from cart
     */
    public async removeProduct() {
        await test.step(`Remove product from cart`, async () => {
            await this.ui.element(CartPage.REMOVE_PRODUCT_BUTTON, CartPageConstants.REMOVE_PRODUCT_BUTTON).click();
        });
    }

    /**
     * Click Edit Cart
     */
    public async editCart() {
        await test.step(`Click Edit Cart`, async () => {
            await this.ui.element(CartPage.EDIT_CART, CartPageConstants.EDIT_CART).click();
        });
    }

    /**
     * Continue Shopping
     */
    public async continueShopping() {
        await test.step(`Continue Shopping`, async () => {
            await this.ui.element(CartPage.CONTINUE_SHOPPING, CartPageConstants.CONTINUE_SHOPPING).click();
        });
    }

    /**
     * Get cart total
     */
    public async getCartTotal(): Promise<string> {
        return test.step(`Get cart total amount`, async () => {
            const total = await this.ui.element(
                CartPage.CART_TOTAL, 
                CartPageConstants.CART_TOTAL,
            ).getTextContent();
            return total;
        });
    }

    /**
     * Verify product is in cart
     */
    public async verifyProductInCart() {
        await test.step(`Verify product is added to cart`, async () => {
            const isVisible = await this.ui.element(
                CartPage.CART_PRODUCT, 
                CartPageConstants.CART_PRODUCT,
            ).isVisible(CommonConstants.TWO);
            await Assert.assertTrue(isVisible, "Product should be visible in cart");
        });
    }
}
