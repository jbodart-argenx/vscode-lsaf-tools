const vscode = require('vscode');

const { uriFromString } = require('./uri');

export async function copyFileOrFolderUri(fileOrFolder) {
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

