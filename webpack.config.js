const path = require('path');
const webpack = require('webpack');
// const { BundleAnalyzerPlugin } = require('webpack-bundle-analyzer');

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
         "os": require.resolve("os-browserify/browser"),
         "util": require.resolve("util"), // Use the 'util' module from npm as a fallback of the Node.js module
         "stream": require.resolve("stream-browserify"), // Use the 'stream' module from npm as a fallback of the Node.js module
      }
   },
   externals: {
      vscode: 'commonjs vscode',
   },
   plugins: [
      new webpack.DefinePlugin({
         'self': JSON.stringify('typeof self !== "undefined" ? self : this')
      }),
      // new BundleAnalyzerPlugin()  // after building, open a web page showing the dependency tree of the project
   ]
};

const nodeConfig = {
   ...commonConfig,
   target: 'node', // Use 'node' for Node.js environment (code-server)
};

const webConfig = {
   ...commonConfig,
   target: 'webworker', // Use 'webworker' for web extensions
   plugins: [
      ...commonConfig.plugins,
      new webpack.IgnorePlugin({
         resourceRegExp: /^fs$/,
      }),
   ],
};

module.exports = [nodeConfig, webConfig];