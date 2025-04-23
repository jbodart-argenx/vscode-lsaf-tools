const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

/**
 * Run-consolidated-tests.js
 * 
 * This script executes Jest tests and VS Code tests across multiple VS Code versions
 * and provides a consolidated, readable report of all test results.
 */

// Configuration
const vsCodeVersions = ['stable', '1.83.0', '1.71.2']; // Add or remove versions as needed
const jestTimeout = 120000; // Increased from 60000 to 120000 (2 minutes)
const vsCodeTimeout = 180000; // Increased from 120000 to 180000 (3 minutes)
const resultsDir = path.join(__dirname, 'test-results');

// ANSI color codes for pretty output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  underscore: '\x1b[4m',
  blink: '\x1b[5m',
  reverse: '\x1b[7m',
  hidden: '\x1b[8m',
  black: '\x1b[30m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  bgBlack: '\x1b[40m',
  bgRed: '\x1b[41m',
  bgGreen: '\x1b[42m',
  bgYellow: '\x1b[43m',
  bgBlue: '\x1b[44m',
  bgMagenta: '\x1b[45m',
  bgCyan: '\x1b[46m',
  bgWhite: '\x1b[47m'
};

// Results storage
const results = {
  jest: {
    success: false,
    message: '',
    passedTests: 0,
    totalTests: 0,
    duration: 0,
    failures: [] // Will hold detailed failure information
  },
  vscode: {}
};

// Create results directory if it doesn't exist
if (!fs.existsSync(resultsDir)) {
  fs.mkdirSync(resultsDir);
}

/**
 * Run Jest tests and capture results
 */
function runJestTests() {
  console.log(`\n${colors.cyan}${colors.bright}=== Running Jest Tests ===${colors.reset}\n`);
  
  const startTime = Date.now();
  try {
    // Run Jest with JSON reporter to capture detailed results
    // Use spawn instead of execSync to avoid ETIMEDOUT issues
    const jestCommand = process.platform === 'win32' 
      ? 'npx.cmd jest --json --outputFile=test-results/jest-results.json'
      : 'npx jest --json --outputFile=test-results/jest-results.json';
    
    execSync(jestCommand, { 
      stdio: 'inherit', 
      timeout: jestTimeout,
      maxBuffer: 10 * 1024 * 1024 // 10MB buffer to handle larger outputs
    });

    // Note: Node.js has a default buffer size limit (usually around 1MB).
    // If test output exceeds this limit, Node.js will terminate the process.
    // This can be mistaken for a timeout error since the process ends unexpectedly.
    // Setting a 10MB buffer ensures even verbose test output won't trigger an error.
    
    // Parse results
    const jestResults = JSON.parse(fs.readFileSync(path.join(resultsDir, 'jest-results.json'), 'utf8'));
    
    results.jest.success = jestResults.success;
    results.jest.passedTests = jestResults.numPassedTests;
    results.jest.totalTests = jestResults.numTotalTests;
    results.jest.duration = Date.now() - startTime;
    results.jest.message = `${jestResults.numPassedTests}/${jestResults.numTotalTests} tests passed`;
    
    // Collect detailed failure information
    if (!jestResults.success) {
      jestResults.testResults.forEach(suite => {
        if (suite.status === 'failed') {
          suite.assertionResults.forEach(test => {
            if (test.status === 'failed') {
              results.jest.failures.push({
                testName: `${suite.name}: ${test.title}`,
                message: test.failureMessages.join('\n')
              });
            }
          });
        }
      });
    }
    
    console.log(`\n${colors.green}✓ Jest Tests: ${results.jest.message} (${(results.jest.duration / 1000).toFixed(2)}s)${colors.reset}\n`);
  } catch (error) {
    results.jest.success = false;
    results.jest.message = `Jest tests failed: ${error.message}`;
    results.jest.duration = Date.now() - startTime;
    
    console.log(`\n${colors.red}✗ Jest Tests Failed: ${error.message} (${(results.jest.duration / 1000).toFixed(2)}s)${colors.reset}\n`);
  }
}

/**
 * Run VS Code tests for a specific version
 */
