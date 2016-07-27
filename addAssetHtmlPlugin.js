import path from 'path';
import crypto from 'crypto';
import Promise from 'bluebird';

// Copied from html-webpack-plugin
function resolvePublicPath(compilation, filename, publicPath) {
  let resolvedPublicPath;
  if (typeof publicPath === 'undefined') {
    /* istanbul ignore else */
    resolvedPublicPath = typeof compilation.options.output.publicPath !== 'undefined'
      ? compilation.options.output.publicPath
      : path.relative(path.dirname(filename), '.'); // TODO: How to test this? I haven't written this logic, unsure what it does
  } else {
    resolvedPublicPath = publicPath;
  }

  if (resolvedPublicPath.length && resolvedPublicPath.substr(-1, 1) !== '/') {
    resolvedPublicPath = `${resolvedPublicPath}/`;
  }
  return resolvedPublicPath;
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

      // TODO: No need to call this if `publicPath` is provided
      const resolvedPublicPath = resolvePublicPath(compilation, addedFilename, publicPath);
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
