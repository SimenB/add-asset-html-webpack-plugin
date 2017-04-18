import addAllAssetsToCompilation from './addAllAssetsToCompilation';
import handleUrl from './handleUrl';

export default class AddAssetHtmlPlugin {
  constructor(assets = []) {
    this.assets = handleUrl(Array.isArray(assets) ? assets.slice().reverse() : [assets]);
  }

  /* istanbul ignore next: this would be integration tests */
  apply(compiler) {
    compiler.plugin('compilation', compilation => {
      compilation.plugin('html-webpack-plugin-before-html-generation', (htmlPluginData, callback) => {
        addAllAssetsToCompilation(this.assets, compilation, htmlPluginData, callback);
      });
    });
  }
}
