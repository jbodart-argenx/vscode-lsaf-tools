const vscode = require('vscode');

if (typeof self === 'undefined') {
	global.self = global;
}

async function activate(context) {
	console.log('Extension "vscode-lsaf-tools" activated.');

	const secretStorage = context.secrets;
	const { initializeSecretModule } = await require('./auth.js');
	initializeSecretModule(secretStorage);

	const helloWorldCommand = vscode.commands.registerCommand('vscode-lsaf-tools.lsaf-helloWorld', async function () {
		vscode.window.showInformationMessage('Hello World from vscode-lsaf-tools extension!');
	});

	const getXAuthTokenCommand = vscode.commands.registerCommand(
		"vscode-lsaf-tools.getXAuthToken",
		async (host) => {
			const { logon } = await require('./auth.js');
			return logon(host);
		}
	);

	const deleteCredentialsCommand = vscode.commands.registerCommand(
		"vscode-lsaf-tools.deleteCredentials",
		async (host) => {
			const { deleteCredentials } = await require('./auth.js');
			return deleteCredentials(host);
		}
	);

	const getFileUriCommand = vscode.commands.registerCommand(
		"vscode-lsaf-tools.copyFileUri",
		async (fileOrFolder) => {
			const { copyFileOrFolderUri } = await require('./utils.js');
			return copyFileOrFolderUri(fileOrFolder);
		}
	);

	context.subscriptions.push(helloWorldCommand);
	context.subscriptions.push(getXAuthTokenCommand);
	context.subscriptions.push(deleteCredentialsCommand);
	context.subscriptions.push(getFileUriCommand);

	const commands = (await vscode.commands.getCommands()).filter(c => /lsaf/i.test(c));
	console.log('(vscode-lsaf-tools) Activated vscode.commands:');
	commands.forEach(c => { console.log(`  ${c}`) });
}

function deactivate() {
	require('./auth.js').then(({ deleteAuthTokens }) => {
		deleteAuthTokens('*');
		console.log('Extension "vscode-lsaf-tools" deactivated.');
	});
}

module.exports = {
	activate,
	deactivate
};
