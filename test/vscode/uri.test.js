const sinon = require('sinon');
const vscode = require('vscode');
const path = require('path');

suite('isValidUri', () => {
   let expect;
   let isValidUri;
   let sandbox;

   suiteSetup(async () => {
      // Dynamically import chai and the function to be tested
      const chai = await import('chai');
      expect = chai.expect;
      ({ isValidUri } = await import('../../src/uri.js'));
   });

   setup(() => {
      sandbox = sinon.createSandbox();
   });

   teardown(() => {
      sandbox.restore();
   });

   test('should return true for an array of valid URIs', async () => {
      const uris = ['http://example.com', 'https://example.com'];
      const result = await isValidUri(uris);
      expect(result).to.be.an('array');
      result.forEach(res => {
         expect(res).to.be.true;
      });
   });

   test('should return false for an array of invalid URIs', async () => {
      const uris = ['invalid-uri', 'another-invalid-uri'];
      const result = await isValidUri(uris);
      expect(result).to.be.an('array');
      result.forEach(res => {
         expect(res).to.be.false;
      });
   });

   test('should return true for a single valid URI', async () => {
      const uri = 'http://example.com';
      const result = await isValidUri(uri);
      expect(result).to.be.true;
   });

   test('should return false for a single invalid URI', async () => {
      const uri = 'invalid-uri';
      const result = await isValidUri(uri);
      expect(result).to.be.false;
   });

   test('should return true for a valid URI with a known scheme', async () => {
      const uri = 'http://example.com';
      sandbox.stub(vscode.extensions, 'all').value([]);
      const result = await isValidUri(uri);
      expect(result).to.be.true;
   });

   test('should return false for a valid URI with an unknown scheme', async () => {
      const uri = 'unknown-scheme://example.com';
      sandbox.stub(vscode.extensions, 'all').value([]);
      const result = await isValidUri(uri);
      expect(result).to.be.false;
   });

   test('should return false for an invalid URI format', async () => {
      const uri = 'http://example.com:invalid-port';
      const result = await isValidUri(uri);
      expect(result).to.be.false;
   });
});

suite('uriFromString', () => {
   let expect;
   let uriFromString;
   let sandbox;

   suiteSetup(async () => {
      // Dynamically import chai and the function to be tested
      const chai = await import('chai');
      expect = chai.expect;
      ({ uriFromString } = await import('../../src/uri.js'));
   });

   setup(() => {
      sandbox = sinon.createSandbox();
   });

   teardown(() => {
      sandbox.restore();
   });

   test('should return vscode.Uri for a valid URI string', async () => {
      const uriString = 'http://example.com';
      const result = uriFromString(uriString);
      expect(result).to.be.instanceOf(vscode.Uri);
      expect(result.toString()).to.equal('http://example.com/');
   });

   test('should return a file:// URI for a string that does not start with a valid scheme', async () => {
      const uriString = 'invalid-uri';
      const result = uriFromString(uriString);
      expect(result).to.be.instanceOf(vscode.Uri);
      expect(result.toString()).to.equal('file:///invalid-uri'); // The URI is normalized to a file URI
   });

   test('should return vscode.Uri for a valid file path on Windows', async () => {
      const uriString = 'C:\\path\\to\\file.txt';
      sandbox.stub(process, 'platform').value('win32');
      const result = uriFromString(uriString);
      expect(result).to.be.instanceOf(vscode.Uri);
      expect(result.scheme).to.equal('file');
      expect(result.fsPath).to.equal('c:\\path\\to\\file.txt');
   });

   test('should return vscode.Uri for a valid file path on non-Windows', async () => {
      const uriString = '/path/to/file.txt';
      sandbox.stub(process, 'platform').value('linux');
      const result = uriFromString(uriString);
      expect(result).to.be.instanceOf(vscode.Uri);
      expect(result.scheme).to.equal('file');
      expect(path.posix.normalize(result.fsPath.replace(/\\/g, '/'))).to.equal(uriString);
   });

   test('should return null for a null input', async () => {
      const result = uriFromString(null);
      expect(result).to.be.null;
   });

   test('should return null for an undefined input', async () => {
      const result = uriFromString(undefined);
      expect(result).to.be.null;
   });

   test('should return an array of vscode.Uri elements for an array of valid URI strings', async () => {
      const uriStrings = ['http://example.com', 'https://example.com'];
      const result = uriFromString(uriStrings);
      expect(result).to.be.an('array');
      result.forEach((res, index) => {
         expect(res).to.be.instanceOf(vscode.Uri);
         expect(res.toString()).to.equal(uriStrings[index] + '/');
      });
   });

   test('should return file URIs for an array of invalid URI strings', async () => {
      const uriStrings = ['invalid-uri', 'another-invalid-uri'];
      const result = uriFromString(uriStrings);
      expect(result).to.be.an('array');
      result.forEach((res) => {
         expect(res).to.be.instanceOf(vscode.Uri);
         expect(res.scheme).to.equal('file');
      });
   });

   test('should return a vscode.Uri for a valid URI object', async () => {
      const uri = vscode.Uri.parse('http://example.com');
      const result = uriFromString(uri);
      expect(result).to.be.instanceOf(vscode.Uri);
      expect(result.toString()).to.equal(uri.toString());
   });
});


