const path = require('path');
const webpack = require('webpack');
// const { BundleAnalyzerPlugin } = require('webpack-bundle-analyzer');

const commonConfig = {
   mode: 'production', // 'production' or 'development'
   entry: {
      extension: './src/extension.js'
   },
   output: {
      path: path.resolve(__dirname, 'dist'),
      filename: '[name].js',
      libraryTarget: 'commonjs2',
      publicPath: './',
   },
   resolve: {
      extensions: ['.js'],
      fallback: {
         // "path": require.resolve("path-browserify"),
         // "os": require.resolve("os-browserify/browser"),
         // "util": require.resolve("util"), // Use the 'util' module from npm as a fallback of the Node.js module
         // "stream": require.resolve("stream-browserify"), // Use the 'stream' module from npm as a fallback of the Node.js module
      }
   },
   externals: {
      vscode: 'commonjs vscode',
   },
   plugins: [
      new webpack.DefinePlugin({
         'self': 'globalThis'
      }),
      // Force all dynamic imports to be included in the main bundle
      new webpack.optimize.LimitChunkCountPlugin({
         maxChunks: 1
      }),
      // new BundleAnalyzerPlugin()  // after building, open a web page showing the dependency tree of the project
   ],
   optimization: {
      // Completely disable code splitting
      minimize: true,
      splitChunks: false,
      runtimeChunk: false
   }
};

const nodeConfig = {
   ...commonConfig,
   target: 'node', // Use 'node' for Node.js environment (code-server)
};

module.exports = nodeConfig;