function runVSCodeTests(version) {
  console.log(`\n${colors.magenta}${colors.bright}=== Running VS Code Tests (${version}) ===${colors.reset}\n`);
  
  const startTime = Date.now();
  const resultKey = `vscode-${version}`;
  
  results.vscode[resultKey] = {
    success: false,
    message: '',
    version: version,
    duration: 0,
    output: '', // Will hold command output
    failures: [], // Will hold test failures
    passedTests: 0,
    totalTests: 0
  };
  
  try {
    // Create a unique log file for this test run
    const logFile = path.join(resultsDir, `vscode-test-${version.replace(/\./g, '-')}.log`);
    
    // Run VS Code tests with the specified version
    // Use the appropriate command based on platform
    const vscodeCommand = process.platform === 'win32'
      ? `node node_modules/cross-env/src/bin/cross-env.js VSCODE_TEST_VERSION=${version} npx.cmd vscode-test --no-install`
      : `cross-env VSCODE_TEST_VERSION=${version} npx vscode-test --no-install`;
    
    // Capture test output
    results.vscode[resultKey].output = execSync(vscodeCommand, {
      timeout: vsCodeTimeout,
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe'] // Override 'inherit' to capture output
    });
    
    // Write the output to a log file
    fs.writeFileSync(logFile, results.vscode[resultKey].output);
    
    // Parse output for test failures
    const failureMatches = results.vscode[resultKey].output.match(/✖\s+(.*?)(?:\n|$)/g);
    
    // Parse output for total number of tests
    const testCountMatch = results.vscode[resultKey].output.match(/(\d+) passing/i);
    const testCount = testCountMatch ? parseInt(testCountMatch[1]) : 0;
    const failureCount = failureMatches ? failureMatches.length : 0;
    
    results.vscode[resultKey].passedTests = testCount;
    results.vscode[resultKey].totalTests = testCount + failureCount;
    
    if (failureMatches) {
      results.vscode[resultKey].failures = failureMatches.map(match => match.trim());
    }
    
    results.vscode[resultKey].success = !failureMatches || failureMatches.length === 0;
    results.vscode[resultKey].duration = Date.now() - startTime;
    results.vscode[resultKey].message = results.vscode[resultKey].success 
      ? `${results.vscode[resultKey].passedTests}/${results.vscode[resultKey].totalTests} tests passed` 
      : `${results.vscode[resultKey].passedTests}/${results.vscode[resultKey].totalTests} tests passed (${failureMatches.length} failed)`;
    
    const statusIcon = results.vscode[resultKey].success ? `${colors.green}✓` : `${colors.red}✗`;
    console.log(`\n${statusIcon} VS Code Tests (${version}): ${results.vscode[resultKey].message} (${(results.vscode[resultKey].duration / 1000).toFixed(2)}s)${colors.reset}\n`);
    console.log(`   Test output saved to: ${logFile}`);
  } catch (error) {
    results.vscode[resultKey].success = false;
    results.vscode[resultKey].duration = Date.now() - startTime;
    results.vscode[resultKey].message = `Tests failed: ${error.message}`;
    
    // Try to capture partial output if available
    if (error.stdout) {
      const logFile = path.join(resultsDir, `vscode-test-${version.replace(/\./g, '-')}-error.log`);
      fs.writeFileSync(logFile, error.stdout);
      console.log(`   Partial test output saved to: ${logFile}`);
    }
    
    console.log(`\n${colors.red}✗ VS Code Tests (${version}) Failed: ${error.message} (${(results.vscode[resultKey].duration / 1000).toFixed(2)}s)${colors.reset}\n`);
  }
}

/**
 * Print consolidated results
 */
