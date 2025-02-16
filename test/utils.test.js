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
      ({ getFileOrFolderUri } = await import('../src/utils.js'));
   });

   setup(() => {
      sandbox = sinon.createSandbox();
   });

   teardown(() => {
      sandbox.restore();
   });

   test('should return an array of URIs when fileOrFolder is an array', () => {
      const uris = ['file:///path/to/file1', 'file:///path/to/file2'];
      const result = getFileOrFolderUri(uris);
      expect(result).to.be.an('array');
      expect(result).to.have.lengthOf(2);
   });

   test('should return the active text editor URI when fileOrFolder is null and activeTextEditor is defined', () => {
      const mockUri = vscode.Uri.file('/path/to/active/file');
      sandbox.stub(vscode.window, 'activeTextEditor').value({ document: { uri: mockUri } });

      const result = getFileOrFolderUri(null);
      expect(result).to.equal(mockUri);
   });

   test('should return the active editor document URI when fileOrFolder is null and activeEditor.document.uri is defined', function () {
      if (!vscode.window.activeEditor) {
         this.skip(); // Skip the test if activeEditor is not defined
      }

      const mockUri = vscode.Uri.file('/path/to/active/file');
      sandbox.stub(vscode.window, 'activeEditor').value({ document: { uri: mockUri } });

      const result = getFileOrFolderUri(null);
      expect(result).to.equal(mockUri);
   });

   test('should return a URI when fileOrFolder is a string', () => {
      const uriString = 'file:///path/to/file';
      const result = getFileOrFolderUri(uriString);
      expect(result).to.be.an.instanceof(vscode.Uri);
      expect(result.toString()).to.equal(uriString);
   });
});