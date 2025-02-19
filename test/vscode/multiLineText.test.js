const sinon = require('sinon');
const vscode = require('vscode');
const { getWebviewContent, showMultiLineText } = require('../../src/multiLineText.js');

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



