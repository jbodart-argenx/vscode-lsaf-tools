const sinon = require('sinon');
const vscode = require('vscode');
const { showMultiLineText, getMultiLineText } = require('../../src/multiLineText.js');
const { getWebviewContent } = require('../../src/getMultiLineTextWebviewUtils.js');

suite('getWebviewContent', () => {
   let expect;

   suiteSetup(async () => {
      const chai = await import('chai');
      expect = chai.expect;
   });

   test('should generate HTML content with default parameters', () => {
      const result = getWebviewContent('default value');
      expect(result).to.include('<title>File Upload Comment</title>');
      expect(result).to.include('<h2>Enter File Upload Comment below:</h2>');
      expect(result).to.include('<textarea id="inputText" >default value</textarea>');
      expect(result).to.include('<button onclick="submitText()">Submit</button>');
   });

   test('should escape HTML characters in title, header, value, and button label', () => {
      const result = getWebviewContent('<value>', '<title>', '<header>', '<button>');
      expect(result).to.include('<title>&lt;title&gt;</title>');
      expect(result).to.include('<h2>&lt;header&gt;</h2>');
      expect(result).to.include('<textarea id="inputText" >&lt;value&gt;</textarea>');
      expect(result).to.include('<button onclick="submitText()">&lt;button&gt;</button>');
   });

   test('should set the textarea to readonly when editable is false', () => {
      const result = getWebviewContent('default value', 'title', 'header', 'button', false);
      expect(result).to.include('<textarea id="inputText" readonly>default value</textarea>');
   });

   test('should preserve whitespace when preserveWhitespace is true', () => {
      const result = getWebviewContent('default value', 'title', 'header', 'button', true, true);
      expect(result).to.include('font-family: monospace;');
      expect(result).to.include('white-space: pre-wrap;');
   });

   test('should not preserve whitespace when preserveWhitespace is false', () => {
      const result = getWebviewContent('default value', 'title', 'header', 'button', true, false);
      expect(result).to.include('font-family: sans-serif;');
      expect(result).to.not.include('white-space: pre-wrap;');
   });

   test('should use default header if header is not provided', () => {
      const result = getWebviewContent('default value', 'title');
      expect(result).to.include('<h2>Enter title below:</h2>');
   });

   test('should use provided header if header is provided', () => {
      const result = getWebviewContent('default value', 'title', 'custom header');
      expect(result).to.include('<h2>custom header</h2>');
   });

   test('should use default button label if button label is not provided', () => {
      const result = getWebviewContent('default value', 'title', 'header');
      expect(result).to.include('<button onclick="submitText()">Submit</button>');
   });

   test('should use provided button label if button label is provided', () => {
      const result = getWebviewContent('default value', 'title', 'header', 'custom button');
      expect(result).to.include('<button onclick="submitText()">custom button</button>');
   });
});

suite('showMultiLineText', function() {
   this.timeout(5000); // Increase the timeout for this suite

   let sandbox;
   let mockPanel;
   let expect;

   suiteSetup(async () => {
      const chai = await import('chai');
      expect = chai.expect;
   });

   setup(() => {
      sandbox = sinon.createSandbox();
      mockPanel = {
         webview: {
            html: '',
            onDidReceiveMessage: sandbox.stub()
         },
         onDidDispose: sandbox.stub(),
         dispose: sandbox.stub()
      };
      sandbox.stub(vscode.window, 'createWebviewPanel').returns(mockPanel);
   });

   teardown(() => {
      sandbox.restore();
   });

   test('should create a webview panel with the correct title', async () => {
      const title = 'Test Title';
      const promise = showMultiLineText('', title, '', 'Dismiss', true, getWebviewContent);
      mockPanel.onDidDispose.yield(); // Ensure the promise gets resolved
      await promise;
      expect(vscode.window.createWebviewPanel.calledOnce).to.be.true;
      const panelTitle = vscode.window.createWebviewPanel.firstCall.args[1];
      console.log("Panel title:", panelTitle); // Add a log to debug the title
      expect(panelTitle).to.equal(title);
   });

   test('should set the webview HTML content', async () => {
      const textValue = 'Test Text';
      const promise = showMultiLineText(textValue, 'Test Title', '', 'Dismiss', true, getWebviewContent);
      mockPanel.onDidDispose.yield(); // Ensure the promise gets resolved
      await promise;
      expect(mockPanel.webview.html).to.include(textValue);
   });

   test('should resolve with the submitted text', async () => {
      const textValue = 'Submitted Text';
      const promise = showMultiLineText('', 'Test Title', '', 'Dismiss', true, getWebviewContent);
      mockPanel.webview.onDidReceiveMessage.yield({ command: 'submitText', text: textValue });
      const result = await promise;
      expect(result).to.equal(textValue);
   });

   test('should reject with "Dismissed" if the panel is closed without submitting', async () => {
      const promise = showMultiLineText('', 'Test Title', '', 'Dismiss', true, getWebviewContent);
      mockPanel.onDidDispose.yield();
      try {
         await promise;
      } catch (error) {
         expect(error).to.equal('Dismissed');
      }
   });

   test('should use default values for optional parameters', async () => {
      const promise = showMultiLineText('', 'Text Content', '', 'Dismiss', true, getWebviewContent);
      mockPanel.onDidDispose.yield(); // Ensure the promise gets resolved
      await promise;
      expect(mockPanel.webview.html).to.include('<title>Text Content</title>');
      expect(mockPanel.webview.html).to.include('<h2>Enter Text Content below:</h2>');
      expect(mockPanel.webview.html).to.include('<button onclick="submitText()">Dismiss</button>');
   });

   test('should use provided values for optional parameters', async () => {
      const textValue = 'Test Text';
      const title = 'Test Title';
      const header = 'Test Header';
      const buttonLabel = 'Test Button';
      const preserveWhitespace = false;
      const promise = showMultiLineText(textValue, title, header, buttonLabel, preserveWhitespace, getWebviewContent);
      mockPanel.onDidDispose.yield(); // Ensure the promise gets resolved
      await promise;
      expect(mockPanel.webview.html).to.include(`<title>${title}</title>`);
      expect(mockPanel.webview.html).to.include(`<h2>${header}</h2>`);
      expect(mockPanel.webview.html).to.include(`<button onclick="submitText()">${buttonLabel}</button>`);
   });

   test('should preserve whitespace when preserveWhitespace is true', async () => {
      const promise = showMultiLineText('', '', '', '', true, getWebviewContent);
      mockPanel.onDidDispose.yield(); // Ensure the promise gets resolved
      await promise;
      expect(mockPanel.webview.html).to.include('font-family: monospace;');
      expect(mockPanel.webview.html).to.include('white-space: pre-wrap;');
   });

   test('should not preserve whitespace when preserveWhitespace is false', async () => {
      const promise = showMultiLineText('', '', '', '', false, getWebviewContent);
      mockPanel.onDidDispose.yield(); // Ensure the promise gets resolved
      await promise;
      expect(mockPanel.webview.html).to.include('font-family: sans-serif;');
      expect(mockPanel.webview.html).to.not.include('white-space: pre-wrap;');
   });
});