// Pseudocode:
// 1. Import necessary modules (chai, sinon, vscode, path, getBaseUri function).
// 2. Create a test suite for getBaseUri.
// 3. For each test, set up sinon stubs:
//    - Test 1: Provided parameter with existing workspace folder: 
//         - Stub uriFromString conversion (implicitly used) and workspace.getWorkspaceFolder to return a fake folder object.
//    - Test 2: No parameter but active editor available: 
//         - Stub vscode.window.activeTextEditor with a document.uri and stub workspace.getWorkspaceFolder to return a fake folder.
//    - Test 3: No parameter and no active editor, but workspaceFolders exists: 
//         - Stub vscode.workspace.workspaceFolders to be a non-empty array.
//    - Test 4: No parameter, no active editor, no workspaceFolders: 
//         - Stub vscode.workspace.workspaceFolders as undefined and vscode.window.activeTextEditor as undefined.
//         - Expect fallback to current working directory using path.resolve.
//    - Test 5: When parameter is an array: call getBaseUri on each element and return array of results.
// 4. Restore stubs after every test.

suite('getBaseUri', () => {
   let expect;
   let getBaseUri;
   let sandbox;
   let uriFromString; // we'll retrieve it from the module since it's used internally.

   suiteSetup(async () => {
      const chai = await import('chai');
      expect = chai.expect;
      ({ getBaseUri, uriFromString } = await import('../../src/uri.js'));
   });

   setup(() => {
      sandbox = sinon.createSandbox();
   });

   teardown(() => {
      sandbox.restore();
   });

   test('should return workspace folder URI when provided a parameter with an associated workspace folder', () => {
      const fakeFolderUri = vscode.Uri.parse('file:///fake/workspace/');
      const fakeWorkspaceFolder = { uri: fakeFolderUri };

      // Stub uriFromString so that it returns a vscode.Uri instance.
      const testParam = 'http://example.com';
      // Stub getWorkspaceFolder to return our fake folder
      sandbox.stub(vscode.workspace, 'getWorkspaceFolder').callsFake(uri => {
         // Ensure that if passed the uri converted from testParam, it returns our fake folder.
         if (uri.toString() === vscode.Uri.parse(testParam).toString()) {
            return fakeWorkspaceFolder;
         }
         return undefined;
      });
      // Ensure active editor and workspaceFolders are undefined so they don't interfere.
      sandbox.stub(vscode.window, 'activeTextEditor').value(undefined);
      sandbox.stub(vscode.workspace, 'workspaceFolders').value(undefined);

      const result = getBaseUri(testParam);
      expect(result).to.equal(fakeFolderUri.toString());
   });

   test('should return active file workspace folder URI when no parameter is provided but active editor is available', () => {
      const fakeFolderUri = vscode.Uri.parse('file:///active/workspace/');
      const fakeWorkspaceFolder = { uri: fakeFolderUri };
      const fakeDocumentUri = vscode.Uri.parse('file:///active/file.txt');
      const fakeActiveEditor = { document: { uri: fakeDocumentUri } };

      sandbox.stub(vscode.window, 'activeTextEditor').value(fakeActiveEditor);
      sandbox.stub(vscode.workspace, 'getWorkspaceFolder').withArgs(fakeDocumentUri).returns(fakeWorkspaceFolder);
      sandbox.stub(vscode.workspace, 'workspaceFolders').value(undefined);

      const result = getBaseUri();
      expect(result).to.equal(fakeFolderUri.toString());
   });

   test('should return first workspace folder URI when no parameter or active editor, but workspaceFolders exists', () => {
      const fakeFolderUri = vscode.Uri.parse('file:///workspace/first/');
      const fakeWorkspaceFolder = { uri: fakeFolderUri };

      sandbox.stub(vscode.window, 'activeTextEditor').value(undefined);
      sandbox.stub(vscode.workspace, 'workspaceFolders').value([fakeWorkspaceFolder]);
      // getWorkspaceFolder should not be called here but we can stub it to be safe.
      sandbox.stub(vscode.workspace, 'getWorkspaceFolder').returns(undefined);

      const result = getBaseUri();
      expect(result).to.equal(fakeFolderUri.toString());
   });

   test('should fallback to current working directory when no parameter, active editor, or workspaceFolders exist', () => {
      sandbox.stub(vscode.window, 'activeTextEditor').value(undefined);
      sandbox.stub(vscode.workspace, 'workspaceFolders').value(undefined);
      sandbox.stub(vscode.workspace, 'getWorkspaceFolder').returns(undefined);

      const expected = `file://${path.resolve('./')}/`;
      const result = getBaseUri();
      expect(result).to.equal(expected);
   });

   test('should return an array of base URIs when provided an array of parameters', () => {
      const fakeFolderUri1 = vscode.Uri.parse('file:///workspace/one/');
      const fakeFolderUri2 = vscode.Uri.parse('file:///workspace/two/');
      const fakeWorkspaceFolder1 = { uri: fakeFolderUri1 };
      const fakeWorkspaceFolder2 = { uri: fakeFolderUri2 };

      // For each parameter string, we simulate conversion to uri and then retrieval of workspace folder
      const testParams = ['http://example.com/one', 'http://example.com/two'];
      const parsedUri1 = vscode.Uri.parse(testParams[0]);
      const parsedUri2 = vscode.Uri.parse(testParams[1]);

      const getWorkspaceFolderStub = sandbox.stub(vscode.workspace, 'getWorkspaceFolder');
      getWorkspaceFolderStub.withArgs(parsedUri1).returns(fakeWorkspaceFolder1);
      getWorkspaceFolderStub.withArgs(parsedUri2).returns(fakeWorkspaceFolder2);

      // Ensure active editor and workspaceFolders are undefined
      sandbox.stub(vscode.window, 'activeTextEditor').value(undefined);
      sandbox.stub(vscode.workspace, 'workspaceFolders').value(undefined);

      const result = getBaseUri(testParams);
      expect(result).to.be.an('array').with.lengthOf(2);
      expect(result[0]).to.equal(fakeFolderUri1.toString());
      expect(result[1]).to.equal(fakeFolderUri2.toString());
   });
});


