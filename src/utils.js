const path = require('path');
const globby = require('globby');

function ensureTrailingSlash(string) {
  if (string.length && string.substr(-1, 1) !== '/') {
    return `${string}/`;
  }

  return string;
}

// Copied from html-webpack-plugin
function resolvePublicPath(compilation, filename) {
  /* istanbul ignore else */
  const publicPath =
    typeof compilation.options.output.publicPath !== 'undefined'
      ? compilation.options.output.publicPath
      : path.relative(path.dirname(filename), '.'); // TODO: How to test this? I haven't written this logic, unsure what it does

  return ensureTrailingSlash(publicPath);
}

function resolveOutput(compilation, addedFilename, outputPath) {
  if (outputPath && outputPath.length) {
    /* eslint-disable no-param-reassign */
    compilation.assets[`${outputPath}/${addedFilename}`] =
      compilation.assets[addedFilename];
    delete compilation.assets[addedFilename];
    /* eslint-enable */
  }
}

/**
 * handle globby filepath and return an array with all matched assets.
 *
 * @export
 * @param {Array} assets
 * @returns
 */
async function handleUrl(assets) {
  const globbyAssets = [];
  const normalAssets = [];
  assets.forEach(asset => {
    if (asset.filepath && asset.glob) {
      throw new Error(
        `Both filepath and glob defined in ${JSON.stringify(
          asset,
        )} - only use one of them`,
      );
    }

    return asset.glob ? globbyAssets.push(asset) : normalAssets.push(asset);
  });
  const ret = [];
  await Promise.all(
    globbyAssets.map(asset =>
      globby(asset.glob).then(paths =>
        paths.forEach(filepath =>
          ret.push(Object.assign({}, asset, { filepath })),
        ),
      ),
    ),
  );

  return ret.concat(normalAssets);
}

module.exports.ensureTrailingSlash = ensureTrailingSlash;
module.exports.resolvePublicPath = resolvePublicPath;
module.exports.resolveOutput = resolveOutput;
module.exports.handleUrl = handleUrl;
