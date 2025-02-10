const path = require('path');
const { BundleAnalyzerPlugin } = require('webpack-bundle-analyzer');
const TerserPlugin = require('terser-webpack-plugin');

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
   optimization: {
      splitChunks: {
         chunks: 'all',
      },
      minimize: true,
      minimizer: [new TerserPlugin()],
   },
   plugins: [
      new BundleAnalyzerPlugin({
         analyzerMode: 'static',
         openAnalyzer: false,
         reportFilename: 'bundle-report.html',
      }),
   ],
};