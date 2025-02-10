const path = require('path');

module.exports = {
   mode: 'production', // Set the mode to 'production' or 'development'
   target: 'webworker', // Use 'webworker' for web extensions
   entry: {
      extension: './src/extension.js',
      'web/extension': './src/web/extension.js' // Add a new entry point for the web extension
   },
   output: {
      path: path.resolve(__dirname, 'dist'),
      filename: '[name].js',  // Output filename pattern - replaced with the name of each entry point defined in the entry section. In this case, there are two entry points: 'extension' and 'web/extension'.
      libraryTarget: 'commonjs2',
   },
   resolve: {
      extensions: ['.js'],
      fallback: {
         "path": require.resolve("path-browserify")
      }
   },
   externals: {
      vscode: 'commonjs vscode',
   },
};