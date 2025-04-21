const vscode = require('vscode');
const assert = require('assert');
const { checkWorkspaceStatus, ensureWorkspaceOpen } = require('./test-helpers');

suite('Workspace Test Environment Verification', () => {
    
    suiteSetup(async function() {
        this.timeout(20000); // Opening workspaces can take time
        console.log('Running workspace verification suite setup...');
        
        // Start by checking if we have a workspace
        const hasWorkspace = checkWorkspaceStatus();
        
        if (!hasWorkspace) {
            // Try to ensure a workspace is open
            await ensureWorkspaceOpen();
            
            // Check again after our attempt
            checkWorkspaceStatus();
        }
    });
    
    test('Verify workspace is available for tests', () => {
        // This test verifies that workspace functions can be called during tests
        assert.ok(vscode.workspace, 'Workspace object should be available');
        
        // Log detailed information about the workspace
        console.log('Workspace rootPath:', vscode.workspace.rootPath);
        console.log('Workspace name:', vscode.workspace.name);
        
        if (vscode.workspace.workspaceFolders && vscode.workspace.workspaceFolders.length > 0) {
            console.log('Number of workspace folders:', vscode.workspace.workspaceFolders.length);
            vscode.workspace.workspaceFolders.forEach((folder, index) => {
                console.log(`Workspace folder #${index + 1}:`, folder.uri.fsPath);
                console.log(`Workspace folder name:`, folder.name);
            });
            
            assert.ok(true, 'Workspace folders are available');
        } else {
            console.log('No workspace folders available in this test run');
            // If this assertion fails, the test will fail
            assert.ok(false, 'Expected at least one workspace folder to be open');
        }
    });
    
    test('Can create files in workspace', async function() {
        this.timeout(10000); // File operations can take time
        
        try {
            // Get the workspace folder
            const workspaceFolder = vscode.workspace.workspaceFolders[0];
            assert.ok(workspaceFolder, 'Workspace folder should be available');
            
            // Create a test file URI
            const testFileUri = vscode.Uri.joinPath(workspaceFolder.uri, 'test-write-file.txt');
            
            // Write content to the file
            const content = 'This file was created during a test run: ' + new Date().toISOString();
            const contentBuffer = Buffer.from(content, 'utf8');
            
            await vscode.workspace.fs.writeFile(testFileUri, contentBuffer);
            console.log('Successfully created test file at:', testFileUri.fsPath);
            
            // Read back the file to verify
            const readContent = await vscode.workspace.fs.readFile(testFileUri);
            const readText = Buffer.from(readContent).toString('utf8');
            
            assert.strictEqual(readText, content, 'File content should match what was written');
            
            // Clean up
            await vscode.workspace.fs.delete(testFileUri);
            console.log('Successfully deleted test file');
            
        } catch (err) {
            console.error('Error during file operations test:', err);
            assert.fail(`Failed to perform file operations: ${err.message}`);
        }
    });
    
    test('WorkspaceConfiguration API works', () => {
        // Get a configuration object
        const config = vscode.workspace.getConfiguration('vscode-lsaf-tools');
        assert.ok(config, 'Should be able to get workspace configuration');
        
        // Log available configuration settings
        console.log('Configuration inspection:');
        
        // Get the default endpoints configuration
        const defaultEndpoints = config.get('defaultEndpoints');
        console.log('Default endpoints config:', defaultEndpoints ? 'Available' : 'Not available');
        
        // Verify we can access configuration data
        assert.ok(
            typeof config.get === 'function', 
            'Configuration API should be functional'
        );
    });
});