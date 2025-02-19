const sinon = require('sinon');
const vscode = require('vscode');
const { getDefaultEndpoints } = require('../../src/endpoints');

suite('defaultEndpoints', () => {
   let sandbox;
   let mockConfig;
   let expect;

   suiteSetup(async () => {
      const chai = await import('chai');
      expect = chai.expect;
   });

   setup(() => {
      sandbox = sinon.createSandbox();
      mockConfig = {
         get: sandbox.stub()
      };
      sandbox.stub(vscode.workspace, 'getConfiguration').returns(mockConfig);
   });

   teardown(() => {
      sandbox.restore();
   });

   test('should return default endpoints from configuration', () => {
      const endpoints = [
         {
            label: 'local',
            uri: 'file:///c:/Users/testuser/lsaf/'
         },
         {
            label: 'example/repo',
            url: 'https://example.ondemand.sas.com/lsaf/webdav/repo/',
            uri: 'lsaf-repo://example/'
         }
      ];
      const onDidChangeConfigurationStub = sandbox.stub(vscode.workspace, 'onDidChangeConfiguration').callsFake((callback) => {
         onDidChangeConfigurationStub.yield = (event) => callback(event);
      });

      mockConfig.get.withArgs('defaultEndpoints').returns(endpoints);

      const result = getDefaultEndpoints();
      expect(result).to.be.an('array').with.lengthOf(2);
      expect(result[0]).to.have.property('label', 'local');
      expect(result[0].uri.toString()).to.equal('file:///c%3A/Users/testuser/lsaf/');
      expect(result[1]).to.have.property('label', 'example/repo');
      expect(result[1].uri.toString()).to.equal('lsaf-repo://example/');
      expect(result[1]).to.have.property('url', 'https://example.ondemand.sas.com/lsaf/webdav/repo/');
   });

   test('should handle endpoints with only uri', () => {
      const endpoints = [
         {
            label: 'local',
            uri: 'file:///c:/Users/testuser/lsaf/'
         }
      ];
      mockConfig.get.withArgs('defaultEndpoints').returns(endpoints);

      const result = getDefaultEndpoints();
      expect(result).to.be.an('array').with.lengthOf(1);
      expect(result[0]).to.have.property('label', 'local');
      expect(result[0].uri.toString()).to.equal('file:///c%3A/Users/testuser/lsaf/');
   });

   test('should handle endpoints with url and uri', () => {
      const endpoints = [
         {
            label: 'example/repo',
            url: 'https://example.ondemand.sas.com/lsaf/webdav/repo/',
            uri: 'lsaf-repo://example/'
         }
      ];
      mockConfig.get.withArgs('defaultEndpoints').returns(endpoints);

      const result = getDefaultEndpoints();
      expect(result).to.be.an('array').with.lengthOf(1);
      expect(result[0]).to.have.property('label', 'example/repo');
      expect(result[0].uri.toString()).to.equal('lsaf-repo://example/');
      expect(result[0]).to.have.property('url', 'https://example.ondemand.sas.com/lsaf/webdav/repo/');
   });

   test('should handle endpoints with url and no uri', () => {
      const endpoints = [
         {
            label: 'example/repo',
            url: 'https://example.ondemand.sas.com/lsaf/webdav/repo/'
         }
      ];
      mockConfig.get.withArgs('defaultEndpoints').returns(endpoints);

      const result = getDefaultEndpoints();
      expect(result).to.be.an('array').with.lengthOf(1);
      expect(result[0]).to.have.property('label', 'example/repo');
      expect(result[0].uri.toString()).to.equal('lsaf-repo://example/');
      expect(result[0]).to.have.property('url', 'https://example.ondemand.sas.com/lsaf/webdav/repo/');
   });

   test('should handle empty endpoints', () => {
      mockConfig.get.withArgs('defaultEndpoints').returns([]);

      const result = getDefaultEndpoints();
      expect(result).to.be.an('array').with.lengthOf(0);
   });

   test('should update defaultEndpoints on configuration change', () => {
      const endpoints = [
         {
            label: 'local',
            uri: 'file:///c:/Users/testuser/lsaf/'
         }
      ];
      mockConfig.get.withArgs('defaultEndpoints').returns(endpoints);

      let defaultEndpoints = getDefaultEndpoints();
      expect(defaultEndpoints).to.be.an('array').with.lengthOf(1);

      const newEndpoints = [
         {
            label: 'example/repo',
            url: 'https://example.ondemand.sas.com/lsaf/webdav/repo/',
            uri: 'lsaf-repo://example/'
         }
      ];
      mockConfig.get.withArgs('defaultEndpoints').returns(newEndpoints);

      const onDidChangeConfigurationStub = sandbox.stub(vscode.workspace, 'onDidChangeConfiguration').callsFake((callback) => {
         onDidChangeConfigurationStub.yield = (event) => callback(event);
      });

      defaultEndpoints = getDefaultEndpoints();
      expect(defaultEndpoints).to.be.an('array').with.lengthOf(1);
      expect(defaultEndpoints[0]).to.have.property('label', 'example/repo');
      expect(defaultEndpoints[0].uri.toString()).to.equal('lsaf-repo://example/');
      expect(defaultEndpoints[0]).to.have.property('url', 'https://example.ondemand.sas.com/lsaf/webdav/repo/');
   });
});