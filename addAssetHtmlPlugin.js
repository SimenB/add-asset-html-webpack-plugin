import path from 'path';
import crypto from 'crypto';
import Promise from 'bluebird';

// Copied from html-webpack-plugin
function resolvePublicPath(compilation, filename, publicPath) {
  let resolvedPublicPath;
  if (typeof publicPath === 'undefined') {
    resolvedPublicPath = typeof compilation.options.output.publicPath !== 'undefined'
      ? compilation.options.output.publicPath
      : path.relative(path.dirname(filename), '.');
  } else {
    resolvedPublicPath = publicPath;
  }

  if (resolvedPublicPath.length && resolvedPublicPath.substr(-1, 1) !== '/') {
    resolvedPublicPath += '/';
  }
  return resolvedPublicPath;
}

function addFileToAssets(htmlPluginData, compilation,
  { filename, typeOfAsset = 'js', includeSourcemap = true, hash = false, publicPath } = {}) {
  if (!filename) return compilation.errors.push(new Error('No filename defined'));

  return htmlPluginData.plugin.addFileToAssets(filename, compilation)
    .then(addedFilename => {
      let suffix = '';
      if (hash) {
        const md5 = crypto.createHash('md5');
        md5.update(compilation.assets[addedFilename].source());
        suffix = `?${md5.digest('hex').substr(0, 20)}`;
      }
      return htmlPluginData.assets[typeOfAsset]
        .unshift(`${resolvePublicPath(compilation, addedFilename, publicPath)}${addedFilename}${suffix}`);
    })
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
