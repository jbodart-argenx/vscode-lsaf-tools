const vscode = require('vscode');

if (typeof self === 'undefined') {
	globalThis.self = globalThis;
}
console.log('(vscode-lsaf-tools) Running in:', globalThis.self === globalThis ? 'Node.js' : 'Browser');
console.log('(vscode-lsaf-tools) typeof self:', typeof self);

let defaultEndpoints = require('./endpoints').defaultEndpoints;
console.log('Default Endpoints:', defaultEndpoints);

async function activate(context) {
	console.log('Extension "vscode-lsaf-tools" activating...');

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
			return await logon(host);
		}
	);

	const deleteCredentialsCommand = vscode.commands.registerCommand(
		"vscode-lsaf-tools.deleteCredentials",
		async (host) => {
			const { deleteCredentials } = await require('./auth.js');
			return deleteCredentials(host);
		}
	);

	const updateCredentialsCommand = vscode.commands.registerCommand(
		"vscode-lsaf-tools.updateCredentials",
		async (host) => {
			const { updateCredentials } = await require('./auth.js');
			return updateCredentials(host);
		}
	);

	const getFileUriCommand = vscode.commands.registerCommand(
		"vscode-lsaf-tools.copyFileUri",
		async (fileOrFolder, fileOrFolders) => {
			const { copyFileOrFolderUri } = await require('./utils.js');
			return copyFileOrFolderUri(fileOrFolders || [fileOrFolder]); // mulitple || single file(s)/folder(s) selected
		}
	);

	const getOppositeEndpointUriCommand = vscode.commands.registerCommand(
		"vscode-lsaf-tools.getOppositeEndpointUri",
		async (fileOrFolder, fileOrFolders, toClipboard = true) => {
			const { getOppositeEndpointUri, copyToClipboard } = await require('./utils.js');
			let oppositeEndpointUris = await getOppositeEndpointUri(fileOrFolders || [fileOrFolder]);
			if (toClipboard) {
				copyToClipboard(oppositeEndpointUris, "File/Folder Uri(s)");
			}
			return oppositeEndpointUris;
		}
	);

	const getLsafFilePathCommand = vscode.commands.registerCommand(
		"vscode-lsaf-tools.getLsafFilePath",
		async (fileOrFolder, fileOrFolders, toClipboard = true) => {
			const { getLsafPath } = await require('./utils.js');
			const lsafPaths = await getLsafPath(fileOrFolders || [fileOrFolder]);
			if (lsafPaths && toClipboard) {
				try {
					await vscode.env.clipboard.writeText(lsafPaths.join('\n'));
					console.log(`(getlsafPath) LSAF File/Folder Path copied to clipboard:\n${lsafPaths.join('\n')}`);
					vscode.window.showInformationMessage(`LSAF File/Folder Path copied to clipboard: ${lsafPaths.join(', ')}`);
				} catch (error) {
					vscode.window.showErrorMessage(`Error copying LSAF File/Folder Path to clipboard: ${error.message}`);         
					console.error(`(getlsafPath) Error copying LSAF File/Folder Path to clipboard: ${error.message}`);         
				}
			}
			return lsafPaths;
		}
	);

	const getLocalFilePathCommand = vscode.commands.registerCommand(
		"vscode-lsaf-tools.getLocalFilePath",
		async (fileOrFolder, fileOrFolders, toClipboard = true) => {
			const { getLocalPath, copyToClipboard } = await require('./utils.js');
			const localPath = await getLocalPath(fileOrFolders || fileOrFolder);
			if (toClipboard) {
				copyToClipboard(localPath, "Local File/Folder Path(s)");
			}
			return localPath;
		}
	);

	const copyToOppositeEndpointCommand = vscode.commands.registerCommand(
		"vscode-lsaf-tools.copyToOppositeEndpoint",
		async (fileOrFolder, fileOrFolders) => {
			const { copyToOppositeEndpoint, getFileOrFolderUri, getOppositeEndpointUri } = await require('./utils.js');
			console.log(`(copyToOppositeEndpoint) fileOrFolder:`, fileOrFolder, `, fileOrFolders:`, fileOrFolders);
			let oppositeEndpoint, copyComment;
			return await copyToOppositeEndpoint(fileOrFolders || [fileOrFolder], oppositeEndpoint, copyComment, getFileOrFolderUri,
				getOppositeEndpointUri);
		}
	);

	const compareToOppositeEndpointCommand = vscode.commands.registerCommand(
		"vscode-lsaf-tools.compareToOppositeEndpoint",
		async (fileOrFolder, fileOrFolders) => {
			const { compareToOppositeEndpoint, getFileOrFolderUri, getOppositeEndpointUri } = await require('./utils.js');
			console.log(`(compareToOppositeEndpoint) fileOrFolder:`, fileOrFolder, `, fileOrFolders:`, fileOrFolders);
			let oppositeEndpoint;
			return await compareToOppositeEndpoint(fileOrFolders || [fileOrFolder], oppositeEndpoint, getFileOrFolderUri,
				getOppositeEndpointUri);
		}
	);

	context.subscriptions.push(...[
		helloWorldCommand,
		getXAuthTokenCommand,
		deleteCredentialsCommand,
		updateCredentialsCommand,
		getFileUriCommand,
		getOppositeEndpointUriCommand,
		getLsafFilePathCommand,
		getLocalFilePathCommand,
		copyToOppositeEndpointCommand,
		compareToOppositeEndpointCommand
	]);

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
