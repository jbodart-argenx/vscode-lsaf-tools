const vscode = require("vscode");
// const beautify = require("js-beautify");
// const path = require("path");
const { uriFromString } = require("./uri");
const os = require('os') // Use native os module in Node.js environment

const username = os.userInfo ? os.userInfo().username : 'default-username'; // Fallback for browser environment


// Default endpoints are defined in the settings.json file
// they can be overridden by the user in the settings.json file
// a) Via Settings UI:
//    Open the Command Palette (Ctrl+Shift+P).
//    Type Preferences: Open Settings (UI) and select it.
//    In the search bar, type "vscode-lsaf-tools".
//    You will see the Default Endpoints setting where you can add, remove, or modify the endpoints.
// b) Via settings.json:
//    Open the Command Palette (Ctrl+Shift+P).
//    Type Preferences: Open Settings (JSON) and select it.
//    Add or modify the "vscode-lsaf-tools.defaultEndpoints property in the settings.json file, for example:
//       "vscode-lsaf-tools.defaultEndpoints": [
//             {
//                "label": "local",
//                "uri": "file:///c:/Users/${username}/lsaf/"
//             },
//             {
//                "label": "WSL",
//                "uri": "file:///home/${username}/lsaf/"
//             },
//             {
//                "label": "RSWB",
//                "uri": "file:///home/${username}@argen-x.com/lsaf/"
//             },
//             {
//                "label": "example/repo",
//                "url": "https://example.ondemand.sas.com/lsaf/webdav/repo/",
//                "uri": "lsaf-repo://example/"
//             },
//             {
//                "label": "example/work",
//                "url": "https://example.ondemand.sas.com/lsaf/webdav/work/",
//                "uri": "lsaf-work://example/"
//             },
//          ]

function getDefaultEndpoints() {
   const config = vscode.workspace.getConfiguration("vscode-lsaf-tools");
   const endpoints = config.get('defaultEndpoints', []);
   return endpoints
      .map(endpoint => {
         let uri;
         if (endpoint.url) {
            const url = new URL(endpoint.url);
            let path = url.pathname;
            let loc, lsafUri;
            // "/content/66c7e5fa-58a2-4e98-9573-6ec7282f5d2f/proxy/xartest/lsaf/webdav/repo/clinical/test/indic/cdisc-pilot-0001/"
            if (/^(?:\/content\/[\da-f-]+\/proxy\/\w+)?\/lsaf\/webdav\/(work|repo)/.test(path)) {
               loc = path.match(/(?:\/content\/[\da-f-]+\/proxy\/\w+)?\/lsaf\/webdav\/(work|repo)/)[1];
               path = path.replace(/^(?:\/content\/[\da-f-]+\/proxy\/\w+)?\/lsaf\/webdav\/(work|repo)/, '');
               lsafUri = `lsaf-${loc}://${url.host.split('.')[0]}${path}`;
            }
            uri = uriFromString(lsafUri || url.protocol + '//' + url.host + path);
         } else {
            uri = uriFromString(endpoint.uri.replace('${username}', username));
         }
         return {
            label: endpoint.label,
            uri,
            url: endpoint.url
         };
      });
}

