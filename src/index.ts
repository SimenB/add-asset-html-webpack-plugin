import HtmlWebpackPlugin from 'html-webpack-plugin';
import pEachSeries from 'p-each-series';
import micromatch from 'micromatch';
import crypto from 'crypto';
import globby from 'globby';
import { Plugin, Compiler, compilation as compilationType } from 'webpack';
import {
  ensureTrailingSlash,
  handleUrl,
  resolveOutput,
  resolvePublicPath,
} from './utils';
import { Asset } from './types';

// TODO: These 2 types are copied from html-webpack-plugin's @types entry
type EntryObject = {
  /** Webpack entry or chunk name */
  entryName: string;
  /** Entry or chunk path */
  path: string;
};

type HtmlPluginData = {
  assets: {
    publicPath: string;
    js: EntryObject[];
    css: EntryObject[];
  };
  outputName: string;
  plugin: HtmlWebpackPluginWithAdd;
};

declare class HtmlWebpackPluginWithAdd extends HtmlWebpackPlugin {
  addFileToAssets(filepath: string, compilation: any): any;
}

export default class AddAssetHtmlPlugin extends Plugin {
  assets: Asset[];

  addedAssets: string[];

  constructor(assets: Asset | Asset[] = []) {
    super();
    this.assets = Array.isArray(assets) ? assets.slice().reverse() : [assets];
    this.addedAssets = [];
  }

  /* istanbul ignore next: this would be integration tests */
  apply(compiler: Compiler) {
    compiler.hooks.compilation.tap('AddAssetHtmlPlugin', compilation => {
      let beforeGenerationHook;
      let alterAssetTagsHook;

      if (HtmlWebpackPlugin.version === 4) {
        const hooks = HtmlWebpackPlugin.getHooks(compilation);

        beforeGenerationHook = hooks.beforeAssetTagGeneration;
        alterAssetTagsHook = hooks.alterAssetTags;
      } else {
        const { hooks } = compilation;

        beforeGenerationHook = hooks.htmlWebpackPluginBeforeHtmlGeneration;
        alterAssetTagsHook = hooks.htmlWebpackPluginAlterAssetTags;
      }

      beforeGenerationHook.tapPromise(
        'AddAssetHtmlPlugin',
        (htmlPluginData: HtmlPluginData) =>
          this.addAllAssetsToCompilation(compilation, htmlPluginData),
      );

      alterAssetTagsHook.tap(
        'AddAssetHtmlPlugin',
        (htmlPluginData: HtmlPluginData) => {
          const { assetTags } = htmlPluginData;
          if (assetTags) {
            this.alterAssetsAttributes(assetTags);
          } else {
            this.alterAssetsAttributes({
              scripts: htmlPluginData.body
                .concat(htmlPluginData.head)
                .filter(
                  ({ tagName }: { tagName: string }) => tagName === 'script',
                ),
            });
          }
        },
      );
    });
  }

  async addAllAssetsToCompilation(
    compilation: typeof compilationType,
    htmlPluginData: HtmlPluginData,
  ) {
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
    compilation: typeof compilationType,
    htmlPluginData: HtmlPluginData,
    {
      filepath,
      typeOfAsset = 'js',
      includeRelatedFiles = true,
      hash = false,
      publicPath,
      outputPath,
      files = [],
    }: Asset,
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
