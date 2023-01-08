# add-asset-html-webpack-plugin

> Add a JavaScript or CSS asset to the HTML generated by `html-webpack-plugin`
> Using Webassets to add JavaScript and CSS files takes advantage of Webassets’ features, such as automatically serving minified files in production, caching and bundling files together to reduce page load times, specifying dependencies between files so that the files a page needs (and only the files it needs) are always loaded, and other tricks to optimize page load times.

[![NPM Version][npm-image]][npm-url]
[![CI Build Status][gh-actions-image]][gh-actions-url]
[![Code Coverage branch][codecov-image]][codecov-url]

## Installation

Install the plugin with `npm`:

```sh
$ npm i add-asset-html-webpack-plugin -D
```

NOTE: This plugin requires `html-webpack-plugin@^3`, `html-webpack-plugin@^4`,
or `html-webpack-plugin@^5`.

## Basic Usage

The plugin will add the given JS or CSS file to the files Webpack knows about,
and put it into the list of assets `html-webpack-plugin` injects into the
generated html. Add the plugin to your config, providing it a filepath:

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
    <meta charset="UTF-8" />
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
  // Glob to match all of the dll file, make sure to use forward slashes on Windows
  { glob: require.resolve('./**/*.dll.js') },
]);
```

## Options

Options are passed to the plugin during instantiation.

```js
new AddAssetHtmlPlugin({ filepath: require.resolve('./some-file') });
```

#### `filepath`

Type: `string`, mandatory unless `glob` is defined

The absolute path of the file you want to add to the compilation, and resulting
HTML file.

#### `glob`

Type: `string`, mandatory unless `filepath` is defined

A glob used to locate files to add to the compilation. See
[`globby`'s docs](https://github.com/sindresorhus/globby) for how to use it.

#### `files`

Type: `string|Array<string>`, default `[]

Files that the assets will be added to.

By default the assets will be included in all files. If files are defined, the
assets will only be included in specified file globs.

#### `hash`

Type: `boolean`, default: `false`

If `true`, will append a unique hash of the file to the filename. This is useful
for cache busting.

#### `includeRelatedFiles`

Type: `boolean`, default: `true`

If `true`, will add `filepath + '.*'` to the compilation as well. E.g
`filepath.map` and `filepath.gz`.

#### `outputPath`

Type: `string`

If set, will be used as the output directory of the file.

#### `publicPath`

Type: `string`

If set, will be used as the public path of the script or link tag.

#### `typeOfAsset`

Type: `string`, default: `js`

Can be set to `css` to create a `link`-tag instead of a `script`-tag.

#### `attributes`

Type: `object`, default: `{}`

Extra attributes to be added to the generated tag. Useful to for instance add
`nomodule` to a polyfill script. The `attributes` object uses the key as the
name of the attribute, and the value as the value of it. If value is simply
`true` no value will be added.

An example of this is included in the repository.

Currently only supports script tags.

## Examples

When adding assets, it's added to the start of the array, so when
`html-webpack-plugin` injects the assets, it's before other assets. If you
depend on some order for the assets beyond that, and ordering the plugins
doesn't cut it, you'll have to create a custom template and add the tags
yourself.

### Add a DLL file from `webpack.DllPlugin`

Note: Remember to build the DLL file in a separate build.

See [example](example/dll/) for an example of how to set it up. You can run it
by cloning this repo, running `yarn` followed by `yarn run example`.

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

### Add a polyfill file you have locally

See [example](example/polyfill/) for an example of how to use it. You can run it
by cloning this repo, running `yarn` followed by `yarn run example`.

#### Webpack config

```js
const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const AddAssetHtmlPlugin = require('../../');

const webpackConfig = {
  entry: 'entry.js',
  devtool: '#source-map',
  mode: 'development',
  output: {
    path: 'dist',
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
```

[npm-url]: https://npmjs.org/package/add-asset-html-webpack-plugin
[npm-image]: https://img.shields.io/npm/v/add-asset-html-webpack-plugin.svg
[gh-actions-url]:
  https://github.com/SimenB/add-asset-html-webpack-plugin/actions/workflows/node.js.yml
[gh-actions-image]:
  https://github.com/SimenB/add-asset-html-webpack-plugin/actions/workflows/node.js.yml/badge.svg?branch=main
[codecov-url]: https://codecov.io/gh/SimenB/add-asset-html-webpack-plugin
[codecov-image]:
  https://img.shields.io/codecov/c/github/SimenB/add-asset-html-webpack-plugin/main.svg
