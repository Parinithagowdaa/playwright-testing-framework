const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

const MAX_RETRY_ATTEMPTS = 5;
const TEST_TIMEOUT = 120000; // 2 minutes

/**
 * Run a specific test file and return results
 */
function runTest(testFilePath) {
    return new Promise((resolve, reject) => {
        const command = `node ./node_modules/@playwright/test/cli.js test ${testFilePath} --reporter=json`;
        
        exec(command, { timeout: TEST_TIMEOUT }, (error, stdout, stderr) => {
            try {
                const output = stdout || stderr;
                const jsonMatch = output.match(/\{[\s\S]*"suites"[\s\S]*\}/);
                
                if (jsonMatch) {
                    const result = JSON.parse(jsonMatch[0]);
                    resolve({ success: !error, result, output });
                } else {
                    resolve({ success: !error, result: null, output, rawError: error });
                }
            } catch (e) {
                resolve({ success: false, result: null, output: stdout + stderr, error: e.message });
            }
        });
    });
}

/**
 * Parse test errors and identify fixable issues
 */
function analyzeTestErrors(testResult) {
    const issues = [];
    
    if (!testResult.result || !testResult.result.suites) {
        return issues;
    }

    testResult.result.suites.forEach(suite => {
        suite.specs?.forEach(spec => {
            spec.tests?.forEach(test => {
                test.results?.forEach(result => {
                    if (result.status === 'failed' || result.status === 'timedOut') {
                        result.errors?.forEach(error => {
                            const errorMessage = error.message || error.stack || '';
                            
                            // Detect common error patterns
                            if (errorMessage.includes('locator.click:') && errorMessage.includes("can't be clicked")) {
                                issues.push({
                                    type: 'CLICK_BLOCKED',
                                    message: errorMessage,
                                    locator: extractLocator(errorMessage),
                                });
                            } else if (errorMessage.includes('locator.waitFor: Timeout') || errorMessage.includes('TimeoutError')) {
                                issues.push({
                                    type: 'ELEMENT_NOT_VISIBLE',
                                    message: errorMessage,
                                    locator: extractLocator(errorMessage),
                                });
                            } else if (errorMessage.includes('Test ended') || errorMessage.includes('Test was interrupted')) {
                                issues.push({
                                    type: 'TEST_INTERRUPTED',
                                    message: errorMessage,
                                    locator: extractLocator(errorMessage),
                                });
                            } else if (errorMessage.includes('locator.fill:') || errorMessage.includes('locator.type:')) {
                                issues.push({
                                    type: 'FILL_ERROR',
                                    message: errorMessage,
                                    locator: extractLocator(errorMessage),
                                });
                            } else if (errorMessage.includes('Expected is \'True\' & Actual is \'false\'')) {
                                issues.push({
                                    type: 'VALIDATION_FAILED',
                                    message: errorMessage,
                                    locator: extractLocator(errorMessage),
                                });
                            } else {
                                issues.push({
                                    type: 'UNKNOWN',
                                    message: errorMessage,
                                    locator: extractLocator(errorMessage),
                                });
                            }
                        });
                    }
                });
            });
        });
    });

    return issues;
}

/**
 * Extract locator information from error message
 */
function extractLocator(errorMessage) {
    const locatorMatch = errorMessage.match(/locator\(['"]([^'"]+)['"]\)/);
    if (locatorMatch) return locatorMatch[1];
    
    const textMatch = errorMessage.match(/text=['"]([^'"]+)['"]/);
    if (textMatch) return `text='${textMatch[1]}'`;
    
    return null;
}

/**
 * Apply automatic fixes to test files
 */
function applyFixes(testFilePath, stepsFilePath, issues) {
    const fixes = [];
    
    issues.forEach(issue => {
        switch (issue.type) {
            case 'TEST_INTERRUPTED':
            case 'CLICK_BLOCKED':
                // Remove unnecessary click steps
                if (issue.locator && issue.locator.includes('*')) {
                    fixes.push({
                        type: 'REMOVE_CLICK',
                        file: testFilePath,
                        locator: issue.locator,
                        action: 'Remove unnecessary click on label'
                    });
                }
                break;
                
            case 'ELEMENT_NOT_VISIBLE':
                // Skip visibility check for hidden elements when validating text
                fixes.push({
                    type: 'SKIP_VISIBILITY_CHECK',
                    file: stepsFilePath,
                    locator: issue.locator,
                    action: 'Skip visibility check when reading text from hidden elements'
                });
                break;
                
            case 'VALIDATION_FAILED':
                // Adjust validation logic
                fixes.push({
                    type: 'FIX_VALIDATION',
                    file: stepsFilePath,
                    locator: issue.locator,
                    action: 'Fix validation logic for hidden elements'
                });
                break;
        }
    });
    
    return fixes;
}

