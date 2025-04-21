#!/bin/bash
# ==========================================================================
# VS Code Extension Consolidated Test Runner
# ==========================================================================
#
# This shell script runs the consolidated test runner for the LSAF Tools
# extension, which includes:
#   1. Jest unit tests
#   2. VS Code integration tests across multiple VS Code versions:
#      - stable (latest stable VS Code release)
#      - 1.83.0 (specific version)
#      - 1.71.2 (minimum required version from package.json)
#
# The consolidated test runner provides a unified report showing the
# status of all test types and saves detailed reports to the test-results
# directory.
#
# The same functionality is available through npm script:
#   - npm run test:consolidated
#
# This script is useful for both manual testing during development
# and for Unix/Linux/macOS-specific CI/CD pipelines.
#
# For Windows users, use run-tests-all-versions.bat instead.
#
# Note: You may need to make this script executable with:
#   chmod +x run-tests-all-versions.sh
# ==========================================================================

echo "Running Consolidated Tests for LSAF Tools Extension"
echo "================================================"

# Set environment variables for test run
export NODE_ENV=test

# Run the consolidated test script
node run-consolidated-tests.js

# Check the exit code
if [ $? -ne 0 ]; then
  echo "Tests failed with exit code $?"
  exit $?
else
  echo "All tests completed successfully!"
  exit 0
fi