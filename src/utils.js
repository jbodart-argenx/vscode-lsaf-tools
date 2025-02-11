const vscode = require('vscode');
let defaultEndpoints = require('./endpoints').defaultEndpoints;
console.log('Default Endpoints:', defaultEndpoints);

const { uriFromString } = require('./uri');

function getFileOrFolderUri(fileOrFolder) {
   return (fileOrFolder == null && vscode.window.activeTextEditor) ?
      vscode.window.activeTextEditor.document.uri :
      vscode.window.activeEditor?.document?.uri ||
      uriFromString(fileOrFolder);
}

async function copyFileOrFolderUri(fileOrFolder) {
   const fileOrFolderUri = getFileOrFolderUri(fileOrFolder);
   if (fileOrFolderUri) {
      try {
         vscode.env.clipboard.writeText(fileOrFolderUri.toString());
         console.log(`(copyFileOrFolderUri) File/Folder Uri copied to clipboard: ${fileOrFolderUri}`);
         vscode.window.showInformationMessage(`File/Folder Uri copied to clipboard: ${fileOrFolderUri}`);
      } catch (error) {
         vscode.window.showErrorMessage(`Error copying File/Folder Uri to clipboard: ${error.message}`);         
         console.error(`(copyFileOrFolderUri) Error copying File/Folder Uri to clipboard: ${error.message}`);         
      }
   } else {
      vscode.window.showWarningMessage(`Failed to copy File/Folder Uri to clipboard`);
      console.error(`(copyFileOrFolderUri) Failed to copy File/Folder Uri to clipboard`);
   }
}

async function getOppositeEndpointUri(fileOrFolder) {
   // Get the opposite endpoint from the defaultEndpoints
   const config = vscode.workspace.getConfiguration("vscode-lsaf-tools");
   const endpoints = config.get('defaultEndpoints') || [];
   if (endpoints) {
      const fileOrFolderUri = getFileOrFolderUri(fileOrFolder);
      // Find the endpoints that match and don't match the fileOrFolderUri
      const endpointIndex = defaultEndpoints.findIndex(ep => (fileOrFolderUri?.toString() || '').startsWith(ep.uri.toString()));
      if (fileOrFolderUri && endpointIndex >= 0) {
         const endpoint1 = defaultEndpoints[endpointIndex];
         const endpoint1RelPath = fileOrFolderUri.toString().replace(endpoint1.uri.toString(), '').replace(/^\//, '');
         const otherEndpoints = defaultEndpoints.filter((ep, idx) => idx !== endpointIndex);
         const selectedOtherEndpointLabel = await vscode.window.showQuickPick(otherEndpoints.map(ep => ep.label), {
            placeHolder: "Choose an endpoint",
            canPickMany: false,
         });
         if (selectedOtherEndpointLabel) {
            const otherEndpoint = otherEndpoints.find(ep => ep.label === selectedOtherEndpointLabel);
            const otherEndpointUri = vscode.Uri.joinPath(otherEndpoint.uri, endpoint1RelPath);
            console.log(`(getOppositeEndpoint) Opposite endpoint for ${fileOrFolderUri} is ${otherEndpointUri}`);
            vscode.window.showInformationMessage(`Opposite endpoint for ${fileOrFolderUri} is ${otherEndpointUri}`);
            return otherEndpointUri;
         }
      } else {
         vscode.window.showWarningMessage(`Failed to get opposite endpoint for ${fileOrFolder}: no matching endpoint found.`);
         console.error(`(getOppositeEndpoint) Failed to get opposite endpoint for ${fileOrFolder}: no matching endpoint found.`);
      }
   } else {
      vscode.window.showWarningMessage(`Failed to get opposite endpoint for ${fileOrFolder}: no endpoints defined.`);
      console.error(`(getOppositeEndpoint) Failed to get opposite endpoint for ${fileOrFolder}: no endpoints defined.`);
   }
   return null;
}

module.exports = { getFileOrFolderUri, copyFileOrFolderUri, getOppositeEndpointUri };
