import { defineConfig } from '@vscode/test-cli';

export default defineConfig({
  files: 'test/vscode/**/*.test.js',
  extensionDevelopmentPath: '.',
  // launchArgs: ['--disable-extensions'],
  launchTestsTimeout: 30000
});
