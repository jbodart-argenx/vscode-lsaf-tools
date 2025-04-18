const vscode = require('vscode');
const fs = require('fs');
const path = require('path');
const beautify = require('js-beautify').js_beautify;
const isBinaryFile = require("isbinaryfile").isBinaryFile;

const { showMultiLineText } = require('./multiLineText.js');
const { showTwoFoldersView } = require('./showTwoFoldersView.js');
const { uriFromString, pathFromUri, existsUri } = require('./uri.js');
const { fileMD5sum, fileMD5sumStripBom } = require('./md5sum.js');


async function getFolderContents(folderUri) {
    if (!folderUri || !(folderUri instanceof vscode.Uri)) {
        vscode.window.showErrorMessage(`(getFolderContents) Invalid folder URI provided: ${folderUri}`);
        console.error('(getFolderContents) Invalid folder URI provided:', folderUri);
        throw new Error('Invalid folder URI provided.');
    }

    if (! await existsUri(folderUri, vscode.FileType.Directory)) {
        vscode.window.showErrorMessage(`(getFolderContents) Folder does not exist or is not a directory: ${pathFromUri(folderUri)}`);
        console.error(`(getFolderContents) Folder does not exist or is not a directory: ${pathFromUri(folderUri)}`);
        throw new Error(`(getFolderContents) Folder does not exist or is not a directory: ${pathFromUri(folderUri)}`);
    }

    let contents = [];
    try {
        if (["lsaf-repo", "lsaf-work"].includes(folderUri.scheme)) {
            contents = await vscode.commands.executeCommand(
                'vsce-lsaf-restapi-fs.getChildren',
                folderUri)
            contents = contents.map(entry => {
                let name = entry.name || `${entry.path}`.split(/[/\\]/).pop();
                let type = entry.type || entry.schemaType === "file" ? vscode.FileType.File : vscode.FileType.Directory;
                let mtime = entry.mtime || entry.lastModified;
                if (mtime) mtime = new Date(mtime).toISOString();
                let ctime = entry.ctime || entry.created;
                if (ctime) ctime = new Date(ctime).toISOString();
                return {
                    name: name,
                    type: type,
                    ...entry,
                    size: entry.size,
                    mtime: mtime,
                    ctime: ctime,
                    md5sum: (entry.md5sum || entry.md5 || entry.digest || '').toLowerCase(),
                };
            });
        } else if (folderUri.scheme === 'file') {
            contents = await fs.promises.readdir(folderUri.fsPath, { withFileTypes: true });
            // filter out '.' and '..' entries
            contents = contents.filter(entry => entry.name !== '.' && entry.name !== '..');
            // map to [name, type] pairs
            const contents_names_types = contents.map(entry => [entry.name, entry.isDirectory() ? vscode.FileType.Directory : vscode.FileType.File]);
            // get detailed information for each file or folder using 'fs'
            contents = await Promise.all(contents_names_types.map(async ([name, type]) => {
                const filePath = path.join(folderUri.fsPath, name);
                const fstat = await fs.promises.stat(filePath);
                let md5sum = '';
                let isBinary = null;
                if (type & vscode.FileType.File) {
                    isBinary = isBinaryFile(filePath);
                    if (isBinary) {
                        md5sum = await fileMD5sum(filePath);
                    } else {
                        md5sum = fileMD5sumStripBom(filePath);
                    }
                }
                return {
                    name,
                    type,
                    ...fstat,
                    size: fstat.size,
                    mtime: fstat.mtimeMs && new Date(fstat.mtimeMs).toISOString(),
                    ctime: fstat.ctimeMs && new Date(fstat.ctimeMs).toISOString(),
                    md5sum,
                    isBinary
                };
            }));
        } else {
            contents = await vscode.workspace.fs.readDirectory(folderUri);
            // get detailed information for each file or folder using vscode.workspace.fs
            contents = await Promise.all(contents.map(async ([name, type]) => {
                const fileUri = vscode.Uri.joinPath(folderUri, name);
                const stat = await vscode.workspace.fs.stat(fileUri);
                return {
                    name,
                    type,
                    ...stat,
                    size: stat.size,
                    mtime: stat.mtime && new Date(stat.mtime).toISOString(),
                    ctime: stat.ctime && new Date(stat.ctime).toISOString(),
                };
            }));
        }
    } catch (e) {
        debugger;
        console.error(`(getFolderContents) Error reading directory ${folderUri}:`, e.message);
        return [];
    }
    return contents;
}

