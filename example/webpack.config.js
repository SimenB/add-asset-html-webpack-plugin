const path = require('path');
const webpack = require('webpack');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const AddAssetHtmlPlugin = require('../');

module.exports = {
  // Normally CWD
  context: __dirname,
  entry: path.join(__dirname, 'entry.js'),
  devtool: '#source-map',
  mode: 'development',
  output: {
    path: path.join(__dirname, 'dist'),
    filename: 'index_bundle.js',
  },
  plugins: [
    new webpack.DllReferencePlugin({
      context: __dirname,
      // eslint-disable-next-line global-require
      manifest: require('./build/vendor-manifest.json'),
    }),
    new HtmlWebpackPlugin(),
    new AddAssetHtmlPlugin({
      filepath: path.resolve(__dirname, './build/*.dll.js'),
    }),
  ],
};
