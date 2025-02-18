const sinon = require('sinon');
const vscode = require('vscode');
const { getOppositeEndpointUri } = require('../../src/utils.js');

suite('getFileOrFolderUri', () => {
   let expect;
   let getFileOrFolderUri;
   let sandbox;

   suiteSetup(async () => {
      // Dynamically import chai and the function to be tested
      const chai = await import('chai');
      expect = chai.expect;
      ({ getFileOrFolderUri } = await import('../../src/utils.js'));
   });

   setup(() => {
      sandbox = sinon.createSandbox();
   });

   teardown(() => {
      sandbox.restore();
   });

   test('should return an array of URIs when fileOrFolder is an array of strings', () => {
      const uris = ['file:///path/to/file1', 'file:///path/to/file2'];
      const result = getFileOrFolderUri(uris);
      expect(result).to.be.an('array');
      expect(result).to.have.lengthOf(2);
      result.forEach(uri => {
         expect(uri).to.be.an.instanceof(vscode.Uri);
      });
   });

   test('should return an array of URIs when fileOrFolder is an array of vscode.Uri', () => {
      const uris = [vscode.Uri.file('/path/to/file1'), vscode.Uri.file('/path/to/file2')];
      const result = getFileOrFolderUri(uris);
      expect(result).to.be.an('array');
      expect(result).to.have.lengthOf(2);
      result.forEach(uri => {
         expect(uri).to.be.an.instanceof(vscode.Uri);
      });
   });

   test('should return a single URI when fileOrFolder is a single vscode.Uri', () => {
      const uri = vscode.Uri.file('/path/to/file');
      const result = getFileOrFolderUri(uri);
      expect(result).to.be.an.instanceof(vscode.Uri);
      expect(result.toString()).to.equal(uri.toString());
   });

   test('should return the active text editor URI when fileOrFolder is null and activeTextEditor is defined', () => {
      const mockUri = vscode.Uri.file('/path/to/active/file');
      sandbox.stub(vscode.window, 'activeTextEditor').value({ document: { uri: mockUri } });

      const result = getFileOrFolderUri(null);
      expect(result).to.equal(mockUri);
      expect(result).to.be.an.instanceof(vscode.Uri);
   });

   test('should return the active editor document URI when fileOrFolder is null and activeEditor.document.uri is defined', function () {
      if (!vscode.window.activeEditor) {
         this.skip(); // Skip the test if activeEditor is not defined
      }

      const mockUri = vscode.Uri.file('/path/to/active/file');
      sandbox.stub(vscode.window, 'activeEditor').value({ document: { uri: mockUri } });

      const result = getFileOrFolderUri(null);
      expect(result).to.equal(mockUri);
      expect(result).to.be.an.instanceof(vscode.Uri);
   });

   test('should return a URI when fileOrFolder is a string', () => {
      const uriString = 'file:///path/to/file';
      const result = getFileOrFolderUri(uriString);
      expect(result).to.be.an.instanceof(vscode.Uri);
      expect(result.toString()).to.equal(uriString);
   });

   test('should return null when fileOrFolder is undefined', () => {
      const result = getFileOrFolderUri(undefined);
      expect(result).to.be.null;
   });

   test('should return a file URI when fileOrFolder is an invalid string', () => {
      const result = getFileOrFolderUri('invalid-uri');
      expect(result).to.be.an.instanceof(vscode.Uri);
      expect(result.scheme).to.equal('file');
   });

   test('should return null when fileOrFolder is an empty string', () => {
      const result = getFileOrFolderUri('');
      expect(result).to.be.null;
   });
});



