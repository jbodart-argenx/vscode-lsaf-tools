const vscode = require('vscode');
const path = require('path');
const fs = require('fs');
const os = require('os');

/**
 * Ensures that at least one workspace folder is open during tests
 * @returns {Promise<vscode.WorkspaceFolder>} The workspace folder
 */
async function ensureWorkspaceOpen() {
  // Check if a workspace is already open
  if (vscode.workspace.workspaceFolders && vscode.workspace.workspaceFolders.length > 0) {
    console.log(`Test workspace already open: ${vscode.workspace.workspaceFolders[0].uri.fsPath}`);
    return vscode.workspace.workspaceFolders[0];
  }

  console.log('No workspace open. Opening a test workspace...');
  
  // Create a temporary workspace if needed
  const tempWorkspace = path.join(os.tmpdir(), `vscode-test-workspace-${Date.now()}`);
  fs.mkdirSync(tempWorkspace, { recursive: true });
  
  // Create a test file in the workspace (helps VS Code recognize it as a workspace)
  fs.writeFileSync(path.join(tempWorkspace, 'test-file.txt'), 'This is a test workspace');
  
  // Open the folder as a workspace
  const workspaceUri = vscode.Uri.file(tempWorkspace);
  await vscode.commands.executeCommand('vscode.openFolder', workspaceUri, false);
  
  // Wait for the workspace to be fully loaded
  return new Promise((resolve) => {
    const checkWorkspace = setInterval(() => {
      if (vscode.workspace.workspaceFolders && vscode.workspace.workspaceFolders.length > 0) {
        clearInterval(checkWorkspace);
        console.log(`Test workspace opened: ${vscode.workspace.workspaceFolders[0].uri.fsPath}`);
        resolve(vscode.workspace.workspaceFolders[0]);
      }
    }, 500);
    
    // Time out after 10 seconds
    setTimeout(() => {
      clearInterval(checkWorkspace);
      console.log('Timed out waiting for workspace to open');
      resolve(null);
    }, 10000);
  });
}

/**
 * Checks if a workspace is open and provides diagnostic information
 * @returns {boolean} True if a workspace is open
 */
function checkWorkspaceStatus() {
  if (vscode.workspace.workspaceFolders && vscode.workspace.workspaceFolders.length > 0) {
    console.log('Workspace status: OPEN');
    console.log(`Current workspace folders: ${vscode.workspace.workspaceFolders.map(folder => folder.uri.fsPath).join(', ')}`);
    return true;
  } else {
    console.log('Workspace status: NONE');
    console.log('No workspace folders are currently open.');
    return false;
  }
}

module.exports = {
  ensureWorkspaceOpen,
  checkWorkspaceStatus
};