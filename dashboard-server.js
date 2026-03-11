const http = require('http');
const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');

const PORT = 3456;

// Function to extract elements from Playwright code
function extractElementsFromCode(code) {
    const elements = [];
    const seenSelectors = new Set();

    let counter = 1;

    // Helper to add element if not seen
    function addElement(key, locatorType, locatorValue, nth, actionHint) {
        const uniqueKey = `${locatorType}:${typeof locatorValue === 'object' ? JSON.stringify(locatorValue) : locatorValue}:${nth ?? '0'}`;
        if (seenSelectors.has(uniqueKey)) return;
        seenSelectors.add(uniqueKey);

        const elementName = `${(actionHint || 'ELEMENT').toUpperCase()}_${counter}`;
        counter += 1;

        // Build a human-friendly description using locator strategy
        let description = '';
        if (locatorType === 'getByRole') {
            description = `${locatorValue.name} ${locatorValue.role}`;
        } else if (locatorType === 'getByTitle') {
            description = `${locatorValue} colour`;
        } else if (locatorType === 'getByText') {
            description = `${locatorValue} element`;
        } else if (locatorType === 'getByLabel') {
            description = `${locatorValue} field`;
        } else if (locatorType === 'getByPlaceholder') {
            description = `field with placeholder "${locatorValue}"`;
        } else if (locatorType === 'locator') {
            // Friendly mapping for common selectors
            if (typeof locatorValue === 'string') {
                if (locatorValue.startsWith('#')) {
                    description = `element with id "${locatorValue.substring(1)}"`;
                } else if (locatorValue.startsWith('.')) {
                    const cls = locatorValue.substring(1);
                    if (/plus/i.test(cls)) description = `+ icon`;
                    else if (/minus/i.test(cls)) description = `- icon`;
                    else if (/cart|shopping-cart|cart-icon/i.test(cls)) description = `cart icon`;
                    else description = `element with class "${cls}"`;
                } else if (locatorValue.includes('[name=')) {
                    const m = locatorValue.match(/\[name=['"]?(.*?)['"]?\]/);
                    description = m ? `element with name "${m[1]}"` : `locator('${locatorValue}')`;
                } else {
                    description = `locator('${locatorValue}')`;
                }
            } else {
                description = `locator`;
            }
        } else if (locatorType === 'click' || locatorType === 'fill' || locatorType === 'type') {
            description = `${locatorType}('${locatorValue}')`;
        } else {
            description = `${locatorType}('${locatorValue}')`;
        }

        elements.push({
            name: elementName,
            selector: locatorValue,
            locatorType,
            locatorValue,
            nth: nth ?? null,
            type: (actionHint || 'ELEMENT').toUpperCase(),
            description,
        });
    }

    // Patterns that capture locator strategy, value and optional nth(index)
    const patterns = [
        { type: 'getByRole', regex: /page\.getByRole\(['"](\w+)['"]\s*,\s*\{\s*name:\s*['"]([^'\"]+)['"]\s*\}\)(?:\.nth\((\d+)\))?/g },
        { type: 'getByTitle', regex: /page\.getByTitle\(['"]([^'\"]+)['"]\)(?:\.nth\((\d+)\))?/g },
        { type: 'getByText', regex: /page\.getByText\(['"]([^'\"]+)['"]\)(?:\.nth\((\d+)\))?/g },
        { type: 'getByLabel', regex: /page\.getByLabel\(['"]([^'\"]+)['"]\)(?:\.nth\((\d+)\))?/g },
        { type: 'getByPlaceholder', regex: /page\.getByPlaceholder\(['"]([^'\"]+)['"]\)(?:\.nth\((\d+)\))?/g },
        { type: 'locator', regex: /page\.locator\(['"]([^'\"]+)['"]\)(?:\.nth\((\d+)\))?/g },
        { type: 'click', regex: /page\.click\(['"]([^'\"]+)['"]\)(?:\.nth\((\d+)\))?/g },
        { type: 'fill', regex: /page\.fill\(['"]([^'\"]+)['"]\)(?:\.nth\((\d+)\))?/g },
        { type: 'type', regex: /page\.type\(['"]([^'\"]+)['"]\)(?:\.nth\((\d+)\))?/g },
    ];

    patterns.forEach((pat) => {
        let match;
        while ((match = pat.regex.exec(code)) !== null) {
            if (pat.type === 'getByRole') {
                const role = match[1];
                const name = match[2];
                const nth = match[3] ? parseInt(match[3], 10) : null;
                addElement(`${role}:${name}`, 'getByRole', { role, name }, nth, 'ELEMENT');
            } else {
                const value = match[1];
                const nth = match[2] ? parseInt(match[2], 10) : null;

                // Infer action hint from surrounding code if possible
                let actionHint = 'ELEMENT';
                const lookbackIndex = Math.max(0, pat.regex.lastIndex - 200);
                const snippet = code.slice(lookbackIndex, pat.regex.lastIndex + 200);
                if (/\.click\(\)/.test(snippet) || pat.type === 'click') actionHint = 'BUTTON';
                if (/\.fill\(\)/.test(snippet) || pat.type === 'fill') actionHint = 'TEXTBOX';
                if (/\.type\(\)/.test(snippet) || pat.type === 'type') actionHint = 'TEXTBOX';

                addElement(value, pat.type, value, nth, actionHint);
            }
        }
    });

    return elements;
}

// Helper function to remove duplicate imports from spec file content
function removeDuplicateImports(content) {
    const lines = content.split('\n');
    const imports = new Set();
    const importLines = [];
    const nonImportLines = [];
    let inImportSection = true;
    
    for (const line of lines) {
        const trimmedLine = line.trim();
        
        // Check if line is an import statement
        if (trimmedLine.startsWith('import ') && trimmedLine.includes('from')) {
            // Normalize the import statement for comparison
            const normalizedImport = trimmedLine.replace(/\s+/g, ' ');
            if (!imports.has(normalizedImport)) {
                imports.add(normalizedImport);
                importLines.push(line);
            }
            // Skip duplicate imports
        } else {
            // Once we hit non-import content, mark that we're past imports
            if (trimmedLine.length > 0 && !trimmedLine.startsWith('//') && !trimmedLine.startsWith('/*') && !trimmedLine.startsWith('*')) {
                inImportSection = false;
            }
            nonImportLines.push(line);
        }
    }
    
    // Combine: imports at top, then rest of content
    return [...importLines, '', ...nonImportLines].join('\n');
}

// Helper function to extract and remove imports from playwright code
function extractAndRemoveImports(playwrightCode) {
    const lines = playwrightCode.split('\n');
    const imports = [];
    const codeWithoutImports = [];
    
    for (const line of lines) {
        const trimmedLine = line.trim();
        if (trimmedLine.startsWith('import ') && trimmedLine.includes('from')) {
            imports.push(trimmedLine);
        } else {
            codeWithoutImports.push(line);
        }
    }
    
    return {
        imports: imports,
        code: codeWithoutImports.join('\n').trim()
    };
}

// Helper function to create or update spec file
function createOrUpdateSpecFile(testCaseData, moduleName, testCaseType, testsDir) {
    const specFile = testCaseData.specFile;
    let testFileName, testFilePath, isNewFile;
    
    // Determine the file name and path
    if (specFile && specFile.trim() !== '') {
        // Use existing selected file
        testFileName = specFile;
        testFilePath = path.join(testsDir, testFileName);
        isNewFile = false;
    } else {
        // Create new file based on module name
        testFileName = moduleName.replace(/\s+/g, '') + '.spec.ts';
        testFilePath = path.join(testsDir, testFileName);
        isNewFile = !fs.existsSync(testFilePath);
    }
    
    // Extract imports from playwright code and get clean code
    const { imports: extractedImports, code: cleanCode } = extractAndRemoveImports(testCaseData.playwrightCode);
    
    // Build the test case content WITHOUT imports
    const testCaseContent = `
/**
 * Test Case: ${testCaseData.name}
 * Description: ${testCaseData.description}
 * Module: ${moduleName}
 * Type: ${testCaseType}
 * Browser: ${testCaseData.browser}
 * URL: ${testCaseData.url}
 * Generated: ${new Date(testCaseData.timestamp).toLocaleString()}
 */

${cleanCode}
`;

    let finalContent;
    
    if (isNewFile) {
        // Create new file - collect all imports
        const allImports = new Set(['import { test, expect } from \'@playwright/test\';']);
        extractedImports.forEach(imp => allImports.add(imp));
        
        const importSection = Array.from(allImports).join('\n');
        finalContent = `${importSection}\n${testCaseContent}`;
    } else {
        // Append to existing file
        const existingContent = fs.readFileSync(testFilePath, 'utf8');
        
        // Add extracted imports to the content (will be deduplicated later)
        const importsSection = extractedImports.length > 0 ? extractedImports.join('\n') + '\n' : '';
        const combinedContent = importsSection + existingContent + '\n' + testCaseContent;
        
        // Remove duplicate imports and organize
        finalContent = removeDuplicateImports(combinedContent);
    }
    
    // Write the file
    fs.writeFileSync(testFilePath, finalContent, 'utf8');
    
    return {
        testFileName: testFileName,
        testFilePath: testFilePath,
        isNewFile: isNewFile
    };
}

// Helper function to parse Playwright code and extract locators
function parsePlaywrightCode(specFileContent) {
    const locators = [];
    const actions = [];
    let url = '';
    
    // Extract URL from goto()
    const gotoMatch = specFileContent.match(/page\.goto\(['"](.*?)['"]/);
    if (gotoMatch) {
        url = gotoMatch[1];
    }
    
    // Pattern for getByRole
    const getByRoleRegex = /page\.getByRole\(['"](\w+)['"]\s*,\s*\{\s*name:\s*['"]([^'"]+)['"]\s*\}\)/g;
    let match;
    while ((match = getByRoleRegex.exec(specFileContent)) !== null) {
        const role = match[1];
        const name = match[2];
        const constantName = name.replace(/[^a-zA-Z0-9]+/g, '_').toUpperCase() + '_' + role.toUpperCase();
        const selector = `page.getByRole('${role}', { name: '${name}' })`;
        
        if (!locators.some(l => l.constantName === constantName)) {
            locators.push({
                constantName,
                description: `${name} ${role}`,
                selector: selector,
                selectorType: 'getByRole'
            });
        }
    }
    
    // Pattern for getByText
    const getByTextRegex = /page\.getByText\(['"]([^'"]+)['"]\)/g;
    while ((match = getByTextRegex.exec(specFileContent)) !== null) {
        const text = match[1];
        const constantName = text.replace(/[^a-zA-Z0-9]+/g, '_').toUpperCase() + '_TEXT';
        const selector = `page.getByText('${text}')`;
        
        if (!locators.some(l => l.constantName === constantName)) {
            locators.push({
                constantName,
                description: `${text} text`,
                selector: selector,
                selectorType: 'getByText'
            });
        }
    }
    
    // Pattern for getByLabel
    const getByLabelRegex = /page\.getByLabel\(['"]([^'"]+)['"]\)/g;
    while ((match = getByLabelRegex.exec(specFileContent)) !== null) {
        const label = match[1];
        const constantName = label.replace(/[^a-zA-Z0-9]+/g, '_').toUpperCase() + '_FIELD';
        const selector = `page.getByLabel('${label}')`;
        
        if (!locators.some(l => l.constantName === constantName)) {
            locators.push({
                constantName,
                description: `${label} field`,
                selector: selector,
                selectorType: 'getByLabel'
            });
        }
    }
    
    // Pattern for getByPlaceholder
    const getByPlaceholderRegex = /page\.getByPlaceholder\(['"]([^'"]+)['"]\)/g;
    while ((match = getByPlaceholderRegex.exec(specFileContent)) !== null) {
        const placeholder = match[1];
        const constantName = placeholder.replace(/[^a-zA-Z0-9]+/g, '_').toUpperCase() + '_INPUT';
        const selector = `page.getByPlaceholder('${placeholder}')`;
        
        if (!locators.some(l => l.constantName === constantName)) {
            locators.push({
                constantName,
                description: `field with placeholder "${placeholder}"`,
                selector: selector,
                selectorType: 'getByPlaceholder'
            });
        }
    }
    
    // Pattern for locator() with CSS selectors
    const locatorRegex = /page\.locator\(['"]([^'"]+)['"]\)/g;
    while ((match = locatorRegex.exec(specFileContent)) !== null) {
        const selector = match[1];
        let constantName = 'ELEMENT';
        
        if (selector.startsWith('#')) {
            constantName = selector.substring(1).replace(/[^a-zA-Z0-9]+/g, '_').toUpperCase();
        } else if (selector.startsWith('.')) {
            constantName = selector.substring(1).replace(/[^a-zA-Z0-9]+/g, '_').toUpperCase();
        } else if (selector.includes('[name=')) {
            const nameMatch = selector.match(/\[name=['"]?([^'"\]]+)['"]?\]/);
            if (nameMatch) {
                constantName = nameMatch[1].replace(/[^a-zA-Z0-9]+/g, '_').toUpperCase();
            }
        }
        
        if (!locators.some(l => l.constantName === constantName)) {
            locators.push({
                constantName,
                description: `element with selector "${selector}"`,
                selector: `"${selector}"`,
                selectorType: 'locator'
            });
        }
    }
    
    // Extract actions (click, fill, type, etc.)
    const clickRegex = /\.click\(\)/g;
    const fillRegex = /\.fill\(['"]([^'"]*)['"]\)/g;
    const typeRegex = /\.type\(['"]([^'"]*)['"]\)/g;
    
    return {
        url,
        locators,
        actions
    };
}

// Helper function to update or create Constants file
function updateOrCreateConstantsFile(moduleName, locators, constantsFilePath) {
    const addedConstants = [];
    
    if (!fs.existsSync(constantsFilePath)) {
        // Create new file
        let content = `export default class ${moduleName}Constants {\n`;
        content += `    static readonly PAGE_TITLE = "${moduleName} Page";\n`;
        
        locators.forEach(locator => {
            content += `    static readonly ${locator.constantName} = "${locator.description}";\n`;
            addedConstants.push(locator.constantName);
        });
        
        content += `}\n`;
        fs.writeFileSync(constantsFilePath, content, 'utf8');
        console.log(`✅ Created ${moduleName}Constants.ts with ${addedConstants.length} constants`);
    } else {
        // Update existing file
        let content = fs.readFileSync(constantsFilePath, 'utf8');
        
        // Find the position before the closing brace
        const lastBraceIndex = content.lastIndexOf('}');
        
        locators.forEach(locator => {
            // Check if constant already exists
            const constantRegex = new RegExp(`static\\s+readonly\\s+${locator.constantName}\\s*=`, 'i');
            if (!constantRegex.test(content)) {
                const newConstant = `    static readonly ${locator.constantName} = "${locator.description}";\n`;
                content = content.slice(0, lastBraceIndex) + newConstant + content.slice(lastBraceIndex);
                addedConstants.push(locator.constantName);
            }
        });
        
        fs.writeFileSync(constantsFilePath, content, 'utf8');
        if (addedConstants.length > 0) {
            console.log(`✅ Updated ${moduleName}Constants.ts - Added ${addedConstants.length} constants: ${addedConstants.join(', ')}`);
        } else {
            console.log(`ℹ️  ${moduleName}Constants.ts - No new constants to add`);
        }
    }
    
    return addedConstants;
}

// Helper function to convert Playwright locator to CSS selector string
function convertLocatorToCSSSelector(locator) {
    if (locator.selectorType === 'locator') {
        // Already a CSS selector, just wrap in quotes
        return `"${locator.selector.replace(/"/g, "'")}"`;
    } else if (locator.selectorType === 'getByRole') {
        // Convert getByRole to CSS selector with text matching
        if (locator.selector.includes("page.getByRole('link'")) {
            // Extract the name from the selector
            const nameMatch = locator.selector.match(/name:\s*'([^']+)'/);
            if (nameMatch) {
                return `"a:has-text('${nameMatch[1]}')"`;
            }
        } else if (locator.selector.includes("page.getByRole('button'")) {
            const nameMatch = locator.selector.match(/name:\s*'([^']+)'/);
            if (nameMatch) {
                return `"button:has-text('${nameMatch[1]}')"`;
            }
        } else if (locator.selector.includes("page.getByRole('heading'")) {
            const nameMatch = locator.selector.match(/name:\s*'([^']+)'/);
            if (nameMatch) {
                return `":is(h1,h2,h3,h4,h5,h6):has-text('${nameMatch[1]}')"`;
            }
        } else if (locator.selector.includes("page.getByRole('textbox'")) {
            const nameMatch = locator.selector.match(/name:\s*'([^']+)'/);
            if (nameMatch) {
                return `"input[type='text']:has-text('${nameMatch[1]}'), textarea:has-text('${nameMatch[1]}')"`;
            }
        } else if (locator.selector.includes("page.getByRole('checkbox'")) {
            const nameMatch = locator.selector.match(/name:\s*'([^']+)'/);
            if (nameMatch) {
                return `"input[type='checkbox']:has-text('${nameMatch[1]}')"`;
            }
        } else if (locator.selector.includes("page.getByRole('radio'")) {
            const nameMatch = locator.selector.match(/name:\s*'([^']+)'/);
            if (nameMatch) {
                return `"input[type='radio']:has-text('${nameMatch[1]}')"`;
            }
        }
        // Generic fallback
        return `"${locator.selector.replace(/page\.getByRole\(|\)/g, '').replace(/"/g, "'")}"`;
    } else if (locator.selectorType === 'getByText') {
        // Convert getByText to text selector
        const textMatch = locator.selector.match(/page\.getByText\('([^']+)'\)/);
        if (textMatch) {
            return `"text='${textMatch[1]}'"`;
        }
        return `"${locator.selector}"`;
    } else if (locator.selectorType === 'getByLabel') {
        // Convert getByLabel to label selector
        const labelMatch = locator.selector.match(/page\.getByLabel\('([^']+)'\)/);
        if (labelMatch) {
            return `"label:has-text('${labelMatch[1]}')"`;
        }
        return `"${locator.selector}"`;
    } else if (locator.selectorType === 'getByPlaceholder') {
        // Convert getByPlaceholder to placeholder attribute selector
        const placeholderMatch = locator.selector.match(/page\.getByPlaceholder\('([^']+)'\)/);
        if (placeholderMatch) {
            return `"[placeholder='${placeholderMatch[1]}']"`;
        }
        return `"${locator.selector}"`;
    }
    // Default fallback
    return `"${locator.selector}"`;
}

// Helper function to update or create Page file
function updateOrCreatePageFile(moduleName, locators, pageFilePath) {
    const addedLocators = [];
    
    if (!fs.existsSync(pageFilePath)) {
        // Create new file
        let content = `export default class ${moduleName}Page {\n`;
        
        locators.forEach(locator => {
            const cssSelector = convertLocatorToCSSSelector(locator);
            content += `    static readonly ${locator.constantName} = ${cssSelector};\n`;
            addedLocators.push(locator.constantName);
        });
        
        content += `}\n`;
        fs.writeFileSync(pageFilePath, content, 'utf8');
        console.log(`✅ Created ${moduleName}Page.ts with ${addedLocators.length} locators`);
    } else {
        // Update existing file
        let content = fs.readFileSync(pageFilePath, 'utf8');
        
        // Find the position before the closing brace
        const lastBraceIndex = content.lastIndexOf('}');
        
        locators.forEach(locator => {
            // Check if locator already exists
            const locatorRegex = new RegExp(`static\\s+readonly\\s+${locator.constantName}\\s*=`, 'i');
            if (!locatorRegex.test(content)) {
                const cssSelector = convertLocatorToCSSSelector(locator);
                const newLocator = `    static readonly ${locator.constantName} = ${cssSelector};\n`;
                content = content.slice(0, lastBraceIndex) + newLocator + content.slice(lastBraceIndex);
                addedLocators.push(locator.constantName);
            }
        });
        
        fs.writeFileSync(pageFilePath, content, 'utf8');
        if (addedLocators.length > 0) {
            console.log(`✅ Updated ${moduleName}Page.ts - Added ${addedLocators.length} locators: ${addedLocators.join(', ')}`);
        } else {
            console.log(`ℹ️  ${moduleName}Page.ts - No new locators to add`);
        }
    }
    
    return addedLocators;
}

// Helper function to generate method name from constant name
function generateMethodName(constantName, action = 'click') {
    const lowerName = constantName.toLowerCase().replace(/_/g, '');
    const actionVerb = action === 'fill' ? 'fill' : action === 'type' ? 'enter' : 'click';
    return actionVerb + lowerName.charAt(0).toUpperCase() + lowerName.slice(1);
}

// Helper function to update or create Steps file
function updateOrCreateStepsFile(moduleName, locators, url, stepsFilePath) {
    const addedMethods = [];
    
    if (!fs.existsSync(stepsFilePath)) {
        // Create new file
        let content = `import test, { Page } from "@playwright/test";
import UIActions from "@uiActions/UIActions";
import Assert from "@asserts/Assert";
import CommonConstants from "@uiConstants/CommonConstants";
import ${moduleName}Constants from "@uiConstants/${moduleName}Constants";
import ${moduleName}Page from "@pages/${moduleName}Page";

export default class ${moduleName}Steps {    
    private ui: UIActions;

    constructor(private page: Page) {
        this.ui = new UIActions(page);
    }

    /**
     * Launch the ${moduleName} page
     */
    public async launchPage() {
        await test.step(\`Launching ${moduleName} page\`, async () => {
            await this.ui.goto("${url || '${process.env.BASE_URL}'}", ${moduleName}Constants.PAGE_TITLE);
        });
    }
`;
        
        // Add methods for each locator
        locators.forEach(locator => {
            const methodName = generateMethodName(locator.constantName);
            content += `
    /**
     * Click on ${locator.description}
     */
    public async ${methodName}() {
        await test.step(\`Click on ${locator.description}\`, async () => {
            await this.ui.element(${moduleName}Page.${locator.constantName}, ${moduleName}Constants.${locator.constantName}).click();
        });
    }
`;
            addedMethods.push(methodName);
        });
        
        content += `}\n`;
        fs.writeFileSync(stepsFilePath, content, 'utf8');
        console.log(`✅ Created ${moduleName}Steps.ts with ${addedMethods.length} methods`);
    } else {
        // Update existing file
        let content = fs.readFileSync(stepsFilePath, 'utf8');
        
        // Find the position before the closing brace
        const lastBraceIndex = content.lastIndexOf('}');
        
        // Add launchPage method if it doesn't exist
        if (!/public\s+async\s+launchPage\s*\(\s*\)/i.test(content)) {
            const launchPageMethod = `
    /**
     * Launch the ${moduleName} page
     */
    public async launchPage() {
        await test.step(\`Launching ${moduleName} page\`, async () => {
            await this.ui.goto("${url || '${process.env.BASE_URL}'}", ${moduleName}Constants.PAGE_TITLE);
        });
    }
`;
            content = content.slice(0, lastBraceIndex) + launchPageMethod + content.slice(lastBraceIndex);
            addedMethods.push('launchPage');
        }
        
        // Add methods for each locator
        locators.forEach(locator => {
            const methodName = generateMethodName(locator.constantName);
            const methodRegex = new RegExp(`public\\s+async\\s+${methodName}\\s*\\(`, 'i');
            
            if (!methodRegex.test(content)) {
                const newMethod = `
    /**
     * Click on ${locator.description}
     */
    public async ${methodName}() {
        await test.step(\`Click on ${locator.description}\`, async () => {
            await this.ui.element(${moduleName}Page.${locator.constantName}, ${moduleName}Constants.${locator.constantName}).click();
        });
    }
`;
                // Insert before closing brace
                const insertPosition = content.lastIndexOf('}');
                content = content.slice(0, insertPosition) + newMethod + content.slice(insertPosition);
                addedMethods.push(methodName);
            }
        });
        
        fs.writeFileSync(stepsFilePath, content, 'utf8');
        if (addedMethods.length > 0) {
            console.log(`✅ Updated ${moduleName}Steps.ts - Added ${addedMethods.length} methods: ${addedMethods.join(', ')}`);
        } else {
            console.log(`ℹ️  ${moduleName}Steps.ts - No new methods to add`);
        }
    }
    
    return addedMethods;
}

// Helper function to create Page Object files
function createPageObjectFiles(specFileName, specFilePath) {
    try {
        console.log('\n🏗️  STEP 2: Generating Page Object Model Implementation');
        
        // Extract module name from spec file (e.g., "MyTesting.spec.ts" -> "MyTesting")
        const moduleName = specFileName.replace('.spec.ts', '');
        
        // Read the spec file content
        const specFileContent = fs.readFileSync(specFilePath, 'utf8');
        
        // Parse the spec file to extract locators
        const parsedData = parsePlaywrightCode(specFileContent);
        
        console.log(`📊 Parsed ${parsedData.locators.length} unique locators from spec file`);
        
        // Define paths for the three Page Object files
        const constantsDir = path.join(process.cwd(), 'src', 'advantage', 'constants');
        const pagesDir = path.join(process.cwd(), 'src', 'advantage', 'pages');
        const stepsDir = path.join(process.cwd(), 'src', 'advantage', 'steps');
        
        // Ensure directories exist
        [constantsDir, pagesDir, stepsDir].forEach(dir => {
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }
        });
        
        // Define file paths
        const constantsFile = path.join(constantsDir, `${moduleName}Constants.ts`);
        const pageFile = path.join(pagesDir, `${moduleName}Page.ts`);
        const stepsFile = path.join(stepsDir, `${moduleName}Steps.ts`);
        
        const result = {
            success: true,
            createdFiles: [],
            updatedFiles: [],
            moduleName: moduleName,
            addedConstants: [],
            addedLocators: [],
            addedMethods: []
        };
        
        // Process Constants file
        const addedConstants = updateOrCreateConstantsFile(moduleName, parsedData.locators, constantsFile);
        if (!fs.existsSync(constantsFile) || addedConstants.length > 0) {
            if (fs.existsSync(constantsFile)) {
                result.updatedFiles.push(`${moduleName}Constants.ts`);
            } else {
                result.createdFiles.push(`${moduleName}Constants.ts`);
            }
        }
        result.addedConstants = addedConstants;
        
        // Process Page file
        const addedLocators = updateOrCreatePageFile(moduleName, parsedData.locators, pageFile);
        if (!fs.existsSync(pageFile) || addedLocators.length > 0) {
            if (fs.existsSync(pageFile)) {
                result.updatedFiles.push(`${moduleName}Page.ts`);
            } else {
                result.createdFiles.push(`${moduleName}Page.ts`);
            }
        }
        result.addedLocators = addedLocators;
        
        // Process Steps file
        const addedMethods = updateOrCreateStepsFile(moduleName, parsedData.locators, parsedData.url, stepsFile);
        if (!fs.existsSync(stepsFile) || addedMethods.length > 0) {
            if (fs.existsSync(stepsFile)) {
                result.updatedFiles.push(`${moduleName}Steps.ts`);
            } else {
                result.createdFiles.push(`${moduleName}Steps.ts`);
            }
        }
        result.addedMethods = addedMethods;
        
        // Summary logging
        console.log('\n✅ Page Object Model Generation Complete:');
        if (result.createdFiles.length > 0) {
            console.log(`   📝 Created: ${result.createdFiles.join(', ')}`);
        }
        if (result.updatedFiles.length > 0) {
            console.log(`   🔄 Updated: ${result.updatedFiles.join(', ')}`);
        }
        console.log(`   📊 Total: ${parsedData.locators.length} locators | ${addedConstants.length} constants | ${addedLocators.length} page elements | ${addedMethods.length} methods\n`);
        
        return result;
    } catch (error) {
        console.error(`❌ Error creating Page Object files: ${error.message}`);
        console.error(error.stack);
        return {
            success: false,
            error: error.message
        };
    }
}

const server = http.createServer((req, res) => {
    // Enable CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
    }

    if (req.url === '/get-playwright-code' && req.method === 'GET') {
        // Serve the latest generated Playwright code (if available)
        const codePath = path.join(process.cwd(), 'playwright-latest-codegen.spec.ts');
        if (fs.existsSync(codePath)) {
            const code = fs.readFileSync(codePath, 'utf8');
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: true, code }));
        } else {
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: false, message: 'No code generated yet.' }));
        }
        return;
    }

    if (req.url === '/start-recording' && req.method === 'POST') {
        let body = '';

        req.on('data', (chunk) => {
            body += chunk.toString();
        });

        req.on('end', () => {
            try {
                const data = JSON.parse(body);
                const { browser, url } = data;
                
                if (!browser || !url) {
                    res.writeHead(400, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ success: false, message: 'Browser and URL are required' }));
                    return;
                }

                // Save codegen output to a file for later retrieval
                const codegenFile = 'playwright-latest-codegen.spec.ts';
                const command = `npx playwright codegen --output=${codegenFile} --browser=${browser} "${url}"`;
                
                console.log(`🎬 Launching Playwright Codegen...`);
                console.log(`   Browser: ${browser}`);
                console.log(`   URL: ${url}`);
                console.log(`   Command: ${command}\n`);

                // Use exec with windowsVerbatimArguments to properly launch Playwright codegen
                // This ensures the browser and inspector windows launch correctly
                const playwrightProcess = exec(command, {
                    windowsHide: false,
                    detached: false,
                }, (error, stdout, stderr) => {
                    if (error) {
                        console.error(`❌ Error launching Playwright: ${error.message}`);
                    }
                    if (stdout) {
                        console.log(`stdout: ${stdout}`);
                    }
                    if (stderr) {
                        console.error(`stderr: ${stderr}`);
                    }
                });

                console.log(`✅ Playwright codegen command executed (PID: ${playwrightProcess.pid})`);

                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({
                    success: true,
                    message: `Launching ${browser} with ${url}`,
                    command,
                    pid: playwrightProcess.pid,
                }));
            } catch (error) {
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: false, message: error.message }));
            }
        });
    } else if (req.url === '/open-html-report' && req.method === 'POST') {
        console.log(`📄 Opening Playwright HTML Report...`);

        // Check if playwright-report directory exists
        const reportPath = path.join(process.cwd(), 'playwright-report');
        if (!fs.existsSync(reportPath)) {
            console.log(`⚠️  No HTML report found. Run tests first.`);
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
                success: false,
                message: 'No HTML report found. Please run tests first using the command: npx playwright test',
            }));
            return;
        }

        const command = `npx playwright show-report`;
        exec(command, (error) => {
            if (error) {
                console.error(`Error: ${error.message}`);
            } else {
                console.log(`✅ HTML Report opened in browser`);
            }
        });

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, message: 'Opening Playwright HTML Report in your browser...' }));
    } else if (req.url === '/open-allure-report' && req.method === 'POST') {
        console.log(`📊 Generating and opening Allure Report...`);

        // Check if allure-results directory exists
        const allureResultsPath = path.join(process.cwd(), 'allure-results');
        if (!fs.existsSync(allureResultsPath)) {
            console.log(`⚠️  No Allure results found. Run tests with Allure reporter first.`);
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
                success: false,
                message: 'No Allure results found. Please run tests first and ensure Allure reporter is configured.',
            }));
            return;
        }

        const command = `npx allure generate ./allure-results --clean -o ./allure-report && npx allure open ./allure-report`;
        exec(command, (error) => {
            if (error) {
                console.error(`Error: ${error.message}`);
            } else {
                console.log(`✅ Allure Report generated and opened`);
            }
        });

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, message: 'Generating and opening Allure Report in your browser...' }));
    } else if (req.url === '/open-logs' && req.method === 'POST') {
        console.log(`📝 Opening logs folder...`);

        // Check if test-results directory exists
        const testResultsPath = path.join(process.cwd(), 'test-results');
        if (!fs.existsSync(testResultsPath)) {
            console.log(`⚠️  No test results folder found. Run tests first.`);
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
                success: false,
                message: 'No test results folder found. Please run tests first to generate execution logs.',
            }));
            return;
        }

        const command = `explorer .\\test-results`;
        exec(command, (error) => {
            if (error) {
                console.error(`Error: ${error.message}`);
            } else {
                console.log(`✅ Test results folder opened`);
            }
        });

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, message: 'Opening test results folder...' }));
    } else if (req.url === '/save-testcase' && req.method === 'POST') {
        let body = '';
        req.on('data', (chunk) => {
            body += chunk.toString();
        });

        req.on('end', async () => {
            try {
                const testCaseData = JSON.parse(body);
                console.log(`💾 Saving test case: ${testCaseData.name}`);
                
                // Read TESTING_FRAMEWORK_CONTEXT.md
                const projectContextPath = path.join(process.cwd(), 'TESTING_FRAMEWORK_CONTEXT.md');
                
                if (!fs.existsSync(projectContextPath)) {
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({
                        success: false,
                        message: 'TESTING_FRAMEWORK_CONTEXT.md file not found',
                    }));
                    return;
                }
                
                let content = fs.readFileSync(projectContextPath, 'utf8');

                // Extract elements from Playwright code
                const elements = extractElementsFromCode(testCaseData.playwrightCode);

                // Build the page elements section
                let elementsSection = '';
                if (elements.length > 0) {
                    elementsSection = '\n\n### ' + testCaseData.name + " Page Elements\n\n```typescript\n";
                    elements.forEach((el) => {
                        // Include human-friendly description and locator metadata
                        const locatorMeta = el.description;
                        elementsSection += el.name + ' = ' + locatorMeta + ' // locator: ' + el.locatorType + '\n';
                    });
                    elementsSection += '```';
                }
                
                // Build the test case entry with test scenario
                const testCaseType = testCaseData.testCaseType || 'UI';
                const moduleName = testCaseData.moduleName || 'General Tests';
                const testCaseEntry = `${elementsSection}\n\n### ${testCaseData.name} Test\n\n**${testCaseData.name}**: ${testCaseData.description}\n- Module: ${moduleName}\n- Type: ${testCaseType}\n- ${testCaseData.steps}\n- Browser: ${testCaseData.browser}\n- URL: ${testCaseData.url}\n- Recorded: ${new Date(testCaseData.timestamp).toLocaleString()}`;

                // Find the Contact Us test section and add after it
                const contactUsTestIndex = content.indexOf('### Contact Us Tests');
                if (contactUsTestIndex !== -1) {
                    // Find the end of Contact Us test section (next ## heading)
                    const nextSectionIndex = content.indexOf('\n## ', contactUsTestIndex + 1);
                    if (nextSectionIndex !== -1) {
                        const before = content.slice(0, nextSectionIndex);
                        const after = content.slice(nextSectionIndex);
                        content = `${before}${testCaseEntry}\n${after}`;
                    } else {
                        content += testCaseEntry;
                    }
                } else {
                    // If Contact Us section not found, append at end of UI Test Scenarios
                    const uiTestDataIndex = content.indexOf('## UI Test Data');
                    if (uiTestDataIndex !== -1) {
                        const before = content.slice(0, uiTestDataIndex);
                        const after = content.slice(uiTestDataIndex);
                        content = `${before}${testCaseEntry}\n\n${after}`;
                    } else {
                        content += testCaseEntry;
                    }
                }

                // Write back to file
                fs.writeFileSync(projectContextPath, content, 'utf8');

                // Create or update spec file using helper function
                const testsDir = path.join(process.cwd(), 'src', 'tests');
                if (!fs.existsSync(testsDir)) {
                    fs.mkdirSync(testsDir, { recursive: true });
                }

                const fileResult = createOrUpdateSpecFile(testCaseData, moduleName, testCaseType, testsDir);

                console.log(`✅ Test case saved to TESTING_FRAMEWORK_CONTEXT.md (${elements.length} elements extracted)`);
                console.log(`✅ Test file ${fileResult.isNewFile ? 'created' : 'updated'}: ${fileResult.testFilePath}`);
                
                // Create Page Object files after spec file is created/updated
                const pageObjectResult = createPageObjectFiles(fileResult.testFileName, fileResult.testFilePath);
                
                if (pageObjectResult.success) {
                    const allFiles = [...(pageObjectResult.createdFiles || []), ...(pageObjectResult.updatedFiles || [])];
                    if (allFiles.length > 0) {
                        console.log(`✅ Page Object files created/updated: ${allFiles.join(', ')}`);
                    }
                }
                
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({
                    success: true,
                    message: `Test case saved successfully with ${elements.length} page elements`,
                    testFilePath: fileResult.testFilePath,
                    testFileName: fileResult.testFileName,
                    isNewFile: fileResult.isNewFile,
                    pageObjectFiles: [...(pageObjectResult.createdFiles || []), ...(pageObjectResult.updatedFiles || [])],
                    pageObjectModuleName: pageObjectResult.moduleName || null,
                    pageObjectDetails: {
                        created: pageObjectResult.createdFiles || [],
                        updated: pageObjectResult.updatedFiles || [],
                        addedConstants: pageObjectResult.addedConstants || [],
                        addedLocators: pageObjectResult.addedLocators || [],
                        addedMethods: pageObjectResult.addedMethods || []
                    },
                }));
            } catch (error) {
                console.error(`Error saving test case: ${error.message}`);
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({
                    success: false,
                    message: `Failed to save test case: ${error.message}`,
                }));
            }
        });
    } else if (req.url === '/get-saved-tests' && req.method === 'GET') {
        // Read TESTING_FRAMEWORK_CONTEXT.md and extract saved test cases
        try {
            const projectContextPath = path.join(process.cwd(), 'TESTING_FRAMEWORK_CONTEXT.md');
            
            if (!fs.existsSync(projectContextPath)) {
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: false, tests: [] }));
                return;
            }
            
            const content = fs.readFileSync(projectContextPath, 'utf8');
            const tests = [];
            
            // Parse test cases from TESTING_FRAMEWORK_CONTEXT.md
            const testRegex = /###\s+(.+?)\s+Test\s*\n\s*\*\*.*?\*\*:\s*(.+?)\n-\s*Type:\s*(.+?)\n-\s*(.+?)\n/g;
            let match;
            
            while ((match = testRegex.exec(content)) !== null) {
                tests.push({
                    name: match[1].trim(),
                    description: match[2].trim(),
                    type: match[3].trim(),
                    steps: match[4].trim(),
                });
            }
            
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: true, tests: tests }));
        } catch (error) {
            console.error('Error loading saved tests:', error);
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: false, tests: [] }));
        }
    } else if (req.url === '/get-spec-files' && req.method === 'GET') {
        // Get list of existing spec files in src/tests directory
        try {
            const testsDir = path.join(process.cwd(), 'src', 'tests');
            
            if (!fs.existsSync(testsDir)) {
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: true, files: [] }));
                return;
            }
            
            const files = fs.readdirSync(testsDir)
                .filter(file => file.endsWith('.spec.ts'))
                .sort();
            
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: true, files: files }));
        } catch (error) {
            console.error('Error loading spec files:', error);
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: true, files: [] }));
        }
    } else if (req.url === '/' || req.url === '/index.html') {
        // Serve the dashboard.html file
        const dashboardPath = path.join(__dirname, 'dashboard.html');
        
        fs.readFile(dashboardPath, 'utf8', (err, data) => {
            if (err) {
                res.writeHead(500, { 'Content-Type': 'text/html' });
                res.end('<h1>Error loading dashboard</h1>');
                return;
            }
            res.writeHead(200, { 'Content-Type': 'text/html' });
            res.end(data);
        });
    } else if (req.url === '/TESTING_FRAMEWORK_CONTEXT.md') {
        // Serve the TESTING_FRAMEWORK_CONTEXT.md file
        const projectContextPath = path.join(__dirname, 'TESTING_FRAMEWORK_CONTEXT.md');
        
        fs.readFile(projectContextPath, 'utf8', (err, data) => {
            if (err) {
                res.writeHead(404, { 'Content-Type': 'text/plain' });
                res.end('TESTING_FRAMEWORK_CONTEXT.md not found');
                return;
            }
            res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
            res.end(data);
        });
    } else {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, message: 'Not found' }));
    }
});

server.listen(PORT, () => {
    console.log(`
╔═══════════════════════════════════════════════════════════╗
║   🚀 Playwright Dashboard Server Running                 ║
║                                                           ║
║   📍 Server: http://localhost:${PORT}                        ║
║   🎬 Ready to launch Playwright Codegen                  ║
║                                                           ║
║   ℹ️  Keep this terminal window open                      ║
║   ℹ️  Open dashboard.html in your browser                 ║
║   ℹ️  Click "Start Recording" to launch browser           ║
║                                                           ║
║   Press Ctrl+C to stop the server                        ║
╚═══════════════════════════════════════════════════════════╝
    `);
});
