import path from 'path';
import globby from 'globby';
import { Asset } from './types';

export function ensureTrailingSlash(string: string): string {
  if (string.length && string.substr(-1, 1) !== '/') {
    return `${string}/`;
  }

  return string;
}

// Copied from html-webpack-plugin
export function resolvePublicPath(compilation, filename: string): string {
  /* istanbul ignore else */
  const publicPath =
    typeof compilation.options.output.publicPath !== 'undefined'
      ? compilation.options.output.publicPath
      : path.relative(path.dirname(filename), '.'); // TODO: How to test this? I haven't written this logic, unsure what it does

  return ensureTrailingSlash(publicPath);
}

export function resolveOutput(
  compilation,
  addedFilename: string,
  outputPath: string,
): void {
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
export async function handleUrl(assets: Asset[]): Promise<Asset[]> {
  const globbyAssets: Asset[] = [];
  const normalAssets: Asset[] = [];
  // if filepath is null or undefined, just bubble up.
  assets.forEach(asset =>
    asset.filepath && globby.hasMagic(asset.filepath)
      ? globbyAssets.push(asset)
      : normalAssets.push(asset),
  );
  const ret: Asset[] = [];
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
