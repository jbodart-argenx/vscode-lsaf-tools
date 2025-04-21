@echo off
rem ==========================================================================
rem VS Code Extension Test Runner for Multiple VS Code Versions
rem ==========================================================================
rem
rem This batch file runs tests for the VS Code extension against:
rem   1. The version specified in package.json (minimum required version)
rem   2. The latest stable VS Code version
rem
rem The same functionality is available through npm scripts:
rem   - npm run test:vscode         (Tests with version from package.json)
rem   - npm run test:vscode:stable  (Tests with latest stable VS Code)
rem   - npm run test:vscode:all     (Tests with both versions)
rem
rem This script is useful for quick manual testing during development
rem and for Windows-specific CI/CD pipelines.
rem
rem For Linux/macOS users, use run-tests-all-versions.sh instead.
rem ==========================================================================

echo Running tests with VS Code version from package.json...
call npx @vscode/test-cli
echo.
echo Running tests with latest stable VS Code version...
set VSCODE_TEST_VERSION=stable
call npx @vscode/test-cli
set VSCODE_TEST_VERSION=