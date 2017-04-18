const path = require('path');
const webpack = require('webpack');

module.exports = {
  // Normally CWD
  context: __dirname,
  entry: {
    ov1: ['./otherVendor.js'],
  },
  devtool: '#source-map',
  output: {
    path: path.join(__dirname, 'build'),
    filename: '[name].dll.js',
    library: '[name]_[hash]',
  },
  plugins: [
    new webpack.DllPlugin({
      path: path.join(__dirname, 'build', '[name]-manifest.json'),
      name: '[name]_[hash]',
    }),
  ],
};