suite('copyFileOrFolderUri', () => {
   let expect;
   let copyFileOrFolderUri;
   let sandbox;
   let mockShowInformationMessage;
   let mockCopyToClipboard;
   let mockGetFileOrFolderUri;

   suiteSetup(async () => {
      // Dynamically import chai and the function to be tested
      const chai = await import('chai');
      expect = chai.expect;
      ({ copyFileOrFolderUri } = await import('../../src/utils.js'));
   });

   setup(() => {
      sandbox = sinon.createSandbox();
      mockShowInformationMessage = sandbox.stub(vscode.window, 'showInformationMessage');
      mockCopyToClipboard = sandbox.stub();
      mockGetFileOrFolderUri = sandbox.stub();
   });

   teardown(() => {
      sandbox.restore();
   });

   test('should show information message when fileOrFolder is not provided', async () => {
      await copyFileOrFolderUri(null, mockGetFileOrFolderUri, mockCopyToClipboard);
      expect(mockShowInformationMessage.calledOnce).to.be.true;
      expect(mockShowInformationMessage.firstCall.args[0]).to.include('no file or folder specified');
   });

   test('should call copyToClipboard with URIs when fileOrFolder is an array of strings', async () => {
      const uris = ['file:///path/to/file1', 'file:///path/to/file2'];
      mockGetFileOrFolderUri.callsFake(uri => vscode.Uri.parse(uri));
      await copyFileOrFolderUri(uris, mockGetFileOrFolderUri, mockCopyToClipboard);
      expect(mockCopyToClipboard.calledOnce).to.be.true;
      expect(mockCopyToClipboard.firstCall.args[0]).to.deep.equal(uris);
   });

   test('should call copyToClipboard with URIs when fileOrFolder is a single string', async () => {
      const uri = 'file:///path/to/file';
      mockGetFileOrFolderUri.callsFake(uri => vscode.Uri.parse(uri));
      await copyFileOrFolderUri(uri, mockGetFileOrFolderUri, mockCopyToClipboard);
      expect(mockCopyToClipboard.calledOnce).to.be.true;
      expect(mockCopyToClipboard.firstCall.args[0]).to.deep.equal([uri]);
   });

   test('should call copyToClipboard with URIs when fileOrFolder is an array of vscode.Uri', async () => {
      const uris = [vscode.Uri.file('/path/to/file1'), vscode.Uri.file('/path/to/file2')];
      mockGetFileOrFolderUri.callsFake(uri => uri);
      await copyFileOrFolderUri(uris, mockGetFileOrFolderUri, mockCopyToClipboard);
      expect(mockCopyToClipboard.calledOnce).to.be.true;
      expect(mockCopyToClipboard.firstCall.args[0]).to.deep.equal(uris.map(uri => uri.toString()));
   });

   test('should call copyToClipboard with URIs when fileOrFolder is a single vscode.Uri', async () => {
      const uri = vscode.Uri.file('/path/to/file');
      mockGetFileOrFolderUri.callsFake(uri => uri);
      await copyFileOrFolderUri(uri, mockGetFileOrFolderUri, mockCopyToClipboard);
      expect(mockCopyToClipboard.calledOnce).to.be.true;
      expect(mockCopyToClipboard.firstCall.args[0]).to.deep.equal([uri.toString()]);
   });

   test('should call copyToClipboard with active editor URI when fileOrFolder is not provided and activeTextEditor is defined', async () => {
      const mockUri = vscode.Uri.file('/path/to/active/file');
      sandbox.stub(vscode.window, 'activeTextEditor').value({ document: { uri: mockUri } });
      mockGetFileOrFolderUri.callsFake(() => mockUri);
      await copyFileOrFolderUri(null, mockGetFileOrFolderUri, mockCopyToClipboard);
      expect(mockCopyToClipboard.calledOnce).to.be.true;
      expect(mockCopyToClipboard.firstCall.args[0]).to.deep.equal([mockUri.toString()]);
   });
});

