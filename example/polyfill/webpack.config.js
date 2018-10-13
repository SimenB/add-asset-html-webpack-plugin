const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const AddAssetHtmlPlugin = require('../../');

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
    new HtmlWebpackPlugin(),
    new AddAssetHtmlPlugin({
      filepath: path.resolve(__dirname, './polyfill.js'),
      attributes: {
        nomodule: true,
      },
    }),
  ],
};
