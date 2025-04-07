// test/jest/utils.copyToClipboard.test.js

jest.resetModules();

const vscode = require('vscode');
const { copyToClipboard } = require('../../src/utils');

describe('copyToClipboard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    vscode.env.clipboard.writeText = jest.fn().mockResolvedValue();
    vscode.window.showInformationMessage = jest.fn();
    vscode.window.showErrorMessage = jest.fn();
    vscode.window.showWarningMessage = jest.fn();
  });

  test('should successfully copy text to clipboard', async () => {
    const text = 'Sample text';
    await copyToClipboard(text);
    expect(vscode.env.clipboard.writeText).toHaveBeenCalledWith(text);
    expect(vscode.window.showInformationMessage).toHaveBeenCalledWith(`Text copied to clipboard: ${text}`);
  });

  test('should successfully copy array of text to clipboard', async () => {
    const textArray = ['Sample text 1', 'Sample text 2'];
    await copyToClipboard(textArray);
    const expectedCopy = textArray.join('\n');
    const expectedMessage = textArray.join(',');
    expect(vscode.env.clipboard.writeText).toHaveBeenCalledWith(expectedCopy);
    expect(vscode.window.showInformationMessage).toHaveBeenCalledWith(`Text copied to clipboard: ${expectedMessage}`);
  });

  test('should show error message when clipboard write fails', async () => {
    const text = 'Sample text';
    const error = new Error('Clipboard failed');
    vscode.env.clipboard.writeText.mockRejectedValue(error);

    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    await copyToClipboard(text);

    expect(vscode.window.showErrorMessage).toHaveBeenCalledWith(`Error copying Text to clipboard: ${error.message}`);
    expect(consoleErrorSpy).toHaveBeenCalledWith(`(Object.copyToClipboard) Error copying Text to clipboard: ${error.message}`);

    consoleErrorSpy.mockRestore();
  });

  test('should show warning message when no text is specified', async () => {
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    await copyToClipboard(null);

    expect(vscode.window.showWarningMessage).toHaveBeenCalledWith('Failed to copy Text to clipboard: no Text specified.');
    expect(consoleErrorSpy).toHaveBeenCalledWith('(Object.copyToClipboard) Failed to copy Text to clipboard: no Text specified.');

    consoleErrorSpy.mockRestore();
  });

  test('should log the caller function name', async () => {
    const text = 'Sample text';
    const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    await copyToClipboard(text);
    const expectedCaller = `Object.copyToClipboard`;
    expect(consoleLogSpy).toHaveBeenCalledWith(`(${expectedCaller}) Text copied to clipboard: ${text}`);
    consoleLogSpy.mockRestore();
  });
});