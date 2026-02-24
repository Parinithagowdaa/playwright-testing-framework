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
                const testCaseEntry = `${elementsSection}\n\n### ${testCaseData.name} Test\n\n**${testCaseData.name}**: ${testCaseData.description}\n- Type: ${testCaseType}\n- ${testCaseData.steps}\n- Browser: ${testCaseData.browser}\n- URL: ${testCaseData.url}\n- Recorded: ${new Date(testCaseData.timestamp).toLocaleString()}`;

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

                // Create actual test file in src/tests/
                const testsDir = path.join(process.cwd(), 'src', 'tests');
                if (!fs.existsSync(testsDir)) {
                    fs.mkdirSync(testsDir, { recursive: true });
                }

                // Generate test file name from test case name
                const testFileName = testCaseData.name.replace(/\s+/g, '') + '.spec.ts';
                const testFilePath = path.join(testsDir, testFileName);

                // Create test file content
                const testFileContent = `import { test, expect } from '@playwright/test';

/**
 * Test Case: ${testCaseData.name}
 * Description: ${testCaseData.description}
 * Type: ${testCaseType}
 * Browser: ${testCaseData.browser}
 * URL: ${testCaseData.url}
 * Generated: ${new Date(testCaseData.timestamp).toLocaleString()}
 */

${testCaseData.playwrightCode}
`;

                // Write test file
                fs.writeFileSync(testFilePath, testFileContent, 'utf8');

                console.log(`✅ Test case saved to TESTING_FRAMEWORK_CONTEXT.md (${elements.length} elements extracted)`);
                console.log(`✅ Test file created: ${testFilePath}`);
                
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({
                    success: true,
                    message: `Test case saved successfully with ${elements.length} page elements`,
                    testFilePath: testFilePath,
                    testFileName: testFileName,
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
