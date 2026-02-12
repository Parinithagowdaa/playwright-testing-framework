# TESTING FRAMEWORK CONTEXT - AI Code Generation Guide

## Purpose
This document provides comprehensive context for AI agents to understand and generate test automation code for this Playwright TypeScript framework. Follow these patterns and conventions when writing new test cases.

---

## Framework Architecture Overview

### Technology Stack
- **Test Framework**: Playwright 1.55.1 with TypeScript
- **Test Runner**: Playwright Test (@playwright/test)
- **Data Management**: Excel-based (convert-excel-to-json)
- **Reporting**: Allure, HTML, JUnit, JSON
- **Pattern**: Page Object Model + Step Definition Layer
- **Approach**: Data-Driven Testing

### Project Structure
```
src/
├── advantage/              # UI Test Layer (advantageonlineshopping.com)
│   ├── pages/             # Page Object Classes (locator repositories)
│   ├── steps/             # Step Classes (business logic)
│   └── constants/         # UI-specific constants
├── API/
│   ├── REST/              # REST API Testing
│   └── SOAP/              # SOAP API Testing
├── database/              # Database Testing Layer
├── framework/
│   ├── playwright/
│   │   ├── actions/       # Wrapped Playwright operations
│   │   ├── asserts/       # Custom assertion methods
│   │   └── API/           # API testing utilities
│   ├── utils/             # Helper utilities
│   ├── config/            # Test fixtures & base configuration
│   └── logger/            # Logging & listeners
├── resources/
│   ├── data/              # testData.xlsx (primary test data)
│   └── API/               # JSON request templates
└── tests/                 # Test specification files (*.spec.ts)
```

---

## Core Concepts

### 1. Data-Driven Testing Philosophy
- **All test data stored in Excel**: `src/resources/data/testData.xlsx`
- **One sheet per test suite**: Sheet name matches test file name (without .spec.ts)
- **Each row = one test case**: Columns are test parameters
- **Required columns**: TestID, Description, Issue
- **Dynamic columns**: Match your test needs (UserName, Password, etc.)

### 2. TypeScript Path Aliases
Use these import shortcuts (configured in tsconfig.json):

```typescript
@pages/*           → src/advantage/pages/*
@uiSteps/*         → src/advantage/steps/*
@uiConstants/*     → src/advantage/constants/*
@restSteps/*       → src/API/REST/steps/*
@soapSteps/*       → src/API/SOAP/steps/*
@dbSteps/*         → src/database/steps/*
@asserts/*         → src/framework/playwright/asserts/*
@uiActions/*       → src/framework/playwright/actions/*
@apiActions/*      → src/framework/playwright/API/*
@utils/*           → src/framework/utils/*
@allure            → src/framework/reporter/Allure
@base-test         → src/framework/config/base-test
@dbConstants/*     → src/database/constants/*
@restConstants/*   → src/API/REST/constants/*
@soapConstants/*   → src/API/SOAP/constants/*
```

### 3. Three-Layer Architecture

#### Layer 1: Page Classes (Locator Storage)
**Purpose**: Store element selectors as static readonly constants
**Location**: `src/advantage/pages/`
**Naming**: `<PageName>Page.ts`

```typescript
// Example: HomePage.ts
export default class HomePage {
    static readonly USER_ICON = "#menuUser";
    static readonly USER_NAME_TEXTBOX = "[name='username']";
    static readonly PASSWORD_TEXTBOX = "[name='password']";
    static readonly SIGN_IN_BUTTON = "#sign_in_btn";
    static readonly LOGGED_IN_USER = "a#menuUserLink>span.hi-user";
}
```

#### Layer 2: Constants Classes (Element Descriptions)
**Purpose**: Store human-readable element names for logging
**Location**: `src/advantage/constants/`
**Naming**: `<PageName>PageConstants.ts`

```typescript
// Example: HomePageConstants.ts
export default class HomePageConstants {
    static readonly HOME_PAGE = "Home Page";
    static readonly USER_ICON = "User Menu Icon";
    static readonly USER_NAME = "Username Field";
    static readonly PASSWORD = "Password Field";
    static readonly SIGN_IN_BUTTON = "Sign In Button";
}
```

