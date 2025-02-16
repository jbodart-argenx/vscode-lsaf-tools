const sinon = require('sinon');
const vscode = require('vscode');

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