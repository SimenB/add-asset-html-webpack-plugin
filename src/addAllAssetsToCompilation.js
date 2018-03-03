import path from 'path';
import crypto from 'crypto';
import pEachSeries from 'p-each-series';
import micromatch from 'micromatch';
import handleUrl from './handleUrl';

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

async function addFileToAssets(
  compilation,
  htmlPluginData,
  {
    filepath,
    typeOfAsset = 'js',
    includeSourcemap = true,
    hash = false,
    publicPath,
    outputPath,
    files = [],
  },
) {
  if (!filepath) {
    const error = new Error('No filepath defined');
    compilation.errors.push(error);
    return Promise.reject(error);
  }

  const fileFilters = Array.isArray(files) ? files : [files];

  if (fileFilters.length > 0) {
    const shouldSkip = !fileFilters.some(file =>
      micromatch.isMatch(htmlPluginData.outputName, file),
    );

    if (shouldSkip) {
      return Promise.resolve(null);
    }
  }

  const addedFilename = await htmlPluginData.plugin.addFileToAssets(
    filepath,
    compilation,
  );

  let suffix = '';
  if (hash) {
    const md5 = crypto.createHash('md5');
    md5.update(compilation.assets[addedFilename].source());
    suffix = `?${md5.digest('hex').substr(0, 20)}`;
  }

  const resolvedPublicPath =
    typeof publicPath === 'undefined'
      ? resolvePublicPath(compilation, addedFilename)
      : ensureTrailingSlash(publicPath);
  const resolvedPath = `${resolvedPublicPath}${addedFilename}${suffix}`;

  htmlPluginData.assets[typeOfAsset].unshift(resolvedPath);

  resolveOutput(compilation, addedFilename, outputPath);

  if (includeSourcemap) {
    const addedMapFilename = await htmlPluginData.plugin.addFileToAssets(
      `${filepath}.map`,
      compilation,
    );
    resolveOutput(compilation, addedMapFilename, outputPath);
  }

  return Promise.resolve(null);
}

// Visible for testing
export default async function(assets, compilation, htmlPluginData) {
  const handledAssets = await handleUrl(assets);
  await pEachSeries(handledAssets, asset =>
    addFileToAssets(compilation, htmlPluginData, asset),
  );
  return htmlPluginData;
}
