// TODO: I don't know if it's possible to document default values...

interface PluginOptions {
  filename: string;
  typeOfAsset?: string;
  includeSourcemap?: boolean;
  hash?: boolean;
  outputPath?: string;
  publicPath?: string;
}

export class AddAssetHtmlPlugin {
  constructor(options: PluginOptions);

  apply(compiler): void;
}
