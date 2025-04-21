#!/bin/bash
# ==========================================================================
# VS Code Extension Test Runner for Multiple VS Code Versions
# ==========================================================================
#
# This shell script runs tests for the VS Code extension against:
#   1. The version specified in package.json (minimum required version)
#   2. The latest stable VS Code version
#
# The same functionality is available through npm scripts:
#   - npm run test:vscode         (Tests with version from package.json)
#   - npm run test:vscode:stable  (Tests with latest stable VS Code)
#   - npm run test:vscode:all     (Tests with both versions)
#
# This script is useful for quick manual testing during development
# and for Linux/macOS-specific CI/CD pipelines.
#
# For Windows users, use run-tests-all-versions.bat instead.
#
# Note: You may need to make this script executable with:
#   chmod +x run-tests-all-versions.sh
# ==========================================================================

echo "Running tests with VS Code version from package.json..."
npx @vscode/test-cli

echo ""
echo "Running tests with latest stable VS Code version..."
export VSCODE_TEST_VERSION=stable
npx @vscode/test-cli

# Clean up environment
unset VSCODE_TEST_VERSION