async function customizeEndpoints() {
   const config = vscode.workspace.getConfiguration("vscode-lsaf-tools");
   const currentEndpoints = config.get('defaultEndpoints', []);
   
   // First, show a quick pick to let the user choose what to do
   const action = await vscode.window.showQuickPick(
      [
         { label: "Add new endpoint", description: "Create a new endpoint configuration" },
         { label: "Edit existing endpoint", description: "Modify an existing endpoint" },
         { label: "Remove endpoint", description: "Delete an existing endpoint" },
         { label: "Restore defaults", description: "Reset to extension default endpoints" }
      ],
      { placeHolder: "Select an action to customize endpoints" }
   );
   
   if (!action) return null; // User cancelled

   try {
      let updatedEndpoints = [...currentEndpoints];
      
      if (action.label === "Add new endpoint") {
         // Get the label for the new endpoint
         const label = await vscode.window.showInputBox({
            placeHolder: "Enter a label for the endpoint (e.g., 'myserver/repo')",
            prompt: "Provide a descriptive name for this endpoint"
         });
         if (!label) return null; // User cancelled
         
         // Choose the type of endpoint
         const type = await vscode.window.showQuickPick(
            [
               { label: "Remote LSAF server", description: "Add a remote LSAF server endpoint" },
               { label: "Local filesystem", description: "Add a local filesystem endpoint" }
            ],
            { placeHolder: "Select the type of endpoint" }
         );
         if (!type) return null; // User cancelled

         let newEndpoint = { label };
         
         if (type.label === "Remote LSAF server") {
            const serverUrl = await vscode.window.showInputBox({
               placeHolder: "https://server.ondemand.sas.com/lsaf/webdav/repo/",
               prompt: "Enter the URL for the LSAF server endpoint",
               validateInput: (value) => {
                  if (!value.startsWith("http")) return "URL must start with http:// or https://";
                  if (!value.includes("/lsaf/webdav/")) return "URL must include '/lsaf/webdav/' path";
                  return null;
               }
            });
            if (!serverUrl) return null; // User cancelled
            newEndpoint.url = serverUrl;
         } else {
            const localPath = await vscode.window.showInputBox({
               placeHolder: "file:///c:/Users/${username}/lsaf/",
               prompt: "Enter the URI for the local filesystem endpoint",
               validateInput: (value) => {
                  if (!value.startsWith("file:///")) return "URI must start with file:///";
                  return null;
               }
            });
            if (!localPath) return null; // User cancelled
            newEndpoint.uri = localPath;
         }
         
         updatedEndpoints.push(newEndpoint);
         
      } else if (action.label === "Edit existing endpoint") {
         // Choose which endpoint to edit
         const endpointToEdit = await vscode.window.showQuickPick(
            currentEndpoints.map(ep => ({ label: ep.label, endpoint: ep })),
            { placeHolder: "Select an endpoint to edit" }
         );
         if (!endpointToEdit) return null; // User cancelled
         
         const index = currentEndpoints.findIndex(ep => ep.label === endpointToEdit.label);
         const isRemote = !!endpointToEdit.endpoint.url;
         
         // Edit the label
         const newLabel = await vscode.window.showInputBox({
            value: endpointToEdit.endpoint.label,
            prompt: "Edit the endpoint label"
         });
         if (!newLabel) return null; // User cancelled
         
         let updatedEndpoint = { ...endpointToEdit.endpoint, label: newLabel };
         
         // Edit the URL or URI
         if (isRemote) {
            const newUrl = await vscode.window.showInputBox({
               value: endpointToEdit.endpoint.url,
               prompt: "Edit the URL for the LSAF server endpoint",
               validateInput: (value) => {
                  if (!value.startsWith("http")) return "URL must start with http:// or https://";
                  if (!value.includes("/lsaf/webdav/")) return "URL must include '/lsaf/webdav/' path";
                  return null;
               }
            });
            if (!newUrl) return null; // User cancelled
            updatedEndpoint.url = newUrl;
         } else {
            const newUri = await vscode.window.showInputBox({
               value: endpointToEdit.endpoint.uri,
               prompt: "Edit the URI for the local filesystem endpoint",
               validateInput: (value) => {
                  if (!value.startsWith("file:///")) return "URI must start with file:///";
                  return null;
               }
            });
            if (!newUri) return null; // User cancelled
            updatedEndpoint.uri = newUri;
         }
         
         updatedEndpoints[index] = updatedEndpoint;
         
      } else if (action.label === "Remove endpoint") {
         // Choose which endpoint to remove
         const endpointToRemove = await vscode.window.showQuickPick(
            currentEndpoints.map(ep => ({ label: ep.label, endpoint: ep })),
            { placeHolder: "Select an endpoint to remove" }
         );
         if (!endpointToRemove) return null; // User cancelled
         
         // Confirm removal
         const confirmed = await vscode.window.showWarningMessage(
            `Are you sure you want to remove the endpoint "${endpointToRemove.label}"?`, 
            "Yes", "No"
         );
         if (confirmed !== "Yes") return null;
         
         updatedEndpoints = updatedEndpoints.filter(ep => ep.label !== endpointToRemove.label);
         
      } else if (action.label === "Restore defaults") {
         // Just use the default from package.json - this gets the extension's default settings
         const confirmed = await vscode.window.showWarningMessage(
            "Are you sure you want to restore the default endpoints? This will remove all custom endpoints.", 
            "Yes", "No"
         );
         if (confirmed !== "Yes") return null;
         
         updatedEndpoints = undefined; // Setting to undefined will restore defaults
      }
      
      // Update the configuration
      await config.update('defaultEndpoints', updatedEndpoints, vscode.ConfigurationTarget.Global);
      
      // Notify the user
      vscode.window.showInformationMessage("Endpoints configuration has been updated successfully!");
      
      // Return the updated endpoints
      return getDefaultEndpoints();
   } catch (error) {
      vscode.window.showErrorMessage(`Failed to update endpoints: ${error.message}`);
      logger.error('Error customizing endpoints:', error);
      return null;
   }
}

let logger = console;

let defaultEndpoints = getDefaultEndpoints();
logger.log('Default Endpoints:', JSON.stringify(defaultEndpoints, null, 2));

vscode.workspace.onDidChangeConfiguration((e) => {
   if (e.affectsConfiguration('vscode-lsaf-tools.defaultEndpoints')) {
      defaultEndpoints = getDefaultEndpoints();
      logger.log('Updated Default Endpoints:', JSON.stringify(defaultEndpoints, null, 2));
   }
});

module.exports = { defaultEndpoints, getDefaultEndpoints, customizeEndpoints, logger };