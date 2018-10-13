import HtmlWebpackPlugin from 'html-webpack-plugin';
import pEachSeries from 'p-each-series';
import micromatch from 'micromatch';
import crypto from 'crypto';
import globby from 'globby';
import {
  ensureTrailingSlash,
  handleUrl,
  resolveOutput,
  resolvePublicPath,
} from './utils';

export default class AddAssetHtmlPlugin {
  constructor(assets = []) {
    this.assets = Array.isArray(assets)
      ? assets.slice().reverse()
      : [assets].filter(Boolean);
  }

  /* istanbul ignore next: this would be integration tests */
  apply(compiler) {
    compiler.hooks.compilation.tap('AddAssetHtmlPlugin', compilation => {
      let hook;

      if (HtmlWebpackPlugin.version === 4) {
        hook = HtmlWebpackPlugin.getHooks(compilation).beforeAssetTagGeneration;
      } else {
        hook = compilation.hooks.htmlWebpackPluginBeforeHtmlGeneration;
      }

      hook.tapPromise('AddAssetHtmlPlugin', htmlPluginData =>
        this.addAllAssetsToCompilation(compilation, htmlPluginData),
      );
    });
  }

  async addAllAssetsToCompilation(compilation, htmlPluginData) {
    const handledAssets = await handleUrl(this.assets);
    await pEachSeries(handledAssets, asset =>
      this.addFileToAssets(compilation, htmlPluginData, asset),
    );
    return htmlPluginData;
  }

  // eslint-disable-next-line class-methods-use-this
  async addFileToAssets(
    compilation,
    htmlPluginData,
    {
      filepath,
      typeOfAsset = 'js',
      includeRelatedFiles = true,
      hash = false,
      publicPath,
      outputPath,
      files = [],
    },
  ) {
    if (!filepath) {
      const error = new Error('No filepath defined');
      compilation.errors.push(error);
      throw error;
    }

    const fileFilters = Array.isArray(files) ? files : [files];

    if (fileFilters.length > 0) {
      const shouldSkip = !fileFilters.some(file =>
        micromatch.isMatch(htmlPluginData.outputName, file),
      );

      if (shouldSkip) {
        return;
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

    if (includeRelatedFiles) {
      const relatedFiles = await globby(`${filepath}.*`);
      await Promise.all(
        relatedFiles.sort().map(async relatedFile => {
          const addedMapFilename = await htmlPluginData.plugin.addFileToAssets(
            relatedFile,
            compilation,
          );
          resolveOutput(compilation, addedMapFilename, outputPath);
        }),
      );
    }
  }
}
