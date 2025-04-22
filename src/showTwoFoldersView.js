const vscode = require('vscode');
const path = require('path');
const os = require('os');
const beautify = require('js-beautify').js_beautify;
const isBinaryFile = require("isbinaryfile").isBinaryFile;

const { uriFromString, pathFromUri, isValidUri, existsUri } = require('./uri.js');

const joinPath = vscode.Uri.joinPath;

async function showTwoFoldersView(bothFoldersContents, folder1, folder2, context) {

    const { getFolderContents, mergeFolderContents, compareFolderContents, compareFileContents } = require('./compareContents.js');
    const { openFile } = require('./utils.js');
    const { existsUri } = require('./uri.js');

    if (!folder1 || !folder2
        || !(folder1 instanceof vscode.Uri)
        || !(folder2 instanceof vscode.Uri)) {
        debugger;
        console.warn('(showTwoFoldersView) Invalid folders - folder1:', folder1, ', folder2:', folder2);
        vscode.window.showErrorMessage(`(showTwoFoldersView) Invalid folders - folder1: ${folder1}, folder2: ${folder2}`);
        return;
    }
    const folder1Path = pathFromUri(folder1, true);
    const folder2Path = pathFromUri(folder2, true);
    const folder1Label = folder1.scheme === 'file' ? 'Local' : `${folder1.authority} ${folder1.scheme.replace('lsaf-', '')}`;
    const folder2Label = folder2.scheme === 'file' ? 'Local' : `${folder2.authority} ${folder2.scheme.replace('lsaf-', '')}`;
    const folder1Exists = await existsUri(folder1, vscode.FileType.Directory);
    const folder2Exists = await existsUri(folder2, vscode.FileType.Directory);

    const panel = vscode.window.createWebviewPanel(
        "folderContents",  // webview identifier
        `${path.basename(folder1Path)}/${
            " (" + folder1Label + (folder1Exists ? "" : "❌") +" ↔ " 
            + folder2Label + (folder2Exists ? "" : "❌") + ")"}`, // title displayed
        vscode.ViewColumn.One,
        {
            enableScripts: true, // Allow running JavaScript in the Webview
            localResourceRoots: context ? [
                uriFromString(path.join(context.extensionPath, 'webr-repo'))
            ] : [],
        }
    );

    // provide more details in tooltip displayed when hovering over the tooltip - does not work!
    panel.title = `${path.basename(folder1Path)}/${
        " (" + folder1Label + (folder1Exists ? "" : "❌") + " ↔ "
        + folder2Label + (folder2Exists ? "" : "❌") + ")"}`;
    panel.description = `${
        folder1Path}/ (${folder1Label + (folder1Exists ? "" : "❌")}) ↔ ${
        folder2Path}/ (${folder2Label + (folder2Exists ? "" : "❌")})}`;

    // Set the HTML content
    panel.webview.html = await getTwoFoldersWebviewContent(bothFoldersContents, folder1, folder2);

    // Handle messages from the Webview
    panel.webview.onDidReceiveMessage(
        async (message) => {
            const { command, filePath, fname, parent, oppositeParent, folder1, folder2, textCompare } = message;
            console.log(`(showTwoFoldersView) message: ${beautify(JSON.stringify(message))}`);
            let parentUri, fileUri, oppositeParentUri, oppositeFileUri, ext, label, oppositeLabel, folderUri1, folderUri2, isFolder, isLocal, isBinary;
            if (parent && isValidUri(parent)) {
                parentUri = uriFromString(parent);
                fileUri = vscode.Uri.joinPath(parentUri, String(fname));
            } else if (filePath) {
                fileUri = uriFromString(filePath);
            }
            if (fileUri && fileUri instanceof vscode.Uri) {
                ext = path.extname(fileUri.path).toLowerCase();
                isLocal = fileUri.scheme === 'file';
                label = fileUri.scheme === 'file' ? 'Local' : `${fileUri.authority} ${fileUri.scheme.replace('lsaf-', '')}`;
            }
            if (oppositeParent && isValidUri(oppositeParent)) {
                oppositeParentUri = uriFromString(oppositeParent);
                oppositeFileUri = vscode.Uri.joinPath(oppositeParentUri, String(fname));
                oppositeLabel = oppositeParentUri.scheme === 'file' ? 'Local' : `${oppositeParentUri.authority} ${oppositeParentUri.scheme.replace('lsaf-', '')}`;
            }
            if (folder1) folderUri1 = uriFromString(folder1);
            if (folder2) folderUri2 = uriFromString(folder2);
            switch (command) {
                case "openFile":
                    isFolder = false;
                    if (! (fileUri instanceof vscode.Uri)) {
                        console.error(`message.command is: "${command}", but fileUri is invalid: ${fileUri}`);
                        vscode.window.showErrorMessage(`message.command is: "${command}", but fileUri is invalid: ${fileUri}`);
                        throw new Error(`message.command is: "${command}", but fileUri is invalid: ${fileUri}`);
                    }
                    break;
                case "openSubFolder":
                    isFolder = true;
                    if (!(fileUri instanceof vscode.Uri)) {
                        console.error(`message.command is: "${command}", but fileUri is invalid: ${fileUri}`);
                        vscode.window.showErrorMessage(`message.command is: "${command}", but fileUri is invalid: ${fileUri}`);
                        throw new Error(`message.command is: "${command}", but fileUri is invalid: ${fileUri}`);
                    }
                    break;
                case ("refresh"):
                    if (folderUri1 instanceof vscode.Uri && folderUri2 instanceof vscode.Uri) {
                        let [contents1, contents2] = await Promise.all([folderUri1, folderUri2].map(getFolderContents));
                        const bothFoldersContents = await mergeFolderContents(contents1, contents2, textCompare, [folderUri1, folderUri2]);
                        panel.webview.html = await getTwoFoldersWebviewContent(
                            bothFoldersContents,
                            folderUri1,
                            folderUri2
                        );
                    return;
                    } else {
                        console.error(`message.command is: "${command}", but folderUri1 or folderUri2 is invalid: ${folderUri1}, ${folderUri2}`);
                        vscode.window.showErrorMessage(`message.command is: "${command}", but folderUri1 or folderUri2 is invalid: ${folderUri1}, ${folderUri2}`);
                        throw new Error(`message.command is: "${command}", but folderUri1 or folderUri2 is invalid: ${folderUri1}, ${folderUri2}`);
                    }
                default:
                    break;
            }
            console.log(`(showTwoFoldersView) isLocal: ${isLocal}, isFolder: ${isFolder}, message?.command: ${message?.command}`);
            if (isLocal) { // local file or folder
                try {
                    if (isFolder) {
                        // Ask what to do with local folder: Open, Upload, Compare to Remote ?
                        const action = await vscode.window.showQuickPick(['Open', 'Copy', 'Compare'],
                            {
                                title: `Choose action for ${label} ${filePath}`,
                                placeHolder: "",
                                canPickMany: false,
                                ignoreFocusOut: false
                            });
                        if (action == null) {  // cancelled
                            return;
                        } else if (action === 'Copy') {
                            console.log('Not implemented yet: Copy local folder to remote');
                            vscode.window.showWarningMessage('Not implemented yet: Copy local folder to remote');
                            return;
                        } else if (action === 'Compare') {
                            let [contents1, contents2] = await Promise.all([folderUri1, folderUri2].map(getFolderContents));
                            const bothFoldersContents = await mergeFolderContents(contents1, contents2);
                            panel.webview.html = await getTwoFoldersWebviewContent(
                                bothFoldersContents,
                                folderUri1,
                                folderUri2
                            );
                            return;
                        } else if (action === 'Open') {
                            // localFolderContents(fileUri);
                            console.log('Not implemented yet: Open local folder');
                            vscode.window.showWarningMessage('Not implemented yet: Open local folder');
                            return;
                        }
                    } else { // File
                        // Ask what to do with local file: Open, Copy, Compare ?
                        const action = await vscode.window.showQuickPick(['Open', 'Copy', 'Compare'],
                            {
                                title: `Choose action for ${label} ${filePath}`,
                                placeHolder: "",
                                canPickMany: false,
                                ignoreFocusOut: false
                            });
                        if (action == null) {  // cancelled
                            return;
                        } else if (action === 'Copy') {
                            console.log('Not implemented yet: Copy local file to remote');
                            vscode.window.showWarningMessage('Not implemented yet: Copy local file to remote');
                            return;
                        } else if (action === 'Compare') {
                            compareFileContents(fileUri, oppositeFileUri);
                            // vscode.commands.executeCommand(
                            //     "vscode.diff",
                            //     fileUri,
                            //     oppositeFileUri,
                            //     `${fileUri.path}`.split('/').pop() + ` (${oppositeLabel} ↔ ${label})`,  // Diff editor title
                            //     {
                            //         preview: false,
                            //         selection: null, // Don't select any text in the compare
                            //     }
                            // );
                            // console.log('Not implemented yet: Compare local file to remote');
                            // vscode.window.showWarningMessage('Not implemented yet: Compare local file to remote');
                            return;
                        } else if (action === 'Open') {
                            switch (ext) {
                                case '.docx':
                                case '.html':
                                case '.md':
                                    vscode.commands.executeCommand('vscode.open', fileUri);
                                    break;
                                case '.pdf':
                                case '.rtf':
                                    openFile(fileUri);
                                    break;
                                case '.sas7bdat':
                                case '.xpt':
                                case '.rds':
                                case '.csv':
                                case '.json':
                                case '.xlsx':
                                case '.xls':
                                    await vscode.commands.executeCommand("table-viewer.openFileInWebview", fileUri);
                                    break;
                                default:
                                    isBinary = await isBinaryFile(message.filePath);
                                    if (!isBinary) {
                                        // Open the local file in the editor
                                        const document = await vscode.workspace.openTextDocument(fileUri);
                                        vscode.window.showTextDocument(document);
                                    } else {
                                        if (os.platform() === 'win32') {
                                            openFile(fileUri);
                                        } else {
                                            vscode.commands.executeCommand('vscode.open', fileUri);
                                        }
                                    }
                                    break;
                            }
                        }
                    }
                } catch (error) {
                    console.log('(showTwoFoldersView) message:', message);
                    console.log(`Failed to open local file: ${error.message}`);
                    debugger;
                    vscode.window.showErrorMessage(
                        `Failed to open file: ${error.message}`
                    );
                }
            } else { // remote folder
                let oppositePathExists = false;
                const actions = [];
                if (oppositePathExists) {
                    actions.push('Compare');
                    actions.push('Copy (overwrite) ⚠');
                } else {
                    actions.push('Copy (new)');
                }
                try {
                    if (isFolder) { // remote subfolder
                        // Ask what to do with remote folder ?
                        actions.forEach((action, index) => {
                            if (action.indexOf('Download') >= 0) {
                                actions[index] = action.replace('Download', 'Download & Expand');
                            }
                        })
                        actions.push('Open');
                        const action = await vscode.window.showQuickPick(actions,
                            {
                                title: `Choose action for ${label} ${filePath}`,
                                placeHolder: "",
                                canPickMany: false,
                                ignoreFocusOut: false
                            });
                        if (action == null) {  // cancelled
                            return;
                             } else if (action === 'Compare') {
                                const miniContext = { extensionPath: context.extensionPath };
                                return compareFolderContents(fileUri, oppositeFileUri, miniContext);
                            //  } else if (action.split(' ')[0] === 'Download') {
                            //     const expand = /expand/i.test(action);
                            //     // return downloadFolderAsZip(localPath, config, expand, /overwrite/i.test(action));
                            //  } else if (action === 'Open') {
                            //     // if (localPath instanceof vscode.Uri) {
                            //     //    restApiFolderContents(localPath, null, config);
                            //     // } else {
                            //     //    restApiFolderContents(uriFromString(localPath), null, config);
                            //     // }
                        } else {
                            const msg = `(showTwoFoldersView) Action not yet implemented: ${action} for ${message?.config?.label} remote file: ${message.filePath}`;
                            console.log(msg);
                            vscode.window.showWarningMessage(msg);
                        }
                    } else {  // remote file

                        // fileUri = vscode.Uri.file(message.filePath);
                        ext = path.extname(message.filePath).toLowerCase();
                        // Ask what to do with remote file: download, compare to local, delete ?
                        actions.push('View');
                        if (oppositeFileUri) {
                            actions.push('Compare');
                        }
                        const action = await vscode.window.showQuickPick(actions,
                            {
                                title: `Choose action for ${label} ${filePath}`,
                                placeHolder: "",
                                canPickMany: false,
                                ignoreFocusOut: false
                            });
                        if (action == null) {  // cancelled
                            return;
                            //  } else if (action === 'Compare to Local') {
                            //     console.log(`(showTwoFoldersView) Calling restApiCompare(localPath=${localPath}, config=${beautify(JSON.stringify(config))})`);
                            //     return restApiCompare(localPath, config);
                            //  } else if (action.split(' ')[0] === 'Download') {
                            //     console.log(`(showTwoFoldersView) Calling restApiDownload(localPath=${localPath}, config=${beautify(JSON.stringify(config))}, overwrite=${/overwrite/i.test(action)})`);
                            //     return restApiDownload(localPath, config, /overwrite/i.test(action));
                            //  } else if (action === 'View') {
                            //     console.log(`(showTwoFoldersView) Calling restApiView(localPath=${localPath}, config=${beautify(JSON.stringify(config))})`);
                            //     return restApiView(localPath, config, message?.fileMd5sum);  // View remote file
                        } else if (action === 'Compare') {
                            compareFileContents(fileUri, oppositeFileUri);
                            return;
                        } else {
                            const msg = `(showTwoFoldersView) Action not yet implemented: ${action} for ${message?.config?.label} remote file: ${message.filePath}`;
                            console.log(msg);
                            vscode.window.showWarningMessage(msg);
                        }
                    }
                } catch (error) {
                    vscode.window.showErrorMessage(`Failed to open remote file: ${error.message}`);
                }

            }
        },
        undefined,
        undefined
    );

}


