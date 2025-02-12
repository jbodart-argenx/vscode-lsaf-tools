const path = require('path');
const webpack = require('webpack');

const commonConfig = {
   mode: 'production', // 'production' or 'development'
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
         "path": require.resolve("path-browserify"),
         "os": require.resolve("os-browserify/browser")
      }
   },
   externals: {
      vscode: 'commonjs vscode',
   },
   plugins: [
      new webpack.DefinePlugin({
         'self': JSON.stringify('typeof self !== "undefined" ? self : this')
      })
   ]
};

const nodeConfig = {
   ...commonConfig,
   target: 'node', // Use 'node' for Node.js environment (code-server)
};

const webConfig = {
   ...commonConfig,
   target: 'webworker', // Use 'webworker' for web extensions
};

module.exports = [nodeConfig, webConfig];