suite('getOppositeEndpointUri', () => {
   let expect;
   let sandbox;
   let mockShowInformationMessage;
   let mockShowWarningMessage;
   let mockShowQuickPick;
   let mockGetFileOrFolderUri;
   let mockGetDefaultEndpoints;

   suiteSetup(async () => {
      const chai = await import('chai');
      expect = chai.expect;
   });

   setup(() => {
      sandbox = sinon.createSandbox();
      mockShowInformationMessage = sandbox.stub(vscode.window, 'showInformationMessage');
      mockShowWarningMessage = sandbox.stub(vscode.window, 'showWarningMessage');
      mockShowQuickPick = sandbox.stub(vscode.window, 'showQuickPick');
      mockGetFileOrFolderUri = sandbox.stub();
      mockGetDefaultEndpoints = sandbox.stub();
   });

   teardown(() => {
      sandbox.restore();
   });

   test('should show information message when fileOrFolder is not provided', async () => {
      await getOppositeEndpointUri(null, mockGetDefaultEndpoints);
      expect(mockShowInformationMessage.calledOnce).to.be.true;
      expect(mockShowInformationMessage.firstCall.args[0]).to.include('no file or folder specified');
   });

   test('should return null when no endpoints are defined', async () => {
      mockGetDefaultEndpoints.returns([]);
      const result = await getOppositeEndpointUri('file:///path/to/file', mockGetDefaultEndpoints);
      expect(result).to.be.null;
      expect(mockShowWarningMessage.calledOnce).to.be.true;
      expect(mockShowWarningMessage.firstCall.args[0]).to.include('no endpoints defined');
   });

   test('should return opposite endpoint URIs', async () => {
      const endpoints = [
         { uri: vscode.Uri.parse('file:///endpoint1'), label: 'Endpoint 1' },
         { uri: vscode.Uri.parse('file:///endpoint2'), label: 'Endpoint 2' }
      ];
      mockGetDefaultEndpoints.returns(endpoints);
      mockShowQuickPick.resolves('Endpoint 2');
      mockGetFileOrFolderUri.callsFake(uri => vscode.Uri.parse(uri));

      const result = await getOppositeEndpointUri('file:///endpoint1/path/to/file', mockGetDefaultEndpoints);
      expect(result).to.be.an('array');
      expect(result[0] ? result[0].toString() : '').to.include('file:///endpoint2/path/to/file');
   });
});