suite('getMultiLineText', function() {
   this.timeout(5000); // Increase the timeout for this suite

   let sandbox;
   let mockPanel;
   let expect;

   suiteSetup(async () => {
      const chai = await import('chai');
      expect = chai.expect;
   });

   setup(() => {
      sandbox = sinon.createSandbox();
      mockPanel = {
         webview: {
            html: '',
            onDidReceiveMessage: sandbox.stub()
         },
         onDidDispose: sandbox.stub(),
         dispose: sandbox.stub()
      };
      sandbox.stub(vscode.window, 'createWebviewPanel').returns(mockPanel);
   });

   teardown(() => {
      sandbox.restore();
   });

   test('should create a webview panel with the correct title', async () => {
      const title = 'Test Title';
      const promise = getMultiLineText('', title, getWebviewContent);
      mockPanel.onDidDispose.yield(); // Ensure the promise gets resolved
      await promise;
      expect(vscode.window.createWebviewPanel.calledOnce).to.be.true;
      const panelTitle = vscode.window.createWebviewPanel.firstCall.args[1];
      console.log("Panel title:", panelTitle); // Add a log to debug the title
      expect(panelTitle).to.equal(title);
   });

   test('should set the webview HTML content', async () => {
      const textValue = 'Test Text';
      const promise = getMultiLineText(textValue, 'Test Title', getWebviewContent);
      mockPanel.onDidDispose.yield(); // Ensure the promise gets resolved
      await promise;
      expect(mockPanel.webview.html).to.include(textValue);
   });

   test('should resolve with the submitted text', async () => {
      const textValue = 'Submitted Text';
      const promise = getMultiLineText('', 'Test Title', getWebviewContent);
      mockPanel.webview.onDidReceiveMessage.yield({ command: 'submitText', text: textValue });
      const result = await promise;
      expect(result).to.equal(textValue);
   });

   test('should reject with "Unknown command" if an unknown command is received', async () => {
      const promise = getMultiLineText('', 'Test Title', getWebviewContent);
      mockPanel.webview.onDidReceiveMessage.yield({ command: 'unknownCommand' });
      try {
         await promise;
      } catch (error) {
         expect(error).to.equal('Unknown command');
      }
   });

   test('should resolve with an empty string if the panel is closed without submitting', async () => {
      const promise = getMultiLineText('', 'Test Title', getWebviewContent);
      mockPanel.onDidDispose.yield();
      const result = await promise;
      expect(result).to.equal('');
   });

   test('should use default title if info is not provided', async () => {
      const promise = getMultiLineText('', undefined, getWebviewContent);
      mockPanel.onDidDispose.yield(); // Ensure the promise gets resolved
      await promise;
      const panelTitle = vscode.window.createWebviewPanel.firstCall.args[1];
      expect(panelTitle).to.equal('Multi-Line Input');
   });

   test('should use default title if info is not a string', async () => {
      const promise = getMultiLineText('', {}, getWebviewContent);
      mockPanel.onDidDispose.yield(); // Ensure the promise gets resolved
      await promise;
      const panelTitle = vscode.window.createWebviewPanel.firstCall.args[1];
      expect(panelTitle).to.equal('Multi-Line Input');
   });
});


