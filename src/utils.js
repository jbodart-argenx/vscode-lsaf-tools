const vscode = require('vscode');
let defaultEndpoints = require('./endpoints').defaultEndpoints;
console.log('Default Endpoints:', defaultEndpoints);

const { uriFromString } = require('./uri');

async function copyFileOrFolderUri(fileOrFolder) {
   let uri;
   if (fileOrFolder == null) {
      // Use the active file if available
      const activeEditor = vscode.window.activeEditor;
      if (activeEditor) {
         uri = activeEditor.document.uri;
      }
   } else if (typeof fileOrFolder === 'string') {
      uri = uriFromString(fileOrFolder);
   } else if (fileOrFolder instanceof vscode.Uri) {
      uri = fileOrFolder;
   }
   if (uri) {
      try {
         vscode.env.clipboard.writeText(uri.toString());
         console.log(`(copyFileOrFolderUri) File/Folder Uri copied to clipboard: ${uri}`);
         vscode.window.showInformationMessage(`File/Folder Uri copied to clipboard: ${uri}`);
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
      const fileOrFolderUri = uriFromString(fileOrFolder);
      // Find the endpoints that match and don't match the fileOrFolderUri
      const endpointIndex = defaultEndpoints.findIndex(ep => fileOrFolderUri.toString().startsWith(ep.uri.toString()));
      if (endpointIndex >= 0) {
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
            console.log(`(getOppositeEndpoint) Opposite endpoint for ${fileOrFolder} is ${otherEndpointUri}`);
            vscode.window.showInformationMessage(`Opposite endpoint for ${fileOrFolder} is ${otherEndpointUri}`);
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

module.exports = { copyFileOrFolderUri, getOppositeEndpointUri };
