// jest.config.js
module.exports = {
    testEnvironment: 'node',
    testMatch: [`<rootDir>/test/jest/**/*.test.js`],
    moduleNameMapper: {
       '^vscode$': '<rootDir>/test/jest-mocks/vscode.js'
    }
};