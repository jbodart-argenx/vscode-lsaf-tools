const path = require('path');

module.exports = {
   mode: 'production', // 'production' or 'development'
   target: 'webworker', // 'webworker' for web extensions
   entry: {
      extension: './src/extension.js',
      'web/extension': './src/web/extension.js'
   },
   output: {
      path: path.resolve(__dirname, 'dist'),
      filename: '[name].js',  // Replaced pattern with the name of each entry point: 'extension' and 'web/extension'
      libraryTarget: 'commonjs2',
      publicPath: '' // Explicitly set the publicPath to an empty string
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