function highlightDiffs(value1, value2) {
    // Convert values to strings
    let str1 = String(value1);
    let str2 = String(value2);

    // Determine if the values are numeric
    const isNumeric1 = !isNaN(value1) && typeof value1 !== 'boolean';
    const isNumeric2 = !isNaN(value2) && typeof value2 !== 'boolean';

    // Handle numeric values with decimals
    if (isNumeric1 && isNumeric2) {
        const decimalPlaces1 = (str1.split('.')[1] || '').length;
        const decimalPlaces2 = (str2.split('.')[1] || '').length;
        const maxDecimalPlaces = Math.max(decimalPlaces1, decimalPlaces2);

        // Format both values to the same number of decimal places
        if (maxDecimalPlaces > 0) {
            str1 = Number(value1).toFixed(maxDecimalPlaces);
            str2 = Number(value2).toFixed(maxDecimalPlaces);
        }

        // Prepend spaces for numeric values
        const maxLength = Math.max(str1.length, str2.length);
        str1 = str1.padStart(maxLength, ' ');
        str2 = str2.padStart(maxLength, ' ');
    } else {
        // Handle non-numeric values by appending spaces
        const maxLength = Math.max(str1.length, str2.length);
        str1 = str1.padEnd(maxLength, ' ');
        str2 = str2.padEnd(maxLength, ' ');
    }

    // Find the first differing character
    let startDiffIndex = -1;
    let endDiffIndex = -1;
    for (let i = 0; i < Math.max(str1.length, str2.length); i++) {
        if (str1[i] !== str2[i]) {
            if (startDiffIndex === -1) {
                startDiffIndex = i; // Mark the start of the difference
            }
            endDiffIndex = i; // Update the end of the difference
        }
    }

    // If there is no difference, return the padded strings
    if (startDiffIndex === -1) {
        return [str1, str2];
    }

    // Highlight the differences
    str1 = `${str1.slice(0, startDiffIndex)}<b>${str1.slice(startDiffIndex, endDiffIndex + 1)}</b>${str1.slice(endDiffIndex + 1)}`;
    str2 = `${str2.slice(0, startDiffIndex)}<b>${str2.slice(startDiffIndex, endDiffIndex + 1)}</b>${str2.slice(endDiffIndex + 1)}`;

    return [str1, str2];
}