#### Layer 3: Step Classes (Business Logic)
**Purpose**: Implement test actions and validations
**Location**: `src/advantage/steps/`
**Naming**: `<Feature>Steps.ts`

```typescript
// Example: HomeSteps.ts
import test, { Page } from "@playwright/test";
import UIActions from "@uiActions/UIActions";
import Assert from "@asserts/Assert";
import HomePage from "@pages/HomePage";
import HomePageConstants from "@uiConstants/HomePageConstants";

export default class HomeSteps {
    private ui: UIActions;

    constructor(private page: Page) {
        this.ui = new UIActions(page);
    }

    public async login(userName: string, password: string) {
        await test.step(`Login with user ${userName}`, async () => {
            await this.ui.element(HomePage.USER_ICON, HomePageConstants.USER_ICON).click();
            await this.ui.editBox(HomePage.USER_NAME_TEXTBOX, HomePageConstants.USER_NAME).fill(userName);
            await this.ui.editBox(HomePage.PASSWORD_TEXTBOX, HomePageConstants.PASSWORD).fill(password);
            await this.ui.element(HomePage.SIGN_IN_BUTTON, HomePageConstants.SIGN_IN_BUTTON).click();
        });
    }

    public async validateLogin(expectedUser: string) {
        await test.step(`Verify logged in user is ${expectedUser}`, async () => {
            const actualUser = await this.ui.element(HomePage.LOGGED_IN_USER, HomePageConstants.USER_NAME).getTextContent();
            await Assert.assertEquals(actualUser, expectedUser, HomePageConstants.USER_NAME);
        });
    }
}
```

---

## Writing Test Specifications

### Test File Structure Template

```typescript
// Location: src/tests/<FeatureName>Test.spec.ts
import <FeatureName>Steps from "@uiSteps/<FeatureName>Steps";
import { test } from "@base-test";
import Allure from "@allure";
import ExcelUtil from "@utils/ExcelUtil";

// Define sheet name (must match Excel sheet)
const SHEET = "<TestFileName>";

// Declare step class instances
let featureSteps: <FeatureName>Steps;

// Setup hook
test.beforeEach(async ({ page }) => {
    featureSteps = new <FeatureName>Steps(page);
});

// Test Case Pattern 1: Single Test Data
const testData1 = ExcelUtil.getTestData(SHEET, "TC01_TestCaseID");
test(`${testData1.TestID} - ${testData1.Description}`, async () => {
    Allure.attachDetails(testData1.Description, testData1.Issue);
    // Test implementation using testData1 properties
    await featureSteps.performAction(testData1.InputField);
    await featureSteps.validateResult(testData1.ExpectedOutput);
});

// Test Case Pattern 2: Multiple Test Data (Loop)
const testDataArray = ExcelUtil.getTestDataArray(SHEET);
for (const data of testDataArray) {
    test(`${data.TestID} - ${data.Description}`, async ({ page }) => {
        Allure.attachDetails(data.Description, data.Issue);
        const steps = new <FeatureName>Steps(page);
        await steps.performAction(data.InputField);
    });
}
```

### Complete UI Test Example

```typescript
// File: src/tests/LoginTest.spec.ts
import HomeSteps from "@uiSteps/HomeSteps";
import { test } from "@base-test";
import Allure from "@allure";
import ExcelUtil from "@utils/ExcelUtil";

const SHEET = "LoginTest";
let home: HomeSteps;

test.beforeEach(async ({ page }) => {
    home = new HomeSteps(page);
});

// Test 1: Valid Login
const validData = ExcelUtil.getTestData(SHEET, "TC01_ValidLogin");
test(`${validData.TestID} - ${validData.Description}`, async () => {
    Allure.attachDetails(validData.Description, validData.Issue);
    await home.launchApplication();
    await home.login(validData.UserName, validData.Password);
    await home.validateLogin(validData.UserName);
    await home.logout();
});

// Test 2: Invalid Login
const invalidData = ExcelUtil.getTestData(SHEET, "TC02_InvalidLogin");
test(`${invalidData.TestID} - ${invalidData.Description}`, async () => {
    Allure.attachDetails(invalidData.Description, invalidData.Issue);
    await home.launchApplication();
    await home.login(invalidData.UserName, invalidData.Password);
    await home.validateInvalidLogin(invalidData.ErrorMessage);
});
```

