// import { get } from 'axios';

const vscode = require('vscode');

// const { getMultiLineText } = require('./multiLineText.js');
const { uriFromString, pathFromUri } = require('./uri');
const { getDefaultEndpoints } = require("./endpoints");

function getFileFolderOrDocumentUri(fileOrFolder) {
   if (Array.isArray(fileOrFolder)) {
      return fileOrFolder.map(getFileFolderOrDocumentUri);
   }
   if (fileOrFolder === '') {
      return null;
   }
   let editor, document;
   // test if fileOrFolder is an object and has properties groupId and editorIndex
   if (fileOrFolder && typeof fileOrFolder === 'object' && typeof fileOrFolder.groupId === 'number' && typeof fileOrFolder.editorIndex === 'number') {
      // editor = vscode.window.visibleTextEditors.find(editor => editor.viewColumn === fileOrFolder.editorIndex);
      editor = vscode?.window?.activeEditor || vscode.window.activeTextEditor;
      if (editor) {
         document = editor.document;
         return document.uri;
      }
   }
   if (editor &&
      (typeof fileOrFolder === 'object' && !(fileOrFolder instanceof vscode.Uri))
      (typeof fileOrFolder !== 'string' && !(fileOrFolder instanceof vscode.Uri))
   ) {
      document = editor.document;
      return document?.uri;
   }
   return (fileOrFolder == null && vscode?.window?.activeTextEditor) ?
      vscode.window.activeTextEditor.document.uri :
      (fileOrFolder == null && vscode?.window?.activeEditor?.document?.uri) ?
      vscode.window.activeEditor?.document?.uri :
      uriFromString(fileOrFolder);
}



async function copyFileOrFolderUri(fileOrFolder, getUriFn = getFileFolderOrDocumentUri, copyFn = copyToClipboard) {
   if (!fileOrFolder) {
      vscode.window.showInformationMessage(`(copyFileOrFolderUri) no file or folder specified, attempting to use Active Editor document.`);
   }
   let fileOrFolderUri;
   if (Array.isArray(fileOrFolder)) {
      fileOrFolderUri = fileOrFolder.map(getUriFn).map(uri => uri ? uri.toString() : '');
   } else {
      const uri = getUriFn(fileOrFolder);
      // if (uri && uri instanceof vscode.Uri && uri.scheme === 'sasServer') {
      //    const binaryContentsBuffer = await vscode.workspace.fs.readFile(uri);
      //    // print buffer length
      //    console.log(`(copyFileOrFolderUri) Buffer length: ${binaryContentsBuffer.length}`);
      //    // convert buffer to string
      //    const binaryContentsText = new TextDecoder("utf-8").decode(binaryContentsBuffer);
      //    // print string
      //    console.log(`(copyFileOrFolderUri) Text: ${binaryContentsText}`);
      // }
      fileOrFolderUri = uri ? [uri.toString()] : [''];
   }
   await copyFn(fileOrFolderUri, 'File/Folder Uri');
}

async function copyToClipboard(text, descr = "Text", copyFn = vscode.env.clipboard.writeText) {
   // retrieve caller function
   const caller = new Error().stack.split('\n')[2].trim().split(/ +/)[1]; //.replace(/^at .*/, '');
   if (text) {
      try {
         await copyFn(Array.isArray(text) ? text.join('\n') : text);
         console.log(`(${caller}) ${descr} copied to clipboard: ${text}`);
         vscode.window.showInformationMessage(`${descr} copied to clipboard: ${text}`);
      } catch (error) {
         vscode.window.showErrorMessage(`Error copying ${descr} to clipboard: ${error.message}`);
         console.error(`(${caller}) Error copying ${descr} to clipboard: ${error.message}`);
      }
   } else {
      vscode.window.showWarningMessage(`Failed to copy ${descr} to clipboard: no ${descr} specified.`);
      console.error(`(${caller}) Failed to copy ${descr} to clipboard: no ${descr} specified.`);
   }
}