async function getTwoFoldersWebviewContent(bothFoldersContents, folder1, folder2) {
    if (!Array.isArray(bothFoldersContents) || bothFoldersContents.length === 0) {
        debugger;
        console.warn('(getTwoFoldersWebviewContent) No files found in both folders:', bothFoldersContents);
        return "<html><body><h2>No files found</h2></body></html>"; 
    }
    const folder1Path = pathFromUri(folder1, true);
    const folder2Path = pathFromUri(folder2, true);
    const folder1Exists = await existsUri(folder1, vscode.FileType.Directory);
    const folder2Exists = await existsUri(folder2, vscode.FileType.Directory);
    const folder1Label = (folder1.scheme === 'file' ?
        'Local' :
        `${folder1.authority} ${(folder1.scheme || '').replace('lsaf-', '')}`)
        + (folder1Exists ? "" : "❌");
    const folder2Label = (folder2.scheme === 'file' ?
        'Local' :
        `${folder2.authority} ${(folder2.scheme || '').replace('lsaf-', '')}`)
        + (folder2Exists ? "" : "❌");

    const textCompared = bothFoldersContents.filter(file => file.textCompare !== undefined).length > 0;

    const class1link = `${folder1Label}-link`.replaceAll(/\W/g, '-');
    const class2link = `${folder2Label}-link`.replaceAll(/\W/g, '-');
    return `
       <html>
          <head>
          <style>
             h2 {
                word-wrap: break-word; /* Ensures long strings break */
             }
             table {
                table-layout: fixed;
                width: 100%;
                border-collapse: separate;
                border-spacing: 3px 0; 
             }
             th, td {
                padding: 2px;
                text-align: left;
                border-bottom: 1px solid #ddd;
             }
             th {
                cursor: pointer;
             }
             /* Apply these styles to all cells in the first column */
             td:nth-child(1), th:nth-child(1), td:nth-child(6), th:nth-child(6) {
                overflow: hidden;
                white-space: nowrap;
                /*
                text-overflow: ellipsis;
                max-width: 30%; 
                */
             }
             td:nth-child(2), th:nth-child(2), td:nth-child(7), th:nth-child(7) { 
                text-align: end;  
             }
             td:nth-child(3), th:nth-child(3), td:nth-child(4), th:nth-child(4),
             td:nth-child(8), th:nth-child(8), td:nth-child(9), th:nth-child(9) { 
                overflow: hidden;
                white-space: nowrap;
                margin-right: 2px;
             }
          /* Assign proportional widths for local, remote, and spacer columns */
          .local-folder, .remote-folder, #local-folder, #remote-folder {
             width: 48%;
             white-space: normal;
             word-break: break-all;
             word-wrap: break-word;
          }
          .spacer {
             width: 4%; /* Spacer takes up 6% of the total table width */
             background-color: transparent;
             border: none; /* No border for the spacer */
             cursor: auto;
             text-align: center;
          }
          .folder-header {
             text-align: left;
             font-weight: bold;
          }
          .higher {
             color: #f08080; /* Higher values */
          }
          .lower {
             color: lightblue; /* Lower values */
          }
          .differ {
             color: brown; /* Lower values */
          }
          .refresh-btn {
             background-color: transparent;
             padding: 2px 2px;
             color: grey;
             border: none;
             border-radius: 4px;
             cursor: pointer;
          }
        .overlay-cell {
            position: relative;
            width: 50px;
            height: 50px;
            text-align: center;
            vertical-align: middle;
        }

        .overlay-cell .emoji1,
        .overlay-cell .emoji2 {
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            font-size: 1.5rem;
            cursor: pointer;
        }

        .overlay-cell .emoji2 {
            color: red; /* Optional: Different color for the second character */
            opacity: 0.7; /* Optional: Transparency for the second character */
            font-size: 0.7rem;
        }
          </style>
          </head>
          <body>
          <h2>${path.basename(folder1Path)}/ (${folder1Label} ↔ ${folder2Label})
             <button class="refresh-btn" id="refreshBtn">⭮</button>
             <span style="color: grey; font-size: 50%;">${new Date()}</span>
          </h2>
          <table id="folderTable">
             <colgroup>
                <col style="width: 25%;">
                <col style="width: 7%;">
                <col style="width: 9ch;">
                <col style="width: 6ch;">
                <col style="width: 2%;">
                <col style="width: 25%;">
                <col style="width: 7%;">
                <col style="width: 9ch;">
                <col style="width: 6ch;">
             </colgroup>
             <thead>
                <tr>
                   <!-- Headers for Local and Remote sections -->
                   <th colspan="4" id="local-folder" class="local-folder folder-header">${folder1Path + (folder1Exists ? "" : "❌")}</th>
                   <th class="spacer"></th> <!-- Spacer column between the two sections -->
                   <th colspan="4" id="remote-folder" class="remote-folder folder-header">${folder2Path + (folder2Exists ? "" : "❌")}</th>
                </tr>
                <tr>
                <th onclick="sortTable(0)">Name</th>
                <th onclick="sortTable(1)">Size</th>
                <th onclick="sortTable(2)">Last Modified</th>
                <th onclick="sortTable(3)">MD5sum</th>
                <th onclick="${textCompared ? "sortTable(4)" : "textCompare()"}" class="spacer overlay-cell">
                    <span class="emoji1">📄</span>
                    <span class="emoji2">🔍</span>
                </th>
                <th onclick="sortTable(5)">Name</th>
                <th onclick="sortTable(6)">Size</th>
                <th onclick="sortTable(7)">Last Modified</th>
                <th onclick="sortTable(8)">MD5sum</th>
                </tr>
             </thead>
             <tbody>
                ${bothFoldersContents
            .map(
                (file) => `
                   <tr>
                      <td><a href="#" class="${/\/$/.test(file.name1) ? 'folder-' : 'file-'}${class1link}" data-path="${file.name1}|${
                      joinPath(folder1, file.name1)}|${file.md5sum1}">${file.name1}</a></td>
                      <td${file.size1 !== file.size2 ? ' class="' + (file.size1 > file.size2 ? 'higher' : 'lower') + '"' : ''}>${
                      highlightDiffs(file.size1, file.size2)[0]}</td>
                      <td${file.mtime1 !== file.mtime2 ? ' class="' + (file.mtime1 > file.mtime2 ? 'higher' : 'lower') + '"' : ''}>${
                      highlightDiffs(file.mtime1, file.mtime2)[0]}</td>
                      <td${file.md5sum1 !== file.md5sum2 ? ' class="differ"' : ''}>${
                      highlightDiffs(file.md5sum1, file.md5sum2)[0]}</td>
                      <td class="spacer"><!-- Spacer column between the two sections -->
                      ${(/[^\/]$/.test(file.name1) && /[^\/]$/.test(file.name2) && (file.textCompare ?? "❔")) || ""}</td> 
                      <td><a href="#" class="${/\/$/.test(file.name2) ? 'folder-' : 'file-'}${class2link}" data-path="${file.name2}|${
                      joinPath(folder2, file.name2)}|${file.md5sum2}">${file.name2}</a></td>
                      <td${file.size1 !== file.size2 ? ' class="' + (file.size1 < file.size2 ? 'higher' : 'lower') + '"' : ''}>${
                      highlightDiffs(file.size1, file.size2)[1]}</td>
                      <td${file.mtime1 !== file.mtime2 ? ' class="' + (file.mtime1 < file.mtime2 ? 'higher' : 'lower') + '"' : ''}>${
                      highlightDiffs(file.mtime1, file.mtime2)[1]}</td>
                      <td${file.md5sum1 !== file.md5sum2 ? ' class="differ"' : ''}>${
                      highlightDiffs(file.md5sum1, file.md5sum2)[1]}</td>
                   </tr>
                   `
            )
            .join("")}
             </tbody>
          </table>
 
          <script>
             const vscode = acquireVsCodeApi();
 
             document.querySelectorAll('.file-${class1link}').forEach(link => {
                link.addEventListener('click', event => {
                event.preventDefault();
                const [fname, filePath, fileMd5sum] = event.target.getAttribute('data-path').split('|');
                msg = {
                   command: 'openFile',
                   fname,
                   filePath: filePath,
                   parent: '${folder1}',
                   oppositeParent: '${folder2}',
                   fileMd5sum: fileMd5sum
                };
                console.log('vscode.postMessage:', JSON.stringify(msg));
                vscode.postMessage(msg);
                });
             });
 
             document.querySelectorAll('.folder-${class1link}').forEach(link => {
                link.addEventListener('click', event => {
                event.preventDefault();
                const [fname, filePath, fileMd5sum] = event.target.getAttribute('data-path').split('|');
                msg = {
                   command: 'openSubFolder',
                   fname,
                   filePath: filePath,
                   parent: '${folder1}',
                   oppositeParent: '${folder2}',
                };
                console.log('vscode.postMessage:', JSON.stringify(msg));
                vscode.postMessage(msg);
                });
             });
 
             document.querySelectorAll('.file-${class2link}').forEach(link => {
                link.addEventListener('click', event => {
                event.preventDefault();
                const [fname, filePath, fileMd5sum] = event.target.getAttribute('data-path').split('|');
                msg = {
                   command: 'openFile',
                   fname,
                   filePath: filePath,
                   parent: '${folder2}',
                   oppositeParent: '${folder1}',
                   fileMd5sum: fileMd5sum
                };
                console.log('vscode.postMessage:', JSON.stringify(msg));
                vscode.postMessage(msg);
                });
             });
 
             document.querySelectorAll('.folder-${class2link}').forEach(link => {
                link.addEventListener('click', event => {
                event.preventDefault();
                const [fname, filePath, fileMd5sum] = event.target.getAttribute('data-path').split('|');
                msg = {
                   command: 'openSubFolder',
                   fname,
                   filePath: filePath,
                   parent: '${folder2}',
                   oppositeParent: '${folder1}',
                };
                console.log('vscode.postMessage:', JSON.stringify(msg));
                vscode.postMessage(msg);
                });
             });
 
             document.getElementById('refreshBtn').addEventListener('click', () => {
                vscode.postMessage({
                   command: 'refresh',
                   folder1: '${folder1}',
                   folder2: '${folder2}'
                });
             });

             function textCompare() {
                vscode.postMessage({
                   command: 'refresh',
                   folder1: '${folder1}',
                   folder2: '${folder2}',
                   textCompare: true,
                });
             }
 
             function sortTable(n) {
                const table = document.getElementById("folderTable");
                let switching = true, rows, i, x, y, xVal, yVal, shouldSwitch, dir = "asc", switchCount = 0;
                while (switching) {
                   switching = false;
                   rows = table.rows;
                   for (i = 2; i < (rows.length - 1); i++) {
                      shouldSwitch = false;
                      x = rows[i].getElementsByTagName("TD")[n];
                      y = rows[i + 1].getElementsByTagName("TD")[n];
                      xVal = (x?.textContent || '').trim().toLowerCase();
                      yVal = (y?.textContent || '').trim().toLowerCase();
 
                      // Check if both values are numeric
                      const xNum = xVal === '' ? -1 : parseFloat(xVal);
                      const yNum = yVal === '' ? -1 : parseFloat(yVal);
                      const bothNumeric = !isNaN(xNum) && !isNaN(yNum)  && !xVal.match(/[^\\d]/i);                     
 
                      if (dir === "asc") {
                         if (bothNumeric) {
                            if (xNum > yNum) {
                               shouldSwitch = true;
                               break;
                            }
                         } else {
                            if (xVal > yVal) {
                               shouldSwitch = true;
                               break;
                            }
                         }
                      } else if (dir === "desc") {
                         if (bothNumeric) {
                            if (xNum < yNum) {
                               shouldSwitch = true;
                               break;
                            }
                         } else {
                            if (xVal < yVal) {
                               shouldSwitch = true;
                               break;
                            }
                         }
                      }
                   }
                   if (shouldSwitch) {
                      rows[i].parentNode.insertBefore(rows[i + 1], rows[i]);
                      switching = true;
                      switchCount++;
                   } else {
                      if (switchCount === 0 && dir === "asc") {
                      dir = "desc";
                      switching = true;
                      }
                   }
                }
             }
 
          </script>
          </body>
       </html>
    `;
}

module.exports = {
    showTwoFoldersView,
    getTwoFoldersWebviewContent
};