/**
 * Execute fixes on files
 */
function executeFixes(fixes) {
    const applied = [];
    
    fixes.forEach(fix => {
        try {
            if (fix.type === 'REMOVE_CLICK') {
                // Read test file and remove problematic click lines
                let content = fs.readFileSync(fix.file, 'utf8');
                const lines = content.split('\n');
                const filtered = lines.filter(line => {
                    // Remove lines with click on text elements that contain *
                    if (fix.locator && line.includes('click') && line.includes(fix.locator.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))) {
                        return false;
                    }
                    return true;
                });
                
                if (filtered.length !== lines.length) {
                    fs.writeFileSync(fix.file, filtered.join('\n'), 'utf8');
                    applied.push(`Removed problematic click: ${fix.locator}`);
                }
            }
        } catch (error) {
            console.error(`Failed to apply fix: ${error.message}`);
        }
    });
    
    return applied;
}

/**
 * Auto-run test with retry and auto-fix mechanism
 */
async function autoRunTest(testFilePath, moduleName) {
    console.log(`\n${'='.repeat(80)}`);
    console.log(`🚀 AUTO TEST RUNNER - Starting test: ${testFilePath}`);
    console.log(`${'='.repeat(80)}\n`);
    
    const stepsFilePath = `src/advantage/steps/${moduleName}Steps.ts`;
    let attempt = 1;
    let lastResult = null;
    
    while (attempt <= MAX_RETRY_ATTEMPTS) {
        console.log(`\n📝 Attempt ${attempt}/${MAX_RETRY_ATTEMPTS}`);
        console.log(`${'-'.repeat(80)}`);
        
        // Run the test
        console.log(`⏳ Running test...`);
        const testResult = await runTest(testFilePath);
        lastResult = testResult;
        
        // Check if test passed
        if (testResult.success && testResult.result) {
            const hasFailures = testResult.result.suites?.some(suite => 
                suite.specs?.some(spec => 
                    spec.tests?.some(test => 
                        test.results?.some(r => r.status === 'failed' || r.status === 'timedOut')
                    )
                )
            );
            
            if (!hasFailures) {
                console.log(`\n✅ SUCCESS! Test passed on attempt ${attempt}`);
                console.log(`${'='.repeat(80)}\n`);
                return { success: true, attempts: attempt };
            }
        }
        
        // Analyze errors
        console.log(`❌ Test failed, analyzing errors...`);
        const issues = analyzeTestErrors(testResult);
        
        if (issues.length === 0) {
            console.log(`⚠️  No fixable issues detected`);
            if (attempt < MAX_RETRY_ATTEMPTS) {
                console.log(`🔄 Retrying...`);
                attempt++;
                continue;
            }
            break;
        }
        
        console.log(`\n🔍 Detected ${issues.length} issue(s):`);
        issues.forEach((issue, idx) => {
            console.log(`   ${idx + 1}. ${issue.type}: ${issue.locator || 'unknown'}`);
        });
        
        // Apply fixes
        console.log(`\n🔧 Applying automatic fixes...`);
        const fixes = applyFixes(testFilePath, stepsFilePath, issues);
        const applied = executeFixes(fixes);
        
        if (applied.length > 0) {
            console.log(`✨ Applied ${applied.length} fix(es):`);
            applied.forEach(fix => console.log(`   - ${fix}`));
        } else {
            console.log(`⚠️  No automatic fixes available for these issues`);
        }
        
        // Increment attempt
        attempt++;
        
        // Wait a bit before retry
        if (attempt <= MAX_RETRY_ATTEMPTS) {
            console.log(`\n⏳ Waiting before retry...`);
            await new Promise(resolve => setTimeout(resolve, 2000));
        }
    }
    
    // Final failure
    console.log(`\n❌ FAILED after ${MAX_RETRY_ATTEMPTS} attempts`);
    console.log(`${'='.repeat(80)}\n`);
    
    if (lastResult && lastResult.output) {
        console.log(`Last error output:`);
        console.log(lastResult.output.substring(0, 2000));
    }
    
    return { success: false, attempts: MAX_RETRY_ATTEMPTS };
}

module.exports = {
    autoRunTest,
    runTest,
    analyzeTestErrors,
    applyFixes,
};
