const vscode = require('vscode');

let defaultEndpoints = require('./endpoints').defaultEndpoints;
console.log('Default Endpoints:', defaultEndpoints);

const { initializeSecretModule, deleteAuthTokens, deleteCredentials, logon } = require('../auth.js');
const { copyFileOrFolderUri } = require('../utils.js');

/**
 * @param {vscode.ExtensionContext} context
 */
async function activate(context) {
   console.log('Web extension "vscode-lsaf-tools" activated.');

   const secretStorage = context.secrets;
   initializeSecretModule(secretStorage);

   const helloWorldCommand = vscode.commands.registerCommand('vscode-lsaf-tools.lsaf-helloWorld', function () {
      vscode.window.showInformationMessage('Hello World from vscode-lsaf-tools web extension!');
   });

   const getXAuthTokenCommand = vscode.commands.registerCommand(
      "vscode-lsaf-tools.getXAuthToken",
      (host) => logon(host)
   );

   const deleteCredentialsCommand = vscode.commands.registerCommand(
      "vscode-lsaf-tools.deleteCredentials",
      (host) => deleteCredentials(host)
   );

   const getFileUriCommand = vscode.commands.registerCommand(
      "vscode-lsaf-tools.copyFileUri",
      (fileOrFolder) => copyFileOrFolderUri(fileOrFolder)
   );
   
   const getOppositeEndpointUriCommand = vscode.commands.registerCommand(
      "vscode-lsaf-tools.getOppositeEndpointUri",
      async (fileOrFolder) => {
         const { getOppositeEndpointUri } = await require('./utils.js');
         const oppositeEndpointUri = await getOppositeEndpointUri(fileOrFolder);
         if (oppositeEndpointUri) {
            try {
               vscode.env.clipboard.writeText(oppositeEndpointUri.toString());
               console.log(`(getOppositeEndpointUri) Opposite File/Folder Uri copied to clipboard: ${oppositeEndpointUri}`);
               vscode.window.showInformationMessage(`Opposite File/Folder Uri copied to clipboard: ${oppositeEndpointUri}`);
            } catch (error) {
               vscode.window.showErrorMessage(`Error copying Opposite File/Folder Uri to clipboard: ${error.message}`);         
               console.error(`(getOppositeEndpointUri) Error copying Opposite File/Folder Uri to clipboard: ${error.message}`);         
            }
         }
         return oppositeEndpointUri;
      }
   );

   context.subscriptions.push(helloWorldCommand);
   context.subscriptions.push(getXAuthTokenCommand);
   context.subscriptions.push(deleteCredentialsCommand);
   context.subscriptions.push(getFileUriCommand);
   context.subscriptions.push(getOppositeEndpointUriCommand);

   const commands = (await vscode.commands.getCommands()).filter(c => /lsaf/i.test(c));
   console.log('(vscode-lsaf-tools) Activated vscode.commands:');
   commands.forEach(c => { console.log(`  ${c}`) });
}

function deactivate() {
   deleteAuthTokens('*');
   console.log('Web extension "vscode-lsaf-tools" deactivated.');
}

module.exports = {
   activate,
   deactivate
};