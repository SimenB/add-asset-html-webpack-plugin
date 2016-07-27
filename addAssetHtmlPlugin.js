import path from 'path';
import crypto from 'crypto';
import Promise from 'bluebird';

function ensureTrailingSlash(string) {
  if (string.length && string.substr(-1, 1) !== '/') {
    return `${string}/`;
  }

  return string;
}

// Copied from html-webpack-plugin
function resolvePublicPath(compilation, filename) {
  /* istanbul ignore else */
  const publicPath = typeof compilation.options.output.publicPath !== 'undefined'
      ? compilation.options.output.publicPath
      : path.relative(path.dirname(filename), '.'); // TODO: How to test this? I haven't written this logic, unsure what it does

  return ensureTrailingSlash(publicPath);
}

function addFileToAssets(compilation, htmlPluginData, { filepath, typeOfAsset = 'js', includeSourcemap = true, hash = false, publicPath }) {
  if (!filepath) {
    const error = new Error('No filename defined');
    compilation.errors.push(error);
    return Promise.reject(error);
  }

  return htmlPluginData.plugin.addFileToAssets(filepath, compilation)
    .then(addedFilename => {
      let suffix = '';
      if (hash) {
        const md5 = crypto.createHash('md5');
        md5.update(compilation.assets[addedFilename].source());
        suffix = `?${md5.digest('hex').substr(0, 20)}`;
      }

      const resolvedPublicPath = typeof publicPath === 'undefined' ?
        resolvePublicPath(compilation, addedFilename) :
        ensureTrailingSlash(publicPath);
      const resolvedPath = `${resolvedPublicPath}${addedFilename}${suffix}`;

      htmlPluginData.assets[typeOfAsset].unshift(resolvedPath);

      return resolvedPath;
    })
    .then(() => {
      if (includeSourcemap) {
        return htmlPluginData.plugin.addFileToAssets(`${filepath}.map`, compilation);
      }
      return null;
    });
}

// Visible for testing
export function addAllAssetsToCompilation(assets, compilation, htmlPluginData, callback) {
  return Promise.mapSeries(assets, asset => addFileToAssets(compilation, htmlPluginData, asset))
    .then(() => callback(null, htmlPluginData))
    .catch(e => callback(e, htmlPluginData));
}

export default class AddAssetHtmlPlugin {
  constructor(assets = []) {
    this.assets = Array.isArray(assets) ? assets.slice().reverse() : [assets];
  }

  /* istanbul ignore next: this would be integration tests */
  apply(compiler) {
    compiler.plugin('compilation', compilation => {
      compilation.plugin('html-webpack-plugin-before-html-generation', (htmlPluginData, callback) => {
        addAllAssetsToCompilation(this.assets, compilation, htmlPluginData, callback);
      });
    });
  }
}
