const path = require('path');
const webpack = require('webpack');

module.exports = {
  // Normally CWD
  context: __dirname,
  entry: {
    vendor: ['classnames'],
  },
  devtool: 'source-map',
  mode: 'development',
  output: {
    path: path.join(__dirname, 'build'),
    filename: '[name].[chunkhash].dll.js',
    library: '[name]_[fullhash]',
  },
  plugins: [
    new webpack.DllPlugin({
      path: path.join(__dirname, 'build', '[name]-manifest.json'),
      name: '[name]_[fullhash]',
    }),
  ],
};
