import HtmlWebpackPlugin from 'html-webpack-plugin';
import addAllAssetsToCompilation from './addAllAssetsToCompilation';

export default class AddAssetHtmlPlugin {
  constructor(assets = []) {
    this.assets = Array.isArray(assets) ? assets.slice().reverse() : [assets];
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
        addAllAssetsToCompilation(this.assets, compilation, htmlPluginData),
      );
    });
  }
}
