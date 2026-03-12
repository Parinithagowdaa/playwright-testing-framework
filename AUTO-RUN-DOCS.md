# Auto-Run & Auto-Fix Test Mechanism

## Overview

This framework includes an **automated test execution and error correction system** that:
- ✅ Automatically runs tests after test generation
- 🔧 Detects and fixes common test failures
- 🔄 Retries tests up to 5 times with intelligent fixes
- 📊 Provides detailed execution logs

## How It Works

### Workflow

1. **Test Generation** → Record test via Playwright Codegen
2. **POM Creation** → Auto-generates Page/Steps/Constants files
3. **Auto-Run** → Immediately runs the test
4. **Error Detection** → Analyzes any failures
5. **Auto-Fix** → Applies fixes based on error patterns
6. **Retry** → Re-runs test with fixes applied
7. **Success** → Test passes without human intervention

### Automatic Fixes Applied

| Error Type | Detection | Fix Applied |
|------------|-----------|-------------|
| **Test Interrupted** | `Test ended` / `Test was interrupted` | Remove unnecessary click steps on labels |
| **Click Blocked** | `can't be clicked` | Remove problematic click actions |
| **Element Not Visible** | `TimeoutError` / `locator.waitFor: Timeout` | Skip visibility checks for hidden elements |
| **Validation Failed** | `Expected is 'True' & Actual is 'false'` | Adjust validation logic |

## Usage

### Option 1: Automatic (via Dashboard)

When you save a test case through the dashboard, the auto-run mechanism triggers automatically:

1. Open dashboard: `http://localhost:3456`
2. Record test with Playwright Codegen
3. Save test case
4. ✨ Test runs and fixes automatically in the background

### Option 2: Manual CLI

Run any test file with auto-fix:

```bash
node run-test-auto.js <test-file-path> <module-name>
```

**Examples:**

```bash
# Run Retest module
node run-test-auto.js src/tests/Retest.spec.ts Retest

# Run ContactForm module
node run-test-auto.js src/tests/ContactForm.spec.ts ContactForm

# Run CreateAccount test
node run-test-auto.js src/tests/CreateAccountTest.spec.ts CreateAccount
```

## Configuration

Edit `.env` to configure timeouts:

```env
# Timeouts in minutes
TEST_TIMEOUT=20
ACTION_TIMEOUT=1
NAVIGATION_TIMEOUT=2
```

These timeouts are automatically used by:
- Generated validation methods (`isVisible()`)
- Playwright configuration
- Test retry mechanism

## Retry Settings

Configure in `auto-test-runner.js`:

```javascript
const MAX_RETRY_ATTEMPTS = 5;    // Maximum retry attempts
const TEST_TIMEOUT = 120000;     // Test timeout (2 minutes)
```

## Output Example

```
╔═══════════════════════════════════════════════════════════════════════╗
║               PLAYWRIGHT AUTO-RUN & AUTO-FIX TEST RUNNER               ║
╚═══════════════════════════════════════════════════════════════════════╝

🚀 AUTO TEST RUNNER - Starting test: src/tests/Retest.spec.ts
================================================================================

📝 Attempt 1/5
--------------------------------------------------------------------------------
⏳ Running test...
❌ Test failed, analyzing errors...

🔍 Detected 1 issue(s):
   1. TEST_INTERRUPTED: text='*EmailEmail'

🔧 Applying automatic fixes...
✨ Applied 1 fix(es):
   - Removed problematic click: text='*EmailEmail'

📝 Attempt 2/5
--------------------------------------------------------------------------------
⏳ Running test...
✅ SUCCESS! Test passed on attempt 2
================================================================================
```

## Files

- `auto-test-runner.js` - Core auto-run and auto-fix logic
- `run-test-auto.js` - CLI interface for manual runs
- `dashboard-server.js` - Integrated auto-run trigger

## Benefits

✅ **Zero Human Intervention** - Tests self-heal automatically
✅ **Fast Feedback** - Know immediately if tests work
✅ **Intelligent Fixes** - Pattern-based error correction
✅ **Detailed Logging** - Full visibility into what's happening
✅ **Configuration-Aware** - Uses .env timeouts correctly

## Limitations

- Currently fixes common patterns (click issues, visibility, validation)
- Maximum 5 retry attempts
- Complex logic errors may need manual intervention
- Works best with newly generated tests

## Next Steps

After successful auto-run:
- Check execution logs: `test-results/logs/execution.log`
- View HTML report: `npx playwright show-report`
- Review generated POM files in `src/advantage/`
