import test, { Page } from "@playwright/test";
import UIActions from "@uiActions/UIActions";
import ProductPage from "@pages/ProductPage";
import ProductPageConstants from "@uiConstants/ProductPageConstants";

export default class ProductSteps {
    private ui: UIActions;

    constructor(private page: Page) {
        this.ui = new UIActions(page);
    }

    /**
     * Click on Popular Items link
     */
    public async clickPopularItems() {
        await test.step(`Click on Popular Items`, async () => {
            await this.ui.element(ProductPage.POPULAR_ITEMS_LINK, ProductPageConstants.POPULAR_ITEMS_LINK).click();
        });
    }

    /**
     * Click on View Details link
     */
    public async clickViewDetails() {
        await test.step(`Click on View Details`, async () => {
            await this.ui.element(ProductPage.VIEW_DETAILS_LINK, ProductPageConstants.VIEW_DETAILS_LINK).click();
        });
    }

    /**
     * Click on Tablets Category
     */
    public async clickTabletsCategory() {
        await test.step(`Click on Tablets Category`, async () => {
            await this.ui.element(ProductPage.TABLETS_CATEGORY, ProductPageConstants.TABLETS_CATEGORY).click();
        });
    }

    /**
     * Click on Laptops Category
     */
    public async clickLaptopsCategory() {
        await test.step(`Click on Laptops Category`, async () => {
            await this.ui.element(ProductPage.LAPTOPS_CATEGORY, ProductPageConstants.LAPTOPS_CATEGORY).click();
        });
    }

    /**
     * Click on See Offer button
     */
    public async clickSeeOffer() {
        await test.step(`Click on See Offer button`, async () => {
            await this.ui.element(ProductPage.SEE_OFFER_BUTTON, ProductPageConstants.SEE_OFFER_BUTTON).click();
        });
    }

    /**
     * Click on Buy Now button
     */
    public async clickBuyNow() {
        await test.step(`Click on Buy Now button`, async () => {
            await this.ui.element(ProductPage.BUY_NOW_BUTTON, ProductPageConstants.BUY_NOW_BUTTON).click();
        });
    }

    /**
     * Click on Add to Cart button
     */
    public async clickAddToCart() {
        await test.step(`Click on Add To Cart button`, async () => {
            await this.ui.element(ProductPage.ADD_TO_CART_BUTTON, ProductPageConstants.ADD_TO_CART_BUTTON).click();
        });
    }

    /**
     * Click on Product Image
     */
    public async clickProductImage() {
        await test.step(`Click on Product Image`, async () => {
            await this.ui.element(ProductPage.PRODUCT_IMAGE, ProductPageConstants.PRODUCT_IMAGE).click();
        });
    }

    /**
     * Increase product quantity
     */
    public async increaseQuantity() {
        await test.step(`Increase product quantity`, async () => {
            await this.ui.element(ProductPage.QUANTITY_PLUS, ProductPageConstants.QUANTITY_PLUS).click();
        });
    }

    /**
     * Decrease product quantity
     */
    public async decreaseQuantity() {
        await test.step(`Decrease product quantity`, async () => {
            await this.ui.element(ProductPage.QUANTITY_MINUS, ProductPageConstants.QUANTITY_MINUS).click();
        });
    }

    /**
     * Click on Banner
     */
    public async clickBanner() {
        await test.step(`Click on Banner`, async () => {
            await this.ui.element(ProductPage.BANNER, ProductPageConstants.BANNER).click();
        });
    }

    /**
     * Get product name
     */
    public async getProductName(): Promise<string> {
        return test.step(`Get Product Name`, async () => {
            const name = await this.ui.element(
                ProductPage.PRODUCT_NAME, 
                ProductPageConstants.PRODUCT_NAME,
            ).getTextContent();
            return name;
        });
    }

    /**
     * Get product price
     */
    public async getProductPrice(): Promise<string> {
        return test.step(`Get Product Price`, async () => {
            const price = await this.ui.element(
                ProductPage.PRODUCT_PRICE, 
                ProductPageConstants.PRODUCT_PRICE,
            ).getTextContent();
            return price;
        });
    }
}
