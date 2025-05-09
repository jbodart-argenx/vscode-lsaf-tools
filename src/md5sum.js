const fs = require("fs");
const crypto = require("crypto");

// Function to calculate MD5 checksum of a file
async function fileMD5sum(inputFile /*: string*/) /*: Promise<string>*/ {
    const vscode = require('vscode'); // Import vscode here to avoid circular dependency
    const { uriFromString } = require("./uri.js");
    
    const fileUri = uriFromString(inputFile);
    return new Promise(async (resolve, reject) => {
        const hash = crypto.createHash('md5');
        const fileStream = fileUri?.scheme === 'file' ?
            fs.createReadStream(fileUri.fsPath) :
            ['lsaf-repo', 'lsaf-work'].includes(fileUri?.scheme) ?
                await vscode.commands.executeCommand("vsce-lsaf-restapi-fs.getFileReadStream", fileUri) :
                fs.createReadStream(await vscode.commands.executeCommand("vsce-lsaf-restapi-fs.getFileReadCachedUri", fileUri).fsPath);

        // Handle file read errors
        fileStream.on('error', (err) => {
            reject(err);
        });

        // Update hash with data from the file stream
        fileStream.on('data', (data) => {
            hash.update(data);
        });

        // Once the file has been read, finalize and return the hash
        fileStream.on('end', () => {
            const md5sum = hash.digest('hex'); // Calculate the final MD5 hash as a hex string
            resolve(md5sum);
        });
    });
}


// Function to convert Windows line endings to Unix line endings, strip BOM, and compute MD5 checksum
function fileMD5sumStripBom(inputFile) {
    fs.readFile(inputFile, async (err, data) => {
        if (err) {
            console.error('Error reading the file:', err);
            return;
        }
        // Use dynamic import
        const stripBomBuf = await import('strip-bom-buf').then(module => module.default);

        // Remove BOM if present
        data = stripBomBuf(data);

        // Replace Windows line endings (CRLF) with Unix line endings (LF)
        data = Buffer.from(data.filter(byte => byte !== 0x0D));

        // Compute MD5 checksum
        const hash = crypto.createHash('md5').update(data).digest('hex');

        console.log(`MD5 checksum: ${hash}`);
    });
}

module.exports = { fileMD5sumStripBom, fileMD5sum };
