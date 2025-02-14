const vscode = require('vscode');

if (typeof self === 'undefined') {
	global.self = global;
}

let defaultEndpoints = require('../endpoints').defaultEndpoints;
console.log('Default Endpoints:', defaultEndpoints);

async function activate(context) {
   console.log('Web extension "vscode-lsaf-tools" activating...');
   
   if (vscode.env.appHost === "desktop") {
		const os = require('os'); // Load only in desktop environment
		console.log("Running on platform:", os.platform());
	} else {
		console.log("Running in a web browser, using 'os-browserify/browser' instead of 'os' module.");
		const os = require('os-browserify/browser');
		console.log("Running on platform:", os.platform());
		// eslint-disable-next-line no-undef
		// const userAgent = typeof navigator !== "undefined" ? navigator.userAgent : "Node.js";
		// globalThis provides a standardized way to access the global object, whether in a browser, Node.js, Web Workers, or other JavaScript environments.
		const userAgent = globalThis.navigator?.userAgent || "Node.js";
		const platform = userAgent.includes("Windows") ? "Windows" : 
			userAgent.includes("Mac") ? "Mac" : 
			userAgent.includes("Linux") ? "Linux" : 
			"Unknown";
		console.log("Running on platform:", platform);
	}

   const secretStorage = context.secrets;
	const { initializeSecretModule } = await require('../auth.js');
   initializeSecretModule(secretStorage);

   const helloWorldCommand = vscode.commands.registerCommand('vscode-lsaf-tools.lsaf-helloWorld', async function () {
      vscode.window.showInformationMessage('Hello World from vscode-lsaf-tools web extension!');
   });

   const getXAuthTokenCommand = vscode.commands.registerCommand(
      "vscode-lsaf-tools.getXAuthToken",
		async (host) => {
			const { logon } = await require('../auth.js');
			return logon(host);
		}
   );

   const deleteCredentialsCommand = vscode.commands.registerCommand(
      "vscode-lsaf-tools.deleteCredentials",
		async (host) => {
			const { deleteCredentials } = await require('../auth.js');
			return deleteCredentials(host);
		}
   );

   const getFileUriCommand = vscode.commands.registerCommand(
      "vscode-lsaf-tools.copyFileUri",
		async (fileOrFolder) => {
			const { copyFileOrFolderUri } = await require('../utils.js');
			return copyFileOrFolderUri(fileOrFolder);
		}
   );
   
   const getOppositeEndpointUriCommand = vscode.commands.registerCommand(
      "vscode-lsaf-tools.getOppositeEndpointUri",
      async (fileOrFolder) => {
         const { getOppositeEndpointUri } = await require('../utils.js');
         const oppositeEndpointUri = await getOppositeEndpointUri(fileOrFolder);
         if (oppositeEndpointUri) {
            try {
               await vscode.env.clipboard.writeText(oppositeEndpointUri.toString());
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
					await vscode.env.clipboard.writeText(lsafPath.toString());
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

	const getLocalFilePathCommand = vscode.commands.registerCommand(
		"vscode-lsaf-tools.getLocalFilePath",
		async (fileOrFolder) => {
			const { getLocalPath } = await require('../utils.js');
			const localPath = await getLocalPath(fileOrFolder);
			if (localPath) {
				try {
					await vscode.env.clipboard.writeText(localPath.toString());
					console.log(`(getLocalPath) Local File/Folder Path copied to clipboard: ${localPath}`);
					vscode.window.showInformationMessage(`Local File/Folder Path copied to clipboard: ${localPath}`);
				} catch (error) {
					vscode.window.showErrorMessage(`Error copying Local File/Folder Path to clipboard: ${error.message}`);         
					console.error(`(getLocalPath) Error copying Local File/Folder Path to clipboard: ${error.message}`);         
				}
			}
			return localPath;
		}
	);

	const copyToOppositeEndpointCommand = vscode.commands.registerCommand(
		"vscode-lsaf-tools.copyToOppositeEndpoint",
		async (fileOrFolder) => {
			const { copyToOppositeEndpoint } = await require('../utils.js');
			return copyToOppositeEndpoint(fileOrFolder);
		}
	);

	context.subscriptions.push(...[
		helloWorldCommand,
		getXAuthTokenCommand,
		deleteCredentialsCommand,
		getFileUriCommand,
		getOppositeEndpointUriCommand,
		getLsafFilePathCommand,
		getLocalFilePathCommand,
		copyToOppositeEndpointCommand
	]);

   const commands = (await vscode.commands.getCommands()).filter(c => /lsaf/i.test(c));
   console.log('(vscode-lsaf-tools) Activated vscode.commands:');
   commands.forEach(c => { console.log(`  ${c}`) });
}

function deactivate() {
	require('../auth.js').then(({ deleteAuthTokens }) => {
   deleteAuthTokens('*');
   console.log('Web extension "vscode-lsaf-tools" deactivated.');
   });
}

module.exports = {
   activate,
   deactivate
};
