const fs = require("fs");
const path = require("path");
const vscode = require('vscode');
const { Readable } = require('stream');

const archiver = require('archiver');
const unzipper = require('unzipper');

/**
 * Helper function: Adds a file or directory to the archive.
 * @param {archiver.Archiver} archive - The archiver instance.
 * @param {vscode.Uri|string} source - The file or directory to add.
 * @param {string} subdirectory - The subdirectory path in the zip archive.
 */
async function addSourceToArchive(archive, source, subdirectory = '') {
    const uri = typeof source === 'string' ? vscode.Uri.parse(source) : source;

    if (uri.scheme === 'file') {
        // Local filesystem
        const stats = fs.lstatSync(uri.fsPath);
        if (stats.isDirectory()) {
            // Add local directory recursively
            archive.directory(uri.fsPath, subdirectory);
        } else if (stats.isFile()) {
            // Add local file
            archive.file(uri.fsPath, { name: subdirectory || path.basename(uri.fsPath) });
        }
    } else if (['lsaf-repo', 'lsaf-work'].includes(uri.scheme)) {
        // Remote filesystem with streaming capabilities
        const fileStream = await vscode.commands.executeCommand("vsce-lsaf-restapi-fs.getFileReadStream", uri);
        archive.append(fileStream, { name: subdirectory || path.basename(uri.path) });
    } else {
        // Remote filesystem without streaming capabilities
        const fileData = await vscode.workspace.fs.readFile(uri);
        archive.append(Buffer.from(fileData), { name: subdirectory || path.basename(uri.path) });
    }
}

// Function to create a zip file and add local or remote sources to it
// This function takes a single source or an array of sources (local or remote) and a zip file path
async function createZip(sources, zipFilePath) {
    return new Promise(async (resolve, reject) => {
        try {
            // Create a writable stream for the zip file
            const output = fs.createWriteStream(zipFilePath);

            // Create an archiver instance for zip format
            const archive = archiver('zip', {
                zlib: { level: 9 } // Maximum compression
            });

            // Handle stream events
            output.on('close', () => {
                console.log(`Zip file created at: ${zipFilePath} (${archive.pointer()} total bytes)`);
                resolve();
            });

            output.on('error', (err) => {
                console.error(`Failed to write zip file: ${err.message}`);
                reject(err);
            });

            archive.on('error', (err) => {
                console.error(`Archiver error: ${err.message}`);
                reject(err);
            });

            // Pipe the archive data to the file
            archive.pipe(output);

            // Normalize sources to an array
            if (!Array.isArray(sources)) {
                sources = [sources];
            }

            // Process each source
            for (const source of sources) {
                try {
                    await addSourceToArchive(archive, source, path.basename(source.path));
                } catch (err) {
                    console.error(`Failed to add source to archive: ${source}`, err.message);
                }
            }

            // Finalize the archive (flush remaining data)
            archive.finalize();
        } catch (err) {
            console.error(`Failed to create zip file: ${err.message}`);
            reject(err);
        }
    });
}

/**
 * Extracts a zip file to a specified folder.
 * @param {string|vscode.Uri} zipFilePath - The path to the zip file.
 * @param {string|vscode.Uri} extractToPath - The path to extract the contents to.
 * @param {boolean} overwrite - Whether to overwrite existing files (default: true).
 */
async function extractZip(zipFilePath, extractToPath, overwrite = true) {
    try {
        // Normalize paths
        if (!(extractToPath instanceof vscode.Uri)) {
            extractToPath = vscode.Uri.file(extractToPath);
        }

        // Extract the zip file
        let directory;
        if (zipFilePath instanceof vscode.Uri) {
            if (zipFilePath.scheme === 'file') {
                // Local file - use fsPath
                directory = await unzipper.Open.file(zipFilePath.fsPath);
            } else {
                // Remote file - get a stream and use it
                let zipStream;
                if (['lsaf-repo', 'lsaf-work'].includes(zipFilePath.scheme)) {
                    // Try to get a stream from command if available
                    try {
                        zipStream = await vscode.commands.executeCommand("vsce-lsaf-restapi-fs.getFileReadStream", zipFilePath);
                    } catch (err) {
                        console.log(`(extractZip) Failed to get stream from "vsce-lsaf-restapi-fs.getFileReadStream", using fallback for remote zip file: ${zipFilePath}`, err.message);
                        // Fall back to reading the entire file if streaming fails
                        const zipFileData = await vscode.workspace.fs.readFile(zipFilePath);
                        zipStream = Readable.from(zipFileData);
                    }
                } else {
                    // For other remote schemes, read the entire file
                    const zipFileData = await vscode.workspace.fs.readFile(zipFilePath);
                    zipStream = Readable.from(zipFileData);
                }
                
                // Use the stream to open the zip
                directory = await unzipper.Open.buffer(await streamToBuffer(zipStream));
            }
        } else {
            // String path to local file
            directory = await unzipper.Open.file(zipFilePath);
        }

        for (const file of directory.files) {
            const entryPath = vscode.Uri.joinPath(extractToPath, file.path);

            // Check for path traversal
            const normalizedEntryPath = path.normalize(entryPath.fsPath);
            const normalizedExtractToPath = path.normalize(extractToPath.fsPath);
            if (!normalizedEntryPath.startsWith(normalizedExtractToPath)) {
                throw new Error(`Path traversal detected: ${file.path}`);
            }

            // Check if the file or directory already exists
            let entryPathExists = false;
            if (!overwrite) {
                try {
                    await vscode.workspace.fs.stat(entryPath);
                    entryPathExists = true;
                } catch (error) {
                    if (error.code !== 'FileNotFound') {
                        throw error;
                    }
                }
            }

            if (overwrite || !entryPathExists) {
                if (file.type === 'Directory') {
                    // Create directory
                    await vscode.workspace.fs.createDirectory(entryPath);
                } else {
                    // Extract file
                    const fileStream = file.stream();
                    const chunks = [];
                    for await (const chunk of fileStream) {
                        chunks.push(chunk);
                    }
                    const fileData = Buffer.concat(chunks);
                    await vscode.workspace.fs.writeFile(entryPath, fileData);
                }
            } else {
                console.log(`(extractZip) Skipped extracting zip entry as target exists: ${entryPath.fsPath}`);
            }
        }
    } catch (err) {
        throw new Error(`Failed to extract zip: ${err.message}`);
    }
}

/**
 * Helper function to convert a stream to a buffer
 * @param {Readable} stream - The readable stream
 * @returns {Promise<Buffer>} The buffer containing stream data
 */
async function streamToBuffer(stream) {
    return new Promise((resolve, reject) => {
        const chunks = [];
        stream.on('data', (chunk) => chunks.push(chunk));
        stream.on('end', () => resolve(Buffer.concat(chunks)));
        stream.on('error', reject);
    });
}

module.exports = { createZip, extractZip, addSourceToArchive };