---

## UI Interaction Patterns

### UIActions Class Methods

```typescript
const ui = new UIActions(page);

// 1. Generic Element Interactions
await ui.element(selector, description).click();
await ui.element(selector, description).waitFor();
await ui.element(selector, description).isVisible();
await ui.element(selector, description).getTextContent();
await ui.element(selector, description).getAttribute("href");
await ui.element(selector, description).scrollIntoView();

// 2. Text Input (EditBox)
await ui.editBox(selector, description).fill(value);
await ui.editBox(selector, description).clear();
await ui.editBox(selector, description).type(value);

// 3. Dropdown Selection
await ui.dropdown(selector, description).selectByVisibleText(text);
await ui.dropdown(selector, description).selectByValue(value);
await ui.dropdown(selector, description).selectByIndex(index);

// 4. Checkbox Operations
await ui.checkbox(selector, description).check();
await ui.checkbox(selector, description).uncheck();
await ui.checkbox(selector, description).isChecked();

// 5. Alert/Dialog Handling
await ui.alert().accept();
await ui.alert().dismiss();
await ui.alert().getText();

// 6. Navigation
await ui.goto(url, pageDescription);

// 7. Page Management
ui.getPage();              // Returns Page object
ui.setPage(newPage);       // Switch to different page
ui.closePage();            // Close current page
```

### Always Wrap Actions in test.step()

```typescript
public async performComplexAction(param1: string, param2: string) {
    await test.step(`Perform action with ${param1} and ${param2}`, async () => {
        // Action implementation
        await this.ui.element(selector, description).click();
        await this.ui.editBox(selector, description).fill(param1);
    });
}
```

---

## Assertion Patterns

### Assert Class Methods

```typescript
import Assert from "@asserts/Assert";

// 1. Equality Assertions
await Assert.assertEquals(actual, expected, "Field Description");
await Assert.assertNotEquals(actual, unexpected, "Field Description");

// 2. Boolean Assertions
await Assert.assertTrue(condition, "Condition Description");
await Assert.assertFalse(condition, "Condition Description");

// 3. String Assertions
await Assert.assertContains(fullString, substring, "Field Description");
await Assert.assertContainsIgnoreCase(fullString, substring, "Field Description");

// 4. Null/Undefined Checks
await Assert.assertNotNull(value, "Field Description");
await Assert.assertNull(value, "Field Description");

// 5. Soft Assertions (continue on failure)
await Assert.assertEquals(actual, expected, "Field", true);  // Last param = soft assert
await Assert.assertTrue(condition, "Condition", true);
```

---

## API Testing Patterns

### REST API Test Example

```typescript
// File: src/tests/RESTUserTest.spec.ts
import UserSteps from "@restSteps/UserSteps";
import { test } from "@base-test";
import Allure from "@allure";
import ExcelUtil from "@utils/ExcelUtil";
import StringUtil from "@utils/StringUtil";

const SHEET = "RESTUserTest";
let user: UserSteps;

test.beforeEach(async ({ page }) => {
    user = new UserSteps(page);
});

// GET Request Test
const getData = ExcelUtil.getTestData(SHEET, "TC01_GetAllUsers");
test(`${getData.TestID} - ${getData.Description}`, async ({ gData }) => {
    Allure.attachDetails(getData.Description, getData.Issue);
    const response = await user.get(getData.EndPoint, getData.Operation);
    await user.verifyStatusCode(response, getData.Status);
    await user.verifyContentIsNotNull(response, getData.JSONPath, getData.Operation);
    
    // Store data for next test
    const id = await user.extractResponseValue(response, getData.JSONPath, getData.Operation);
    gData.set("id", id);
});

// POST Request Test
const postData = ExcelUtil.getTestData(SHEET, "TC02_CreateUser");
test(`${postData.TestID} - ${postData.Description}`, async ({ gData }) => {
    Allure.attachDetails(postData.Description, postData.Issue);
    
    // Generate dynamic data
    const userName = StringUtil.randomAlphabeticString(8);
    const password = StringUtil.randomAlphanumericString(10);
    
    const requestData = {
        userName: userName,
        password: password,
    };
    
    const response = await user.post(
        postData.EndPoint, 
        postData.RequestBody,  // JSON template file name
        requestData,           // Data to inject into template
        postData.Operation
    );
    
    await user.verifyStatusCode(response, postData.Status);
    const id = await user.extractResponseValue(response, "$.id", postData.Operation);
    gData.set("userId", id);
});

// Using shared data from previous test
const updateData = ExcelUtil.getTestData(SHEET, "TC03_UpdateUser");
test(`${updateData.TestID} - ${updateData.Description}`, async ({ gData }) => {
    Allure.attachDetails(updateData.Description, updateData.Issue);
    
    // Retrieve stored data
    const userId = gData.get("userId");
    const endPoint = StringUtil.formatStringValue(updateData.EndPoint, { ID: userId });
    
    const response = await user.put(endPoint, updateData.RequestBody, {}, updateData.Operation);
    await user.verifyStatusCode(response, updateData.Status);
});
```

