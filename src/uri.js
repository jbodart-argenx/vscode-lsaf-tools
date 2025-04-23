const vscode = require('vscode');

const path = require('path') // Use native path module in Node.js environment

function getKnownSchemes() {
   const knownSchemes = ['http', 'https', 'ftp', 'file', 'untitled', 'vscode', 'vscode-remote', 'vscode-userdata', 'data', 'lsaf-repo', 'lsaf-work'];

   // Check for custom schemes registered by extensions
   vscode.extensions.all.forEach(extension => {
      if (extension.packageJSON.contributes && extension.packageJSON.contributes.fileSystemProvider) {
         extension.packageJSON.contributes.fileSystemProvider.forEach(provider => {
            if (!knownSchemes.includes(provider.scheme)) {
               knownSchemes.push(provider.scheme);
            }
         });
      }
   });

   return knownSchemes;
}

function isValidSchemeFormat(scheme) {
   if (scheme === undefined || scheme === null) {
      return false;
   }
   if (Array.isArray(scheme)) {
      return scheme.map(isValidSchemeFormat);
   }
   const schemeRegex = /^[a-zA-Z][a-zA-Z0-9+.-]*$/;
   return schemeRegex.test(scheme);
}

function isValidUri(uriString) {
   if (Array.isArray(uriString)) {
      return uriString.map(isValidUri);
   }
   const knownSchemes = getKnownSchemes();
   try {
      const url = new URL(uriString);
      // Use url.protocol.slice(0, -1) to remove the trailing colon of URL the protocol component
      return knownSchemes.includes(url.protocol.slice(0, -1)) && isValidSchemeFormat(url.protocol.slice(0, -1));
   } catch (e) {
      if (e) return false;
   }
}

function isRelativeUri(uriString) {
   if (Array.isArray(uriString)) {
      return uriString.map(isRelativeUri);
   }
   if (!uriString) return false;
   try {
      const uri = new URL(uriString, 'http://example.com');  // The second argument is a base URL, used to resolve the uriString if it is a relative URI.
      // Check if the resolved URL is different from the base URL
      return uri.origin === 'http://example.com' && uriString !== uri.href;
   } catch (e) {
      if (e) return false;
   }
}

function resolveUri(relativeUri, baseUri, getBaseUriFn = getBaseUri) {
   if (Array.isArray(relativeUri)) {
      return relativeUri.map(uri => resolveUri(uri, baseUri, getBaseUriFn));
   }
   if (!baseUri) {
      baseUri = getBaseUriFn();
   }
   try {
      const base = new URL(baseUri);
      const resolved = new URL(relativeUri, base);
      return resolved.toString();
   } catch (e) {
      if (e) return null;
   }
}

function uriFromString(param) {
   if (Array.isArray(param)) {
      return param.map(uriFromString);
   }
   if (param instanceof vscode.Uri) {
      return param;
   }
   if (param != null && typeof param === 'string') {
      try {
         let uri = null;
         // decide if vscode.Uri.parse or vscode.Uri.file should be used
         // if param matches a URI path, use vscode.Uri.parse
         // otherwise, use vscode.Uri.file
         if (param.match(/^[a-zA-Z]:/) && process.platform === 'win32') {
            uri = vscode.Uri.file(param.replace(/^[A-Z]:/, s => s.toLowerCase()));  // Convert windows drive letter to lowercase
         } else if (isValidUri(param)) {
            uri = vscode.Uri.parse(param.replace(/\\/g, '/')); 
         } else {
            uri = vscode.Uri.file(param);
         }
         return uri;
      } catch (e) {
         console.warn(`Invalid URI: ${param}`);
         if (e) return null;
      }
   }
   return null;
}

function pathFromUri(uri, dropScheme = false) {
   if (Array.isArray(uri)) {
      return uri.map(pathFromUri);
   }
   if (typeof uri === 'string') {
      if (uri === '') return uri;
      uri = uriFromString(uri);
   }
   if (uri instanceof vscode.Uri) {
      if (uri.scheme === 'file') {
         let path = uri.fsPath;
         path = path.replace(/^[A-Z]:/, s => s.toLowerCase());  // Convert windows drive letter to lowercase
         return path;
      } else {
         if (dropScheme) {
            return uri.path;
            // return decodeURIComponent(uri.path);
         } else {
            return uri.toString();
            // return decodeURIComponent(uri.toString());
         }
      }
   }
   return null;
}

function getBaseUri(param) {
   if (Array.isArray(param)) {
      return param.map(getBaseUri);
   }
   const workspaceFolders = vscode.workspace.workspaceFolders;
   const activeEditor = vscode.window.activeTextEditor || vscode.window.activeEditor;

   // Use the workspace folder of the provided parameter if available
   if (param) param = uriFromString(param);
   if (param instanceof vscode.Uri) {
      const workspaceFolder = vscode.workspace.getWorkspaceFolder(param);
      if (workspaceFolder) {
         return workspaceFolder.uri.toString();
      }
   }

   // Use the folder of the active file if available
   if (activeEditor?.document?.uri) {
      const activeFileUri = activeEditor.document.uri;
      const workspaceFolder = vscode.workspace.getWorkspaceFolder(activeFileUri);
      if (workspaceFolder) {
         return workspaceFolder.uri.toString();
      }
   }

   // Fallback to the first workspace folder
   if (workspaceFolders && workspaceFolders.length > 0) {
      return workspaceFolders[0].uri.toString();
   }

   // Fallback to the current working directory
   return `file://${path.resolve('./')}/`;
}

async function existsUri(fileUri, type = null, stat = vscode.workspace.fs.stat) {
   if (Array.isArray(fileUri)) {
      return Promise.all(fileUri.map(async uri => existsUri(uri, type, stat)));  // 'await' not needed in callback as Promise.all() is already handling the promises returned by the map function
   }
   // type: vscode.FileType.File = 1 | vscode.FileType.Directory = 2 | vscode.FileType.SymbolicLink = 64
   let exists = false;
   if (fileUri != null) fileUri = uriFromString(fileUri);
   if (fileUri && fileUri instanceof vscode.Uri) {
      try {
         let fileStat = await stat(fileUri);  // async operation
         if (fileStat && typeof fileStat === 'object') {
            if (fileStat.type) exists = true;
         }
         if (type != null) exists = Boolean(fileStat.type & type);  // & : bitwise AND operation
      } catch (error) {
         if (error) console.log(`Uri does not exist: ${fileUri},`, error?.code);
      }
   }
   return exists;
}

module.exports = {
   isValidUri,
   isValidSchemeFormat,
   isRelativeUri,
   resolveUri,
   getBaseUri,
   uriFromString,
   pathFromUri,
   existsUri
};