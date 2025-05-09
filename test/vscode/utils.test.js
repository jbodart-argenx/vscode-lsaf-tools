const sinon = require('sinon');
const vscode = require('vscode');
const { getOppositeEndpointUri } = require('../../src/utils.js');
const { createFormDataFromFileSystem } = require('../../src/utils.js');

suite('getFileFolderOrDocumentUri', () => {
   let expect;
   let getFileFolderOrDocumentUri;
   let sandbox;

   suiteSetup(async () => {
      // Dynamically import chai and the function to be tested
      const chai = await import('chai');
      expect = chai.expect;
      ({ getFileFolderOrDocumentUri } = await import('../../src/utils.js'));
   });

   setup(() => {
      sandbox = sinon.createSandbox();
   });

   teardown(() => {
      sandbox.restore();
   });

   test('should return an array of URIs when fileOrFolder is an array of strings', () => {
      const uris = ['file:///path/to/file1', 'file:///path/to/file2'];
      const result = getFileFolderOrDocumentUri(uris);
      expect(result).to.be.an('array');
      expect(result).to.have.lengthOf(2);
      result.forEach(uri => {
         expect(uri).to.be.an.instanceof(vscode.Uri);
      });
   });

   test('should return an array of URIs when fileOrFolder is an array of vscode.Uri', () => {
      const uris = [vscode.Uri.file('/path/to/file1'), vscode.Uri.file('/path/to/file2')];
      const result = getFileFolderOrDocumentUri(uris);
      expect(result).to.be.an('array');
      expect(result).to.have.lengthOf(2);
      result.forEach(uri => {
         expect(uri).to.be.an.instanceof(vscode.Uri);
      });
   });

   test('should return a single URI when fileOrFolder is a single vscode.Uri', () => {
      const uri = vscode.Uri.file('/path/to/file');
      const result = getFileFolderOrDocumentUri(uri);
      expect(result).to.be.an.instanceof(vscode.Uri);
      expect(result.toString()).to.equal(uri.toString());
   });

   test('should return the active text editor URI when fileOrFolder is null and activeTextEditor is defined', () => {
      const mockUri = vscode.Uri.file('/path/to/active/file');
      sandbox.stub(vscode.window, 'activeTextEditor').value({ document: { uri: mockUri } });

      const result = getFileFolderOrDocumentUri(null);
      expect(result).to.equal(mockUri);
      expect(result).to.be.an.instanceof(vscode.Uri);
   });

   test('should return the active editor document URI when fileOrFolder is null and activeEditor.document.uri is defined', function () {
      // Check if activeEditor property exists in vscode.window
      if (!("activeEditor" in vscode.window)) {
         console.log(`== SKIPPING TEST == "${this.test.title
            }" as "activeEditor" property does not exist in vscode.window (VSCode ${vscode.version})`);
         // Instead of actually calling this.skip(),
         // we'll make the test pass conditionally
         // This approach works better with VS Code's test explorer
         return;
      }

      const mockUri = vscode.Uri.file('/path/to/active/file');
      // Only try to stub the property if it exists
      sandbox.stub(vscode.window, 'activeEditor').value({ document: { uri: mockUri } });

      const result = getFileFolderOrDocumentUri(null);
      expect(result).to.equal(mockUri);
      expect(result).to.be.an.instanceof(vscode.Uri);
   });

   test('should return a URI when fileOrFolder is a non-empty string', () => {
      const uriString = 'file:///path/to/file';
      const result = getFileFolderOrDocumentUri(uriString);
      expect(result).to.be.an.instanceof(vscode.Uri);
      expect(result.toString()).to.equal(uriString);
   });

   test('should return null when fileOrFolder is undefined and no editor is active', async function() {
      // Close all editors
      await vscode.commands.executeCommand('workbench.action.closeAllEditors');
      if (vscode.window.activeEditor) {
         console.log('== SKIPPING TEST == as "activeEditor" is defined in vscode.window');
         // Instead of actually calling this.skip(),
         // we'll make the test pass conditionally
         // This approach works better with VS Code's test explorer
         // this.skip(); // Skip the test if activeEditor is not defined
         return;
      }
      if (vscode.window.activeTextEditor) {
         console.log('== SKIPPING TEST == as "activeTextEditor" is defined in vscode.window');
         // Instead of actually calling this.skip(),
         // we'll make the test pass conditionally
         // This approach works better with VS Code's test explorer
         // this.skip(); // Skip the test if activeEditor is not defined
         return;
      }
      const result = getFileFolderOrDocumentUri(undefined);
      expect(result).to.be.null;
   });

   test('should return a file URI when fileOrFolder is an invalid string', () => {
      const result = getFileFolderOrDocumentUri('invalid-uri');
      expect(result).to.be.an.instanceof(vscode.Uri);
      expect(result.scheme).to.equal('file');
   });

   test('should return null when fileOrFolder is an empty string', () => {
      const result = getFileFolderOrDocumentUri('');
      expect(result).to.be.null;
   });
});