### REST Step Class Pattern

```typescript
// File: src/API/REST/steps/UserSteps.ts
import test, { Page } from "@playwright/test";
import APIActions from "@apiActions/APIActions";
import RESTResponse from "@apiActions/RESTResponse";
import Assert from "@asserts/Assert";

export default class UserSteps {
    private api: APIActions;
    private BASE_URL = process.env.REST_API_BASE_URL;

    constructor(private page: Page) {
        this.api = new APIActions(this.page);
    }

    private get header() {
        return this.api.header
            .set("Content-Type", "application/json")
            .set("Accept", "application/json")
            .get();
    }

    public async get(endPoint: string, operation: string): Promise<RESTResponse> {
        let response: RESTResponse;
        await test.step(`GET ${operation}`, async () => {
            response = await this.api.rest.get(this.BASE_URL + endPoint, this.header, operation);
        });
        return response;
    }

    public async post(endPoint: string, requestBodyFile: string, requestData: any, operation: string): Promise<RESTResponse> {
        let response: RESTResponse;
        await test.step(`POST ${operation}`, async () => {
            const requestJSON = await this.api.rest.createRequestBody(requestBodyFile, requestData);
            response = await this.api.rest.post(this.BASE_URL + endPoint, this.header, requestJSON, operation);
        });
        return response;
    }

    public async verifyStatusCode(response: RESTResponse, expectedStatus: string) {
        await test.step(`Verify status code is ${expectedStatus}`, async () => {
            await Assert.assertEquals(response.status.toString(), expectedStatus, "Status Code");
        });
    }

    public async verifyContent(response: RESTResponse, jsonPath: string, expectedValue: string, operation: string) {
        await test.step(`Verify ${operation} response contains ${expectedValue}`, async () => {
            const actualValue = await this.api.rest.extractValue(response.body, jsonPath);
            await Assert.assertEquals(actualValue, expectedValue, operation);
        });
    }

    public async extractResponseValue(response: RESTResponse, jsonPath: string, operation: string): Promise<string> {
        let value: string;
        await test.step(`Extract value from ${operation} response`, async () => {
            value = await this.api.rest.extractValue(response.body, jsonPath);
        });
        return value;
    }
}
```

---

## Utility Classes

### StringUtil Methods

```typescript
import StringUtil from "@utils/StringUtil";

// String Formatting
StringUtil.formatString("Hello {0}, you are {1} years old", "John", "30");
// Returns: "Hello John, you are 30 years old"

StringUtil.formatStringValue("User {ID} has role {ROLE}", { ID: "123", ROLE: "admin" });
// Returns: "User 123 has role admin"

// String Replacement
StringUtil.replaceAll(text, "oldValue", "newValue");

// Random String Generation
StringUtil.randomAlphabeticString(10);           // Random letters only
StringUtil.randomAlphanumericString(12);         // Random letters + numbers
StringUtil.randomNumberString(8);                // Random numbers only
StringUtil.randomString(15);                     // Random alphanumeric
```

### ExcelUtil Methods

```typescript
import ExcelUtil from "@utils/ExcelUtil";

// Get single test case data
const testData = ExcelUtil.getTestData("SheetName", "TestCaseID");
// Returns object with properties matching Excel column headers
// Access: testData.UserName, testData.Password, etc.

// Get all test cases from sheet
const allTestData = ExcelUtil.getTestDataArray("SheetName");
// Returns array of objects
// Use in loop: for (const data of allTestData) { ... }
```

