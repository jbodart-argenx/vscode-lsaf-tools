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
      ({ isValidUri } = await import('../src/uri.js'));
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
      ({ uriFromString } = await import('../src/uri.js'));
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

   test('should return vscode.Uri for an array of valid URI strings', async () => {
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

   test('should return vscode.Uri for a valid URI object', async () => {
      const uri = vscode.Uri.parse('http://example.com');
      const result = uriFromString(uri);
      expect(result).to.be.instanceOf(vscode.Uri);
      expect(result.toString()).to.equal(uri.toString());
   });
});