function printResults(totalStartTime, allSuccess) {
  console.log('\n\n');
  console.log(`${colors.bright}${colors.white}${colors.bgBlue} CONSOLIDATED TEST RESULTS ${colors.reset}`);
  console.log('════════════════════════════════════════════════════════');
  
  // Jest Results
  const jestColor = results.jest.success ? colors.green : colors.red;
  const jestIcon = results.jest.success ? '✓' : '✗';
  console.log(`${jestColor}${jestIcon} Jest Tests:${colors.reset} ${results.jest.message} (${(results.jest.duration / 1000).toFixed(2)}s)`);
  
  // Print Jest failures if any
  if (results.jest.failures && results.jest.failures.length > 0) {
    console.log(`\n   ${colors.red}Failed Jest Tests:${colors.reset}`);
    results.jest.failures.forEach((failure, index) => {
      console.log(`   ${index + 1}. ${colors.yellow}${failure.testName}${colors.reset}`);
      // Simplified failure message (first line only)
      const simplifiedMessage = failure.message.split('\n')[0];
      console.log(`      ${colors.red}${simplifiedMessage}${colors.reset}`);
    });
  }
  
  // VS Code Results
  console.log(`\n${colors.bright}VS Code Tests:${colors.reset}`);
  
  for (const [key, result] of Object.entries(results.vscode)) {
    const vsColor = result.success ? colors.green : colors.red;
    const vsIcon = result.success ? '✓' : '✗';
    console.log(`${vsColor}${vsIcon} ${result.version}:${colors.reset} ${result.message} (${(result.duration / 1000).toFixed(2)}s)`);
    console.log(`   ${colors.dim}Passed Tests: ${result.passedTests}/${result.totalTests}${colors.reset}`);
    
    // Print VS Code failures if any
    if (result.failures && result.failures.length > 0) {
      console.log(`   ${colors.red}Failed Tests:${colors.reset}`);
      result.failures.forEach((failure, index) => {
        console.log(`   ${index + 1}. ${colors.yellow}${failure}${colors.reset}`);
      });
      console.log(`   ${colors.dim}See test-results/vscode-test-${result.version.replace(/\./g, '-')}.log for details${colors.reset}`);
    }
  }
  
  // Summary
  console.log('\n════════════════════════════════════════════════════════');
  const totalDuration = (Date.now() - totalStartTime) / 1000;
  
  if (allSuccess) {
    console.log(`${colors.bgGreen}${colors.black} SUMMARY: ${colors.reset} ${colors.green}All tests passed successfully in ${totalDuration.toFixed(2)}s${colors.reset}`);
  } else {
    console.log(`${colors.bgRed}${colors.white} SUMMARY: ${colors.reset} ${colors.red}Some tests failed (${totalDuration.toFixed(2)}s)${colors.reset}`);
    console.log(`\n${colors.bright}Detailed test logs available in the test-results directory:${colors.reset}`);
    console.log(`  - ${colors.cyan}Jest results:${colors.reset} test-results/jest-results.json`);
    vsCodeVersions.forEach(version => {
      console.log(`  - ${colors.cyan}VS Code ${version} results:${colors.reset} test-results/vscode-test-${version.replace(/\./g, '-')}.log`);
    });
  }
  
  console.log('\n');
  
  // Save full results to file
  const reportPath = path.join(resultsDir, `test-report-${new Date().toISOString().replace(/:/g, '-')}.json`);
  fs.writeFileSync(reportPath, JSON.stringify(results, null, 2));
  console.log(`Detailed report saved to: ${reportPath}`);
}

/**
 * Main execution function
 */
async function runAllTests() {
  const totalStartTime = Date.now();
  
  try {
    console.log(`${colors.bright}${colors.white}${colors.bgBlue} STARTING CONSOLIDATED TEST RUN ${colors.reset}`);
    console.log('Running tests for VS Code LSAF Tools Extension');
    console.log(`Date: ${new Date().toISOString()}`);
    console.log('════════════════════════════════════════════════════════');
    
    // Run Jest tests first
    runJestTests();
    
    // Run VS Code tests for each version
    for (const version of vsCodeVersions) {
      runVSCodeTests(version);
    }
    
    // Print consolidated results
    const allSuccess = results.jest.success && Object.values(results.vscode).every(r => r.success);
    printResults(totalStartTime, allSuccess);
    
    // Exit with appropriate code
    process.exit(allSuccess ? 0 : 1);
    
  } catch (error) {
    console.error(`${colors.red}Unexpected error running tests: ${error.message}${colors.reset}`);
    process.exit(1);
  }
}

// Run everything
runAllTests();