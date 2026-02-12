const http = require('http');
const { exec, spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

const PORT = 3456;

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

    if (req.url === '/start-recording' && req.method === 'POST') {
        let body = '';
        
        req.on('data', chunk => {
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

                const command = `npx playwright codegen --browser=${browser} "${url}"`;
                
                console.log(`🎬 Launching Playwright Codegen...`);
                console.log(`   Browser: ${browser}`);
                console.log(`   URL: ${url}`);
                console.log(`   Command: ${command}\n`);

                // Use exec with windowsVerbatimArguments to properly launch Playwright codegen
                // This ensures the browser and inspector windows launch correctly
                const playwrightProcess = exec(command, {
                    windowsHide: false,
                    detached: false
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
                    command: command,
                    pid: playwrightProcess.pid
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
                message: 'No HTML report found. Please run tests first using the command: npx playwright test' 
            }));
            return;
        }

        const command = `npx playwright show-report`;
        exec(command, (error, stdout, stderr) => {
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
                message: 'No Allure results found. Please run tests first and ensure Allure reporter is configured.' 
            }));
            return;
        }

        const command = `npx allure generate ./allure-results --clean -o ./allure-report && npx allure open ./allure-report`;
        exec(command, (error, stdout, stderr) => {
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
                message: 'No test results folder found. Please run tests first to generate execution logs.' 
            }));
            return;
        }

        const command = `explorer .\\test-results`;
        exec(command, (error, stdout, stderr) => {
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
        req.on('data', chunk => {
            body += chunk.toString();
        });

        req.on('end', async () => {
            try {
                const testCaseData = JSON.parse(body);
                console.log(`💾 Saving test case: ${testCaseData.name}`);
                
                // Read PROJECT_CONTEXT.md
                const projectContextPath = path.join(process.cwd(), 'PROJECT_CONTEXT.md');
                
                if (!fs.existsSync(projectContextPath)) {
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ 
                        success: false, 
                        message: 'PROJECT_CONTEXT.md file not found' 
                    }));
                    return;
                }
                
                let content = fs.readFileSync(projectContextPath, 'utf8');
                
                // Extract elements from Playwright code
                const elements = extractElementsFromCode(testCaseData.playwrightCode, testCaseData.name);
                
                // Build the page elements section
                let elementsSection = '';
                if (elements.length > 0) {
                    elementsSection = `\n\n### ${testCaseData.name} Page Elements\n\n\`\`\`typescript\n`;
                    elements.forEach(el => {
                        elementsSection += `${el.name} = "${el.selector}"\n`;
                    });
                    elementsSection += `\`\`\``;
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
                        content = content.slice(0, nextSectionIndex) + testCaseEntry + '\n' + content.slice(nextSectionIndex);
                    } else {
                        content += testCaseEntry;
                    }
                } else {
                    // If Contact Us section not found, append at end of UI Test Scenarios
                    const uiTestDataIndex = content.indexOf('## UI Test Data');
                    if (uiTestDataIndex !== -1) {
                        content = content.slice(0, uiTestDataIndex) + testCaseEntry + '\n\n' + content.slice(uiTestDataIndex);
                    } else {
                        content += testCaseEntry;
                    }
                }
                
                // Write back to file
                fs.writeFileSync(projectContextPath, content, 'utf8');
                
                console.log(`✅ Test case saved to PROJECT_CONTEXT.md (${elements.length} elements extracted)`);
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ 
                    success: true, 
                    message: `Test case saved successfully with ${elements.length} page elements` 
                }));
                
            } catch (error) {
                console.error(`Error saving test case: ${error.message}`);
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ 
                    success: false, 
                    message: `Failed to save test case: ${error.message}` 
                }));
            }
        });

// Function to extract elements from Playwright code
function extractElementsFromCode(code, testName) {
    const elements = [];
    const seenSelectors = new Set();
    
    // Regular expressions to match different Playwright locator patterns
    const patterns = [
        /page\.locator\(['"]([^'"]+)['"]\)/g,
        /page\.getByRole\(['"](\w+)['"]\s*,\s*\{\s*name:\s*['"]([^'"]+)['"]/g,
        /page\.getByText\(['"]([^'"]+)['"]\)/g,
        /page\.getByLabel\(['"]([^'"]+)['"]\)/g,
        /page\.getByPlaceholder\(['"]([^'"]+)['"]\)/g,
        /page\.click\(['"]([^'"]+)['"]\)/g,
        /page\.fill\(['"]([^'"]+)['"]/g,
        /page\.type\(['"]([^'"]+)['"]/g,
    ];
    
    let counter = 1;
    
    patterns.forEach(pattern => {
        let match;
        while ((match = pattern.exec(code)) !== null) {
            let selector = match[1];
            let actionType = 'ELEMENT';
            
            // Determine element type based on selector or action
            if (code.includes(`locator('${selector}').click()`) || code.includes(`click('${selector}')`)) {
                actionType = 'BUTTON';
            } else if (code.includes(`locator('${selector}').fill()`) || code.includes(`fill('${selector}')`)) {
                actionType = 'TEXTBOX';
            } else if (selector.includes('input')) {
                actionType = 'INPUT';
            } else if (selector.includes('button') || selector.includes('btn')) {
                actionType = 'BUTTON';
            } else if (selector.includes('icon')) {
                actionType = 'ICON';
            } else if (selector.includes('link') || selector.includes('a[')) {
                actionType = 'LINK';
            }
            
            // Skip if we've already seen this selector
            if (seenSelectors.has(selector)) {
                continue;
            }
            seenSelectors.add(selector);
            
            // Generate element name
            const elementName = `${actionType}_${counter++}`;
            
            elements.push({
                name: elementName,
                selector: selector,
                type: actionType
            });
        }
    });
    
    return elements;
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
    } else if (req.url === '/PROJECT_CONTEXT.md') {
        // Serve the PROJECT_CONTEXT.md file
        const projectContextPath = path.join(__dirname, 'PROJECT_CONTEXT.md');
        
        fs.readFile(projectContextPath, 'utf8', (err, data) => {
            if (err) {
                res.writeHead(404, { 'Content-Type': 'text/plain' });
                res.end('PROJECT_CONTEXT.md not found');
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
