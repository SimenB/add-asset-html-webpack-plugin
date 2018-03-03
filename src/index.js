import addAllAssetsToCompilation from './addAllAssetsToCompilation';

export default class AddAssetHtmlPlugin {
  constructor(assets = []) {
    this.assets = Array.isArray(assets) ? assets.slice().reverse() : [assets];
  }

  /* istanbul ignore next: this would be integration tests */
  apply(compiler) {
    compiler.plugin('compilation', compilation => {
      compilation.plugin(
        'html-webpack-plugin-before-html-generation',
        async (htmlPluginData, callback) => {
          await addAllAssetsToCompilation(
            this.assets,
            compilation,
            htmlPluginData,
            callback,
          );
        },
      );
    });
  }
}