suite('getLsafPath', () => {
   let expect;
   let getLsafPath;
   let sandbox;
   let mockShowInformationMessage;
   let mockShowWarningMessage;
   let mockGetFileOrFolderUri;
   let mockGetDefaultEndpoints;

   suiteSetup(async () => {
      const chai = await import('chai');
      expect = chai.expect;
      ({ getLsafPath } = await import('../../src/utils.js'));
   });

   setup(() => {
      sandbox = sinon.createSandbox();
      mockShowInformationMessage = sandbox.stub(vscode.window, 'showInformationMessage');
      mockShowWarningMessage = sandbox.stub(vscode.window, 'showWarningMessage');
      mockGetFileOrFolderUri = sandbox.stub();
      mockGetDefaultEndpoints = sandbox.stub();
   });

   teardown(() => {
      sandbox.restore();
   });

   test('should show information message when fileOrFolder is not provided', async () => {
      await getLsafPath(null, mockGetDefaultEndpoints);
      expect(mockShowInformationMessage.calledOnce).to.be.true;
      expect(mockShowInformationMessage.firstCall.args[0]).to.include('no file or folder specified');
   });

   test('should return null when fileOrFolderUri is not retrieved', async () => {
      mockGetFileOrFolderUri.returns(null);
      const result = await getLsafPath('invalid-uri', mockGetDefaultEndpoints);
      expect(result).to.be.null;
      expect(mockShowWarningMessage.calledOnce).to.be.true;
      expect(mockShowWarningMessage.firstCall.args[0]).to.include('no matching endpoint found');
   });

   test('should return null when no endpoints are defined', async () => {
      mockGetDefaultEndpoints.returns([]);
      mockGetFileOrFolderUri.returns(vscode.Uri.parse('file:///path/to/file'));
      const result = await getLsafPath('file:///path/to/file', mockGetDefaultEndpoints);
      expect(result).to.be.null;
      expect(mockShowWarningMessage.calledOnce).to.be.true;
      expect(mockShowWarningMessage.firstCall.args[0]).to.include('no matching endpoint found');
   });

   test('should return null when no matching endpoint is found', async () => {
      const endpoints = [
         { uri: vscode.Uri.parse('file:///endpoint1'), label: 'Endpoint 1' }
      ];
      mockGetDefaultEndpoints.returns(endpoints);
      mockGetFileOrFolderUri.returns(vscode.Uri.parse('file:///path/to/file'));
      const result = await getLsafPath('file:///path/to/file', mockGetDefaultEndpoints);
      expect(result).to.be.null;
      expect(mockShowWarningMessage.calledOnce).to.be.true;
      expect(mockShowWarningMessage.firstCall.args[0]).to.include('no matching endpoint found');
   });

   test('should return LSAF path when matching endpoint is found', async () => {
      const endpoints = [
         { uri: vscode.Uri.parse('file:///endpoint1'), label: 'Endpoint 1' }
      ];
      mockGetDefaultEndpoints.returns(endpoints);
      mockGetFileOrFolderUri.returns(vscode.Uri.parse('file:///endpoint1/path/to/file'));
      const result = await getLsafPath('file:///endpoint1/path/to/file', mockGetDefaultEndpoints);
      expect(result).to.equal('/path/to/file');
      expect(mockShowInformationMessage.calledOnce).to.be.true;
      expect(mockShowInformationMessage.firstCall.args[0]).to.include('LSAF path for file:///endpoint1/path/to/file is /path/to/file');
   });


   test('should return LSAF paths for an array of fileOrFolder', async () => {
      const endpoints = [
         { uri: vscode.Uri.parse('file:///endpoint1'), label: 'Endpoint 1' }
      ];
      mockGetDefaultEndpoints.returns(endpoints);
      mockGetFileOrFolderUri.callsFake(uri => vscode.Uri.parse(uri));
      const fileOrFolders = ['file:///endpoint1/path/to/file1', 'file:///endpoint1/path/to/file2'];
      const result = await getLsafPath(fileOrFolders, mockGetDefaultEndpoints);
      expect(result).to.be.an('array');
      expect(result).to.have.lengthOf(2);
      expect(result[0]).to.equal('/path/to/file1');
      expect(result[1]).to.equal('/path/to/file2');
   });
});


