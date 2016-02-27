export default class AddAssetHtmlPlugin {
  constructor ({
    filename,
    includeSourcemap = false,
    typeOfAsset = 'js'
  } = {}) {
    this.filename = filename
    this.includeSourcemap = includeSourcemap
    this.typeOfAsset = typeOfAsset
  }

  apply (compiler) {
    compiler.plugin('compilation', (compilation) => {
      if (!this.filename) return compilation.errors.push(new Error('No filename defined'))

      compilation.plugin('html-webpack-plugin-before-html-processing', (htmlPluginData, callback) => {
        htmlPluginData.plugin.addFileToAssets(this.filename, compilation)
          .then((filename) => htmlPluginData.assets[this.typeOfAsset].unshift(`/${filename}`))
          .then(() => {
            if (this.includeSourcemap) {
              return htmlPluginData.plugin.addFileToAssets(`${this.filename}.map`, compilation)
            }
          })
          .then(() => callback())
      })
    })
  }
}
