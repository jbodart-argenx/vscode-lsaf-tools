const vscode = require('vscode');

const { initializeSecretModule, deleteAuthTokens, deleteCredentials, logon } = require('./auth.js');
const { copyFileOrFolderUri } = require('./utils.js');

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed

/**
 * @param {vscode.ExtensionContext} context
 */
async function activate(context) {

	// This line of code will only be executed once when your extension is activated
	console.log('Extension "vscode-lsaf-tools" activated.');

	// Initialize secret storage
	const secretStorage = context.secrets;

	// Pass secret storage to other modules
	initializeSecretModule(secretStorage);





	// Provide the implementation of the commands defined in the package.json file
	// with registerCommand() and matching commandId parameter

	// Register the command to display a message box
	const helloWorldCommand = vscode.commands.registerCommand('vscode-lsaf-tools.lsaf-helloWorld', function () {
		vscode.window.showInformationMessage('Hello World from vscode-lsaf-tools extension!');
	});

	// Register the command to get an X-Auth-Token
	const getXAuthTokenCommand = vscode.commands.registerCommand(
		"vscode-lsaf-tools.getXAuthToken",
		(host) => logon(host)
	);

	// Register the command to delete credentials
	const deleteCredentialsCommand = vscode.commands.registerCommand(
		"vscode-lsaf-tools.deleteCredentials",
		(host) => deleteCredentials(host)
	);

	// Register the command to copy a file URI to the clipboard
	const getFileUriCommand = vscode.commands.registerCommand(
		"vscode-lsaf-tools.copyFileUri",
		(fileOrFolder) => copyFileOrFolderUri(fileOrFolder)
	);

	// Add the commands to the context

	context.subscriptions.push(helloWorldCommand);
   context.subscriptions.push(getXAuthTokenCommand);
	context.subscriptions.push(deleteCredentialsCommand);
	context.subscriptions.push(getFileUriCommand);

	// Log registered LSAF commands 
	const commands = (await vscode.commands.getCommands()).filter(c => /lsaf/i.test(c));
	console.log('(vscode-lsaf-tools) Activated vscode.commands:');
	commands.forEach(c => { console.log(`  ${c}`)});
}

// This method is called when your extension is deactivated
function deactivate() {
	deleteAuthTokens('*');
	console.log('Extension "vscode-lsaf-tools" deactivated.');
}

module.exports = {
	activate,
	deactivate
}