async function textCompare(file1, file2) {
    // Read the files as text line by line
    // ignore empty lines and lines with only whitespace
    // ignore BOM and CRLF
    // if all relmaining lines are the same, return "⇔"
    // otherwise if all the lines are identical after trimming whitespace, return "≈"
    // otherwise return "≠"
    let file1Uri, file2Uri, contents1Buffer, contents1Text, contents2Buffer, contents2Text, identical, trimmedIdentical, i;
    try {
        file1Uri = uriFromString(file1);
        file2Uri = uriFromString(file2);
        if (file1Uri && file2Uri && (file1Uri instanceof vscode.Uri) && (file2Uri instanceof vscode.Uri)) {
            contents1Buffer = await vscode.workspace.fs.readFile(file1Uri);
            contents1Text = Buffer.from(contents1Buffer).toString('utf8').split(/\r?\n/).filter(line => line.trim() !== '');
            contents2Buffer = await vscode.workspace.fs.readFile(file2Uri);
            contents2Text = Buffer.from(contents2Buffer).toString('utf8').split(/\r?\n/).filter(line => line.trim() !== '');
            if (contents1Text.length !== contents2Text.length) {
                console.warn(`\nFiles text length differ:`, `\n${file1}: \n${contents1Text.length} lines`, `\n${file2}: \n${contents2Text.length} lines`);
                return "≠";
            }
            identical = true;
            trimmedIdentical = true;
            for (i = 0; i < contents1Text.length; i++) {
                if (contents1Text[i] !== contents2Text[i]) {
                    identical = false;
                    if (contents1Text[i].trim() !== contents2Text[i].trim()) {
                        trimmedIdentical = false;
                        break;
                    }
                }
            }
            if (identical) {
                return "⇔";
            }
            if (trimmedIdentical) {
                return "≈";
            }
            console.warn(`\nFiles text (trimmed) differ at line ${i}:`, `\n${file1}: \n${contents1Text[i].trim()}`, `\n${file2}: \n${contents2Text[i].trim()}`);
            return "≠";
        } else {
            return "❌"
        }
    } catch (e) {
        console.error(`Error comparing files ${file1} and ${file2}:`, e.message);
        debugger;
        return "❌";
    }
}

async function mergeFolderContents(contents1, contents2, doTextCompare = false, parents = []) {
    if (!Array.isArray(contents1) || !Array.isArray(contents2)) {
        debugger;
        vscode.window.showErrorMessage(`(mergeFolderContents) Error merging folder contents: ${contents1}, ${contents2}`);
        console.error('(mergeFolderContents) Error merging folder contents:', contents1, contents2);
        throw new Error('Error merging folder contents.');
    }
    if (contents1.length === 0 && contents2.length === 0) {
        debugger;
        return [];
    }
    const [folder1, folder2] = parents;
    let folder1Names = new Set([...(contents1.map(folder => folder.name))]);
    let folder2Names = new Set([...(contents2.map(folder => folder.name))]);
    let uniqueNames = new Set([...folder1Names, ...folder2Names]);
    const bothFoldersContents = [];
    uniqueNames.forEach(name => {
        const folder1index = contents1.findIndex(file => file.name === name);
        const folder2index = contents2.findIndex(file => file.name === name);
        bothFoldersContents.push(
            {
                name,
                type1: contents1[folder1index]?.type || vscode.FileType.Unknown,
                name1: (contents1[folder1index]?.name || '') + (contents1[folder1index]?.type === vscode.FileType.Directory ? "/" : ""),
                size1: contents1[folder1index]?.size || '',
                mtime1: contents1[folder1index]?.mtime || '',
                md5sum1: contents1[folder1index]?.md5sum || '',
                type2: contents2[folder2index]?.type || vscode.FileType.Unknown,
                name2: (contents2[folder2index]?.name || '') + (contents2[folder2index]?.type === vscode.FileType.Directory ? "/" : ""),
                size2: contents2[folder2index]?.size || '',
                mtime2: contents2[folder2index]?.mtime || '',
                md5sum2: contents2[folder2index]?.md5sum || contents2[folder2index]?.digest || '',
            })
    });
    if (doTextCompare) {
        const folder1Uri = uriFromString(folder1);
        const folder2Uri = uriFromString(folder2);
        if (!folder1Uri || !folder2Uri || !(folder1Uri instanceof vscode.Uri) || !(folder2Uri instanceof vscode.Uri)) {
            vscode.window.showErrorMessage(`(mergeFolderContents) Invalid folder URIs provided: ${folder1}, ${folder2} for doTextCompare = ${doTextCompare}`);
            console.error('(mergeFolderContents) Invalid folder URIs provided:', folder1, folder2, 'for doTextCompare =', doTextCompare);
            throw new Error('Invalid folder URIs provided.');
        }
        await Promise.allSettled(bothFoldersContents.map(async file => {
            if (!file?.type1 || !file?.type2) {
                file.textCompare = "";
                return;
            }
            if ((file.type1 & vscode.FileType.File) && (file.type2 & vscode.FileType.File)) {
                if (file.md5sum1 && file.md5sum2 && file.md5sum1 === file.md5sum2) {
                    file.textCompare = "⇔";
                } else {
                    file.textCompare = await textCompare(vscode.Uri.joinPath(folder1Uri, String(file.name)), vscode.Uri.joinPath(folder2Uri, String(file.name)));
                }
            } else {
                if (file.type1 === file.type2) {
                    file.textCompare = "";
                } else {
                    file.textCompare = "⚡";
                }
            }
        }));
    }
    if (!Array.isArray(bothFoldersContents)) {
        debugger;
        vscode.window.showErrorMessage(`(mergeFolderContents) Error merging folder contents: ${bothFoldersContents}`);
        console.error('(mergeFolderContents) Error merging folder contents:', bothFoldersContents);
        throw new Error('Error merging folder contents.');
    }
    return bothFoldersContents;
}



