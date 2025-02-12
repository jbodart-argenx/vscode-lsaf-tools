const vscode = require('vscode');

let defaultEndpoints = require('../endpoints').defaultEndpoints;
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
         const { getOppositeEndpointUri } = await require('../utils.js');
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

	const getLsafFilePathCommand = vscode.commands.registerCommand(
		"vscode-lsaf-tools.getLsafFilePath",
		async (fileOrFolder) => {
			const { getLsafPath } = await require('../utils.js');
			const lsafPath = await getLsafPath(fileOrFolder);
			if (lsafPath) {
				try {
					vscode.env.clipboard.writeText(lsafPath.toString());
					console.log(`(getlsafPath) LSAF File/Folder Path copied to clipboard: ${lsafPath}`);
					vscode.window.showInformationMessage(`LSAF File/Folder Path copied to clipboard: ${lsafPath}`);
				} catch (error) {
					vscode.window.showErrorMessage(`Error copying LSAF File/Folder Path to clipboard: ${error.message}`);         
					console.error(`(getlsafPath) Error copying LSAF File/Folder Path to clipboard: ${error.message}`);         
				}
			}
			return lsafPath;
		}
	);

	context.subscriptions.push(...[
		helloWorldCommand,
		getXAuthTokenCommand,
		deleteCredentialsCommand,
		getFileUriCommand,
		getOppositeEndpointUriCommand,
		getLsafFilePathCommand,
	]);

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