const vscode = require('vscode');
// let defaultEndpoints = require('./endpoints').defaultEndpoints;
// console.log('Default Endpoints:', defaultEndpoints);

const { uriFromString } = require('./uri');
const { getDefaultEndpoints } = require("./endpoints");

function getFileOrFolderUri(fileOrFolder) {
   return (fileOrFolder == null && vscode.window.activeTextEditor) ?
      vscode.window.activeTextEditor.document.uri :
      vscode.window.activeEditor?.document?.uri ||
      uriFromString(fileOrFolder);
}

async function copyFileOrFolderUri(fileOrFolder) {
   if (!fileOrFolder) {
      vscode.window.showInformationMessage(`(getOppositeEndpointUri) no file or folder specified, attempting to use Active Editor document.`);
   }
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
      vscode.window.showWarningMessage(`Failed to copy File/Folder Uri to clipboard: no file or folder specified.`);
      console.error(`(copyFileOrFolderUri) Failed to copy File/Folder Uri to clipboard: no file or folder specified.`);
   }
}

async function getOppositeEndpointUri(fileOrFolder) {
   if (!fileOrFolder) {
      vscode.window.showInformationMessage(`(getOppositeEndpointUri) no file or folder specified, attempting to use Active Editor document.`);
   }
   const fileOrFolderUri = getFileOrFolderUri(fileOrFolder);
   if (! fileOrFolderUri) {
      vscode.window.showWarningMessage(`Failed to get opposite endpoint for ${fileOrFolder}: could not retrieve file or folder URI.`);
      console.error(`(getOppositeEndpointUri) Failed to get opposite endpoint for ${fileOrFolder}: could not retrieve file or folder URI.`);
      return null;
   }
   // Get the opposite endpoint from the defaultEndpoints
   const endpoints = getDefaultEndpoints() || [];
   if (endpoints) {
      const fileOrFolderUri = getFileOrFolderUri(fileOrFolder);
      // Find the endpoints that match and don't match the fileOrFolderUri
      const endpointIndex = endpoints.findIndex(ep => (fileOrFolderUri?.toString() || '').startsWith(ep.uri.toString()));
      if (fileOrFolderUri && endpointIndex >= 0) {
         const endpoint1 = endpoints[endpointIndex];
         const endpoint1RelPath = fileOrFolderUri.toString().replace(endpoint1.uri.toString(), '').replace(/^\//, '');
         const otherEndpoints = endpoints.filter((ep, idx) => idx !== endpointIndex);
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

async function getLsafPath(fileOrFolder) {
   if (!fileOrFolder) {
      vscode.window.showInformationMessage(`(getLsafPath) no file or folder specified, attempting to use Active Editor document.`);
   }
   const fileOrFolderUri = getFileOrFolderUri(fileOrFolder);
   if (! fileOrFolderUri) {
      vscode.window.showWarningMessage(`Failed to get LSAF path for ${fileOrFolder}: could not retrieve file or folder URI.`);
      console.error(`(getLsafPath) Failed to get LSAF path for ${fileOrFolder}: could not retrieve file or folder URI.`);
      return null;
   }
   // Get the opposite endpoint from the defaultEndpoints
   const endpoints = getDefaultEndpoints() || [];
   if (endpoints) {
      // Find the endpoint that matches the fileOrFolderUri
      const endpoint = endpoints.find(ep => (fileOrFolderUri?.toString() || '').startsWith(ep.uri.toString()));
      if (fileOrFolderUri && endpoint) {
         const endpointRelPath = fileOrFolderUri.toString().replace(endpoint.uri.toString().replace(/\/$/, ''), '');
         console.log(`(getLsafPath) LSAF path for ${fileOrFolderUri} is ${endpointRelPath}`);
         vscode.window.showInformationMessage(`LSAF path for ${fileOrFolderUri} is ${endpointRelPath}`);
         return endpointRelPath;
      } else {
         vscode.window.showWarningMessage(`Failed to get LSAF path for ${fileOrFolder}: no matching endpoint found.`);
         console.error(`(getLsafPath) Failed to get LSAF path for ${fileOrFolder}: no matching endpoint found.`);
      }
   } else {
      vscode.window.showWarningMessage(`Failed to get LSAF path for ${fileOrFolder}: no endpoints defined.`);
      console.error(`(getLsafPath) Failed to get LSAF path for ${fileOrFolder}: no endpoints defined.`);
   }
   return null;
}


async function getLocalPath(fileOrFolder) {
   if (!fileOrFolder) {
      vscode.window.showInformationMessage(`(getLocalPath) no file or folder specified, attempting to use Active Editor document.`);
   }
   const fileOrFolderUri = getFileOrFolderUri(fileOrFolder);
   if (! fileOrFolderUri) {
      vscode.window.showWarningMessage(`Failed to get local path for ${fileOrFolder}: could not retrieve file or folder URI.`);
      console.error(`(getLocalPath) Failed to get local path for ${fileOrFolder}: could not retrieve file or folder URI.`);
      return null;
   }
   // Get the local endpoint from the defaultEndpoints
   const endpoints = getDefaultEndpoints() || [];
   if (endpoints) {
      // Find the local endpoints
      let localEndpoints = endpoints.filter(ep => ep.uri.scheme === 'file');
      if (localEndpoints.length = 0) {
         vscode.window.showWarningMessage(`Failed to get local path for ${fileOrFolder}: no local endpoints found.`);
         console.error(`(getLocalPath) Failed to get local path for ${fileOrFolder}: no local endpoints found.`);
         return null;
      }
      if (localEndpoints.length > 1) {
         const selectedLocalEndpointLabel = await vscode.window.showQuickPick(localEndpoints.map(ep => ep.label), {
            placeHolder: "Choose a local endpoint",
            canPickMany: false,
         });
         localEndpoints = localEndpoints.filter(ep => ep.label === selectedLocalEndpointLabel);
      }
      if (localEndpoints.length === 1) {
         const localEndpoint = localEndpoints[0];
         const localPath = fileOrFolderUri.toString().replace(localEndpoint.uri.toString().replace(/\/$/, ''), '');
         console.log(`(getLocalPath) Local path for ${fileOrFolderUri} is ${localPath}`);
         vscode.window.showInformationMessage(`Local path for ${fileOrFolderUri} is ${localPath}`);
         return localPath;
      } else {      
         vscode.window.showWarningMessage(`Failed to get Local endpoint path for ${fileOrFolder}: no local endpoint found.`);
         console.error(`(getLsafPath) Failed to get Local endpoint path for ${fileOrFolder}: no local endpoint found.`);
      }
   } else {
      vscode.window.showWarningMessage(`Failed to get Local path for ${fileOrFolder}: no endpoints defined.`);
      console.error(`(getLsafPath) Failed to get Local path for ${fileOrFolder}: no endpoints defined.`);
   }
   return null;
}


async function copyToOppositeEndpoint(fileOrFolder){
   if (!fileOrFolder) {
      vscode.window.showInformationMessage(`(copyToOppositeEndpoint) no file or folder specified, attempting to use Active Editor document.`);
   }
   const fileOrFolderUri = getFileOrFolderUri(fileOrFolder);
   if (! fileOrFolderUri) {
      vscode.window.showWarningMessage(`Failed to copy ${fileOrFolder} to opposite endpoint: could not retrieve file or folder URI.`);
      console.error(`(copyToOppositeEndpoint) Failed to copy ${fileOrFolder} to opposite endpoint: could not retrieve file or folder URI.`);
      return null;
   }
   const oppositeEndpointUri = getOppositeEndpointUri(fileOrFolder);
   if (!oppositeEndpointUri) {
      vscode.window.showWarningMessage(`Failed to copy ${fileOrFolder} to opposite endpoint: could not identify opposite endpoint.`);
      console.error(`(copyToOppositeEndpoint) Failed to copy ${fileOrFolder} to opposite endpoint: could not identify opposite endpoint.`);
      return null;
   }
   console.log(`(copyToOppositeEndpoint) Copying ${fileOrFolderUri} to ${oppositeEndpointUri}`);
   if (oppositeEndpointUri.scheme === 'file') {
      const stat = await vscode.workspace.fs.stat(fileOrFolderUri);
      if (stat.type & vscode.FileType.Directory) {
         // Copy folder to local endpoint
         debugger;
         vscode.window.showWarningMessage(`Copying folders to local endpoint not yet implemented.`);
      } else if (stat.type & vscode.FileType.File) {
         try {
            await vscode.workspace.fs.copy(fileOrFolderUri, oppositeEndpointUri, { overwrite: true });
            vscode.window.showInformationMessage(`Copied ${fileOrFolderUri} to ${oppositeEndpointUri}`);
            console.log(`(copyToOppositeEndpoint) Copied ${fileOrFolderUri} to ${oppositeEndpointUri}`);
         } catch (error) {
            vscode.window.showErrorMessage(`Error copying ${fileOrFolderUri} to ${oppositeEndpointUri}: ${error.message}`);
            console.error(`(copyToOppositeEndpoint) Error copying ${fileOrFolderUri} to ${oppositeEndpointUri}: ${error.message}`);
         }
      } else {
         vscode.window.showWarningMessage(`Failed to copy ${fileOrFolderUri} to ${oppositeEndpointUri}: not a file or folder.`);
         console.error(`(copyToOppositeEndpoint) Failed to copy ${fileOrFolderUri} to ${oppositeEndpointUri}: not a file or folder.`);
      }
   } else {
      // Upload to remote endpoint
      debugger;
      vscode.window.showWarningMessage(`Copying to remote endpoint not yet implemented.`);
   }
} 

module.exports = { getFileOrFolderUri, getLsafPath, getLocalPath, copyFileOrFolderUri, getOppositeEndpointUri, copyToOppositeEndpoint };
