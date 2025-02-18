const vscode = require('vscode');

const { getMultiLineText: getMultiLineInput } = require('./multiLineText.js');
const { uriFromString, pathFromUri } = require('./uri');
const { getDefaultEndpoints } = require("./endpoints");

function getFileOrFolderUri(fileOrFolder) {
   if (Array.isArray(fileOrFolder)) {
      return fileOrFolder.map(getFileOrFolderUri);
   }
   if (fileOrFolder === '') {
      return null;
   }
   return (fileOrFolder == null && vscode?.window?.activeTextEditor) ?
      vscode.window.activeTextEditor.document.uri :
      (fileOrFolder == null && vscode?.window?.activeEditor?.document?.uri) ?
      vscode.window.activeEditor?.document?.uri :
      uriFromString(fileOrFolder);
}

async function copyFileOrFolderUri(fileOrFolder, getUriFn = getFileOrFolderUri) {
   if (!fileOrFolder) {
      vscode.window.showInformationMessage(`(getOppositeEndpointUri) no file or folder specified, attempting to use Active Editor document.`);
   }
   let fileOrFolderUri;
   if (Array.isArray(fileOrFolder)) {
      fileOrFolderUri = fileOrFolder.map(getUriFn).map(uri => uri.toString());
   } else {
      fileOrFolderUri = [getUriFn(fileOrFolder).toString()];
   }
   if (fileOrFolderUri) {
      try {
         await vscode.env.clipboard.writeText(fileOrFolderUri.join('\n'));
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
   const fileOrFolders = (Array.isArray(fileOrFolder)) ? fileOrFolder : [fileOrFolder];
   const fileOrFolderUris = fileOrFolders.map(getFileOrFolderUri);
   if (! fileOrFolderUris || !(Array.isArray(fileOrFolderUris)) || fileOrFolderUris.length === 0) {
      vscode.window.showWarningMessage(`Failed to get opposite endpoint for ${fileOrFolders}: could not retrieve file or folder URI.`);
      console.error(`(getOppositeEndpointUri) Failed to get opposite endpoint for ${fileOrFolders}: could not retrieve file or folder URI.`);
      return null;
   }
   // Get the opposite endpoint from the defaultEndpoints
   const endpoints = getDefaultEndpoints() || [];
   if (endpoints && Array.isArray(endpoints) && endpoints.length > 0) {
      // Find the endpoints that match and don't match the fileOrFolderUri
      let endpointIndexes = fileOrFolderUris.map(uri => endpoints.findIndex(ep => (uri.toString() || '').startsWith(ep.uri.toString())));
      // Unique endpointIndexes
      const uniqueEndpointIndexes = [...new Set(endpointIndexes.filter(idx => idx >= 0))];
      const otherEndpoints = endpoints.filter((ep, idx) => ! (uniqueEndpointIndexes.includes(idx)) );
      let selectedOtherEndpointLabel;
      if (otherEndpoints.length > 0) {
         selectedOtherEndpointLabel = await vscode.window.showQuickPick(otherEndpoints.map(ep => ep.label), {
            placeHolder: "Choose an endpoint",
            canPickMany: false,
         });
      }
      if (endpointIndexes.length > 0 && selectedOtherEndpointLabel) {
         const otherEndpoint = otherEndpoints.find(ep => ep.label === selectedOtherEndpointLabel);
         const otherEndpointUris = fileOrFolderUris.map((fileOrFolderUri, idx) => {
            const endpointIndex = endpointIndexes[idx];
            const endpoint1 = endpoints[endpointIndex];
            // const endpoint1RelPath = fileOrFolderUri.toString().replace(endpoint1.uri.toString(), '').replace(/^\//, '');
            const endpoint1RelPath = pathFromUri(fileOrFolderUri).replace(pathFromUri(endpoint1.uri), '').replace(/^\//, '');

            const otherEndpointUri = vscode.Uri.joinPath(otherEndpoint.uri, endpoint1RelPath);
            console.log(`(getOppositeEndpoint) Opposite endpoint for: ${fileOrFolderUri} is: ${otherEndpointUri}`);
            return otherEndpointUri;
         });
         vscode.window.showInformationMessage(`Opposite endpoint(s) for:\n ${fileOrFolderUris.join(', \n')}\nis/are:\n${otherEndpointUris.join(', \n')}`);
         return otherEndpointUris;
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
   if (Array.isArray(fileOrFolder)) {
      return Promise.all(fileOrFolder.map(getLsafPath));
   }
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
      if (localEndpoints.length === 0) {
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
      const localEndpoint = (localEndpoints.length === 1) ? localEndpoints[0] : undefined;
      if (localEndpoint) {
         let localPaths = fileOrFolderUri.map(fileOrFolderUri => {
            // Find the endpoint that matches the fileOrFolderUri
            const endpoint = endpoints.find(ep => (fileOrFolderUri?.toString() || '').startsWith(ep.uri.toString()));
            try {            
               const localFileOrFolderUri = vscode.Uri.joinPath(localEndpoint.uri, fileOrFolderUri.toString().replace(endpoint.uri.toString().replace(/\/$/, ''), ''));
               const localPath = decodeURIComponent(localFileOrFolderUri.fsPath);
               console.log(`(getLocalPath) Local path for ${fileOrFolderUri} is: ${localPath}`);
               // vscode.window.showInformationMessage(`Local path for ${fileOrFolderUri} is: ${localPath}`);
               return localPath;
            } catch (error) {
               vscode.window.showWarningMessage(`Failed to get Local path for ${fileOrFolder}: ${error.message}`);
               console.error(`(getLocalPath) Failed to get Local path for ${fileOrFolder}: ${error.message}`);
               return null;
            }
         });
         vscode.window.showInformationMessage(`Local path(s) for:\n${fileOrFolderUri}\n is/are: ${localPaths.join(', \n')}`);
         return (fileOrFolderUri.length === 1 && localPaths.length === 1) ? localPaths[0] : localPaths;
      } else {      
         vscode.window.showWarningMessage(`Failed to get Local path for ${fileOrFolder}: no local endpoint found.`);
         console.error(`(getLsafPath) Failed to get Local path for ${fileOrFolder}: no local endpoint found.`);
      }
   } else {
      vscode.window.showWarningMessage(`Failed to get Local path for ${fileOrFolder}: no endpoints defined.`);
      console.error(`(getLsafPath) Failed to get Local path for ${fileOrFolder}: no endpoints defined.`);
   }
   return null;
}


async function enterMultiLineComment(defaultValue, info) {

   // vscode.window.showInformationMessage(info || `Enter a (multi-line) comment and click 'submit' when done.`);

   const userInput = await getMultiLineInput(defaultValue, info);
   let comment;
   if (userInput.trim()) {
      console.log(`Comment entered: ${userInput}`);
      // vscode.window.showInformationMessage(`Comment entered: ${userInput}`);
      comment = userInput;
   } else {
      console.log('No comment provided.');
      // vscode.window.showInformationMessage('No comment provided.');
      comment = null;
   }
   console.log('Entered comment:\n', comment);
   return comment;
}

async function getFormData(fileUri, fileContents) {
   let filename;
   if (fileUri && fileUri instanceof vscode.Uri) {
      filename = fileUri.path.split(/[\\/]/).slice(-1)[0];
   } else {
      console.warn(`(getFormData) fileUri is not a Uri: ${fileUri}`);
      vscode.window.showErrorMessage(`(getFormData) fileUri is not a Uri: ${fileUri}`);
      throw new Error(`(getFormData) fileUri is not a Uri: ${fileUri}`);
   }
   console.log('filename:', filename);

   // Dynamically import modules
   const { Readable } = await import('stream');
   const FormData = (await import('form-data')).default;

   // const { Readable } = await require('stream');
   // const FormData = await require('form-data');  // Node.js implementation of FormData for multipart/form-data including streams
   let formdata = new FormData();
   if (fileContents && fileContents instanceof Uint8Array) {
      // Create a Buffer from the string content and convert it to a Readable Stream
      const bufferStream = new Readable();
      bufferStream._read = () => { }; // No operation needed for the _read method
      bufferStream.push(fileContents); // Push the content to the stream
      bufferStream.push(null);    // Signal end of the stream

      // Append the file-like content to the FormData object with the key 'uploadFile'
      formdata.append('uploadFile', bufferStream, { filename });
      // formdata.append('uploadFile', new Blob([this.fileContents]), filename);    // fails in node.js because Blob is not a stream
      return [formdata, filename];
   }
   if (fileUri && fileUri instanceof vscode.Uri) {
      try {
         let commands = await vscode.commands.getCommands();
         console.log('commands:', commands);
         commands = commands.filter(c => /lsaf/i.test(c));
         console.log(commands);
         commands = commands.filter(c =>  /getFileReadStream/i.test(c));
         console.log('commands:', commands);
         let stream;
         if (commands.includes('vsce-lsaf-restapi-fs.getFileReadStream')) {
            stream = await vscode.commands.executeCommand(
               "vsce-lsaf-restapi-fs.getFileReadStream",
               fileUri
            );
         }
         if (stream) {
            console.log('typeof stream:', typeof stream);
            if (stream instanceof Readable) {   // stream is a Readable stream
               formdata.append('uploadFile', stream, { filename });
               console.log('formdata:', formdata);
               return [formdata, filename];
            } else {
               console.error('(getFormData) stream is not an instance of Readable');
               throw new Error('(getFormData) stream is not an instance of Readable');
            }
         } else {
            // vscode.window.showWarningMessage(`Failed to upload file: could not read file stream.`);
            // console.error(`(uploadFile) Failed to upload file: could not read file stream.`);
            // return null;
            console.log('(getFormData) Could not read file as a stream');
         }
      }  catch (error) {
         console.log(`(getFormData) Could not read file as a stream: ${error.message}`);
         // vscode.window.showErrorMessage(`(getFormData) Could not read file as a stream: ${error.message}`);
         // console.error(`(getFormData) Could not read file as a stream: ${error.message}`);
         // return null;
      }
      let fs;
      if (typeof process !== 'undefined') {  // node environment
         fs = await require('fs');
      }
      if (fs && fileUri.scheme === 'file') {
         try {
            formdata = new FormData();
            formdata.append('file', fs.createReadStream(fileUri.fsPath));
            return [formdata, filename];
         } catch (error) {
            console.log(`(getFormData) Could not read file as a stream: ${error.message}`);
         }
      }   
      try { 
         const fileContents = await vscode.workspace.fs.readFile(fileUri);
         // Convert Uint8Array to Buffer
         const buffer = Buffer.from(fileContents);
         // Append the file to the FormData
         formdata.append('uploadFile', buffer, filename);
         console.log('(getFormData) formdata:', formdata);
         return [formdata, filename];
      } catch (error) {
         vscode.window.showErrorMessage(`(getFormData) Could not read file contents: ${error.message}`);
         console.error(`(getFormData) Could not read file contents: ${error.message}`);
         return null;
      }
   }
}

async function copyToOppositeEndpoint(fileOrFolder, oppositeEndpoint, copyComment) {
   if (!fileOrFolder) {
      vscode.window.showInformationMessage(`(copyToOppositeEndpoint) no file or folder specified, attempting to use Active Editor document.`);
   }
   const fileOrFolderUri = getFileOrFolderUri(fileOrFolder);
   if (!fileOrFolderUri) {
      vscode.window.showWarningMessage(`Failed to copy ${fileOrFolder} to opposite endpoint: could not retrieve file or folder URI.`);
      console.error(`(copyToOppositeEndpoint) Failed to copy ${fileOrFolder} to opposite endpoint: could not retrieve file or folder URI.`);
      return null;
   }
   let oppositeEndpointUri;
   if (oppositeEndpoint) {
      oppositeEndpointUri = uriFromString(oppositeEndpoint);
   } else {
      oppositeEndpointUri = await getOppositeEndpointUri(fileOrFolder);
   }
   let comment;
   if (copyComment === undefined) {
      const isOppositeEndpointUriSchemeFile = (Array.isArray(oppositeEndpointUri)) ? 
         oppositeEndpointUri.every(uri => uriFromString(uri).scheme === 'file') : 
         uriFromString(oppositeEndpointUri).scheme  === 'file';
      if (!isOppositeEndpointUriSchemeFile) {
         if (Array.isArray(fileOrFolderUri)) {
            let results = await Promise.allSettled(fileOrFolderUri.map(async uri => await getLsafPath(uri)));
            results = results.map((result, idx) => (result.status === 'fulfilled') ? result.value : pathFromUri(fileOrFolderUri[idx], true));
            comment = `Add / Update\n${results.join(', \n')}\n\n`;
         } else {
            comment = `Add / Update ${await getLsafPath(fileOrFolderUri)}\n\n`;
         }
         comment = await enterMultiLineComment(comment, `a Copy comment`);
      }
   } else {
      comment = copyComment;
   }
   console.log('comment:', comment);
   if (Array.isArray(fileOrFolderUri)) {
      if (!(Array.isArray(oppositeEndpointUri))) oppositeEndpointUri = [oppositeEndpointUri];
      if (fileOrFolderUri.length !== oppositeEndpointUri.length) {
         vscode.window.showWarningMessage(`Failed to copy ${fileOrFolder} to opposite endpoint: number of file or folder URIs (${fileOrFolderUri.length}) does not match number of opposite endpoints (${oppositeEndpointUri.length}).`);
         console.error(`Failed to copy ${fileOrFolder} to opposite endpoint: number of file or folder URIs (${fileOrFolderUri.length}) does not match number of opposite endpoints (${oppositeEndpointUri.length}).`);
         return null;
      }
      return await Promise.allSettled(fileOrFolderUri.map((uri, idx) => copyToOppositeEndpoint(uri, oppositeEndpointUri[idx], comment)));
   }
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
      const { logon } = await require('./auth.js');
      let host = oppositeEndpointUri.authority;
      if (host && ['lsaf-repo', 'lsaf-work'].includes(oppositeEndpointUri.scheme)) {
         host = `${host}.ondemand.sas.com`;
      } else {
         vscode.window.showWarningMessage(`Unexpected host: ${host} and/or scheme: ${oppositeEndpointUri.scheme}.`);
         console.error(`(copyToOppositeEndpoint) Unexpected host: ${host} and/or scheme: ${oppositeEndpointUri.scheme}.`);
         return null;
      }
      const authToken = await logon(host);
      if (!authToken) {
         vscode.window.showErrorMessage(`Failed to copy ${fileOrFolder} to opposite endpoint: could not authenticate.`);
         console.error(`(copyToOppositeEndpoint) Failed to copy ${fileOrFolder} to opposite endpoint: could not authenticate.`);
         return null;
      }
      const endpoints = getDefaultEndpoints() || [];
      let endpoint, oppositeEndpoint;
      if (endpoints) {
         const endpointIndex = endpoints.findIndex(ep => (fileOrFolderUri?.toString() || '').startsWith(ep.uri.toString()));
         if (endpointIndex >= 0) {
            endpoint = endpoints[endpointIndex];
         }
         const oppositeEndpointIndex = endpoints.findIndex(ep => (oppositeEndpointUri?.toString() || '').startsWith(ep.uri.toString()));
         if (oppositeEndpointIndex >= 0) {
            oppositeEndpoint = endpoints[oppositeEndpointIndex];
         }
      }
      if (oppositeEndpoint && oppositeEndpoint.url) {
         const axios = await require('axios');
         const path = await require('path');
         const beautify = await require("js-beautify");
         let fileContents;
         // fileContents = await vscode.workspace.fs.readFile(fileOrFolderUri);
         const apiUrl = `https://${host}/lsaf/api`;
         const urlPath = new URL(oppositeEndpoint.url).pathname
            .replace(/\/lsaf\/webdav\/work\//, '/workspace/files/')
            .replace(/\/lsaf\/webdav\/repo\//, '/repository/files/')
            .replace(/\/$/, '');
         console.log('urlPath:', urlPath);
         // const filePath = decodeURI(uriFromString(fileOrFolderUri).path).replace(endpoint.uri.path, '');
         const filePath = pathFromUri(fileOrFolderUri)
            .replace(pathFromUri(endpoint.uri), '')
            .replaceAll('\\', '/');
         console.log('filePath:', filePath);
         let apiRequest = `${path.posix.join(urlPath, filePath)}?action=upload&version=MINOR&createParents=true&overwrite=true`;
         // const comment = await enterMultiLineComment(`Add / Update ${pathFromUri(fileOrFolderUri)}\n\n`);
         if (comment) {
            apiRequest = `${apiRequest}&comment=${encodeURIComponent(comment)}`;
         }
         apiRequest = `${apiRequest}&expand=item,status`;
         let formdata;
         let filename;
         let requestOptions;
         let fullUrl;
         [formdata, filename] = await getFormData(fileOrFolderUri, fileContents);
         requestOptions = {
            headers: {
               ...formdata.getHeaders(),
               "X-Auth-Token": authToken
            }
         };
         let response;
         try {
            fullUrl = encodeURI(apiUrl + apiRequest);
            console.log('(uploadFile) fullUrl:', fullUrl);
            const controller = new AbortController();
            const timeout = 10_000;
            const timeoutId = setTimeout(() => controller.abort(), timeout);
            try {
               response = await axios.put(fullUrl, formdata, { ...requestOptions, signal: controller.signal });
               clearTimeout(timeoutId); // clear timeout when the request completes
            } catch (error) {
               if (error.code === 'ECONNABORTED') {
                  console.error(`(uploadFile) Fetch request timed out after ${timeout / 1000} seconds.`);
                  throw new Error(`(uploadFile) Fetch request timed out after ${timeout / 1000} seconds.`);
               } else {
                  debugger;
                  console.error('(uploadFile) Fetch request failed:', error);
                  console.log(
                     error?.response?.status || '',
                     error?.response?.data?.message || '',
                     error?.response?.data?.remediation || ''
                  );
                  if (error?.config?.headers) console.log('request headers:', error.config.headers);
                  throw new Error('(uploadFile) Fetch request failed:', error.message);
               }
            }
            console.log('(uploadFile) response.status:', response.status, response.statusText);
         } catch (error) {
            console.error(`(uploadFile) Error uploading file:`, error);
            throw new Error(`(uploadFile) Error uploading file: ${error.message}`);
         }

         let result;
         let status;
         let message;
         const contentType = response.headers['content-type'];
         console.log('(RestApi.uploadFileContents) contentType:', contentType);
         if (response.headers['content-type'].match(/\bjson\b/)) {
            const data = response.data;
            status = data.status;
            result = beautify(JSON.stringify(data), {
               indent_size: 2,
               space_in_empty_paren: true,
            });
         } else {
            result = response.data;
         }
         console.log('(RestApi.uploadFileContents) result:', result);
         if (status?.type === 'FAILURE') {
            message = `File "${filename}" upload to "${path.posix.join(urlPath, filePath)}" on ${new URL(fullUrl).hostname} failed: ` + status?.message || result;
            vscode.window.showWarningMessage(message);
         } else if (status?.type === 'SUCCESS') {
            message = `File "${filename}" uploaded to : ${new URL(fullUrl).hostname.split('.')[0]} ${urlPath.split('/')[1]}, ` + status?.message || result;
            vscode.window.showInformationMessage(message);
         } else {
            console.log('result:', result);
            message = `File "${filename}" upload result: ${result}`;
            if (/(error|fail(ed|ure))/i.test(message)) {
               vscode.window.showWarningMessage(message);
            } else {
               vscode.window.showInformationMessage(message);
            }
         }
         console.log(message);
         
      } else {
         vscode.window.showWarningMessage(`Failed to copy ${fileOrFolder} to opposite endpoint: no matching endpoint found.`);
         console.error(`(copyToOppositeEndpoint) Failed to copy ${fileOrFolder} to opposite endpoint: no matching endpoint found.`);
      }
   }
} 

module.exports = { getFileOrFolderUri, getLsafPath, getLocalPath, copyFileOrFolderUri, getOppositeEndpointUri, copyToOppositeEndpoint };
