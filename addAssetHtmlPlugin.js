import path from 'path';
import Promise from 'bluebird';

// Copied from html-webpack-plugin
function resolvePublicPath(compilation, filename) {
  let publicPath = typeof compilation.options.output.publicPath !== 'undefined'
    ? compilation.options.output.publicPath
    : path.relative(path.dirname(filename), '.');

  if (publicPath.length && publicPath.substr(-1, 1) !== '/') {
    publicPath += '/';
  }
  return publicPath;
}

function addFileToAssets(htmlPluginData, compilation, { filename, typeOfAsset = 'js', includeSourcemap = true } = {}) {
  if (!filename) return compilation.errors.push(new Error('No filename defined'));

  return htmlPluginData.plugin.addFileToAssets(filename, compilation)
    .then(addedFilename => htmlPluginData.assets[typeOfAsset].unshift(`${resolvePublicPath(compilation, addedFilename)}${addedFilename}`))
    .then(() => {
      if (includeSourcemap) {
        return htmlPluginData.plugin.addFileToAssets(`${filename}.map`, compilation);
      }
      return null;
    });
}

export default class AddAssetHtmlPlugin {
  constructor(assets = []) {
    this.assets = Array.isArray(assets) ? assets.slice().reverse() : [assets];
  }

  apply(compiler) {
    compiler.plugin('compilation', compilation => {
      compilation.plugin('html-webpack-plugin-before-html-generation', (htmlPluginData, callback) => {
        Promise.mapSeries(this.assets, asset => addFileToAssets(htmlPluginData, compilation, asset))
          .then(() => callback(null, htmlPluginData));
      });
    });
  }
}
