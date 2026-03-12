#!/usr/bin/env node

/**
 * CLI tool to run tests with automatic retry and fix mechanism
 * Usage: node run-test-auto.js <test-file-path> <module-name>
 * Example: node run-test-auto.js src/tests/Retest.spec.ts Retest
 */

const { autoRunTest } = require('./auto-test-runner');
const path = require('path');

async function main() {
    const args = process.argv.slice(2);
    
    if (args.length < 2) {
        console.log('');
        console.log('Usage: node run-test-auto.js <test-file-path> <module-name>');
        console.log('');
        console.log('Examples:');
        console.log('  node run-test-auto.js src/tests/Retest.spec.ts Retest');
        console.log('  node run-test-auto.js src/tests/ContactForm.spec.ts ContactForm');
        console.log('');
        process.exit(1);
    }
    
    const testFilePath = args[0];
    const moduleName = args[1];
    
    console.log('╔═══════════════════════════════════════════════════════════════════════╗');
    console.log('║               PLAYWRIGHT AUTO-RUN & AUTO-FIX TEST RUNNER               ║');
    console.log('╚═══════════════════════════════════════════════════════════════════════╝');
    console.log('');
    console.log(`📋 Test File: ${testFilePath}`);
    console.log(`📦 Module: ${moduleName}`);
    console.log('');
    
    try {
        const result = await autoRunTest(testFilePath, moduleName);
        
        if (result.success) {
            console.log('');
            console.log('╔═══════════════════════════════════════════════════════════════════════╗');
            console.log('║                          ✅ TEST PASSED                               ║');
            console.log('╚═══════════════════════════════════════════════════════════════════════╝');
            console.log(`✨ Test passed on attempt ${result.attempts}`);
            console.log('');
            process.exit(0);
        } else {
            console.log('');
            console.log('╔═══════════════════════════════════════════════════════════════════════╗');
            console.log('║                          ❌ TEST FAILED                               ║');
            console.log('╚═══════════════════════════════════════════════════════════════════════╝');
            console.log(`⚠️  Test failed after ${result.attempts} attempts`);
            console.log('');
            process.exit(1);
        }
    } catch (error) {
        console.error('');
        console.error('╔═══════════════════════════════════════════════════════════════════════╗');
        console.error('║                          💥 ERROR                                      ║');
        console.error('╚═══════════════════════════════════════════════════════════════════════╝');
        console.error(`Error: ${error.message}`);
        console.error('');
        process.exit(1);
    }
}

main();
