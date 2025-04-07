class Uri {
  constructor(fsPath, scheme) {
    this.fsPath = fsPath;
    this.scheme = scheme;
  }
  toString() {
    return this.scheme === 'file'
      ? `file://${this.fsPath}`
      : `${this.scheme}://dummy`; // simple dummy for non-file URIs
  }
  static file(path) {
    // Lowercase drive letter for Windows paths if applicable
    const modifiedPath = path.replace(/^[A-Z]:/, s => s.toLowerCase());
    return new Uri(modifiedPath, 'file');
  }
  static parse(uri) {
    const scheme = uri.split('://')[0];
    return new Uri(uri, scheme);
  }
}

module.exports = {
  window: {
    showInformationMessage: jest.fn(),
    showErrorMessage: jest.fn(),
    showWarningMessage: jest.fn(),
    activeTextEditor: { document: { uri: { toString: () => 'file:///dummy' } } }
  },
  env: {
    clipboard: { writeText: jest.fn().mockResolvedValue() }
  },
  workspace: {
    fs: {
      stat: jest.fn()
    },
    getWorkspaceFolder: jest.fn(),
    workspaceFolders: [],
    getConfiguration: jest.fn().mockReturnValue({
      get: jest.fn().mockReturnValue([]) // Return an empty array of endpoints
    }),
    onDidChangeConfiguration: jest.fn()
  },
  commands: {
    registerCommand: jest.fn(),
    getCommands: jest.fn().mockResolvedValue([])
  },
  Uri,  // Export the class so that instanceof works
  extensions: {
    all: []
  }
};