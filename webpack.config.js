const path = require('path');

module.exports = {
   mode: 'production', // Set the mode to 'production' or 'development'
   target: 'node',
   entry: './src/extension.js',
   output: {
      path: path.resolve(__dirname, 'dist'),
      filename: 'extension.js',
      libraryTarget: 'commonjs2',
   },
   resolve: {
      extensions: ['.js'],
   },
   externals: {
      vscode: 'commonjs vscode',
   },
};