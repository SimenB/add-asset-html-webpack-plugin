# add-asset-html-webpack-plugin

> Add a JavaScript or CSS asset to the HTML generated by `html-webpack-plugin`

[![NPM Version][npm-image]][npm-url]
[![Linux & Mac Build Status][travis-image]][travis-url]
[![Windows Build Status][appveyor-image]][appveyor-url]
[![Code Coverage branch][codecov-image]][codecov-url]

[![Dependency Status][david-image]][david-url]
[![Dev Dependency Status][david-dev-image]][david-dev-url]
[![Peer Dependency Status][david-peer-image]][david-peer-url]
[![Greenkeeper Dependency Status][greenkeeper-image]][greenkeeper-url]

## Installation

Install the plugin with `npm`:

```sh
$ npm i add-asset-html-webpack-plugin -D
```

NOTE: This plugin requires `html-webpack-plugin@^2.10.0`.

## Basic Usage

The plugin will add the given JS or CSS file to the files Webpack knows about,
and put it into the list of assets `html-webpack-plugin` injects into the
generated html. Add the plugin the your config, providing it a filepath:

```js
const HtmlWebpackPlugin = require('html-webpack-plugin');
const AddAssetHtmlPlugin = require('add-asset-html-webpack-plugin');
const webpackConfig = {
  entry: 'index.js',
  output: {
    path: 'dist',
    filename: 'index_bundle.js',
  },
  plugins: [
    new HtmlWebpackPlugin(),
    new AddAssetHtmlPlugin({ filepath: require.resolve('./some-file') }),
  ],
};
```

This will add a script tag to the HTML generated by `html-webpack-plugin`, and
look like:

```html
<!DOCTYPE html>
<html>
  <head>
    <meta charset="UTF-8">
    <title>Webpack App</title>
  </head>
  <body>
    <script src="index_bundle.js"></script>
    <script src="some-file.js"></script>
  </body>
</html>
```

NOTE: You can also pass an array of assets to be added. Same API as mentioned
below, just pass multiple objects as an array.

```js
new AddAssetHtmlPlugin([
  { filepath: require.resolve('./some-file') },
  { filepath: require.resolve('./some-other-file') },
  // Glob to match all of the dll file
  { filepath: require.resolve('./**/*.dll.js') },
]);
```

## Options

Options are passed to the plugin during instantiation.

```js
new AddAssetHtmlPlugin({ filepath: require.resolve('./some-file') });
```

#### `filepath`

Type: `string|Glob`, mandatory

The absolute path of the file you want to add to the compilation, and resulting
HTML file. Also support globby string.

#### `files`

Type: `string|Array<string>`, default `[]

Files that the assets will be added to.

By default the assets will be included in all files. If files are defined, the
assets will only be included in specified file globs.

#### `hash`

Type: `boolean`, default: `false`

If `true`, will append a unique hash of the file to the filename. This is useful
for cache busting.

#### `includeSourcemap`

Type: `boolean`, default: `true`

If `true`, will add `filepath + '.map'` to the compilation as well.

#### `includeGzipped`
Type: `boolean`, default: `true`

If `true`, will add `filepath + '.gz'` to the compilation as well.

#### `outputPath`

Type: `string`

If set, will be used as the output directory of the file.

#### `publicPath`

Type: `string`

If set, will be used as the public path of the script or link tag.

#### `typeOfAsset`

Type: `string`, default: `js`

Can be set to `css` to create a `link`-tag instead of a `script`-tag.

## Examples

### Add a DLL file from `webpack.DllPlugin`

Note: Remember to build the DLL file in a separate build.

See [example](example/) for an example of how to set it up. You can run it by
cloning this repo, running `yarn` followed by `yarn run example`.

When adding assets, it's added to the start of the array, so when
`html-webpack-plugin` injects the assets, it's before other assets. If you
depend on some order for the assets beyond that, and ordering the plugins
doesn't cut it, you'll have to create a custom template and add the tags
yourself.

#### Webpack config

```js
const path = require('path');
const webpack = require('webpack');
const webpackConfig = {
  entry: {
    vendor: ['react', 'redux', 'react-router'],
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
```

Your main build:

```js
const path = require('path');
const webpack = require('webpack');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const AddAssetHtmlPlugin = require('add-asset-html-webpack-plugin');
const webpackConfig = {
  entry: 'index.js',
  output: {
    path: 'dist',
    filename: 'index_bundle.js',
  },
  plugins: [
    new webpack.DllReferencePlugin({
      context: path.join(__dirname),
      manifest: require('./build/vendor-manifest.json'),
    }),
    new HtmlWebpackPlugin(),
    new AddAssetHtmlPlugin({
      filepath: path.resolve(__dirname, './build/*.dll.js'),
    }),
  ],
};
```

[npm-url]: https://npmjs.org/package/add-asset-html-webpack-plugin
[npm-image]: https://img.shields.io/npm/v/add-asset-html-webpack-plugin.svg
[travis-url]: https://travis-ci.org/SimenB/add-asset-html-webpack-plugin
[travis-image]: https://img.shields.io/travis/SimenB/add-asset-html-webpack-plugin/master.svg
[appveyor-url]: https://ci.appveyor.com/project/SimenB/add-asset-html-webpack-plugin
[appveyor-image]: https://ci.appveyor.com/api/projects/status/dim5hcl49h3pi332/branch/master?svg=true
[codecov-url]: https://codecov.io/gh/SimenB/add-asset-html-webpack-plugin
[codecov-image]: https://img.shields.io/codecov/c/github/SimenB/add-asset-html-webpack-plugin/master.svg
[david-url]: https://david-dm.org/SimenB/add-asset-html-webpack-plugin
[david-image]: https://img.shields.io/david/SimenB/add-asset-html-webpack-plugin.svg
[david-dev-url]: https://david-dm.org/SimenB/add-asset-html-webpack-plugin?type=dev
[david-dev-image]: https://img.shields.io/david/dev/SimenB/add-asset-html-webpack-plugin.svg
[david-peer-url]: https://david-dm.org/SimenB/add-asset-html-webpack-plugin?type=peer
[david-peer-image]: https://img.shields.io/david/peer/SimenB/add-asset-html-webpack-plugin.svg
[greenkeeper-url]: https://greenkeeper.io/
[greenkeeper-image]: https://badges.greenkeeper.io/SimenB/add-asset-html-webpack-plugin.svg
