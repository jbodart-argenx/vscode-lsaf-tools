const sinon = require('sinon');
const vscode = require('vscode');

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

   suiteSetup(async () => {
      const chai = await import('chai');
      expect = chai.expect;
      const utils = await import('../../src/utils.js');
      copyFileOrFolderUri = utils.copyFileOrFolderUri;
   });

   setup(() => {
      sandbox = sinon.createSandbox();
      sandbox.stub(vscode.env.clipboard, 'writeText').resolves();
      sandbox.stub(vscode.window, 'showInformationMessage');
      sandbox.stub(vscode.window, 'showErrorMessage');
      sandbox.stub(vscode.window, 'showWarningMessage');
   });

   teardown(() => {
      sandbox.restore();
   });

   test('should successfully copy a single file URI to clipboard', async () => {
      // Stub getFileOrFolderUri to return an object with a toString value
      sandbox.stub(require('../../src/utils.js'), 'getFileOrFolderUri').returns({ toString: 'file:///path/to/fake' });
      await copyFileOrFolderUri('dummy');
      sinon.assert.calledWith(vscode.env.clipboard.writeText, 'file:///path/to/fake');
      sinon.assert.calledWith(vscode.window.showInformationMessage, 'File/Folder Uri copied to clipboard: file:///path/to/fake');
   });

   test('should successfully copy an array of file URIs to clipboard', async () => {
      // For each input, stub getFileOrFolderUri to return an object with a toString value
      const getFileStub = sinon.stub();
      getFileStub.withArgs('dummy1').returns({ toString: 'file:///path/to/fake1' });
      getFileStub.withArgs('dummy2').returns({ toString: 'file:///path/to/fake2' });
      sandbox.stub(require('../../src/utils.js'), 'getFileOrFolderUri').callsFake(input => getFileStub(input));
      
      await copyFileOrFolderUri(['dummy1', 'dummy2']);
      const expected = 'file:///path/to/fake1\nfile:///path/to/fake2';
      sinon.assert.calledWith(vscode.env.clipboard.writeText, expected);
      sinon.assert.calledWith(vscode.window.showInformationMessage, `File/Folder Uri copied to clipboard: ${expected}`);
   });

   test('should show error message when clipboard write fails', async () => {
      // Stub getFileOrFolderUri for a single input
      sandbox.stub(require('../../src/utils.js'), 'getFileOrFolderUri').returns({ toString: 'file:///path/to/fake' });
      // Force clipboard.writeText to reject
      sandbox.restore(); // Remove previous stubs on clipboard to re-stub below
      sandbox.stub(vscode.env.clipboard, 'writeText').rejects(new Error('Clipboard failed'));
      sandbox.stub(vscode.window, 'showErrorMessage');
      
      await copyFileOrFolderUri('dummy');
      sinon.assert.calledWith(vscode.window.showErrorMessage, sinon.match('Error copying File/Folder Uri to clipboard: Clipboard failed'));
   });
});