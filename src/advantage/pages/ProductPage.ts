export default class ProductPage {
    // Category Links
    static readonly POPULAR_ITEMS_LINK = "a[name='popular_items']";
    static readonly TABLETS_CATEGORY = "#tabletsTxt";
    static readonly LAPTOPS_CATEGORY = "#laptopsTxt";
    static readonly HEADPHONES_CATEGORY = "#headphonesTxt";
    static readonly MICE_CATEGORY = "#miceTxt";
    static readonly SPEAKERS_CATEGORY = "#speakersTxt";
    
    // Product Actions
    static readonly VIEW_DETAILS_LINK = "a.viewDetails";
    static readonly BUY_NOW_BUTTON = "button[name='buy_now']";
    static readonly SEE_OFFER_BUTTON = "button.see_offer_btn";
    static readonly ADD_TO_CART_BUTTON = "button[name='save_to_cart']";
    
    // Product Details
    static readonly PRODUCT_IMAGE = "#mainImg";
    static readonly QUANTITY_PLUS = ".plus";
    static readonly QUANTITY_MINUS = ".minus";
    static readonly PRODUCT_NAME = "h1[class='roboto-regular screen768']";
    static readonly PRODUCT_PRICE = "h2.roboto-thin";
    
    // Banner
    static readonly BANNER = "a.banner";
}