suite('getLocalPath', () => {
   let expect;
   let getLocalPath;
   let sandbox;
   let mockShowInformationMessage;
   let mockShowWarningMessage;
   let mockShowQuickPick;
   let mockGetFileOrFolderUri;
   let mockGetDefaultEndpoints;

   suiteSetup(async () => {
      const chai = await import('chai');
      expect = chai.expect;
      ({ getLocalPath } = await import('../../src/utils.js'));
   });

   setup(() => {
      sandbox = sinon.createSandbox();
      mockShowInformationMessage = sandbox.stub(vscode.window, 'showInformationMessage');
      mockShowWarningMessage = sandbox.stub(vscode.window, 'showWarningMessage');
      mockShowQuickPick = sandbox.stub(vscode.window, 'showQuickPick');
      mockGetFileOrFolderUri = sandbox.stub();
      mockGetDefaultEndpoints = sandbox.stub();
   });

   teardown(() => {
      sandbox.restore();
   });

   test('should show information message when fileOrFolder is not provided', async () => {
      await getLocalPath(null, mockGetDefaultEndpoints);
      expect(mockShowInformationMessage.calledOnce).to.be.true;
      expect(mockShowInformationMessage.firstCall.args[0]).to.include('no file or folder specified');
   });

   test('should return null when fileOrFolderUri is not retrieved', async () => {
      mockGetFileOrFolderUri.returns(null);
      const result = await getLocalPath('invalid-uri', mockGetDefaultEndpoints);
      expect(result).to.be.null;
      expect(mockShowWarningMessage.calledOnce).to.be.true;
      expect(mockShowWarningMessage.firstCall.args[0]).to.include('no local endpoints found');
   });

   test('should return null when no endpoints are defined', async () => {
      mockGetDefaultEndpoints.returns([]);
      mockGetFileOrFolderUri.returns(vscode.Uri.parse('file:///path/to/file'));
      const result = await getLocalPath('file:///path/to/file', mockGetDefaultEndpoints);
      expect(result).to.be.null;
      expect(mockShowWarningMessage.calledOnce).to.be.true;
      expect(mockShowWarningMessage.firstCall.args[0]).to.include('no local endpoints found');
   });

   test('should return null when no local endpoints are found', async () => {
      const endpoints = [
         { uri: vscode.Uri.parse('http:///endpoint1'), label: 'Endpoint 1' }
      ];
      mockGetDefaultEndpoints.returns(endpoints);
      mockGetFileOrFolderUri.returns(vscode.Uri.parse('file:///path/to/file'));
      const result = await getLocalPath('file:///path/to/file', mockGetDefaultEndpoints);
      expect(result).to.be.null;
      expect(mockShowWarningMessage.calledOnce).to.be.true;
      expect(mockShowWarningMessage.firstCall.args[0]).to.include('no local endpoints found');
   });

   test('should return local path when matching local endpoint is found', async () => {
      const endpoints = [
         { uri: vscode.Uri.parse('file:///endpoint1'), label: 'Endpoint 1' }
      ];
      mockGetDefaultEndpoints.returns(endpoints);
      mockGetFileOrFolderUri.returns(vscode.Uri.parse('file:///endpoint1/path/to/file'));
      const result = await getLocalPath('file:///endpoint1/path/to/file', mockGetDefaultEndpoints);
      if (process.platform === 'win32') {
         expect(result).to.equal('\\endpoint1\\path\\to\\file');
         expect(mockShowInformationMessage.firstCall.args[0]).to.include('Local path(s) for:\nfile:///endpoint1/path/to/file\n is/are: \\endpoint1\\path\\to\\file');
      } else {
         expect(result).to.equal('/endpoint1/path/to/file');
         expect(mockShowInformationMessage.firstCall.args[0]).to.include('Local path(s) for:\nfile:///endpoint1/path/to/file\n is/are: /endpoint1/path/to/file');
      }
      expect(mockShowInformationMessage.calledOnce).to.be.true;
   });

   test('should return local paths below single local endpoint for an array of fileOrFolder', async () => {
      const endpoints = [
         { uri: vscode.Uri.parse('file:///endpoint1'), label: 'Endpoint 1' }
      ];
      mockGetDefaultEndpoints.returns(endpoints);
      mockGetFileOrFolderUri.callsFake(uri => vscode.Uri.parse(uri));
      const fileOrFolders = ['file:///endpoint1/path/to/file1', 'file:///endpoint1/path/to/file2'];
      const result = await getLocalPath(fileOrFolders, mockGetDefaultEndpoints);
      expect(result).to.be.an('array');
      expect(result).to.have.lengthOf(2);
      if (process.platform === 'win32') {
         expect(result[0]).to.equal('\\endpoint1\\path\\to\\file1');
         expect(result[1]).to.equal('\\endpoint1\\path\\to\\file2');
      } else {
         expect(result[0]).to.equal('/endpoint1/path/to/file1');
         expect(result[1]).to.equal('/endpoint1/path/to/file2');
      }
   });

   test('should return null when none of multiple local endpoints is selected', async () => {
      const endpoints = [
         { uri: vscode.Uri.parse('file:///endpoint1'), label: 'Endpoint 1' },
         { uri: vscode.Uri.parse('file:///endpoint2'), label: 'Endpoint 2' }
      ];
      mockGetDefaultEndpoints.returns(endpoints);
      mockShowQuickPick.resolves(null);
      mockGetFileOrFolderUri.returns(vscode.Uri.parse('file:///endpoint1/path/to/file'));
      const result = await getLocalPath('file:///endpoint1/path/to/file', mockGetDefaultEndpoints);
      expect(result).to.be.null;
      expect(mockShowWarningMessage.calledOnce).to.be.true;
      expect(mockShowWarningMessage.firstCall.args[0]).to.include('no local endpoint found');
   });

   test('should return local path below selected endpoint when one of multiple local endpoints is selected', async () => {
      const endpoints = [
         { uri: vscode.Uri.parse('file:///endpoint1'), label: 'Endpoint 1' },
         { uri: vscode.Uri.parse('file:///endpoint2'), label: 'Endpoint 2' }
      ];
      mockGetDefaultEndpoints.returns(endpoints);
      mockShowQuickPick.resolves('Endpoint 2');
      mockGetFileOrFolderUri.returns(vscode.Uri.parse('file:///endpoint1/path/to/file'));
      const result = await getLocalPath('file:///endpoint1/path/to/file', mockGetDefaultEndpoints);
      if (process.platform === 'win32') {
         expect(result).to.equal('\\endpoint2\\path\\to\\file');
         expect(mockShowInformationMessage.firstCall.args[0]).to.include('Local path(s) for:\nfile:///endpoint1/path/to/file\n is/are: \\endpoint2\\path\\to\\file');
      } else {
         expect(result).to.equal('/endpoint2/path/to/file');
         expect(mockShowInformationMessage.firstCall.args[0]).to.include('Local path(s) for:\nfile:///endpoint1/path/to/file\n is/are: /endpoint2/path/to/file');
      }
      expect(mockShowInformationMessage.calledOnce).to.be.true;
   });
});



