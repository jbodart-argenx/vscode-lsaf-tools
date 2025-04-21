# LSAF Tools Extension Test Guide

This document provides a comprehensive guide on how to run tests and review test results for the VS Code LSAF Tools Extension.

## Table of Contents

- [Test Environment Overview](#test-environment-overview)
- [Running Tests](#running-tests)
  - [Running Individual Test Types](#running-individual-test-types)
  - [Running Consolidated Tests](#running-consolidated-tests)
  - [Running Tests Against Multiple VS Code Versions](#running-tests-against-multiple-vs-code-versions)
- [Reviewing Test Results](#reviewing-test-results)
  - [Standard Test Output](#standard-test-output)
  - [Consolidated Test Reports](#consolidated-test-reports)
  - [Reviewing Test Failures in Detail](#reviewing-test-failures-in-detail)
- [Test Structure](#test-structure)
  - [Jest Unit Tests](#jest-unit-tests)
  - [VS Code Integration Tests](#vs-code-integration-tests)
- [Troubleshooting Tests](#troubleshooting-tests)
- [Writing New Tests](#writing-new-tests)

## Test Environment Overview

The LSAF Tools extension uses two testing frameworks:

1. **Jest** - For unit tests that don't require VS Code API integration
2. **VS Code Test Runner** - For integration tests that need the VS Code environment

Tests are organized into:
- `test/jest/` - Jest unit tests
- `test/vscode/` - VS Code integration tests

## Running Tests

### Running Individual Test Types

#### Jest Tests

Run Jest unit tests only:

```bash
npm run test:jest
```

#### VS Code Tests

Run VS Code integration tests with the minimum supported VS Code version:

```bash
npm run test:vscode
```

Run with latest stable VS Code version:

```bash
npm run test:vscode:stable
```

Run against both minimum and stable VS Code versions:

```bash
npm run test:vscode:all
```

### Running Consolidated Tests

To run all tests (Jest + VS Code tests across multiple VS Code versions) with enhanced reporting:

```bash
npm run test:consolidated
```

You can also use the batch file or shell script:

**Windows**:
```bash
run-tests-all-versions.bat
```

**macOS/Linux**:
```bash
chmod +x run-tests-all-versions.sh
./run-tests-all-versions.sh
```

### Running Tests Against Multiple VS Code Versions

The consolidated test runner executes tests against multiple VS Code versions:
- The current stable version
- Version 1.83.0 (a specific recent version)
- Version 1.71.2 (the minimum required version from package.json)

You can customize these versions by editing the `vsCodeVersions` array in `run-consolidated-tests.js`.

## Reviewing Test Results

### Standard Test Output

When running tests with standard NPM scripts (`npm test`, `npm run test:jest`, or `npm run test:vscode`), results will be displayed in the terminal without detailed reporting.

### Consolidated Test Reports

When running tests with the consolidated test runner, you'll get:

1. A summary of all test runs in the console
2. Detailed test reports saved in the `test-results` directory:
   - `test-results/jest-results.json` - Full Jest test results
   - `test-results/vscode-test-{version}.log` - Output logs for VS Code tests
   - `test-results/test-report-{timestamp}.json` - Consolidated report with all test results

Example console output:
```
CONSOLIDATED TEST RESULTS
════════════════════════════════════════════════════════
✓ Jest Tests: 24/24 tests passed (2.35s)

VS Code Tests:
✓ stable: All tests passed (8.42s)
✓ 1.83.0: All tests passed (7.89s)
✓ 1.71.2: All tests passed (9.13s)

════════════════════════════════════════════════════════
SUMMARY: All tests passed successfully in 27.79s
```

### Reviewing Test Failures in Detail

To view detailed information about test failures:

```bash
npm run test:view-failures
```

This command displays:
- Failed test names with error messages
- Stack traces for failed tests
- Links to detailed log files for each test run

For Jest test failures, you'll see:
```
JEST TEST FAILURES

Failure #1: /path/to/test.js: should handle error conditions
AssertionError: expected 'error' to equal 'success'
────────────────────────────────────────────────────────
```

For VS Code test failures, you'll see:
```
VS CODE TEST FAILURES (stable)

Failure #1: ✖ should extract zip files correctly

Detailed Error Information:
Error Detail #1:
    AssertionError [ERR_ASSERTION]: Expected values to be strictly equal:
    false !== true
────────────────────────────────────────────────────────

Full log available at: test-results/vscode-test-stable.log
```

## Test Structure

### Jest Unit Tests

Jest tests are located in the `test/jest/` directory and focus on testing:
- Utility functions
- Non-VS Code dependent logic
- Pure JavaScript functionality

Run a specific Jest test:
```bash
npx jest test/jest/zip.test.js
```

### VS Code Integration Tests

VS Code tests are in the `test/vscode/` directory and test:
- Extension activation
- Command registration and execution
- API integration
- UI components

These tests require the VS Code API and run in a special VS Code test environment.

## Troubleshooting Tests

### Common Issues

1. **VSCode Extension Tests Failing to Run**
   
   Ensure you have the VS Code test extension installed:
   ```
   npm install --save-dev @vscode/test-cli @vscode/test-electron
   ```

2. **LSAF-Specific Tests Failing**

   Some tests require the 'jbodart-argenx.vsce-lsaf-restapi-fs' extension to be installed in your VS Code.

3. **Test Timeouts**

   For long-running tests, you may need to increase the timeout in the consolidated test runner:
   ```javascript
   // In run-consolidated-tests.js
   const jestTimeout = 120000;  // 2 minutes
   const vsCodeTimeout = 180000; // 3 minutes
   ```

### Debug Mode

To debug tests:

1. **Debug Jest Tests**:
   - Open VS Code's Run and Debug view
   - Select "Debug Jest Tests" configuration
   - Press F5

2. **Debug VS Code Tests**:
   - Open VS Code's Run and Debug view
   - Select "Debug VS Code Tests" configuration
   - Press F5

## Writing New Tests

### Adding Jest Tests

1. Create a new test file in `test/jest/` with a `.test.js` extension
2. Follow the Jest pattern for assertions:

```javascript
describe('My Feature', () => {
  it('should do something', () => {
    expect(myFunction()).toBe(expectedValue);
  });
});
```

### Adding VS Code Tests

1. Create a new test file in `test/vscode/` with `.test.js` extension
2. Use the TDD style suite/test structure:

```javascript
const assert = require('assert');
const vscode = require('vscode');

suite('My Feature', () => {
  test('should do something in VS Code', async () => {
    const result = await vscode.commands.executeCommand('my.command');
    assert.strictEqual(result, expectedValue);
  });
});
```

---

For questions or additional assistance with testing, please contact the extension maintainers.