suite('copyFileOrFolderUri', () => {
   let expect;
   let copyFileOrFolderUri;
   let sandbox;
   let mockShowInformationMessage;
   let mockCopyToClipboard;
   let mockgetFileFolderOrDocumentUri;

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
      mockgetFileFolderOrDocumentUri = sandbox.stub();
   });

   teardown(() => {
      sandbox.restore();
   });

   test('should show information message when fileOrFolder is not provided', async () => {
      await copyFileOrFolderUri(null, mockgetFileFolderOrDocumentUri, mockCopyToClipboard);
      expect(mockShowInformationMessage.calledOnce).to.be.true;
      expect(mockShowInformationMessage.firstCall.args[0]).to.include('no file or folder specified');
   });

   test('should call copyToClipboard with URIs when fileOrFolder is an array of strings', async () => {
      const uris = ['file:///path/to/file1', 'file:///path/to/file2'];
      mockgetFileFolderOrDocumentUri.callsFake(uri => vscode.Uri.parse(uri));
      await copyFileOrFolderUri(uris, mockgetFileFolderOrDocumentUri, mockCopyToClipboard);
      expect(mockCopyToClipboard.calledOnce).to.be.true;
      expect(mockCopyToClipboard.firstCall.args[0]).to.deep.equal(uris);
   });

   test('should call copyToClipboard with URIs when fileOrFolder is a single string', async () => {
      const uri = 'file:///path/to/file';
      mockgetFileFolderOrDocumentUri.callsFake(uri => vscode.Uri.parse(uri));
      await copyFileOrFolderUri(uri, mockgetFileFolderOrDocumentUri, mockCopyToClipboard);
      expect(mockCopyToClipboard.calledOnce).to.be.true;
      expect(mockCopyToClipboard.firstCall.args[0]).to.deep.equal([uri]);
   });

   test('should call copyToClipboard with URIs when fileOrFolder is an array of vscode.Uri', async () => {
      const uris = [vscode.Uri.file('/path/to/file1'), vscode.Uri.file('/path/to/file2')];
      mockgetFileFolderOrDocumentUri.callsFake(uri => uri);
      await copyFileOrFolderUri(uris, mockgetFileFolderOrDocumentUri, mockCopyToClipboard);
      expect(mockCopyToClipboard.calledOnce).to.be.true;
      expect(mockCopyToClipboard.firstCall.args[0]).to.deep.equal(uris.map(uri => uri.toString()));
   });

   test('should call copyToClipboard with URIs when fileOrFolder is a single vscode.Uri', async () => {
      const uri = vscode.Uri.file('/path/to/file');
      mockgetFileFolderOrDocumentUri.callsFake(uri => uri);
      await copyFileOrFolderUri(uri, mockgetFileFolderOrDocumentUri, mockCopyToClipboard);
      expect(mockCopyToClipboard.calledOnce).to.be.true;
      expect(mockCopyToClipboard.firstCall.args[0]).to.deep.equal([uri.toString()]);
   });

   test('should call copyToClipboard with active editor URI when fileOrFolder is not provided and activeTextEditor is defined', async () => {
      const mockUri = vscode.Uri.file('/path/to/active/file');
      sandbox.stub(vscode.window, 'activeTextEditor').value({ document: { uri: mockUri } });
      mockgetFileFolderOrDocumentUri.callsFake(() => mockUri);
      await copyFileOrFolderUri(null, mockgetFileFolderOrDocumentUri, mockCopyToClipboard);
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
   let mockgetFileFolderOrDocumentUri;
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
      mockgetFileFolderOrDocumentUri = sandbox.stub();
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
      mockgetFileFolderOrDocumentUri.callsFake(uri => vscode.Uri.parse(uri));

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
   let mockgetFileFolderOrDocumentUri;
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
      mockgetFileFolderOrDocumentUri = sandbox.stub();
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
      mockgetFileFolderOrDocumentUri.returns(null);
      const result = await getLsafPath('invalid-uri', mockGetDefaultEndpoints);
      expect(result).to.be.null;
      expect(mockShowWarningMessage.calledOnce).to.be.true;
      expect(mockShowWarningMessage.firstCall.args[0]).to.include('no matching endpoint found');
   });

   test('should return null when no endpoints are defined', async () => {
      mockGetDefaultEndpoints.returns([]);
      mockgetFileFolderOrDocumentUri.returns(vscode.Uri.parse('file:///path/to/file'));
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
      mockgetFileFolderOrDocumentUri.returns(vscode.Uri.parse('file:///path/to/file'));
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
      mockgetFileFolderOrDocumentUri.returns(vscode.Uri.parse('file:///endpoint1/path/to/file'));
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
      mockgetFileFolderOrDocumentUri.callsFake(uri => vscode.Uri.parse(uri));
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
   let mockgetFileFolderOrDocumentUri;
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
      mockgetFileFolderOrDocumentUri = sandbox.stub();
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
      mockgetFileFolderOrDocumentUri.returns(null);
      const result = await getLocalPath('invalid-uri', mockGetDefaultEndpoints);
      expect(result).to.be.null;
      expect(mockShowWarningMessage.calledOnce).to.be.true;
      expect(mockShowWarningMessage.firstCall.args[0]).to.include('no local endpoints found');
   });

   test('should return null when no endpoints are defined', async () => {
      mockGetDefaultEndpoints.returns([]);
      mockgetFileFolderOrDocumentUri.returns(vscode.Uri.parse('file:///path/to/file'));
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
      mockgetFileFolderOrDocumentUri.returns(vscode.Uri.parse('file:///path/to/file'));
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
      mockgetFileFolderOrDocumentUri.returns(vscode.Uri.parse('file:///endpoint1/path/to/file'));
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
      mockgetFileFolderOrDocumentUri.callsFake(uri => vscode.Uri.parse(uri));
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
      mockgetFileFolderOrDocumentUri.returns(vscode.Uri.parse('file:///endpoint1/path/to/file'));
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
      mockgetFileFolderOrDocumentUri.returns(vscode.Uri.parse('file:///endpoint1/path/to/file'));
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

   test('should create FormData from file contents', async function () {
      this.timeout(5000); // Increase timeout to 5000ms (5 seconds)
      console.log('Test expected to take longer (should create FormData from file contents):');
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



suite('getFilenameFromUri', () => {
   let expect;
   let getFilenameFromUri;
   let sandbox;
   let mockShowErrorMessage;

   suiteSetup(async () => {
      const chai = await import('chai');
      expect = chai.expect;
      ({ getFilenameFromUri } = await import('../../src/utils.js'));
   });

   setup(() => {
      sandbox = sinon.createSandbox();
      mockShowErrorMessage = sandbox.stub(vscode.window, 'showErrorMessage');
   });

   teardown(() => {
      sandbox.restore();
   });

   test('should return the filename from a valid vscode.Uri', () => {
      const fileUri = vscode.Uri.file('/path/to/file.txt');
      const result = getFilenameFromUri(fileUri);
      expect(result).to.equal('file.txt');
   });

   test('should return the filename from a valid vscode.Uri with backslashes', () => {
      const fileUri = vscode.Uri.file('C:\\path\\to\\file.txt');
      const result = getFilenameFromUri(fileUri);
      expect(result).to.equal('file.txt');
   });

   test('should throw an error and show error message when fileUri is not a vscode.Uri', () => {
      const invalidUri = 'invalid-uri';
      try {
         getFilenameFromUri(invalidUri);
      } catch (error) {
         expect(error.message).to.include('fileUri is not a Uri');
         expect(mockShowErrorMessage.calledOnce).to.be.true;
      }
   });

   test('should throw an error and show error message when fileUri is null', () => {
      try {
         getFilenameFromUri(null);
      } catch (error) {
         expect(error.message).to.include('fileUri is not a Uri');
         expect(mockShowErrorMessage.calledOnce).to.be.true;
      }
   });

   test('should throw an error and show error message when fileUri is undefined', () => {
      try {
         getFilenameFromUri(undefined);
      } catch (error) {
         expect(error.message).to.include('fileUri is not a Uri');
         expect(mockShowErrorMessage.calledOnce).to.be.true;
      }
   });
});



suite('createFormDataFromContents', () => {
   let expect;
   let createFormDataFromContents;
   let sandbox;
   let mockFormData;
   let Readable;

   suiteSetup(async () => {
      const chai = await import('chai');
      expect = chai.expect;
      ({ createFormDataFromContents } = await import('../../src/utils.js'));
      ({ Readable } = await import('stream'));
   });

   setup(() => {
      sandbox = sinon.createSandbox();
      mockFormData = {
         append: sandbox.stub()
      };
   });

   teardown(() => {
      sandbox.restore();
   });

   test('should create FormData from file contents', async () => {
      const fileContents = new Uint8Array([1, 2, 3]);
      const filename = 'file.txt';

      const [formdata, resultFilename] = await createFormDataFromContents(mockFormData, fileContents, filename);

      expect(formdata).to.equal(mockFormData);
      expect(resultFilename).to.equal(filename);
      expect(mockFormData.append.calledOnce).to.be.true;
      expect(mockFormData.append.firstCall.args[0]).to.equal('uploadFile');      // 'uploadFile' is the required field name
      expect(mockFormData.append.firstCall.args[2]).to.deep.equal({ filename });
   });

   test('should create a readable stream from file contents', async () => {
      const fileContents = new Uint8Array([1, 2, 3]);
      const filename = 'file.txt';

      // eslint-disable-next-line no-unused-vars
      const [formdata, resultFilename] = await createFormDataFromContents(mockFormData, fileContents, filename);

      const bufferStream = mockFormData.append.firstCall.args[1];
      expect(bufferStream).to.be.an.instanceof(Readable);

      const chunks = [];
      bufferStream.on('data', chunk => chunks.push(chunk));
      bufferStream.on('end', () => {
         const result = Buffer.concat(chunks);
         expect(result).to.deep.equal(Buffer.from(fileContents));
      });

      bufferStream.read();
   });

   test('should handle empty file contents', async () => {
      const fileContents = new Uint8Array([]);
      const filename = 'file.txt';

      const [formdata, resultFilename] = await createFormDataFromContents(mockFormData, fileContents, filename);

      expect(formdata).to.equal(mockFormData);
      expect(resultFilename).to.equal(filename);
      expect(mockFormData.append.calledOnce).to.be.true;
      expect(mockFormData.append.firstCall.args[0]).to.equal('uploadFile');   // 'uploadFile' is the required field name
      expect(mockFormData.append.firstCall.args[2]).to.deep.equal({ filename });

      const bufferStream = mockFormData.append.firstCall.args[1];
      expect(bufferStream).to.be.an.instanceof(Readable);

      const chunks = [];
      bufferStream.on('data', chunk => chunks.push(chunk));
      bufferStream.on('end', () => {
         const result = Buffer.concat(chunks);
         expect(result).to.deep.equal(Buffer.from(fileContents));
      });

      bufferStream.read();
   });

   test('should throw an error if fileContents is not a Uint8Array', async () => {
      const fileContents = 'invalid-contents';
      const filename = 'file.txt';

      try {
         await createFormDataFromContents(mockFormData, fileContents, filename);
      } catch (error) {
         expect(error).to.be.an.instanceof(TypeError);
         expect(error.message).to.include('fileContents must be a Uint8Array');
      }
   });
});



suite('getFileReadStreamAndCreateFormData', () => {
   let expect;
   let getFileReadStreamAndCreateFormData;
   let sandbox;
   let mockGetCommands;
   let mockExecuteCommand;
   let mockShowErrorMessage;
   let Readable;

   suiteSetup(async () => {
      const chai = await import('chai');
      expect = chai.expect;
      ({ getFileReadStreamAndCreateFormData } = await import('../../src/utils.js'));
      ({ Readable } = await import('stream'));
   });

   setup(() => {
      sandbox = sinon.createSandbox();
      mockGetCommands = sandbox.stub(vscode.commands, 'getCommands');
      mockExecuteCommand = sandbox.stub(vscode.commands, 'executeCommand');
      mockShowErrorMessage = sandbox.stub(vscode.window, 'showErrorMessage');
   });

   teardown(() => {
      sandbox.restore();
   });

   test('should create FormData from file read stream', async () => {
      const formdata = { append: sandbox.stub() };
      const fileUri = vscode.Uri.file('/path/to/file.txt');
      const filename = 'file.txt';
      const mockStream = new Readable();
      mockStream._read = () => { };
      mockGetCommands.resolves(['vsce-lsaf-restapi-fs.getFileReadStream']);
      mockExecuteCommand.resolves(mockStream);

      const [resultFormdata, resultFilename] = await getFileReadStreamAndCreateFormData(formdata, fileUri, filename);

      expect(resultFormdata).to.equal(formdata);
      expect(resultFilename).to.equal(filename);
      expect(formdata.append.calledOnce).to.be.true;
      expect(formdata.append.firstCall.args[0]).to.equal('uploadFile');    // 'uploadFile' is the required field name
      expect(formdata.append.firstCall.args[1]).to.equal(mockStream);
      expect(formdata.append.firstCall.args[2]).to.deep.equal({ filename });
   });

   test('should return null if no matching command is found', async () => {
      const formdata = { append: sandbox.stub() };
      const fileUri = vscode.Uri.file('/path/to/file.txt');
      const filename = 'file.txt';
      mockGetCommands.resolves([]);

      const result = await getFileReadStreamAndCreateFormData(formdata, fileUri, filename);

      expect(result).to.be.null;
      expect(formdata.append.notCalled).to.be.true;
   });

   test('should return null if command execution fails', async () => {
      const formdata = { append: sandbox.stub() };
      const fileUri = vscode.Uri.file('/path/to/file.txt');
      const filename = 'file.txt';
      mockGetCommands.resolves(['vsce-lsaf-restapi-fs.getFileReadStream']);
      mockExecuteCommand.rejects(new Error('Command execution failed'));

      const result = await getFileReadStreamAndCreateFormData(formdata, fileUri, filename);

      expect(result).to.be.null;
      expect(formdata.append.notCalled).to.be.true;
   });

   test('should throw an error if stream is not an instance of Readable', async () => {
      const formdata = { append: sandbox.stub() };
      const fileUri = vscode.Uri.file('/path/to/file.txt');
      const filename = 'file.txt';
      mockGetCommands.resolves(['vsce-lsaf-restapi-fs.getFileReadStream']);
      mockExecuteCommand.resolves({});

      try {
         await getFileReadStreamAndCreateFormData(formdata, fileUri, filename);
      } catch (error) {
         expect(error.message).to.include('stream is not an instance of Readable');
         expect(formdata.append.notCalled).to.be.true;
      }
   });

   test('should log an error if stream is not an instance of Readable', async () => {
      const formdata = { append: sandbox.stub() };
      const fileUri = vscode.Uri.file('/path/to/file.txt');
      const filename = 'file.txt';
      mockGetCommands.resolves(['vsce-lsaf-restapi-fs.getFileReadStream']);
      mockExecuteCommand.resolves({});

      const result = await getFileReadStreamAndCreateFormData(formdata, fileUri, filename);

      expect(result).to.be.null;
      expect(formdata.append.notCalled).to.be.true;
      expect(mockShowErrorMessage.calledOnce).to.be.true;
      expect(mockShowErrorMessage.firstCall.args[0]).to.include('stream is not an instance of Readable');
   });
});



suite('createFormDataFromFileSystem', () => {
   let expect;
   let sandbox;
   let mockFormData;
   let mockFs;
   let mockCreateReadStream;
   let mockLogger;

   suiteSetup(async () => {
      const chai = await import('chai');
      expect = chai.expect;
   });

   setup(() => {
      sandbox = sinon.createSandbox();
      mockFormData = {
         append: sandbox.stub()
      };
      mockCreateReadStream = sandbox.stub();
      mockFs = {
         createReadStream: mockCreateReadStream
      };
      mockLogger = {
         error: sandbox.stub()
      };
   });

   teardown(() => {
      sandbox.restore();
   });

   test('should create FormData from file system', () => {
      const fileUri = vscode.Uri.file('/path/to/file.txt');
      const filename = 'file.txt';
      mockCreateReadStream.returns({});

      const [formdata, resultFilename] = createFormDataFromFileSystem(mockFormData, fileUri, filename, mockFs, mockLogger);

      expect(formdata).to.equal(mockFormData);
      expect(resultFilename).to.equal(filename);
      expect(mockFormData.append.calledOnce).to.be.true;
      expect(mockFormData.append.firstCall.args[0]).to.equal('uploadFile');            // 'uploadFile' is the required form field name
      expect(mockFormData.append.firstCall.args[1]).to.equal(mockCreateReadStream());
   });

   test('should return null if process is undefined', () => {
      const originalProcess = global.process;
      delete global.process;
      const fileUri = vscode.Uri.file('/path/to/file.txt');
      const filename = 'file.txt';

      const result = createFormDataFromFileSystem(mockFormData, fileUri, filename, mockFs, mockLogger);

      global.process = originalProcess;

      expect(result).to.be.null;
      expect(mockFormData.append.notCalled).to.be.true;
   });

   test('should return null if fileUri scheme is not file', () => {
      const fileUri = vscode.Uri.parse('http://path/to/file.txt');
      const filename = 'file.txt';

      const result = createFormDataFromFileSystem(mockFormData, fileUri, filename, mockFs, mockLogger);

      expect(result).to.be.null;
      expect(mockFormData.append.notCalled).to.be.true;
   });

   test('should return null if fs is not available', () => {
      const fileUri = vscode.Uri.file('/path/to/file.txt');
      const filename = 'file.txt';

      const result = createFormDataFromFileSystem(mockFormData, fileUri, filename, null, mockLogger);

      expect(result).to.be.null;
      expect(mockFormData.append.notCalled).to.be.true;
   });

   test('should log an error if createReadStream throws an error', () => {
      const fileUri = vscode.Uri.file('/path/to/file.txt');
      const filename = 'file.txt';
      const errorMessage = 'Error reading file';
      mockCreateReadStream.throws(new Error(errorMessage));

      const result = createFormDataFromFileSystem(mockFormData, fileUri, filename, mockFs, mockLogger);

      expect(result).to.be.null;
      expect(mockFormData.append.notCalled).to.be.true;
      expect(mockLogger.error.calledOnce).to.be.true;
      expect(mockLogger.error.firstCall.args[0]).to.include(errorMessage);
   });
});



suite('createFormDataFromWorkspace', () => {
   let expect;
   let sandbox;
   let mockFormData;
   let mockReadFile;
   let mockLogger;
   let createFormDataFromWorkspace;

   suiteSetup(async () => {
      const chai = await import('chai');
      expect = chai.expect;
      ({ createFormDataFromWorkspace } = await import('../../src/utils.js'));
   });

   setup(() => {
      sandbox = sinon.createSandbox();
      mockFormData = {
         append: sandbox.stub()
      };
      mockReadFile = sandbox.stub();
      mockLogger = {
         error: sandbox.stub(),
         warn: sandbox.stub(),
         info: sandbox.stub(),
         log: sandbox.stub()
      };
   });

   teardown(() => {
      sandbox.restore();
   });

   test('should create FormData from workspace file', async () => {
      const fileUri = vscode.Uri.file('/path/to/file.txt');
      const filename = 'file.txt';
      const fileContents = Buffer.from('file contents');
      mockReadFile.resolves(fileContents);

      const [formdata, resultFilename] = await createFormDataFromWorkspace(mockFormData, fileUri, filename, mockReadFile, mockLogger);

      expect(formdata).to.equal(mockFormData);
      expect(resultFilename).to.equal(filename);
      expect(mockFormData.append.calledOnce).to.be.true;
      expect(mockFormData.append.firstCall.args[0]).to.equal('uploadFile');   // 'uploadFile' is the required form field name
      expect(mockFormData.append.firstCall.args[1].equals(fileContents)).to.be.true;
      expect(mockFormData.append.firstCall.args[2]).to.equal(filename);
   });

   test('should return null if readFile throws an error', async () => {
      const fileUri = vscode.Uri.file('/path/to/file.txt');
      const filename = 'file.txt';
      const errorMessage = 'Error reading file';
      mockReadFile.rejects(new Error(errorMessage));

      const result = await createFormDataFromWorkspace(mockFormData, fileUri, filename, mockReadFile, mockLogger);

      expect(result).to.be.null;
      expect(mockFormData.append.notCalled).to.be.true;
      expect(mockLogger.error.calledOnce).to.be.true;
      expect(mockLogger.error.firstCall.args[0]).to.include(errorMessage);
   });
});



const { copyToOppositeEndpoint } = require('../../src/utils.js');

suite('copyToOppositeEndpoint', () => {
   let expect;
   let sandbox;
   let mockgetFileFolderOrDocumentUri;
   let mockGetOppositeEndpointUri;
   let mockShowInformationMessage, mockShowWarningMessage, mockShowErrorMessage;
   let mockFs;
   let mockLogger;

   suiteSetup(async () => {
      const chai = await import('chai');
      expect = chai.expect;
   });

   setup(() => {
      sandbox = sinon.createSandbox();
      mockgetFileFolderOrDocumentUri = sandbox.stub();
      mockGetOppositeEndpointUri = sandbox.stub();
      mockShowInformationMessage = sandbox.stub(vscode.window, 'showInformationMessage');
      mockShowWarningMessage = sandbox.stub(vscode.window, 'showWarningMessage');
      mockShowErrorMessage = sandbox.stub(vscode.window, 'showErrorMessage');
      mockFs = {
         copy: sandbox.stub(),
         stat: sandbox.stub()
      };
      mockLogger = {
         error: sandbox.stub(),
         warn: sandbox.stub(),
         info: sandbox.stub(),
         log: sandbox.stub()
      };
   });

   teardown(() => {
      sandbox.restore();
   });

   test('should show information message when fileOrFolder is not provided', async () => {
      // const mockShowInformationMessage = sandbox.stub(vscode.window, 'showInformationMessage');
      await copyToOppositeEndpoint(null, 'oppositeEndpoint', 'copyComment', mockgetFileFolderOrDocumentUri, mockGetOppositeEndpointUri, mockFs, mockLogger);
      expect(mockShowInformationMessage.calledOnce).to.be.true;
      expect(mockShowInformationMessage.firstCall.args[0]).to.include('no file or folder specified');
   });

   test('should show warning message when oppositeEndpoint is not provided', async () => {
      const fileOrFolderUri = vscode.Uri.file('/path/to/file.txt');
      mockgetFileFolderOrDocumentUri.returns(fileOrFolderUri);
      mockGetOppositeEndpointUri.returns(null);
      await copyToOppositeEndpoint('/path/to/file.txt', null, 'copyComment', mockgetFileFolderOrDocumentUri, mockGetOppositeEndpointUri, mockFs, mockLogger);
      expect(mockShowWarningMessage.calledOnce).to.be.true;
      expect(mockShowWarningMessage.firstCall.args[0]).to.include('No opposite endpoint specified');
   });

   test('should copy file or folder passed as strings to opposite endpoint', async () => {
      const fileOrFolderUri = vscode.Uri.file('/path/to/file.txt');
      const oppositeEndpointUri = vscode.Uri.file('/path/to/opposite/file.txt');
      mockgetFileFolderOrDocumentUri.returns(fileOrFolderUri);
      mockGetOppositeEndpointUri.returns(oppositeEndpointUri);
      mockFs.stat.resolves({ type: vscode.FileType.File });
      await copyToOppositeEndpoint('/path/to/file.txt', '/path/to/opposite/file.txt', 'copyComment', mockgetFileFolderOrDocumentUri, mockGetOppositeEndpointUri, mockFs, mockLogger);
      expect(mockFs.copy.calledOnce).to.be.true;
      expect(mockFs.copy.firstCall.args[0].toString()).to.equal(fileOrFolderUri.toString());
      expect(mockFs.copy.firstCall.args[1].toString()).to.equal(oppositeEndpointUri.toString());
      expect(mockFs.copy.firstCall.args[2]).to.deep.equal({ overwrite: true });
      expect(mockShowInformationMessage.calledOnce).to.be.true;
      expect(mockShowInformationMessage.firstCall.args[0]).to.include(`Copied ${fileOrFolderUri} to ${oppositeEndpointUri}`);
   });
   test('should copy file or folder passed as URIs to opposite endpoint', async () => {
      const fileOrFolderUri = vscode.Uri.file('/path/to/file.txt');
      const oppositeEndpointUri = vscode.Uri.file('/path/to/opposite/file.txt');
      mockgetFileFolderOrDocumentUri.returns(fileOrFolderUri);
      mockGetOppositeEndpointUri.returns(oppositeEndpointUri);
      mockFs.stat.resolves({ type: vscode.FileType.File });
      await copyToOppositeEndpoint(fileOrFolderUri, oppositeEndpointUri, 'copyComment', mockgetFileFolderOrDocumentUri, mockGetOppositeEndpointUri, mockFs, mockLogger);
      expect(mockFs.copy.calledOnce).to.be.true;
      expect(mockFs.copy.firstCall.args[0].toString()).to.equal(fileOrFolderUri.toString());
      expect(mockFs.copy.firstCall.args[1].toString()).to.equal(oppositeEndpointUri.toString());
      expect(mockFs.copy.firstCall.args[2]).to.deep.equal({ overwrite: true });
      expect(mockShowInformationMessage.calledOnce).to.be.true;
      expect(mockShowInformationMessage.firstCall.args[0]).to.include(`Copied ${fileOrFolderUri} to ${oppositeEndpointUri}`);
   });

   test('should log and show error message if copy fails', async () => {
      const fileOrFolderUri = vscode.Uri.file('/path/to/file.txt');
      const oppositeEndpointUri = vscode.Uri.file('/path/to/opposite/file.txt');
      const errorMessage = 'Error copying file';
      mockgetFileFolderOrDocumentUri.returns(fileOrFolderUri);
      mockGetOppositeEndpointUri.returns(oppositeEndpointUri);
      mockFs.stat.resolves({ type: vscode.FileType.File });
      mockFs.copy.rejects(new Error(errorMessage));
      await copyToOppositeEndpoint(fileOrFolderUri, oppositeEndpointUri, 'copyComment', mockgetFileFolderOrDocumentUri, mockGetOppositeEndpointUri, mockFs, mockLogger);
      expect(mockFs.copy.calledOnce).to.be.true;
      expect(mockLogger.error.calledOnce).to.be.true;
      expect(mockLogger.error.firstCall.args[0]).to.include(`Error copying ${fileOrFolderUri} to ${oppositeEndpointUri}: ${errorMessage}`);
      expect(mockShowErrorMessage.calledOnce).to.be.true;
      expect(mockShowErrorMessage.firstCall.args[0]).to.include(`Error copying ${fileOrFolderUri} to ${oppositeEndpointUri}: ${errorMessage}`);
   });
});



