import path from 'path';
import globby from 'globby';

export function ensureTrailingSlash(string) {
  if (string.length && string.substr(-1, 1) !== '/') {
    return `${string}/`;
  }

  return string;
}

// Copied from html-webpack-plugin
export function resolvePublicPath(compilation, filename) {
  /* istanbul ignore else */
  const publicPath =
    typeof compilation.options.output.publicPath !== 'undefined'
      ? compilation.options.output.publicPath
      : path.relative(path.dirname(filename), '.'); // TODO: How to test this? I haven't written this logic, unsure what it does

  return ensureTrailingSlash(publicPath);
}

export function resolveOutput(compilation, addedFilename, outputPath) {
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
export async function handleUrl(assets) {
  const globbyAssets = [];
  const normalAssets = [];
  // if filepath is null or undefined, just bubble up.
  assets.forEach(asset =>
    asset.filepath && globby.hasMagic(asset.filepath)
      ? globbyAssets.push(asset)
      : normalAssets.push(asset),
  );
  const ret = [];
  await Promise.all(
    globbyAssets.map(asset =>
      globby(asset.filepath).then(paths =>
        paths.forEach(filepath =>
          ret.push(Object.assign({}, asset, { filepath })),
        ),
      ),
    ),
  );

  return ret.concat(normalAssets);
}

export function getAsValue(optionsAs, href) {
  if (!optionsAs) {
    const extension = path.extname(href);
    if (extension === '.css') {
      return 'style';
    }
    if (extension === '.woff2') {
      return 'font';
    }
    return 'script';
  }
  return optionsAs;
}