async function getOppositeEndpointUri(fileOrFolder, getDefaultEndPointsFn = async () => getDefaultEndpoints()) {
   if (!fileOrFolder) {
      vscode.window.showInformationMessage(`(getOppositeEndpointUri) no file or folder specified, attempting to use Active Editor document.`);
   }
   const fileOrFolders = (Array.isArray(fileOrFolder)) ? fileOrFolder : [fileOrFolder];
   const fileOrFolderUris = fileOrFolders.map(getFileFolderOrDocumentUri).map(uri => uri ? uri : '');
   if (!fileOrFolderUris || !(Array.isArray(fileOrFolderUris)) || fileOrFolderUris.length === 0) {
      vscode.window.showWarningMessage(`Failed to get opposite endpoint for ${fileOrFolders}: could not retrieve file or folder URI.`);
      console.error(`(getOppositeEndpointUri) Failed to get opposite endpoint for ${fileOrFolders}: could not retrieve file or folder URI.`);
      return null;
   }
   // Get the opposite endpoint from the defaultEndpoints
   const endpoints = await getDefaultEndPointsFn() || [];
   if (endpoints && Array.isArray(endpoints) && endpoints.length > 0) {
      // Find the endpoints that match and don't match the fileOrFolderUri
      let endpointIndexes = fileOrFolderUris.map(uri => endpoints.findIndex(ep => (uri.toString() || '').startsWith(ep.uri.toString())));
      // Unique endpointIndexes
      const uniqueEndpointIndexes = [...new Set(endpointIndexes.filter(idx => idx >= 0))];
      const otherEndpoints = endpoints.filter((ep, idx) => !(uniqueEndpointIndexes.includes(idx)));
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
            if (endpoint1) {
            // const endpoint1RelPath = fileOrFolderUri.toString().replace(endpoint1.uri.toString(), '').replace(/^\//, '');
               const endpoint1RelPath = pathFromUri(fileOrFolderUri).replace(pathFromUri(endpoint1.uri), '')
                  .replace(/\\/g, "/").replace(/^\//, '');

               const otherEndpointUri = vscode.Uri.joinPath(otherEndpoint.uri, endpoint1RelPath);
               console.log(`(getOppositeEndpoint) Opposite endpoint for: ${fileOrFolderUri} is: ${otherEndpointUri}`);
               return otherEndpointUri;
            } else {
               return null;
            }
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

async function getLsafPath(fileOrFolder, getDefaultEndPointsFn = async () => getDefaultEndpoints()) {
   if (Array.isArray(fileOrFolder)) {
      let results = await Promise.allSettled(fileOrFolder.map(fileOrFolder => getLsafPath(fileOrFolder, getDefaultEndPointsFn)));      
      results = results.map((result) => (result.status === 'fulfilled') ? result.value : null);
      return results;
   }
   if (!fileOrFolder) {
      vscode.window.showInformationMessage(`(getLsafPath) no file or folder specified, attempting to use Active Editor document.`);
   }
   const fileOrFolderUri = getFileFolderOrDocumentUri(fileOrFolder);
   if (!fileOrFolderUri) {
      vscode.window.showWarningMessage(`Failed to get LSAF path for ${fileOrFolder}: could not retrieve file or folder URI.`);
      console.error(`(getLsafPath) Failed to get LSAF path for ${fileOrFolder}: could not retrieve file or folder URI.`);
      return null;
   }
   // Get the opposite endpoint from the defaultEndpoints
   const endpoints = await getDefaultEndPointsFn() || [];
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


async function getLocalPath(fileOrFolder, getDefaultEndPointsFn = async () => getDefaultEndpoints()) {
   if (!fileOrFolder) {
      vscode.window.showInformationMessage(`(getLocalPath) no file or folder specified, attempting to use Active Editor document.`);
   }
   const fileOrFolderUri = getFileFolderOrDocumentUri(fileOrFolder);
   if (!fileOrFolderUri) {
      vscode.window.showWarningMessage(`Failed to get local path for ${fileOrFolder}: could not retrieve file or folder URI.`);
      console.error(`(getLocalPath) Failed to get local path for ${fileOrFolder}: could not retrieve file or folder URI.`);
      return null;
   }
   // Get the local endpoint from the defaultEndpoints
   const endpoints = await getDefaultEndPointsFn() || [];
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
         let localPaths = (Array.isArray(fileOrFolderUri) ? fileOrFolderUri : [fileOrFolderUri]).map(fileOrFolderUri => {
            // Find the endpoint that matches the fileOrFolderUri
            const endpoint = endpoints.find(ep => (fileOrFolderUri?.toString() || '').startsWith(ep.uri.toString()));
            try {            
               const localFileOrFolderUri = vscode.Uri.joinPath(localEndpoint.uri, 
                  (fileOrFolderUri?.toString() || '').replace((endpoint?.uri?.toString() || '').replace(/\/$/, ''), ''));
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
         return ((!Array.isArray(fileOrFolderUri) || fileOrFolderUri.length === 1) &&
            Array.isArray(localPaths) && localPaths.length === 1) ? localPaths[0] : localPaths;
      } else {      
         vscode.window.showWarningMessage(`Failed to get Local path for ${fileOrFolder}: no local endpoint found.`);
         console.error(`(getLocalPath) Failed to get Local path for ${fileOrFolder}: no local endpoint found.`);
      }
   } else {
      vscode.window.showWarningMessage(`Failed to get Local path for ${fileOrFolder}: no endpoints defined.`);
      console.error(`(getLocalPath) Failed to get Local path for ${fileOrFolder}: no endpoints defined.`);
   }
   return null;
}


async function enterMultiLineComment(defaultValue, info, getInputFn) {
   // vscode.window.showInformationMessage(info || `Enter a (multi-line) comment and click 'submit' when done.`);
   if (!getInputFn) {
      getInputFn = async (defaultValue, info) => {
         const { getMultiLineText } = require('./multiLineText.js');
         return await getMultiLineText(defaultValue, info);
      }
   }
   let userInput;
   try {
      userInput = await getInputFn(defaultValue, info) || '';
   } catch (error) {
      console.error(`(enterMultiLineComment): Error calling ${getInputFn.name}(): ${error.message}`);
      if (error) userInput = '';
   }
   let comment;
   if (userInput && typeof userInput === 'string' && userInput.trim()) {
      console.log(`Comment entered: ${userInput}`);
      comment = userInput;
   } else {
      console.log('No comment provided.');
      comment = '';
   }
   console.log('Entered comment:\n', comment);
   return comment;
}

async function getFormData(fileUri, fileContents) {
   const filename = getFilenameFromUri(fileUri);
   console.log('filename:', filename);

   const FormData = (await import('form-data')).default;

   let formdata = new FormData();

   if (fileContents && fileContents instanceof Uint8Array) {
      return await createFormDataFromContents(formdata, fileContents, filename);
   }

   if (fileUri && fileUri instanceof vscode.Uri) {
      if (fileUri.scheme === 'file') {
         const fsFormData = createFormDataFromFileSystem(formdata, fileUri, filename);
         if (fsFormData) {
            return fsFormData;
         }
      } else if (['lsaf-repo', 'lsaf-work'].includes(fileUri.scheme)) {
         const stream = await getFileReadStreamAndCreateFormData(formdata, fileUri, filename);
         if (stream) {
            return stream;
         }
      } else {
         return createFormDataFromWorkspace(formdata, fileUri, filename);
      }
   }

   throw new Error(`(getFormData) Invalid fileUri: ${fileUri}`);
}

function getFilenameFromUri(fileUri) {
   if (fileUri && fileUri instanceof vscode.Uri) {
      return fileUri.path.split(/[\\/]/).slice(-1)[0];
   } else {
      console.warn(`(getFormData) fileUri is not a Uri: ${fileUri}`);
      vscode.window.showErrorMessage(`(getFormData) fileUri is not a Uri: ${fileUri}`);
      throw new Error(`(getFormData) fileUri is not a Uri: ${fileUri}`);
   }
}

async function createFormDataFromContents(formdata, fileContents, filename) {
   const { Readable } = await import('stream');
   const bufferStream = new Readable();
   bufferStream._read = () => { };
   bufferStream.push(fileContents);
   bufferStream.push(null);

   formdata.append('uploadFile', bufferStream, { filename });
   return [formdata, filename];
}

async function getFileReadStreamAndCreateFormData(formdata, fileUri, filename) {
   try {
      let commands = await vscode.commands.getCommands();
      commands = commands.filter(c => /lsaf/i.test(c) && /getFileReadStream/i.test(c));

      if (commands.includes('vsce-lsaf-restapi-fs.getFileReadStream')) {
         const { Readable } = await require('stream');
         const stream = await vscode.commands.executeCommand("vsce-lsaf-restapi-fs.getFileReadStream", fileUri);
         if (stream && stream instanceof Readable) {
            formdata.append('uploadFile', stream, { filename });
            console.log('formdata:', formdata);
            return [formdata, filename];
         } else {
            const errorMessage = '(getFormData) stream is not an instance of Readable';
            console.error(errorMessage);
            vscode.window.showErrorMessage(errorMessage);
            return null;
         }
      }
   } catch (error) {
      console.log(`(getFormData) Could not read file as a stream: ${error.message}`);
   }
   return null;
}

function createFormDataFromFileSystem(formdata, fileUri, filename, fs = require('fs'), logger = console) {
   if (typeof process === 'undefined') {
      return null;
   }

   if (!fs || fileUri.scheme !== 'file') {
      return null;
   }

   try {
      formdata.append('uploadFile', fs.createReadStream(fileUri.fsPath));
      return [formdata, filename];
   } catch (error) {
      logger.error(`(createFormDataFromFileSystem) Could not read file as a stream: ${error.message}`);
      return null;
   }
}

async function createFormDataFromWorkspace(formdata, fileUri, filename, readFile = vscode.workspace.fs.readFile, logger = console) {
   try {
      const fileContents = await readFile(fileUri);
      const buffer = Buffer.from(fileContents);
      formdata.append('uploadFile', buffer, filename);
      logger.log('(getFormData) formdata:', formdata);
      return [formdata, filename];
   } catch (error) {
      logger.error(`(getFormData) Could not read file contents: ${error.message}`);
      return null;
   }
}

async function compareToOppositeEndpoint( fileOrFolder, oppositeEndpoint, getFileOrFolderUri = getFileOrFolderUri,
   getOppositeEndpointUri = getOppositeEndpointUri, logger = console) {

   // Ensure files or Folders and opposite endpoints are (arrays of) URIs
   if (!fileOrFolder) {
   vscode.window.showInformationMessage(`(compareToOppositeEndpoint) no file or folder specified, attempting to use Active Editor document.`);
   }
   const fileOrFolderUri = getFileFolderOrDocumentUri(fileOrFolder);
   if (!fileOrFolderUri) {
   vscode.window.showWarningMessage(`Failed to compare ${fileOrFolder} to opposite endpoint: could not retrieve file or folder URI.`);
   logger.error(`(compareToOppositeEndpoint) Failed to compare ${fileOrFolder} to opposite endpoint: could not retrieve file or folder URI.`);
   return null;
   }
   let oppositeEndpointUri;
   if (oppositeEndpoint) {
   oppositeEndpointUri = uriFromString(oppositeEndpoint);
   } else {
   oppositeEndpointUri = await getOppositeEndpointUri(fileOrFolder);
   }
   if (Array.isArray(oppositeEndpointUri) && oppositeEndpointUri.length <= 1) {
   oppositeEndpointUri = oppositeEndpointUri[0]; // Assuming we only need the first URI for single file/folder compare
   }
   if (!oppositeEndpointUri) {
   vscode.window.showWarningMessage(`No opposite endpoint specified.`);
   logger.error(`(compareToOppositeEndpoint) No opposite endpoint specified.`);
   return null;
   }

   // If arrays, check if they are the same length
   // Then recursively call this function with individual file or folder URIs and corresponding opposite endpoint URI
   if (Array.isArray(fileOrFolderUri)) {
      if (!(Array.isArray(oppositeEndpointUri))) oppositeEndpointUri = [oppositeEndpointUri];
      if (fileOrFolderUri.length !== oppositeEndpointUri.length) {
         vscode.window.showWarningMessage(`Failed to compare ${fileOrFolder} to opposite endpoint: number of file or folder URIs (${fileOrFolderUri.length
         }) does not match number of opposite endpoints (${oppositeEndpointUri.length}).`);
         logger.error(`Failed to compare ${fileOrFolder} to opposite endpoint: number of file or folder URIs (${fileOrFolderUri.length
         }) does not match number of opposite endpoints (${oppositeEndpointUri.length}).`);
         return null;
      }
      return await Promise.allSettled(fileOrFolderUri.map((uri, idx) => compareToOppositeEndpoint(uri, oppositeEndpointUri[idx], context,
         getFileFolderOrDocumentUri, getOppositeEndpointUri, logger)));
   }
   if (!oppositeEndpointUri) {
      vscode.window.showWarningMessage(`Failed to compare ${fileOrFolder} to opposite endpoint: could not identify opposite endpoint.`);
      logger.error(`(compareToOppositeEndpoint) Failed to compare ${fileOrFolder} to opposite endpoint: could not identify opposite endpoint.`);
      return null;
   }

   logger.log(`(compareToOppositeEndpoint) Comparing ${fileOrFolderUri} to ${oppositeEndpointUri}`);

   const stat = await vscode.workspace.fs.stat(fileOrFolderUri);
   if (stat.type & vscode.FileType.Directory) {
      // Folder Comparison - not yet implemented
      debugger;
      console.warn(`Comparing folders to opposite endpoint not yet implemented.`);
      vscode.window.showWarningMessage(`Comparing folders to opposite endpoint not yet implemented.`);
   } else if (stat.type & vscode.FileType.File) {
      try {
         await vscode.commands.executeCommand(
            "vscode.diff",
            oppositeEndpointUri,  // left file, non-editable (original)
            fileOrFolderUri,      // right file, editable (modified)
            `${oppositeEndpointUri} ↔ ${fileOrFolderUri}`,  // Diff editor title
            {  
               preview: false,   // ensures the diff editor remains open until explicitly closed.
               selection: null,  // No specific selection is highlighted in the diff editor.
            }
         );
         vscode.window.showInformationMessage(`Compared ${fileOrFolderUri} to ${oppositeEndpointUri}`);
         logger.log(`(compareToOppositeEndpoint) Compared ${fileOrFolderUri} to ${oppositeEndpointUri}`);
      } catch (error) {
         vscode.window.showErrorMessage(`Error comparing ${fileOrFolderUri} to ${oppositeEndpointUri}: ${error.message}`);
         logger.error(`(compareToOppositeEndpoint) Error comparing ${fileOrFolderUri} to ${oppositeEndpointUri}: ${error.message}`);
      }
   } else {
      vscode.window.showWarningMessage(`Failed to compare ${fileOrFolderUri} to ${oppositeEndpointUri}: not a file or folder.`);
      logger.error(`(compareToOppositeEndpoint) Failed to compare ${fileOrFolderUri} to ${oppositeEndpointUri}: not a file or folder.`);
   }


}


async function copyToOppositeEndpoint( fileOrFolder, oppositeEndpoint, copyComment, getFileOrFolderUri = getFileOrFolderUri,
                                       getOppositeEndpointUri = getOppositeEndpointUri, fs = vscode.workspace.fs, logger = console) {
   if (!fileOrFolder) {
      vscode.window.showInformationMessage(`(copyToOppositeEndpoint) no file or folder specified, attempting to use Active Editor document.`);
   }
   const fileOrFolderUri = getFileFolderOrDocumentUri(fileOrFolder);
   if (!fileOrFolderUri) {
      vscode.window.showWarningMessage(`Failed to copy ${fileOrFolder} to opposite endpoint: could not retrieve file or folder URI.`);
      logger.error(`(copyToOppositeEndpoint) Failed to copy ${fileOrFolder} to opposite endpoint: could not retrieve file or folder URI.`);
      return null;
   }
   let oppositeEndpointUri;
   if (oppositeEndpoint) {
      oppositeEndpointUri = uriFromString(oppositeEndpoint);
   } else {
      oppositeEndpointUri = await getOppositeEndpointUri(fileOrFolder);
   }
   if (Array.isArray(oppositeEndpointUri) && oppositeEndpointUri.length <= 1) {
      oppositeEndpointUri = oppositeEndpointUri[0]; // Assuming we only need the first URI for single file/folder copy
   }
   if (!oppositeEndpointUri) {
      vscode.window.showWarningMessage(`No opposite endpoint specified.`);
      logger.error(`(copyToOppositeEndpoint) No opposite endpoint specified.`);
      return null;
   }
   
   let comment;
   if (copyComment === undefined) {
      const isOppositeEndpointUriSchemeFile = (Array.isArray(oppositeEndpointUri)) ? 
         oppositeEndpointUri.every(uri => uriFromString(uri).scheme === 'file') : 
         uriFromString(oppositeEndpointUri).scheme === 'file';
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
   logger.log('comment:', comment);
   if (Array.isArray(fileOrFolderUri)) {
      if (!(Array.isArray(oppositeEndpointUri))) oppositeEndpointUri = [oppositeEndpointUri];
      if (fileOrFolderUri.length !== oppositeEndpointUri.length) {
         vscode.window.showWarningMessage(`Failed to copy ${fileOrFolder} to opposite endpoint: number of file or folder URIs (${fileOrFolderUri.length
         }) does not match number of opposite endpoints (${oppositeEndpointUri.length}).`);
         logger.error(`Failed to copy ${fileOrFolder} to opposite endpoint: number of file or folder URIs (${fileOrFolderUri.length
         }) does not match number of opposite endpoints (${oppositeEndpointUri.length}).`);
         return null;
      }
      return await Promise.allSettled(fileOrFolderUri.map((uri, idx) => copyToOppositeEndpoint(uri, oppositeEndpointUri[idx], comment,
         getFileFolderOrDocumentUri, getOppositeEndpointUri, fs, logger)));
   }
   if (!oppositeEndpointUri) {
      vscode.window.showWarningMessage(`Failed to copy ${fileOrFolder} to opposite endpoint: could not identify opposite endpoint.`);
      logger.error(`(copyToOppositeEndpoint) Failed to copy ${fileOrFolder} to opposite endpoint: could not identify opposite endpoint.`);
      return null;
   }
   logger.log(`(copyToOppositeEndpoint) Copying ${fileOrFolderUri} to ${oppositeEndpointUri}`);
   if (oppositeEndpointUri.scheme === 'file') {
      // Copy to local endpoint
      const stat = await fs.stat(fileOrFolderUri);
      if (stat.type & vscode.FileType.Directory) {
         // Copy folder to local endpoint - NOT IMPLELMENTED YET
         debugger;
         console.warn(`Copying folders to local endpoint not yet implemented.`);
         vscode.window.showWarningMessage(`Copying folders to local endpoint not yet implemented.`);
      } else if (stat.type & vscode.FileType.File) {
         // Copy file to local endpoint
         try {
            await fs.copy(fileOrFolderUri, oppositeEndpointUri, { overwrite: true });
            vscode.window.showInformationMessage(`Copied ${fileOrFolderUri} to ${oppositeEndpointUri}`);
            logger.log(`(copyToOppositeEndpoint) Copied ${fileOrFolderUri} to ${oppositeEndpointUri}`);
         } catch (error) {
            vscode.window.showErrorMessage(`Error copying ${fileOrFolderUri} to ${oppositeEndpointUri}: ${error.message}`);
            logger.error(`(copyToOppositeEndpoint) Error copying ${fileOrFolderUri} to ${oppositeEndpointUri}: ${error.message}`);
         }
      } else {
         vscode.window.showWarningMessage(`Failed to copy ${fileOrFolderUri} to ${oppositeEndpointUri}: not a file or folder.`);
         logger.error(`(copyToOppositeEndpoint) Failed to copy ${fileOrFolderUri} to ${oppositeEndpointUri}: not a file or folder.`);
      }
   } else {
      // Copy (Upload) to remote endpoint
      const { logon } = await require('./auth.js');
      let host = oppositeEndpointUri.authority;
      if (host && ['lsaf-repo', 'lsaf-work'].includes(oppositeEndpointUri.scheme)) {
         host = `${host}.ondemand.sas.com`;
      } else {
         vscode.window.showWarningMessage(`Unexpected host: ${host} and/or scheme: ${oppositeEndpointUri.scheme}.`);
         logger.error(`(copyToOppositeEndpoint) Unexpected host: ${host} and/or scheme: ${oppositeEndpointUri.scheme}.`);
         return null;
      }
      const authToken = await logon(host);
      if (!authToken) {
         vscode.window.showErrorMessage(`Failed to copy ${fileOrFolder} to opposite endpoint: could not authenticate.`);
         logger.error(`(copyToOppositeEndpoint) Failed to copy ${fileOrFolder} to opposite endpoint: could not authenticate.`);
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
         logger.log('urlPath:', urlPath);
         // const filePath = decodeURI(uriFromString(fileOrFolderUri).path).replace(endpoint.uri.path, '');
         const filePath = pathFromUri(fileOrFolderUri)
            .replace(pathFromUri(endpoint.uri), '')
            .replaceAll('\\', '/');
         logger.log('filePath:', filePath);
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
            logger.log('(uploadFile) fullUrl:', fullUrl);
            const controller = new AbortController();
            const timeout = 10_000;
            const timeoutId = setTimeout(() => controller.abort(), timeout);
            try {
               response = await axios.put(fullUrl, formdata, { ...requestOptions, signal: controller.signal });
               clearTimeout(timeoutId); // clear timeout when the request completes
            } catch (error) {
               if (error.code === 'ECONNABORTED') {
                  logger.error(`(uploadFile) Fetch request timed out after ${timeout / 1000} seconds.`);
                  vscode.window.showErrorMessage(`(uploadFile) Fetch request timed out after ${timeout / 1000} seconds.`);
                  throw new Error(`(uploadFile) Fetch request timed out after ${timeout / 1000} seconds.`);
               } else {
                  debugger;
                  logger.error('(uploadFile) Fetch request failed:', error);
                  logger.log(
                     error?.response?.status || '',
                     error?.response?.data?.message || '',
                     error?.response?.data?.remediation || ''
                  );
                  if (error?.config?.headers) logger.log('request headers:', error.config.headers);
                  vscode.window.showErrorMessage(
                     `(uploadFile) Fetch request failed: ${
                        error?.response?.status || ''} ${
                           error?.response?.data?.message || ''} ${
                              error?.response?.data?.remediation || ''}`
                  );
                  throw new Error('(uploadFile) Fetch request failed:', error.message);
               }
            }
            logger.log('(uploadFile) response.status:', response.status, response.statusText);
         } catch (error) {
            logger.error(`(uploadFile) Error uploading file:`, error);
            throw new Error(`(uploadFile) Error uploading file: ${error.message}`);
         }

         let result;
         let status;
         let message;
         const contentType = response.headers['content-type'];
         logger.log('(uploadFile) contentType:', contentType);
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
         logger.log('(uploadFile) result:', result);
         if (status?.type === 'FAILURE') {
            message = `File "${filename}" upload to "${path.posix.join(urlPath, filePath)}" on ${new URL(fullUrl).hostname} failed: ` + status?.message || result;
            vscode.window.showWarningMessage(message);
         } else if (status?.type === 'SUCCESS') {
            message = `File "${filename}" uploaded to : ${new URL(fullUrl).hostname.split('.')[0]} ${urlPath.split('/')[1]}, ` + status?.message || result;
            vscode.window.showInformationMessage(message);
         } else {
            logger.log('result:', result);
            message = `File "${filename}" upload result: ${result}`;
            if (/(error|fail(ed|ure))/i.test(message)) {
               vscode.window.showWarningMessage(message);
            } else {
               vscode.window.showInformationMessage(message);
            }
         }
         logger.log(message);
         
      } else {
         vscode.window.showWarningMessage(`Failed to copy ${fileOrFolder} to opposite endpoint: no matching endpoint found.`);
         logger.error(`(copyToOppositeEndpoint) Failed to copy ${fileOrFolder} to opposite endpoint: no matching endpoint found.`);
      }
   }
} 

module.exports = { getFileOrFolderUri, getLsafPath, getLocalPath, copyFileOrFolderUri,
   getOppositeEndpointUri, copyToOppositeEndpoint, copyToClipboard, enterMultiLineComment,
   getFormData, getFilenameFromUri, createFormDataFromContents, getFileReadStreamAndCreateFormData,
   createFormDataFromFileSystem, createFormDataFromWorkspace, compareToOppositeEndpoint
};
