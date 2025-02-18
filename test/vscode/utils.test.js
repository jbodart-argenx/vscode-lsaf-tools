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