// Pseudocode:
// 1. Create a test suite named "pathFromUri".
// 2. In suiteSetup, import chai's expect and retrieve pathFromUri and uriFromString from the module, and require vscode.
// 3. In setup/teardown, create and restore sinon sandbox.
// 4. Test 1: When input is an empty string, expect the output to be an empty string.
// 5. Test 2: When a vscode.Uri with scheme "file" is provided, verify that the returned path has the drive letter lowercased and contains the rest of the fsPath.
// 6. Test 3: When a vscode.Uri with a non-"file" scheme is provided and dropScheme is false, expect the returned string to be the full URI string.
// 7. Test 4: When a vscode.Uri with a non-"file" scheme is provided and dropScheme is true, expect the returned string to be the uri.path.
// 8. Test 5: When the input is a string (for a file URI), expect it to be converted into a vscode.Uri, then processed correctly.
// 9. Test 6: When an array of inputs is provided, expect an array of corresponding output paths.
// 10. Each test is appended to the existing test file.

suite('pathFromUri', () => {
   let expect;
   let pathFromUri;
   let sandbox;
   let uriFromString;

   suiteSetup(async () => {
      const chai = await import('chai');
      expect = chai.expect;
      ({ pathFromUri, uriFromString } = await import('../../src/uri.js'));
   });

   setup(() => {
      sandbox = sinon.createSandbox();
   });

   teardown(() => {
      sandbox.restore();
   });

   test('should return empty string if input is empty', () => {
      const result = pathFromUri('');
      expect(result).to.equal('');
   });

   test('should convert a file scheme vscode.Uri to file system path with lower case drive letter', () => {
      const fileUri = vscode.Uri.parse('file:///C:/Test/File.txt');
      const result = pathFromUri(fileUri);
      // Check that drive letter is lower-cased
      expect(result).to.match(/^c:/);
      // Check that the rest of the path is present
      if (process.platform === 'win32') {
         expect(result).to.include('\\Test\\File.txt');
      } else {
         expect(result).to.include('/Test/File.txt');
      }
   });

   test('should return full URI string for non-file scheme when dropScheme is false', () => {
      const nonFileUri = vscode.Uri.parse('http://example.com/path');
      const result = pathFromUri(nonFileUri, false);
      expect(result).to.equal(nonFileUri.toString());
   });

   test('should return uri.path for non-file scheme when dropScheme is true', () => {
      const nonFileUri = vscode.Uri.parse('http://example.com/path');
      const result = pathFromUri(nonFileUri, true);
      expect(result).to.equal(nonFileUri.path);
   });

   test('should handle string input by converting it to a vscode.Uri and returning correct file system path', () => {
      const input = 'file:///C:/Test/StringInput.txt';
      const result = pathFromUri(input);
      // Expect drive letter lower cased and proper path formatting
      expect(result).to.match(/^c:/);
      if (process.platform === 'win32') {
         expect(result).to.include('\\Test\\StringInput.txt');
      } else {
         expect(result).to.include('/Test/StringInput.txt');
      }
   });

   test('should handle an array of inputs and return an array of paths', () => {
      const inputs = [
         'file:///C:/Test/File1.txt',
         'http://example.com/path'
      ];
      const results = pathFromUri(inputs, true);
      expect(results).to.be.an('array').with.lengthOf(2);
      // For file URI, dropScheme is ignored; expect file system path with lower case drive letter
      expect(results[0]).to.match(/^c:/);
      // For non-file URI with dropScheme true, expect uri.path
      const nonFileUri = vscode.Uri.parse(inputs[1]);
      expect(results[1]).to.equal(nonFileUri.path);
   });
});


