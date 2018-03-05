import addAllAssetsToCompilation from './addAllAssetsToCompilation';

export default class AddAssetHtmlPlugin {
  constructor(assets = []) {
    this.assets = Array.isArray(assets) ? assets.slice().reverse() : [assets];
  }

  /* istanbul ignore next: this would be integration tests */
  apply(compiler) {
    compiler.hooks.compilation.tap('AddAssetHtmlPlugin', compilation => {
      compilation.hooks.htmlWebpackPluginBeforeHtmlGeneration.tapPromise(
        'AddAssetHtmlPlugin',
        htmlPluginData =>
          addAllAssetsToCompilation(this.assets, compilation, htmlPluginData),
      );
    });
  }
}