### Allure Reporting

```typescript
import Allure from "@allure";

// Attach test metadata
Allure.attachDetails(description, issueNumber);

// Attach files to report
await Allure.attachPNG("Screenshot Name", filePath);
await Allure.attachPDF("PDF Report", filePath);
```

---

## Fixture Usage (gData)

### Purpose
Share data between tests in the same worker thread

### Usage Pattern

```typescript
// Test 1: Store data
test('Create resource', async ({ gData }) => {
    const resourceId = await createResource();
    gData.set("resourceId", resourceId);
    gData.set("resourceName", "TestResource");
});

// Test 2: Retrieve data
test('Update resource', async ({ gData }) => {
    const resourceId = gData.get("resourceId");
    const resourceName = gData.get("resourceName");
    await updateResource(resourceId, resourceName);
});

// Pre-defined values in gData
gData.get("SPACE");        // Returns " "
gData.get("HYPHEN");       // Returns "-"
gData.get("UNDERSCORE");   // Returns "_"
```

---

## Common Patterns & Best Practices

### 1. Page Object Pattern
```typescript
// Step 1: Create Page class with selectors
export default class CheckoutPage {
    static readonly PRODUCT_NAME = ".product-title";
    static readonly ADD_TO_CART_BUTTON = "#addToCartBtn";
    static readonly CART_ICON = ".shopping-cart-icon";
}

// Step 2: Create Constants class
export default class CheckoutPageConstants {
    static readonly CHECKOUT_PAGE = "Checkout Page";
    static readonly PRODUCT_NAME = "Product Name";
    static readonly ADD_TO_CART_BUTTON = "Add to Cart Button";
}

// Step 3: Create Steps class
export default class CheckoutSteps {
    private ui: UIActions;
    
    constructor(private page: Page) {
        this.ui = new UIActions(page);
    }
    
    public async addProductToCart(productName: string) {
        await test.step(`Add ${productName} to cart`, async () => {
            await this.ui.element(CheckoutPage.ADD_TO_CART_BUTTON, 
                CheckoutPageConstants.ADD_TO_CART_BUTTON).click();
        });
    }
}

// Step 4: Use in test
const checkout = new CheckoutSteps(page);
await checkout.addProductToCart(testData.ProductName);
```

### 2. Dynamic Locator Handling
```typescript
// When locator contains dynamic values
const dynamicSelector = `[data-id='${productId}']`;
await ui.element(dynamicSelector, "Product Item").click();

// Using string formatting
const formattedEndpoint = StringUtil.formatStringValue(
    "/api/users/{ID}/orders/{ORDER_ID}", 
    { ID: userId, ORDER_ID: orderId }
);
```

### 3. Conditional Logic
```typescript
public async selectOptionsBasedOnData(enableOption: string) {
    await test.step(`Configure options`, async () => {
        // Check if checkbox should be checked
        if (enableOption.toLowerCase() === "true") {
            await this.ui.checkbox(selector, description).check();
        } else {
            await this.ui.checkbox(selector, description).uncheck();
        }
    });
}
```

### 4. Multiple Page Interactions
```typescript
test('Multi-page flow', async ({ page }) => {
    const home = new HomeSteps(page);
    await home.launchApplication();
    await home.navigateToProducts();
    
    const products = new ProductSteps(page);
    await products.selectProduct(testData.ProductName);
    await products.addToCart();
    
    const checkout = new CheckoutSteps(page);
    await checkout.proceedToCheckout();
    await checkout.completeOrder(testData);
});
```

### 5. Wait and Synchronization
```typescript
// Wait for element
await ui.element(selector, description).waitFor();

// Wait for navigation
await page.waitForLoadState('networkidle');

// Custom wait
await page.waitForTimeout(2000);  // Use sparingly

// Wait for specific condition
await page.waitForFunction(() => document.querySelector('.loaded'));
```

---

## Environment Configuration

### Accessing Environment Variables