suite('enterMultiLineComment', () => {
   let expect;
   let enterMultiLineComment;
   let sandbox;
   let mockGetMultiLineInput;

   suiteSetup(async () => {
      const chai = await import('chai');
      expect = chai.expect;
      ({ enterMultiLineComment } = await import('../../src/utils.js'));
   });

   setup(() => {
      sandbox = sinon.createSandbox();
      mockGetMultiLineInput = sandbox.stub();
   });

   teardown(() => {
      sandbox.restore();
   });

   test('should return the entered comment when user input is provided', async () => {
      const userInput = 'This is a test comment';
      mockGetMultiLineInput.resolves(userInput);

      const result = await enterMultiLineComment('default value', 'Enter your comment', mockGetMultiLineInput);
      expect(result).to.equal(userInput);
      expect(mockGetMultiLineInput.calledOnce).to.be.true;
      expect(mockGetMultiLineInput.firstCall.args[0]).to.equal('default value');
      expect(mockGetMultiLineInput.firstCall.args[1]).to.equal('Enter your comment');
   });

   test('should return null when user input is empty', async () => {
      const userInput = '   ';
      mockGetMultiLineInput.resolves(userInput);

      const result = await enterMultiLineComment('default value', 'Enter your comment', mockGetMultiLineInput);
      expect(result).to.equal('');
      expect(mockGetMultiLineInput.calledOnce).to.be.true;
      expect(mockGetMultiLineInput.firstCall.args[0]).to.equal('default value');
      expect(mockGetMultiLineInput.firstCall.args[1]).to.equal('Enter your comment');
   });

   test('should return null when user input is not provided', async () => {
      mockGetMultiLineInput.resolves('');

      const result = await enterMultiLineComment('default value', 'Enter your comment', mockGetMultiLineInput);
      expect(result).to.equal('');
      expect(mockGetMultiLineInput.calledOnce).to.be.true;
      expect(mockGetMultiLineInput.firstCall.args[0]).to.equal('default value');
      expect(mockGetMultiLineInput.firstCall.args[1]).to.equal('Enter your comment');
   });

   test('should return the entered comment when default value is empty', async () => {
      const userInput = 'This is a test comment';
      mockGetMultiLineInput.resolves(userInput);

      const result = await enterMultiLineComment('', 'Enter your comment', mockGetMultiLineInput);
      expect(result).to.equal(userInput);
      expect(mockGetMultiLineInput.calledOnce).to.be.true;
      expect(mockGetMultiLineInput.firstCall.args[0]).to.equal('');
      expect(mockGetMultiLineInput.firstCall.args[1]).to.equal('Enter your comment');
   });

   test('should return the entered comment when info is not provided', async () => {
      const userInput = 'This is a test comment';
      mockGetMultiLineInput.resolves(userInput);

      const result = await enterMultiLineComment('default value', undefined, mockGetMultiLineInput);
      expect(result).to.equal(userInput);
      expect(mockGetMultiLineInput.calledOnce).to.be.true;
      expect(mockGetMultiLineInput.firstCall.args[0]).to.equal('default value');
      expect(mockGetMultiLineInput.firstCall.args[1]).to.be.undefined;
   });
});



