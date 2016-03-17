import path from 'path'

// Copied from html-webpack-plugin
function resolvePublicPath (compilation, filename) {
  let publicPath = typeof compilation.options.output.publicPath !== 'undefined'
    ? compilation.options.output.publicPath
    : path.relative(path.dirname(filename), '.')

  if (publicPath.length && publicPath.substr(-1, 1) !== '/') {
    publicPath += '/'
  }
  return publicPath
}

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

      const publicPath = resolvePublicPath(compilation, this.filename)

      compilation.plugin('html-webpack-plugin-before-html-generation', (htmlPluginData, callback) => {
        htmlPluginData.plugin.addFileToAssets(this.filename, compilation)
          .then((filename) => htmlPluginData.assets[this.typeOfAsset].unshift(`${publicPath}${filename}`))
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
