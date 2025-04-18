const fs = require('fs');
const path = require('path');
const vscode = require('vscode');
const { createZip, extractZip } = require('../../src/zip');
const archiver = require('archiver');
const unzipper = require('unzipper');
const { Readable } = require('stream');

jest.mock('fs');
jest.mock('path');
jest.mock('vscode');
jest.mock('archiver');
jest.mock('unzipper');

describe('zip.js', () => {
    beforeEach(() => {
        jest.clearAllMocks();

        // Mock fs.lstatSync
        fs.lstatSync = jest.fn((filePath) => {
            return {
                isDirectory: () => filePath.endsWith('/'),
                isFile: () => !filePath.endsWith('/'),
            };
        });

        // Mock path.normalize to return the input
        path.normalize = jest.fn(input => input);
        
        // Mock path.basename
        path.basename = jest.fn(path => {
            const parts = path.split(/[\/\\]/);
            return parts[parts.length - 1];
        });

        // Mock vscode.Uri
        class MockUri {
            constructor(fsPath) {
                this.fsPath = fsPath;
                this.scheme = 'file';
                this.path = fsPath;
            }

            static file(filePath) {
                return new MockUri(filePath);
            }

            static joinPath(base, path) {
                return new MockUri(`${base.fsPath}/${path}`);
            }
        }
        vscode.Uri = MockUri;

        // Mock vscode.workspace.fs methods
        vscode.workspace.fs = {
            writeFile: jest.fn().mockResolvedValue(undefined),
            createDirectory: jest.fn().mockResolvedValue(undefined),
            stat: jest.fn().mockResolvedValue({}),
            readFile: jest.fn().mockResolvedValue(new Uint8Array([1, 2, 3])),
        };
    });

    test('createZip should create a zip file with given sources', async () => {
        // Setup mock output stream that triggers 'close' event
        const mockWriteStream = { 
            on: jest.fn((event, callback) => {
                if (event === 'close') {
                    // Simulate the close event being triggered after finalize
                    setTimeout(callback, 10); 
                }
                return mockWriteStream;
            }), 
            pipe: jest.fn() 
        };
        fs.createWriteStream.mockReturnValue(mockWriteStream);

        // Mock createReadStream
        fs.createReadStream = jest.fn().mockReturnValue(new Readable({
            read() {
                this.push(null); // End the stream immediately
            }
        }));

        // Setup mock archive
        const mockArchive = {
            pointer: jest.fn().mockReturnValue(100),
            pipe: jest.fn(),
            on: jest.fn(),
            append: jest.fn(),
            finalize: jest.fn().mockImplementation(() => {
                // Simulate async operation completion
                return Promise.resolve();
            }),
            file: jest.fn(),
            directory: jest.fn()
        };
        archiver.mockReturnValue(mockArchive);

        const sources = [
            vscode.Uri.file('/path/to/file1.txt'),
            vscode.Uri.file('/path/to/file2.txt'),
        ];
        const zipFilePath = 'output.zip';

        await createZip(sources, zipFilePath);

        expect(fs.createWriteStream).toHaveBeenCalledWith(zipFilePath);
        expect(mockArchive.pipe).toHaveBeenCalledWith(mockWriteStream);
        expect(mockArchive.finalize).toHaveBeenCalled();
    });

    test('extractZip should extract a zip file to a specified folder', async () => {
        const mockStream = new Readable();
        mockStream._read = () => { };
        mockStream.push(Buffer.from('test data'));
        mockStream.push(null);

        const mockDirectory = {
            files: [
                { path: 'file1.txt', type: 'File', stream: () => mockStream },
                { path: 'folder/', type: 'Directory' },
            ],
        };
        unzipper.Open.file.mockResolvedValue(mockDirectory);

        const zipFilePath = 'test.zip';
        const extractToPath = vscode.Uri.file('output');
        
        // Fix the startsWith issue by ensuring paths are properly normalized
        path.normalize.mockImplementation(path => path);

        await extractZip(zipFilePath, extractToPath);

        expect(unzipper.Open.file).toHaveBeenCalledWith(zipFilePath);
        expect(vscode.workspace.fs.writeFile).toHaveBeenCalled();
        expect(vscode.workspace.fs.createDirectory).toHaveBeenCalled();
    });
});