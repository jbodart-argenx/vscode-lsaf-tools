const sinon = require('sinon');
let expect;

suite('Console Message Tests', () => {
   let sandbox;
   let logger;
   let consoleLogStub;
   let consoleWarnStub;
   let consoleErrorStub;

   suiteSetup(async () => {
        const chai = await import('chai');
        expect = chai.expect;
    });

   setup(() => {
      sandbox = sinon.createSandbox();
      logger = {
         log: console.log,
         warn: console.warn,
         error: console.error
      };
      consoleLogStub = sandbox.stub(logger, 'log');
      consoleWarnStub = sandbox.stub(logger, 'warn');
      consoleErrorStub = sandbox.stub(logger, 'error');
   });

   teardown(() => {
      sandbox.restore();
   });

   test('should capture and assert logger.log messages', () => {
      logger.log('This is a log message');
      expect(consoleLogStub.calledOnce).to.be.true;
      expect(consoleLogStub.firstCall.args[0]).to.equal('This is a log message');
   });

   test('should capture and assert logger.warn messages', () => {
      logger.warn('This is a warning message');
      expect(consoleWarnStub.calledOnce).to.be.true;
      expect(consoleWarnStub.firstCall.args[0]).to.equal('This is a warning message');
   });

   test('should capture and assert logger.error messages', () => {
      logger.error('This is an error message');
      expect(consoleErrorStub.calledOnce).to.be.true;
      expect(consoleErrorStub.firstCall.args[0]).to.equal('This is an error message');
   });
});