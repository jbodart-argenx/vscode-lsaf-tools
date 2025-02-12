const vscode = require("vscode");
// const beautify = require("js-beautify");
// const path = require("path");
const { uriFromString } = require("./uri");
const os = require('os');
const username = os.userInfo().username;


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
   const endpoints = config.get('defaultEndpoints');
   if (endpoints) {
      return endpoints
         .map(endpoint => {
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
               const uri = endpoint.uri ?
                  uriFromString(endpoint.uri.replace('${username}', username)) :
                  uriFromString(lsafUri || url.protocol + '//' + url.host + path);
               return {
                  label: endpoint.label,
                  uri,
                  url: endpoint.url
               };
            } else {
               return {
                  label: endpoint.label,
                  uri: uriFromString(endpoint.uri.replace('${username}', username))
               };
            }
         });
   }
}

let defaultEndpoints = getDefaultEndpoints();
console.log('Default Endpoints:', defaultEndpoints);

vscode.workspace.onDidChangeConfiguration((e) => {
   if (e.affectsConfiguration('vscode-lsaf-tools.defaultEndpoints')) {
      defaultEndpoints = getDefaultEndpoints();
      console.log('Updated Default Endpoints:', defaultEndpoints);
   }
});

module.exports = { defaultEndpoints, getDefaultEndpoints };