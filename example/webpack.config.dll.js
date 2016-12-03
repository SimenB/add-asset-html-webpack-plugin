const path = require('path');
const webpack = require('webpack');

module.exports = {
  // Normally CWD
  context: __dirname,
  entry: {
    vendor: ['classnames'],
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