suite('getFormData', () => {
   let expect;
   let getFormData;
   let sandbox;
   let mockShowErrorMessage;
   let mockGetFileReadStreamAndCreateFormData;
   let mockCreateFormDataFromFileSystem;
   let mockCreateFormDataFromWorkspace;
   let mockGetFilenameFromUri;
   let mockCreateFormDataFromContents;
   let Readable;

   suiteSetup(async () => {
      const chai = await import('chai');
      expect = chai.expect;
      ({ getFormData } = await import('../../src/utils.js'));
      ({ Readable } = await import('stream'));
   });

   setup(() => {
      sandbox = sinon.createSandbox();
      mockShowErrorMessage = sandbox.stub(vscode.window, 'showErrorMessage');
      mockGetFileReadStreamAndCreateFormData = sandbox.stub();
      mockCreateFormDataFromFileSystem = sandbox.stub();
      mockCreateFormDataFromWorkspace = sandbox.stub();
      mockGetFilenameFromUri = sandbox.stub();
      mockCreateFormDataFromContents = sandbox.stub();
   });

   teardown(() => {
      sandbox.restore();
   });

   test('should create FormData from file contents', async () => {
      const fileContents = new Uint8Array([1, 2, 3]);
      const fileUri = vscode.Uri.file('/path/to/file.txt');
      const filename = 'file.txt';
      mockGetFilenameFromUri.returns(filename);
      mockCreateFormDataFromContents.resolves([{}, filename]);

      const [formdata, resultFilename] = await getFormData(fileUri, fileContents);

      expect(formdata).to.be.an('object');
      expect(resultFilename).to.equal(filename);
   });

   test('should create FormData from file read stream', async () => {
      const fileUri = vscode.Uri.file('/path/to/file.txt');
      const filename = 'file.txt';
      const mockStream = new Readable();
      mockStream._read = () => { };
      mockGetFilenameFromUri.returns(filename);
      mockGetFileReadStreamAndCreateFormData.resolves([{}, filename]);

      const [formdata, resultFilename] = await getFormData(fileUri);

      expect(formdata).to.be.an('object');
      expect(resultFilename).to.equal(filename);
   });

   test('should create FormData from file system', async () => {
      const fileUri = vscode.Uri.file('/path/to/file.txt');
      const filename = 'file.txt';
      mockGetFilenameFromUri.returns(filename);
      mockCreateFormDataFromFileSystem.returns([{}, filename]);

      const [formdata, resultFilename] = await getFormData(fileUri);

      expect(formdata).to.be.an('object');
      expect(resultFilename).to.equal(filename);
   });

   test('should create FormData from workspace', async () => {
      const fileUri = vscode.Uri.file('/path/to/file.txt');
      const filename = 'file.txt';
      mockGetFilenameFromUri.returns(filename);
      mockCreateFormDataFromWorkspace.resolves([{}, filename]);

      const [formdata, resultFilename] = await getFormData(fileUri);

      expect(formdata).to.be.an('object');
      expect(resultFilename).to.equal(filename);
   });

   test('should throw error for invalid fileUri', async () => {
      const fileUri = 'invalid-uri';
      try {
         await getFormData(fileUri);
      } catch (error) {
         expect(error.message).to.include('fileUri is not a Uri');
         expect(mockShowErrorMessage.calledOnce).to.be.true;
      }
   });
});
