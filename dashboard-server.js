const http = require('http');
const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');
require('dotenv').config();
const { autoRunTest } = require('./auto-test-runner');

const PORT = 3456;
const ACTION_TIMEOUT_SECONDS = Number.parseInt(process.env.ACTION_TIMEOUT || '1', 10) * 60;

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
                    description = `element with id '${locatorValue.substring(1)}'`;
                } else if (locatorValue.startsWith('.')) {
                    const cls = locatorValue.substring(1);
                    if (/plus/i.test(cls)) description = `+ icon`;
                    else if (/minus/i.test(cls)) description = `- icon`;
                    else if (/cart|shopping-cart|cart-icon/i.test(cls)) description = `cart icon`;
                    else description = `element with class '${cls}'`;
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

// Helper function to parse Playwright code and extract locators AND actions WITH parameters
function parsePlaywrightCode(specFileContent) {
    const locators = [];
    const actions = [];
    let url = '';
    
    // Extract URL from goto()
    const gotoMatch = specFileContent.match(/page\.goto\(['"](.*?)['"]/);
    if (gotoMatch) {
        url = gotoMatch[1];
    }
    
    // Helper to add locator if not exists
    function addLocator(constantName, description, selector, selectorType) {
        if (!locators.some(l => l.constantName === constantName)) {
            locators.push({
                constantName,
                description,
                selector,
                selectorType
            });
        }
        return constantName;
    }
    
    // Helper to add action with parameters
    function addAction(constantName, actionType, param = null) {
        actions.push({
            constantName,
            actionType,  // 'click', 'fill', 'selectOption', 'toBeVisible', 'toContainText'
            param
        });
    }
    
    // Parse ALL actions line by line to preserve order and capture everything
    const lines = specFileContent.split('\n');
    
    for (let line of lines) {
        line = line.trim();
        
        // Skip empty lines, comments, and import statements
        if (!line || line.startsWith('//') || line.startsWith('/*') || line.startsWith('import ')) continue;
        
        let match;
        
        // 1. Extract getByRole with click action
        match = line.match(/await\s+page\.getByRole\(['"](\w+)['"]\s*,\s*\{\s*name:\s*['"]([^'"]+)['"]\s*\}\)\.click\(\)/);
        if (match) {
            const [, role, name] = match;
            const constantName = name.replace(/[^a-zA-Z0-9]+/g, '_').toUpperCase() + '_' + role.toUpperCase();
            addLocator(constantName, `${name} ${role}`, `page.getByRole('${role}', { name: '${name}' })`, 'getByRole');
            addAction(constantName, 'click');
            continue;
        }
        
        // 1b. Extract getByRole with nth() and click action
        match = line.match(/await\s+page\.getByRole\(['"](\w+)['"]\s*,\s*\{\s*name:\s*['"]([^'"]+)['"]\s*\}\)\.nth\((\d+)\)\.click\(\)/);
        if (match) {
            const [, role, name, index] = match;
            const constantName = name.replace(/[^a-zA-Z0-9]+/g, '_').toUpperCase() + '_' + role.toUpperCase() + '_' + index;
            addLocator(constantName, `${name} ${role} at index ${index}`, `page.getByRole('${role}', { name: '${name}' }).nth(${index})`, 'getByRole');
            addAction(constantName, 'click');
            continue;
        }
        
        // 2. Extract getByRole with fill action
        match = line.match(/await\s+page\.getByRole\(['"](\w+)['"]\s*,\s*\{\s*name:\s*['"]([^'"]+)['"]\s*\}\)\.fill\(['"]([^'"]*)['"]\)/);
        if (match) {
            const [, role, name, value] = match;
            const constantName = name.replace(/[^a-zA-Z0-9]+/g, '_').toUpperCase() + '_' + role.toUpperCase();
            addLocator(constantName, `${name} ${role}`, `page.getByRole('${role}', { name: '${name}' })`, 'getByRole');
            addAction(constantName, 'fill', value);
            continue;
        }
        
        // 3. Extract getByText with actions
        match = line.match(/await\s+page\.getByText\(['"]([^'"]+)['"]\)\.click\(\)/);
        if (match) {
            const text = match[1];
            const constantName = text.replace(/[^a-zA-Z0-9]+/g, '_').toUpperCase() + '_TEXT';
            addLocator(constantName, `${text} text`, `page.getByText('${text}')`, 'getByText');
            addAction(constantName, 'click');
            continue;
        }
        
        // 4. Extract locator() with click action
        match = line.match(/await\s+page\.locator\('([^']+)'\)\.click\(\)/);
        if (match) {
            const selector = match[1];
            let constantName = 'ELEMENT';
            let description = `element with selector "${selector}"`;
            
            if (selector.startsWith('#')) {
                constantName = selector.substring(1).replace(/[^a-zA-Z0-9]+/g, '_').toUpperCase();
                description = `element with id '${selector.substring(1)}'`;
            } else if (selector.startsWith('.')) {
                constantName = selector.substring(1).replace(/[^a-zA-Z0-9]+/g, '_').toUpperCase();
                description = `element with class '${selector.substring(1)}'`;
            } else if (selector.includes('[name=')) {
                const nameMatch = selector.match(/\[name=['"]?([^'"\]]+)['"]?\]/);
                if (nameMatch) {
                    constantName = nameMatch[1].replace(/[^a-zA-Z0-9]+/g, '_').toUpperCase();
                    description = `${nameMatch[1]} field`;
                }
            } else if (selector.match(/^select/)) {
                const nameMatch = selector.match(/\[name=['"]?([^'"\]]+)['"]?\]/);
                if (nameMatch) {
                    constantName = nameMatch[1].replace(/[^a-zA-Z0-9]+/g, '_').toUpperCase();
                    description = `${nameMatch[1]} dropdown`;
                }
            } else if (selector.match(/^input/)) {
                const nameMatch = selector.match(/\[name=['"]?([^'"\]]+)['"]?\]/);
                if (nameMatch) {
                    constantName = nameMatch[1].replace(/[^a-zA-Z0-9]+/g, '_').toUpperCase();
                    description = `${nameMatch[1]} input field`;
                }
            } else if (selector.match(/^textarea/)) {
                const nameMatch = selector.match(/\[name=['"]?([^'"\]]+)['"]?\]/);
                if (nameMatch) {
                    constantName = nameMatch[1].replace(/[^a-zA-Z0-9]+/g, '_').toUpperCase();
                    description = `${nameMatch[1]} textarea`;
                }
            } else if (selector.match(/^button/)) {
                const nameMatch = selector.match(/\[name=['"]?([^'"\]]+)['"]?\]/);
                if (nameMatch) {
                    constantName = nameMatch[1].replace(/[^a-zA-Z0-9]+/g, '_').toUpperCase();
                    description = `${nameMatch[1]} button`;
                }
            }
            
            addLocator(constantName, description, selector, 'locator');
            addAction(constantName, 'click');
            continue;
        }
        
        // 5. Extract locator() with fill action
        match = line.match(/await\s+page\.locator\('([^']+)'\)\.fill\('([^']*)'\)/);
        if (match) {
            const [, selector, value] = match;
            let constantName = 'ELEMENT';
            let description = `element with selector "${selector}"`;
            
            if (selector.includes('[name=')) {
                const nameMatch = selector.match(/\[name=['"]?([^'"\]]+)['"]?\]/);
                if (nameMatch) {
                    constantName = nameMatch[1].replace(/[^a-zA-Z0-9]+/g, '_').toUpperCase();
                    description = `${nameMatch[1]} field`;
                }
            } else if (selector.startsWith('#')) {
                constantName = selector.substring(1).replace(/[^a-zA-Z0-9]+/g, '_').toUpperCase();
                description = `element with id '${selector.substring(1)}'`;
            } else if (selector.match(/^input/)) {
                const nameMatch = selector.match(/\[name=['"]?([^'"\]]+)['"]?\]/);
                if (nameMatch) {
                    constantName = nameMatch[1].replace(/[^a-zA-Z0-9]+/g, '_').toUpperCase();
                    description = `${nameMatch[1]} input`;
                }
            } else if (selector.match(/^textarea/)) {
                const nameMatch = selector.match(/\[name=['"]?([^'"\]]+)['"]?\]/);
                if (nameMatch) {
                    constantName = nameMatch[1].replace(/[^a-zA-Z0-9]+/g, '_').toUpperCase();
                    description = `${nameMatch[1]} textarea`;
                }
            }
            
            addLocator(constantName, description, selector, 'locator');
            addAction(constantName, 'fill', value);
            continue;
        }
        
        // 6. Extract locator() with selectOption action
        match = line.match(/await\s+page\.locator\('([^']+)'\)\.selectOption\('([^']+)'\)/);
        if (match) {
            const [, selector, value] = match;
            let constantName = 'ELEMENT';
            let description = `element with selector "${selector}"`;
            
            if (selector.includes('[name=')) {
                const nameMatch = selector.match(/\[name=['"]?([^'"\]]+)['"]?\]/);
                if (nameMatch) {
                    constantName = nameMatch[1].replace(/[^a-zA-Z0-9]+/g, '_').toUpperCase();
                    description = `${nameMatch[1]} dropdown`;
                }
            } else if (selector.startsWith('select')) {
                const nameMatch = selector.match(/\[name=['"]?([^'"\]]+)['"]?\]/);
                if (nameMatch) {
                    constantName = nameMatch[1].replace(/[^a-zA-Z0-9]+/g, '_').toUpperCase();
                    description = `${nameMatch[1]} dropdown`;
                }
            }
            
            addLocator(constantName, description, selector, 'locator');
            addAction(constantName, 'selectOption', value);
            continue;
        }
        
        // 7. Extract expect() with toBeVisible() - getByRole WITH name
        match = line.match(/await\s+expect\(page\.getByRole\(['"](\w+)['"]\s*,\s*\{\s*name:\s*['"]([^'"]+)['"]\s*\}\)\)\.toBeVisible\(\)/);
        if (match) {
            const [, role, name] = match;
            const constantName = name.replace(/[^a-zA-Z0-9]+/g, '_').toUpperCase() + '_' + role.toUpperCase();
            addLocator(constantName, `${name} ${role}`, `page.getByRole('${role}', { name: '${name}' })`, 'getByRole');
            addAction(constantName, 'toBeVisible');
            continue;
        }
        
        // 7b. Extract expect() with toBeVisible() - getByRole WITHOUT name
        match = line.match(/await\s+expect\(page\.getByRole\(['"](\w+)['"]\)\)\.toBeVisible\(\)/);
        if (match) {
            const [, role] = match;
            const constantName = role.toUpperCase();
            addLocator(constantName, `${role} element`, `page.getByRole('${role}')`, 'getByRole');
            addAction(constantName, 'toBeVisible');
            continue;
        }
        
        // 8. Extract expect() with toBeVisible() - locator
        match = line.match(/await\s+expect\(page\.locator\('([^']+)'\)\)\.toBeVisible\(\)/);
        if (match) {
            const selector = match[1];
            let constantName = 'ELEMENT';
            let description = `element with selector "${selector}"`;
            
            if (selector.startsWith('#')) {
                constantName = selector.substring(1).replace(/[^a-zA-Z0-9]+/g, '_').toUpperCase();
                description = `element with id '${selector.substring(1)}'`;
            } else if (selector.includes('[name=')) {
                const nameMatch = selector.match(/\[name=['"]?([^'"\]]+)['"]?\]/);
                if (nameMatch) {
                    constantName = nameMatch[1].replace(/[^a-zA-Z0-9]+/g, '_').toUpperCase();
                    description = `${nameMatch[1]} element`;
                }
            }
            
            addLocator(constantName, description, selector, 'locator');
            addAction(constantName, 'toBeVisible');
            continue;
        }
        
        // 9. Extract expect() with toContainText() - getByRole WITH name
        match = line.match(/await\s+expect\(page\.getByRole\(['"](\w+)['"]\s*,\s*\{\s*name:\s*['"]([^'"]+)['"]\s*\}\)\)\.toContainText\(['"]([^'"]+)['"]\)/);
        if (match) {
            const [, role, name, textValue] = match;
            const constantName = name.replace(/[^a-zA-Z0-9]+/g, '_').toUpperCase() + '_' + role.toUpperCase();
            addLocator(constantName, `${name} ${role}`, `page.getByRole('${role}', { name: '${name}' })`, 'getByRole');
            addAction(constantName, 'toContainText', textValue);
            continue;
        }
        
        // 9b. Extract expect() with toContainText() - getByRole WITHOUT name
        match = line.match(/await\s+expect\(page\.getByRole\(['"](\w+)['"]\)\)\.toContainText\(['"]([^'"]+)['"]\)/);
        if (match) {
            const [, role, textValue] = match;
            const constantName = role.toUpperCase();
            addLocator(constantName, `${role} element`, `page.getByRole('${role}')`, 'getByRole');
            addAction(constantName, 'toContainText', textValue);
            continue;
        }
        
        // 10. Extract expect() with toContainText() - locator
        match = line.match(/await\s+expect\(page\.locator\('([^']+)'\)\)\.toContainText\('([^']+)'\)/);
        if (match) {
            const [, selector, textValue] = match;
            let constantName = 'ELEMENT';
            let description = `element with selector "${selector}"`;
            
            if (selector.startsWith('#')) {
                constantName = selector.substring(1).replace(/[^a-zA-Z0-9]+/g, '_').toUpperCase();
                description = `element with id '${selector.substring(1)}'`;
            } else if (selector.includes('[name=')) {
                const nameMatch = selector.match(/\[name=['"]?([^'"\]]+)['"]?\]/);
                if (nameMatch) {
                    constantName = nameMatch[1].replace(/[^a-zA-Z0-9]+/g, '_').toUpperCase();
                    description = `${nameMatch[1]} element`;
                }
            }
            
            addLocator(constantName, description, selector, 'locator');
            addAction(constantName, 'toContainText', textValue);
            continue;
        }
        
        // 11. Extract getByLabel with actions
        match = line.match(/await\s+page\.getByLabel\(['"]([^'"]+)['"]\)\.click\(\)/);
        if (match) {
            const label = match[1];
            const constantName = label.replace(/[^a-zA-Z0-9]+/g, '_').toUpperCase() + '_LABEL';
            addLocator(constantName, `${label} label`, `page.getByLabel('${label}')`, 'getByLabel');
            addAction(constantName, 'click');
            continue;
        }
        
        match = line.match(/await\s+page\.getByLabel\(['"]([^'"]+)['"]\)\.fill\(['"]([^'"]*)['"]\)/);
        if (match) {
            const [, label, value] = match;
            const constantName = label.replace(/[^a-zA-Z0-9]+/g, '_').toUpperCase() + '_LABEL';
            addLocator(constantName, `${label} label`, `page.getByLabel('${label}')`, 'getByLabel');
            addAction(constantName, 'fill', value);
            continue;
        }
        
        // 12. Extract getByPlaceholder with actions
        match = line.match(/await\s+page\.getByPlaceholder\(['"]([^'"]+)['"]\)\.click\(\)/);
        if (match) {
            const placeholder = match[1];
            const constantName = placeholder.replace(/[^a-zA-Z0-9]+/g, '_').toUpperCase() + '_PLACEHOLDER';
            addLocator(constantName, `field with placeholder "${placeholder}"`, `page.getByPlaceholder('${placeholder}')`, 'getByPlaceholder');
            addAction(constantName, 'click');
            continue;
        }
        
        match = line.match(/await\s+page\.getByPlaceholder\(['"]([^'"]+)['"]\)\.fill\(['"]([^'"]*)['"]\)/);
        if (match) {
            const [, placeholder, value] = match;
            const constantName = placeholder.replace(/[^a-zA-Z0-9]+/g, '_').toUpperCase() + '_PLACEHOLDER';
            addLocator(constantName, `field with placeholder "${placeholder}"`, `page.getByPlaceholder('${placeholder}')`, 'getByPlaceholder');
            addAction(constantName, 'fill', value);
            continue;
        }
    }
    
    console.log(`\n📊 Parsed ${locators.length} locators and ${actions.length} actions from recorded test:`);
    actions.forEach((action, index) => {
        console.log(`   ${index + 1}. ${action.actionType.toUpperCase()}: ${action.constantName}${action.param ? ` (param: ${action.param})` : ''}`);
    });
    
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
    // Convert CONSTANT_NAME to camelCase (e.g., POPULAR_ITEMS_LINK -> Popularitemslink)
    const parts = constantName.toLowerCase().split('_');
    let camelCase = parts.map((part, index) => 
        index === 0 ? part : part.charAt(0).toUpperCase() + part.slice(1)
    ).join('');
    
    const actionVerb = action === 'fill' ? 'fill' : action === 'type' ? 'enter' : 'click';
    return actionVerb + camelCase.charAt(0).toUpperCase() + camelCase.slice(1);
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
            
            // Determine element type and generate appropriate methods
            if (locator.constantName.includes('LISTBOX') || locator.constantName.includes('DROPDOWN') || locator.constantName.includes('SELECT') || locator.description.includes('select')) {
                // Generate selectByValue method for dropdown elements
                content += `
    /**
     * Select option from ${locator.description}
     */
    public async ${methodName}(option: string) {
        await test.step(\`Select option from ${locator.description}\`, async () => {
            await this.ui.dropdown(${moduleName}Page.${locator.constantName}, ${moduleName}Constants.${locator.constantName}).selectByValue(option);
        });
    }
`;
                addedMethods.push(methodName);
            } else if (locator.constantName.includes('TEXTAREA') || locator.constantName.includes('TEXTBOX') || locator.constantName.includes('INPUT') || locator.constantName.includes('EMAIL') || locator.constantName.includes('PLACEHOLDER') || locator.description.includes('email') || locator.description.includes('input') || locator.description.includes('textarea')) {
                // Generate both fill and click methods for input fields
                const fillMethodName = methodName.replace('click', 'fill');
                content += `
    /**
     * Fill ${locator.description}
     */
    public async ${fillMethodName}(text: string) {
        await test.step(\`Fill ${locator.description}\`, async () => {
            await this.ui.editBox(${moduleName}Page.${locator.constantName}, ${moduleName}Constants.${locator.constantName}).fill(text);
        });
    }

    /**
     * Click on ${locator.description}
     */
    public async ${methodName}() {
        await test.step(\`Click on ${locator.description}\`, async () => {
            await this.ui.element(${moduleName}Page.${locator.constantName}, ${moduleName}Constants.${locator.constantName}).click();
        });
    }
`;
                addedMethods.push(fillMethodName);
                addedMethods.push(methodName);
            } else {
                // Standard click method
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
            }
            
            // Add validation method for all elements
            const validateMethodName = 'validate' + methodName.substring(5).charAt(0).toUpperCase() + methodName.substring(6);
            content += `
    /**
     * Validate ${locator.description} is visible
     */
    public async ${validateMethodName}(expectedText?: string) {
        await test.step(\`Validate ${locator.description}\$\{expectedText ? ' contains: ' + expectedText : ' is visible'\}\`, async () => {
            const element = this.ui.element(${moduleName}Page.${locator.constantName}, ${moduleName}Constants.${locator.constantName});
            const isVisible = await element.isVisible(${ACTION_TIMEOUT_SECONDS});
            Assert.assertTrue(isVisible, ${moduleName}Constants.${locator.constantName});
            if (expectedText) {
                const actualText = await element.getTextContent();
                Assert.assertContains(actualText || '', expectedText, ${moduleName}Constants.${locator.constantName});
            }
        });
    }
`;
            addedMethods.push(validateMethodName);
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
                let newMethod = '';
                
                // Determine element type
                if (locator.constantName.includes('LISTBOX') || locator.constantName.includes('DROPDOWN') || locator.constantName.includes('SELECT') || locator.description.includes('select')) {
                    newMethod = `
    /**
     * Select option from ${locator.description}
     */
    public async ${methodName}(option: string) {
        await test.step(\`Select option from ${locator.description}\`, async () => {
            await this.ui.dropdown(${moduleName}Page.${locator.constantName}, ${moduleName}Constants.${locator.constantName}).selectByValue(option);
        });
    }
`;
                    addedMethods.push(methodName);
                } else if (locator.constantName.includes('TEXTAREA') || locator.constantName.includes('TEXTBOX') || locator.constantName.includes('INPUT') || locator.constantName.includes('EMAIL') || locator.constantName.includes('PLACEHOLDER') || locator.description.includes('email') || locator.description.includes('input') || locator.description.includes('textarea')) {
                    // Add fill method
                    const fillMethodName = methodName.replace('click', 'fill');
                    const fillMethodRegex = new RegExp(`public\\s+async\\s+${fillMethodName}\\s*\\(`, 'i');
                    
                    if (!fillMethodRegex.test(content)) {
                        newMethod += `
    /**
     * Fill ${locator.description}
     */
    public async ${fillMethodName}(text: string) {
        await test.step(\`Fill ${locator.description}\`, async () => {
            await this.ui.editBox(${moduleName}Page.${locator.constantName}, ${moduleName}Constants.${locator.constantName}).fill(text);
        });
    }
`;
                        addedMethods.push(fillMethodName);
                    }
                    
                    // Add click method
                    newMethod += `
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
                } else {
                    newMethod = `
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
                }
                
                // Add validation method
                const validateMethodName = 'validate' + methodName.substring(5).charAt(0).toUpperCase() + methodName.substring(6);
                const validateMethodRegex = new RegExp(`public\\s+async\\s+${validateMethodName}\\s*\\(`, 'i');
                
                if (!validateMethodRegex.test(content)) {
                    newMethod += `
    /**
     * Validate ${locator.description} is visible
     */
    public async ${validateMethodName}(expectedText?: string) {
        await test.step(\`Validate ${locator.description}\$\{expectedText ? ' contains: ' + expectedText : ' is visible'\}\`, async () => {
            const element = this.ui.element(${moduleName}Page.${locator.constantName}, ${moduleName}Constants.${locator.constantName});
            const isVisible = await element.isVisible(${ACTION_TIMEOUT_SECONDS});
            Assert.assertTrue(isVisible, ${moduleName}Constants.${locator.constantName});
            if (expectedText) {
                const actualText = await element.getTextContent();
                Assert.assertContains(actualText || '', expectedText, ${moduleName}Constants.${locator.constantName});
            }
        });
    }
`;
                    addedMethods.push(validateMethodName);
                }
                
                // Insert before closing brace
                const insertPosition = content.lastIndexOf('}');
                content = content.slice(0, insertPosition) + newMethod + content.slice(insertPosition);
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

// STEP 3: Helper function to refactor spec file to use Page Object Model pattern
function refactorSpecFile(specFilePath, moduleName) {
    try {
        console.log('\n🔧 STEP 3: Refactoring Spec File to Page Object Model');
        
        // CRITICAL: Read the recorded test from playwright-latest-codegen.spec.ts first
        const recordedTestPath = path.join(process.cwd(), 'playwright-latest-codegen.spec.ts');
        let recordedActions = [];
        
        if (fs.existsSync(recordedTestPath)) {
            console.log('📖 Reading recorded test from playwright-latest-codegen.spec.ts');
            const recordedContent = fs.readFileSync(recordedTestPath, 'utf8');
            const parsedRecorded = parsePlaywrightCode(recordedContent);
            recordedActions = parsedRecorded.actions;
            console.log(`✅ Found ${recordedActions.length} actions in recorded test`);
        }
        
        // Helper to convert constant name to method name
        function constantToMethodName(constantName, actionType) {
            const parts = constantName.toLowerCase().split('_');
            let camelCase = parts.map((part, index) => 
                index === 0 ? part : part.charAt(0).toUpperCase() + part.slice(1)
            ).join('');
            
            let prefix = '';
            if (actionType === 'fill') {
                prefix = 'fill';
            } else if (actionType === 'selectOption') {
                // Use 'click' prefix for selectOption to match generated method names
                prefix = 'click';
            } else if (actionType === 'toBeVisible' || actionType === 'toContainText') {
                prefix = 'validate';
            } else {
                prefix = 'click';
            }
            
            return prefix + camelCase.charAt(0).toUpperCase() + camelCase.slice(1);
        }
        
        // Read the current spec file
        const specContent = fs.readFileSync(specFilePath, 'utf8');
        
        // Parse all test cases with COMPLETE match to preserve them
        // Matches both raw format: test('test', async ({ page }) => {...});
        // and refactored format: test('TC_01_...', async () => {...});
        const testCaseRegex = /\/\*\*[\s\S]*?\*\s*Test Case:\s*(.+?)\n[\s\S]*?\*\s*Description:\s*(.+?)\n[\s\S]*?\*\s*Module:\s*(.+?)\n[\s\S]*?\*\s*Type:\s*(.+?)\n[\s\S]*?\*\s*Browser:\s*(.+?)\n[\s\S]*?\*\s*URL:\s*(.+?)\n[\s\S]*?\*\s*Generated:\s*(.+?)\n[\s\S]*?\*\/\s*\ntest\(([^,]+),\s*async\s*\((?:\s*\{\s*page\s*\}|\s*)\s*\)\s*=>\s*\{([\s\S]*?)\n\}\);/g;
        
        const testCases = [];
        let match;
        
        while ((match = testCaseRegex.exec(specContent)) !== null) {
            const testBody = match[9].trim();
            // Check if already refactored by looking for module.method() pattern
            const isRefactored = new RegExp(`${moduleName.toLowerCase()}\\.\\w+\\(`).test(testBody);
            
            testCases.push({
                testCaseId: match[1].trim(),
                description: match[2].trim(),
                module: match[3].trim(),
                type: match[4].trim(),
                browser: match[5].trim(),
                url: match[6].trim(),
                generated: match[7].trim(),
                testParams: match[8].trim(),
                testBody: testBody,
                fullMatch: match[0],
                isAlreadyRefactored: isRefactored
            });
        }
        
        if (testCases.length === 0) {
            console.log('⚠️  No test cases found to refactor');
            return { success: false, message: 'No test cases found' };
        }
        
        // Scenario 2 detection: Multiple test cases = preserve existing ones
        const isScenario2 = testCases.length > 1;
        
        if (isScenario2) {
            console.log(`🔄 SCENARIO 2: Appending to existing spec file with ${testCases.length} test case(s)`);
            console.log(`   ⚠️  CRITICAL: Existing test cases MUST be preserved exactly!`);
        } else {
            console.log(`🆕 SCENARIO 1: Creating new spec file with first test case`);
        }
        
        // Build refactored imports
        const refactoredImports = `import ${moduleName}Steps from "@uiSteps/${moduleName}Steps";
import { test } from "@base-test";
import Allure from "@allure";
`;
        
        // Build test setup
        const testSetup = `
let ${moduleName.toLowerCase()}: ${moduleName}Steps;
test.beforeEach(async ({ page }) => {
    ${moduleName.toLowerCase()} = new ${moduleName}Steps(page);
});
`;
        
        // Build refactored test cases
        let refactoredTests = '';
        let preservedCount = 0;
        let refactoredCount = 0;
        
        testCases.forEach((tc, index) => {
            const isLastTestCase = index === testCases.length - 1;
            // For Scenario 1: First test should use recorded actions
            // For Scenario 2: Only the last test (new one) should use recorded actions
            const isNewTestCase = !isScenario2 || (isLastTestCase && isScenario2);
            
            // SCENARIO 2: Preserve existing refactored test cases EXACTLY
            if (tc.isAlreadyRefactored && !isNewTestCase) {
                console.log(`   ✅ PRESERVING: ${tc.testCaseId} (already refactored)`);
                refactoredTests += tc.fullMatch + '\n\n';
                preservedCount++;
            } else {
                // Refactor this test case (new or first test case)
                console.log(`   🔄 REFACTORING: ${tc.testCaseId}`);
                
                const testId = tc.testCaseId.replace(/\s+/g, '_');
                const testName = `'${testId} - ${tc.description}'`;
                
                let testCase = `
/**
 * Test Case: ${tc.testCaseId}
 * Description: ${tc.description}
 * Module: ${tc.module}
 * Type: ${tc.type}
 * Browser: ${tc.browser}
 * URL: ${tc.url}
 * Generated: ${tc.generated}
 */
test(${testName}, async () => {
    Allure.attachDetails('${tc.description}', '${testId}');
`;
                
                // Use recorded actions if this is a new test case and we have them
                if (isNewTestCase && recordedActions.length > 0) {
                    console.log(`      📝 Using ${recordedActions.length} actions from recorded test`);
                    testCase += `    await ${moduleName.toLowerCase()}.launchPage();\n`;
                    
                    recordedActions.forEach(action => {
                        const methodName = constantToMethodName(action.constantName, action.actionType);
                        
                        if (action.param !== null && action.param !== undefined) {
                            testCase += `    await ${moduleName.toLowerCase()}.${methodName}('${action.param}');\n`;
                        } else {
                            testCase += `    await ${moduleName.toLowerCase()}.${methodName}();\n`;
                        }
                    });
                } else {
                    // No recorded actions, just add launchPage
                    testCase += `    await ${moduleName.toLowerCase()}.launchPage();\n`;
                }
                
                testCase += `});
`;
                
                refactoredTests += testCase + '\n';
                refactoredCount++;
            }
        });
        
        // Combine all parts
        const refactoredContent = refactoredImports + testSetup + refactoredTests;
        
        // Write refactored spec file
        fs.writeFileSync(specFilePath, refactoredContent, 'utf8');
        
        console.log(`\n✅ Spec file refactored successfully`);
        console.log(`   📝 File: ${path.basename(specFilePath)}`);
        console.log(`   📊 Total test cases: ${testCases.length}`);
        if (isScenario2) {
            console.log(`   ✅ Preserved: ${preservedCount} existing test case(s)`);
            console.log(`   ➕ Refactored: ${refactoredCount} new test case(s)`);
        } else {
            console.log(`   ✨ Refactored: ${refactoredCount} test case(s)`);
        }
        console.log(`   🎯 Applied Page Object Model pattern\n`);
        
        return {
            success: true,
            refactoredTestCount: testCases.length,
            preservedCount: preservedCount,
            moduleUsed: moduleName
        };
        
    } catch (error) {
        console.error(`❌ Error refactoring spec file: ${error.message}`);
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
                
                // STEP 2: Create Page Object files after spec file is created/updated
                const pageObjectResult = createPageObjectFiles(fileResult.testFileName, fileResult.testFilePath);
                
                if (pageObjectResult.success) {
                    const allFiles = [...(pageObjectResult.createdFiles || []), ...(pageObjectResult.updatedFiles || [])];
                    if (allFiles.length > 0) {
                        console.log(`✅ Page Object files created/updated: ${allFiles.join(', ')}`);
                    }
                }
                
                // STEP 3: Refactor the spec file to use Page Object Model
                let refactorResult = { success: false };
                if (pageObjectResult.success && pageObjectResult.moduleName) {
                    refactorResult = refactorSpecFile(fileResult.testFilePath, pageObjectResult.moduleName);
                }
                
                // STEP 4: Auto-run the test with auto-fix mechanism (async, don't wait)
                if (refactorResult.success && pageObjectResult.moduleName) {
                    console.log(`\n🚀 AUTO-RUN: Triggering automated test execution...`);
                    // Run asynchronously without blocking the response
                    setImmediate(async () => {
                        try {
                            await autoRunTest(fileResult.testFilePath, pageObjectResult.moduleName);
                        } catch (error) {
                            console.error(`Auto-run error: ${error.message}`);
                        }
                    });
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
                    refactored: refactorResult.success,
                    refactoredTestCount: refactorResult.refactoredTestCount || 0,
                    autoRunTriggered: refactorResult.success,
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
