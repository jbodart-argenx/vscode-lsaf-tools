// VS Code Testing Environment Configuration
// https://code.visualstudio.com/api/working-with-extensions/testing-extension

const path = require('path');

module.exports = {
    // Configure extensions to install in the test environment
    extensions: [
        // Option 1: Try to install from marketplace
        // 'jbodart-argenx.vsce-lsaf-restapi-fs'
        
        // Option 2: Install from local VSIX file
        path.resolve(__dirname, '../vsce-lsaf-restapi-fs/vsce-lsaf-restapi-fs-0.1.9.vsix')
    ],
    // Optional: Configure VS Code version, launch arguments, etc.
    version: '1.99.3', // Match your installed version or specify another version
    launchArgs: [
        // Open a folder/workspace during tests
        '--folder-uri', `file:///${path.resolve(__dirname).replace(/\\/g, '/')}`,
        // '--disable-extensions' // Disable other extensions to avoid interference
        // We need to keep other extensions enabled to support custom URI schemes
    ]
};