```typescript
// Application URLs
process.env.BASE_URL              // UI application URL
process.env.REST_API_BASE_URL     // REST API base URL
process.env.SOAP_API_BASE_URL     // SOAP API base URL

// Browser Settings
process.env.BROWSER               // chrome|firefox|edge|webkit
process.env.HEADLESS              // true|false

// Timeouts (in minutes)
process.env.TEST_TIMEOUT          // Overall test timeout
process.env.ACTION_TIMEOUT        // Element action timeout
process.env.NAVIGATION_TIMEOUT    // Page navigation timeout

// Execution
process.env.PARALLEL_THREAD       // Number of parallel workers
process.env.RETRIES              // Number of retries on failure

// Other
process.env.LINK                 // Base URL for issue tracking
process.env.TEST_NAME            // Test name filter for local execution
```

---

## Complete Test Creation Checklist

When creating a new test suite, follow these steps:

### 1. Define Test Data in Excel
- Open `src/resources/data/testData.xlsx`
- Create new sheet named `<FeatureName>Test`
- Add columns: TestID, Description, Issue, [your input fields], [expected outputs]
- Add test case rows

### 2. Create Page Class (if needed)
- File: `src/advantage/pages/<PageName>Page.ts`
- Define all element selectors as static readonly
- Use descriptive names

### 3. Create Constants Class
- File: `src/advantage/constants/<PageName>PageConstants.ts`
- Mirror page class structure
- Provide human-readable descriptions

### 4. Create Steps Class
- File: `src/advantage/steps/<Feature>Steps.ts`
- Import required classes
- Create constructor accepting Page
- Initialize UIActions
- Implement public methods for each action
- Wrap all actions in test.step()
- Add validations using Assert

### 5. Create Test Specification
- File: `src/tests/<Feature>Test.spec.ts`
- Import steps class
- Import utilities (ExcelUtil, Allure, etc.)
- Define sheet constant
- Add beforeEach for setup
- Create tests using ExcelUtil
- Add Allure details
- Implement test logic using steps

### 6. Run and Verify
```bash
# Run single test locally
TEST_NAME=<FeatureName> npm run local:test

# Run full suite
npm run test

# Generate report
npm run report
```

---

## Example: Complete New Test Suite Creation

### Scenario: Testing Product Search Feature

#### Step 1: Excel Data (Sheet: "SearchTest")
| TestID | Description | Issue | SearchTerm | ExpectedResultCount |
|--------|-------------|-------|------------|---------------------|
| TC01_ValidSearch | Valid product search | JIRA-123 | laptop | 5 |
| TC02_NoResults | Search with no results | JIRA-124 | xyzabc | 0 |

#### Step 2: SearchPage.ts
```typescript
export default class SearchPage {
    static readonly SEARCH_BOX = "#searchInput";
    static readonly SEARCH_BUTTON = "button[type='submit']";
    static readonly SEARCH_RESULTS = ".search-result-item";
    static readonly NO_RESULTS_MESSAGE = ".no-results";
    static readonly RESULT_COUNT = ".result-count";
}
```

#### Step 3: SearchPageConstants.ts
```typescript
export default class SearchPageConstants {
    static readonly SEARCH_PAGE = "Search Page";
    static readonly SEARCH_BOX = "Search Input Box";
    static readonly SEARCH_BUTTON = "Search Button";
    static readonly SEARCH_RESULTS = "Search Results";
    static readonly NO_RESULTS_MESSAGE = "No Results Message";
}
```

#### Step 4: SearchSteps.ts
```typescript
import test, { Page } from "@playwright/test";
import UIActions from "@uiActions/UIActions";
import Assert from "@asserts/Assert";
import SearchPage from "@pages/SearchPage";
import SearchPageConstants from "@uiConstants/SearchPageConstants";

export default class SearchSteps {
    private ui: UIActions;

    constructor(private page: Page) {
        this.ui = new UIActions(page);
    }

    public async performSearch(searchTerm: string) {
        await test.step(`Search for "${searchTerm}"`, async () => {
            await this.ui.editBox(SearchPage.SEARCH_BOX, SearchPageConstants.SEARCH_BOX).fill(searchTerm);
            await this.ui.element(SearchPage.SEARCH_BUTTON, SearchPageConstants.SEARCH_BUTTON).click();
        });
    }

    public async validateResultCount(expectedCount: string) {
        await test.step(`Verify search results count is ${expectedCount}`, async () => {
            const results = await this.page.$$(SearchPage.SEARCH_RESULTS);
            await Assert.assertEquals(results.length.toString(), expectedCount, SearchPageConstants.SEARCH_RESULTS);
        });
    }

    public async validateNoResults() {
        await test.step(`Verify no results message is displayed`, async () => {
            const isVisible = await this.ui.element(SearchPage.NO_RESULTS_MESSAGE, 
                SearchPageConstants.NO_RESULTS_MESSAGE).isVisible();
            await Assert.assertTrue(isVisible, SearchPageConstants.NO_RESULTS_MESSAGE);
        });
    }
}
```

