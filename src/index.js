const HtmlWebpackPlugin = require('html-webpack-plugin');
const micromatch = require('micromatch');
const crypto = require('crypto');
const globby = require('globby');
const path = require('path');
const fs = require('fs');
const util = require('util');
const webpack = require('webpack');
const {
  ensureTrailingSlash,
  handleUrl,
  resolveOutput,
  resolvePublicPath,
} = require('./utils');

const fsReadFileAsync = util.promisify(fs.readFile);

/* istanbul ignore next: webpack 5 not in unit test mocks */
/**
 * Pushes the content of the given filename to the compilation assets
 * @param {string} filename
 * @param {WebpackCompilation} compilation
 * @returns {Promise<string>} file basename
 */
function addFileToAssetsWebpack5(filename, compilation) {
  const resolvedFilename = path.resolve(compilation.compiler.context, filename);

  return fsReadFileAsync(resolvedFilename)
    .then(source => new webpack.sources.RawSource(source, true))
    .catch(() =>
      Promise.reject(
        new Error(`HtmlWebpackPlugin: could not load file ${resolvedFilename}`),
      ),
    )
    .then(rawSource => {
      const basename = path.basename(resolvedFilename);
      compilation.fileDependencies.add(resolvedFilename);
      if (!compilation.getAsset(basename)) {
        compilation.emitAsset(basename, rawSource);
      }
      return basename;
    });
}

module.exports = class AddAssetHtmlPlugin {
  constructor(assets = []) {
    this.assets = Array.isArray(assets) ? assets.slice().reverse() : [assets];
    this.addedAssets = [];
  }

  /* istanbul ignore next: this would be integration tests */
  apply(compiler) {
    compiler.hooks.compilation.tap('AddAssetHtmlPlugin', compilation => {
      let beforeGenerationHook;
      let alterAssetTagsHook;

      if (HtmlWebpackPlugin.version >= 4) {
        const hooks = HtmlWebpackPlugin.getHooks(compilation);

        beforeGenerationHook = hooks.beforeAssetTagGeneration;
        alterAssetTagsHook = hooks.alterAssetTags;
      } else {
        const { hooks } = compilation;

        beforeGenerationHook = hooks.htmlWebpackPluginBeforeHtmlGeneration;
        alterAssetTagsHook = hooks.htmlWebpackPluginAlterAssetTags;
      }

      beforeGenerationHook.tapPromise('AddAssetHtmlPlugin', htmlPluginData =>
        this.addAllAssetsToCompilation(compilation, htmlPluginData),
      );

      alterAssetTagsHook.tap('AddAssetHtmlPlugin', htmlPluginData => {
        const { assetTags } = htmlPluginData;
        if (assetTags) {
          this.alterAssetsAttributes(assetTags);
        } else {
          this.alterAssetsAttributes({
            scripts: htmlPluginData.body
              .concat(htmlPluginData.head)
              .filter(({ tagName }) => tagName === 'script'),
          });
        }
      });
    });
  }

  async addAllAssetsToCompilation(compilation, htmlPluginData) {
    try {
      const handledAssets = await handleUrl(this.assets);
      // eslint-disable-next-line no-restricted-syntax
      for (const asset of handledAssets) {
        await this.addFileToAssets(compilation, htmlPluginData, asset);
      }
    } catch (error) {
      compilation.errors.push(error);
      throw error;
    }
    return htmlPluginData;
  }

  alterAssetsAttributes(assetTags) {
    this.assets
      .filter(
        asset => asset.attributes && Object.keys(asset.attributes).length > 0,
      )
      .forEach(asset => {
        assetTags.scripts
          .map(({ attributes }) => attributes)
          .filter(attrs => this.addedAssets.includes(attrs.src))
          .forEach(attrs => Object.assign(attrs, asset.attributes));
      });
  }

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

    const addFileToAssets =
      htmlPluginData.plugin.addFileToAssets ||
      /* istanbul ignore next: webpack 5 not in unit test mocks */ addFileToAssetsWebpack5;

    const addedFilename = await addFileToAssets(filepath, compilation);

    let suffix = '';
    if (hash) {
      // if the hash is set by html-webpack-plugin use that hash, else generate a new one
      if (compilation.hash) {
        suffix = `?${compilation.hash}`;
      } else {
        const md5 = crypto.createHash('md5');
        md5.update(compilation.assets[addedFilename].source());
        suffix = `?${md5.digest('hex').substr(0, 20)}`;
      }
    }

    const resolvedPublicPath =
      typeof publicPath === 'undefined'
        ? resolvePublicPath(compilation, addedFilename)
        : ensureTrailingSlash(publicPath);
    const resolvedPath = `${resolvedPublicPath}${addedFilename}${suffix}`;

    htmlPluginData.assets[typeOfAsset].unshift(resolvedPath);

    resolveOutput(compilation, addedFilename, outputPath);

    this.addedAssets.push(resolvedPath);

    if (includeRelatedFiles) {
      const relatedFiles = await globby(`${filepath}.*`);
      await Promise.all(
        relatedFiles.sort().map(async relatedFile => {
          const addedMapFilename = await addFileToAssets(
            relatedFile,
            compilation,
          );
          resolveOutput(compilation, addedMapFilename, outputPath);
        }),
      );
    }
  }
};
