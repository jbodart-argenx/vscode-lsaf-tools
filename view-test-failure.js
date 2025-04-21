#!/usr/bin/env node

/**
 * Test Failure Viewer
 * 
 * A utility script to easily review test failures from recent test runs.
 * Use this script to examine detailed test failure information after
 * running tests with the consolidated test runner.
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');

// ANSI color codes for pretty output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  underscore: '\x1b[4m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  bgBlue: '\x1b[44m',
};

const resultsDir = path.join(__dirname, 'test-results');

// Check if results directory exists
if (!fs.existsSync(resultsDir)) {
  console.error(`${colors.red}Error: Could not find test results directory at ${resultsDir}${colors.reset}`);
  console.log(`Run tests first using: npm run test:consolidated`);
  process.exit(1);
}

// Get all JSON report files, sorted by date (newest first)
const reportFiles = fs.readdirSync(resultsDir)
  .filter(file => file.startsWith('test-report-') && file.endsWith('.json'))
  .sort()
  .reverse();

if (reportFiles.length === 0) {
  console.error(`${colors.red}Error: No test reports found in ${resultsDir}${colors.reset}`);
  console.log(`Run tests first using: npm run test:consolidated`);
  process.exit(1);
}

// Find most recent report
const latestReportFile = reportFiles[0];
const latestReport = JSON.parse(fs.readFileSync(path.join(resultsDir, latestReportFile), 'utf8'));

// Track if we have failures
let hasFailures = false;

// Display Jest failures
if (latestReport.jest && !latestReport.jest.success) {
  hasFailures = true;
  console.log(`\n${colors.bright}${colors.white}${colors.bgBlue} JEST TEST FAILURES ${colors.reset}\n`);
  
  if (latestReport.jest.failures && latestReport.jest.failures.length > 0) {
    latestReport.jest.failures.forEach((failure, index) => {
      console.log(`${colors.bright}${colors.yellow}Failure #${index + 1}: ${failure.testName}${colors.reset}`);
      console.log(`${colors.red}${failure.message}${colors.reset}`);
      console.log('─'.repeat(80));
    });
  } else {
    console.log(`${colors.yellow}Jest tests failed but no specific failure details were captured.${colors.reset}`);
  }
}

// Display VS Code failures for each version
Object.entries(latestReport.vscode).forEach(([key, data]) => {
  if (!data.success) {
    hasFailures = true;
    console.log(`\n${colors.bright}${colors.white}${colors.bgBlue} VS CODE TEST FAILURES (${data.version}) ${colors.reset}\n`);
    
    // Check if we have specific failures
    if (data.failures && data.failures.length > 0) {
      data.failures.forEach((failure, index) => {
        console.log(`${colors.bright}${colors.yellow}Failure #${index + 1}: ${failure}${colors.reset}`);
      });
      
      // Check if we have a log file with more details
      const logFile = path.join(resultsDir, `vscode-test-${data.version.replace(/\./g, '-')}.log`);
      if (fs.existsSync(logFile)) {
        const logContent = fs.readFileSync(logFile, 'utf8');
        
        // Extract sections of logs that contain error details (stack traces, assertion failures)
        const errorSections = logContent.split('\n\n')
          .filter(section => section.includes('Error:') || section.includes('AssertionError') || 
                           section.includes('✖') || section.includes('FAIL'));
        
        if (errorSections.length > 0) {
          console.log(`\n${colors.bright}Detailed Error Information:${colors.reset}`);
          errorSections.forEach((section, index) => {
            if (section.trim()) {
              console.log(`\n${colors.cyan}Error Detail #${index + 1}:${colors.reset}`);
              console.log(section);
              console.log('─'.repeat(80));
            }
          });
        }
        
        console.log(`\nFull log available at: ${logFile}`);
      }
    } else {
      console.log(`${colors.yellow}Tests failed but no specific failure details were captured.${colors.reset}`);
      console.log(`Check the log file for more information.`);
    }
  }
});

if (!hasFailures) {
  console.log(`\n${colors.green}${colors.bright}No test failures found in the most recent test run!${colors.reset}`);
  console.log(`Last test run completed: ${latestReportFile.replace('test-report-', '').replace('.json', '')}`);
}

// Display a list of all available reports
console.log(`\n${colors.bright}Available test reports:${colors.reset}`);
reportFiles.forEach((file, index) => {
  const timestamp = file.replace('test-report-', '').replace('.json', '');
  console.log(`${index + 1}. ${timestamp}`);
});

console.log(`\n${colors.bright}To view a specific test report, run:${colors.reset}`);
console.log(`  node view-test-failure.js <report-number>`);