#### Step 5: SearchTest.spec.ts
```typescript
import SearchSteps from "@uiSteps/SearchSteps";
import { test } from "@base-test";
import Allure from "@allure";
import ExcelUtil from "@utils/ExcelUtil";

const SHEET = "SearchTest";
let search: SearchSteps;

test.beforeEach(async ({ page }) => {
    search = new SearchSteps(page);
});

const validSearchData = ExcelUtil.getTestData(SHEET, "TC01_ValidSearch");
test(`${validSearchData.TestID} - ${validSearchData.Description}`, async () => {
    Allure.attachDetails(validSearchData.Description, validSearchData.Issue);
    await search.performSearch(validSearchData.SearchTerm);
    await search.validateResultCount(validSearchData.ExpectedResultCount);
});

const noResultsData = ExcelUtil.getTestData(SHEET, "TC02_NoResults");
test(`${noResultsData.TestID} - ${noResultsData.Description}`, async () => {
    Allure.attachDetails(noResultsData.Description, noResultsData.Issue);
    await search.performSearch(noResultsData.SearchTerm);
    await search.validateNoResults();
});
```

---

## Troubleshooting Common Issues

### 1. Import Path Issues
- Always use @ aliases defined in tsconfig.json
- Example: `import HomeSteps from "@uiSteps/HomeSteps";`

### 2. Test Data Not Found
- Verify sheet name matches const SHEET value
- Verify TestID matches Excel exactly (case-sensitive)
- Check Excel file path: `src/resources/data/testData.xlsx`

### 3. Element Not Found
- Verify selector in Page class
- Use browser dev tools to confirm selector accuracy
- Add wait: `await ui.element(selector, desc).waitFor();`

### 4. Assertion Failures
- Check expected vs actual values
- Use soft assertions for non-critical checks
- Verify data types match (string vs number)

---

## Quick Reference: Common Imports

```typescript
// Always include these for test specs
import { test } from "@base-test";
import Allure from "@allure";
import ExcelUtil from "@utils/ExcelUtil";

// For UI tests
import <Feature>Steps from "@uiSteps/<Feature>Steps";

// For API tests
import UserSteps from "@restSteps/UserSteps";
import APIActions from "@apiActions/APIActions";

// For Step classes
import test, { Page } from "@playwright/test";
import UIActions from "@uiActions/UIActions";
import Assert from "@asserts/Assert";
import <PageName>Page from "@pages/<PageName>Page";
import <PageName>PageConstants from "@uiConstants/<PageName>PageConstants";

// Utilities
import StringUtil from "@utils/StringUtil";
import CommonConstants from "@uiConstants/CommonConstants";
```

---

## Summary: AI Code Generation Guidelines

When generating test code:

1. **Follow the three-layer pattern**: Page → Constants → Steps → Test Spec
2. **Always use Excel for test data**: Never hardcode test data in specs
3. **Use TypeScript path aliases**: Import with @ prefixes
4. **Wrap actions in test.step()**: For better reporting
5. **Use descriptive names**: Element descriptions should be human-readable
6. **Import only what's needed**: Keep imports clean and organized
7. **Follow naming conventions**: 
   - Pages: `<PageName>Page.ts`
   - Constants: `<PageName>PageConstants.ts`
   - Steps: `<Feature>Steps.ts`
   - Tests: `<Feature>Test.spec.ts`
   - Sheet names: Match test file name without extension
8. **Use proper assertions**: Assert class methods, not raw expect()
9. **Add Allure metadata**: Always call `Allure.attachDetails()` in tests
10. **Handle dynamic data**: Use StringUtil for randomization and formatting

---

## End of Framework Context

This document provides all necessary patterns and conventions for generating test automation code in this Playwright TypeScript framework. Follow these guidelines to ensure consistency and maintainability.