async function compareFileContents(file1, file2, logger = console) {
    const file1Uri = uriFromString(file1);
    const file2Uri = uriFromString(file2);
    try {
        const file1Label = file1Uri.scheme === 'file' ? 'Local' : `${file1Uri.authority} ${file1Uri.scheme.replace('lsaf-', '')}`;
        const file2Label = file2Uri.scheme === 'file' ? 'Local' : `${file2Uri.authority} ${file2Uri.scheme.replace('lsaf-', '')}`;
        await vscode.commands.executeCommand(
            "vscode.diff",
            file2Uri,  // left file, non-editable (original)
            file1Uri,      // right file, editable (modified)
            //`${oppositeEndpointUri} ↔ ${fileOrFolderUri}`,  // Diff editor title
            `${file1Uri.path}`.split('/').pop() + ` (${file2Label} ↔ ${file1Label})`,  // Diff editor title
            {
                preview: false,   // ensures the diff editor remains open until explicitly closed.
                selection: null,  // No specific selection is highlighted in the diff editor.
            }
        );
        vscode.window.showInformationMessage(`Compared ${file1} to ${file2}`);
        logger.log(`(compareToOppositeEndpoint) Compared ${file1} to ${file2}`);
    } catch (error) {
        vscode.window.showErrorMessage(`Error comparing ${file1} to ${file2}: ${error.message}`);
        logger.error(`(compareToOppositeEndpoint) Error comparing ${file1} to ${file2}: ${error.message}`);
    }
}


async function compareFolderContents(folder1, folder2, context, textCompare = false, logger = console) {
    const folderUri1 = uriFromString(folder1);
    const folderUri2 = uriFromString(folder2);

    if (!folderUri1 || !folderUri2
        || !(folderUri1 instanceof vscode.Uri)
        || !(folderUri2 instanceof vscode.Uri)) {
        vscode.window.showErrorMessage(`Invalid folder URIs provided: ${folder1}, ${folder2}`);
        logger.error('Invalid folder URIs provided:\n - folderUri1:', folderUri1, "\n - folderUri2:", folderUri2);
        throw new Error('Invalid folder URIs provided.');
    }

    if (! await existsUri(folderUri1, vscode.FileType.Directory)) {
        vscode.window.showErrorMessage(`Folder 1 does not exist or is not a directory: ${pathFromUri(folderUri1)}`);
        logger.error(`Folder 1 does not exist or is not a directory: ${pathFromUri(folderUri1)}`);
        throw new Error(`Folder 1 does not exist or is not a directory: ${pathFromUri(folderUri1)}`);
    }
    if (! await existsUri(folderUri2, vscode.FileType.Directory)) {
        vscode.window.showErrorMessage(`Folder 2 does not exist or is not a directory: ${pathFromUri(folderUri2)}`);
        logger.error(`Folder 2 does not exist or is not a directory: ${pathFromUri(folderUri2)}`);
        throw new Error(`Folder 2 does not exist or is not a directory: ${pathFromUri(folderUri2)}`);
    }

    let [contents1, contents2] = await Promise.all([folderUri1, folderUri2].map(getFolderContents));

    logger.log('Contents of folder 1:', contents1);
    logger.log('Contents of folder 2:', contents2);

    const bothFoldersContents = await mergeFolderContents(contents1, contents2, textCompare)
    const bothFoldersContentsText = beautify(JSON.stringify(bothFoldersContents), {
        indent_size: 2,
        space_in_empty_paren: true,
    });
    const webViewReady = true;
    if (webViewReady) {
        showTwoFoldersView(bothFoldersContents, folder1, folder2, context);
    } else {
        showMultiLineText(bothFoldersContentsText,
            "Both Folders Contents", `Local folder: ${folder1}, Remote folder: ${folder2}`);
    }

    return [contents1, contents2];
}


module.exports = {
    getFolderContents,
    mergeFolderContents,
    compareFolderContents,
    compareFileContents,
    textCompare,
};