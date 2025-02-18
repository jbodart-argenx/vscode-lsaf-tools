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


