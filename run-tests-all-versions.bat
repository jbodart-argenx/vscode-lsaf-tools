@echo off
REM ==========================================================================
REM VS Code Extension Consolidated Test Runner
REM ==========================================================================
REM
REM This batch file runs the consolidated test runner for the LSAF Tools
REM extension, which includes:
REM   1. Jest unit tests
REM   2. VS Code integration tests across multiple VS Code versions:
REM      - stable (latest stable VS Code release)
REM      - 1.83.0 (specific version)
REM      - 1.71.2 (minimum required version from package.json)
REM
REM The consolidated test runner provides a unified report showing the
REM status of all test types and saves detailed reports to the test-results
REM directory.
REM
REM The same functionality is available through npm script:
REM   - npm run test:consolidated
REM
REM For Unix/Linux/macOS users, use run-tests-all-versions.sh instead.
REM ==========================================================================

echo Running Consolidated Tests for LSAF Tools Extension
echo ================================================

REM Make sure node_modules\.bin is in the PATH
set PATH=%PATH%;%~dp0node_modules\.bin

REM Set environment variables for test run
set NODE_ENV=test
set NODE_OPTIONS=--max-old-space-size=4096

REM Ensure the test-results directory exists
if not exist test-results mkdir test-results

REM Run the consolidated test script
node "%~dp0run-consolidated-tests.js"

REM Check the exit code
if %errorlevel% neq 0 (
  echo Tests failed with exit code %errorlevel%
  exit /b %errorlevel%
) else (
  echo All tests completed successfully!
  exit /b 0
)