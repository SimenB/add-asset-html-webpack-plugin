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
    const handledAssets = await handleUrl(this.assets);
    await pEachSeries(handledAssets, asset =>
      this.addFileToAssets(compilation, htmlPluginData, asset),
    );
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

    this.addedAssets.push(resolvedPath);

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
