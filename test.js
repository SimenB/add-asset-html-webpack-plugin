const path = require('path');
const slash = require('slash');
const AddAssetHtmlPlugin = require('./src/index');
const { handleUrl } = require('./src/utils');

const testFile = slash(require.resolve('./fixture/some-file'));

const pluginMock = {
  plugin: {
    addFileToAssets: filename => Promise.resolve(path.basename(filename)),
  },
  outputName: 'index.html',
};

test('assets should always be an array', () => {
  expect(new AddAssetHtmlPlugin({}).assets).toBeInstanceOf(Array);
  expect(new AddAssetHtmlPlugin([]).assets).toBeInstanceOf(Array);
  expect(new AddAssetHtmlPlugin().assets).toBeInstanceOf(Array);
});

test('assets should should be reversed', () => {
  expect(new AddAssetHtmlPlugin(['a', 'b']).assets).toEqual(['b', 'a']);
});

test('should not reject on success', async () => {
  const plugin = new AddAssetHtmlPlugin();
  expect(await plugin.addAllAssetsToCompilation({}, pluginMock)).toEqual(
    pluginMock
  );
});

test('should invoke callback on error', async () => {
  const compilation = { errors: [] };
  const plugin = new AddAssetHtmlPlugin({});

  await expect(
    plugin.addAllAssetsToCompilation(compilation, pluginMock)
  ).rejects.toThrowError();

  expect(compilation.errors).toMatchSnapshot();
});

test('should reject on error', async () => {
  expect.hasAssertions();
  const compilation = { errors: [] };
  const plugin = new AddAssetHtmlPlugin({});

  try {
    await plugin.addAllAssetsToCompilation(compilation, pluginMock);
  } catch (e) {
    expect(compilation.errors).toMatchSnapshot();
    expect(compilation.errors[0]).toBe(e);
  }
});

test("should add file using compilation's publicPath", async () => {
  const compilation = { options: { output: { publicPath: 'vendor/' } } };
  const pluginData = Object.assign({ assets: { js: [], css: [] } }, pluginMock);
  const plugin = new AddAssetHtmlPlugin({
    filepath: path.join(__dirname, 'my-file.js'),
  });

  await plugin.addAllAssetsToCompilation(compilation, pluginData);

  expect(pluginData.assets).toMatchSnapshot();
});

test('should used passed in publicPath', async () => {
  const compilation = { options: { output: { publicPath: 'vendor/' } } };
  const pluginData = Object.assign({ assets: { js: [], css: [] } }, pluginMock);
  const plugin = new AddAssetHtmlPlugin({
    filepath: 'my-file.js',
    publicPath: 'pp',
  });

  await plugin.addAllAssetsToCompilation(compilation, pluginData);

  expect(pluginData.assets).toMatchSnapshot();
});

// TODO: No idea what this does, actually... Coverage currently hits it, but the logic is untested.
test.todo('should handle missing `publicPath`');

test('should add file missing "/" to public path', async () => {
  const compilation = { options: { output: { publicPath: 'vendor' } } };
  const pluginData = Object.assign({ assets: { js: [], css: [] } }, pluginMock);
  const plugin = new AddAssetHtmlPlugin({ filepath: 'my-file.js' });

  await plugin.addAllAssetsToCompilation(compilation, pluginData);

  expect(pluginData.assets).toMatchSnapshot();
});

test('should add sourcemap and gzipped files to compilation', async () => {
  const addFileToAssetsStub = jest.fn();
  const compilation = { options: { output: {} } };
  const pluginData = {
    assets: { js: [], css: [] },
    plugin: { addFileToAssets: addFileToAssetsStub },
  };
  addFileToAssetsStub.mockReturnValue(Promise.resolve('my-file.js'));
  const plugin = new AddAssetHtmlPlugin({ filepath: testFile });

  await plugin.addAllAssetsToCompilation(compilation, pluginData);

  expect(pluginData.assets).toMatchSnapshot();

  expect(addFileToAssetsStub).toHaveBeenCalledTimes(3);
  expect(addFileToAssetsStub.mock.calls[0]).toEqual([testFile, compilation]);
  expect(addFileToAssetsStub.mock.calls[1]).toEqual([
    `${testFile}.gz`,
    compilation,
  ]);
  expect(addFileToAssetsStub.mock.calls[2]).toEqual([
    `${testFile}.map`,
    compilation,
  ]);
});

test('should skip adding sourcemap and gzipped files to compilation if set to false', async () => {
  const addFileToAssetsStub = jest.fn();
  const compilation = { options: { output: {} } };
  const pluginData = {
    assets: { js: [], css: [] },
    plugin: { addFileToAssets: addFileToAssetsStub },
  };
  addFileToAssetsStub.mockReturnValue(Promise.resolve('my-file.js'));
  const plugin = new AddAssetHtmlPlugin({
    filepath: 'my-file.js',
    includeRelatedFiles: false,
  });

  await plugin.addAllAssetsToCompilation(compilation, pluginData);

  expect(pluginData.assets).toMatchSnapshot();

  expect(addFileToAssetsStub).toHaveBeenCalledTimes(1);
  expect(addFileToAssetsStub).toHaveBeenCalledWith('my-file.js', compilation);
});

test('should include hash of file content if option is set', async () => {
  const compilation = {
    options: { output: {} },
    assets: {
      'my-file.js': { source: () => 'some source code is cool to have;' },
    },
  };
  const pluginData = Object.assign({ assets: { js: [], css: [] } }, pluginMock);
  const plugin = new AddAssetHtmlPlugin({ filepath: 'my-file.js', hash: true });

  await plugin.addAllAssetsToCompilation(compilation, pluginData);

  expect(pluginData.assets).toMatchSnapshot();
});

test('should add to css if `typeOfAsset` is css', async () => {
  const compilation = {
    options: { output: {} },
    assets: {
      'my-file.js': { source: () => 'some source code is cool to have;' },
    },
  };
  const pluginData = Object.assign({ assets: { js: [], css: [] } }, pluginMock);
  const plugin = new AddAssetHtmlPlugin({
    filepath: 'my-file.css',
    typeOfAsset: 'css',
  });

  await plugin.addAllAssetsToCompilation(compilation, pluginData);

  expect(pluginData.assets).toMatchSnapshot();
});

test('should replace compilation assets key if `outputPath` is set', async () => {
  const source = { source: () => 'test' };
  const addFileToAssetsMock = (filename, compilation) => {
    const name = path.basename(filename);
    compilation.assets[name] = source; // eslint-disable-line no-param-reassign
    return Promise.resolve(name);
  };
  const compilation = {
    options: { output: {} },
    assets: {},
  };
  const pluginData = {
    assets: { js: [], css: [] },
    plugin: { addFileToAssets: addFileToAssetsMock },
  };
  const plugin = new AddAssetHtmlPlugin({
    filepath: testFile,
    outputPath: 'assets',
  });

  await plugin.addAllAssetsToCompilation(compilation, pluginData);

  expect(pluginData.assets).toMatchSnapshot();

  expect(compilation.assets).toEqual({
    'assets/some-file.js': source,
    'assets/some-file.js.gz': source,
    'assets/some-file.js.map': source,
  });
});

test('filter option should exclude some files', async () => {
  const compilation = { options: { output: { publicPath: 'vendor/' } } };
  const pluginData = Object.assign({ assets: { js: [], css: [] } }, pluginMock);
  const plugin = new AddAssetHtmlPlugin({
    filepath: path.join(__dirname, 'my-file.js'),
    files: ['something-weird'],
  });

  await plugin.addAllAssetsToCompilation(compilation, pluginData);

  expect(pluginData.assets).toMatchSnapshot();
});

test('filter option should include some files', async () => {
  const compilation = { options: { output: { publicPath: 'vendor/' } } };
  const pluginData = Object.assign({ assets: { js: [], css: [] } }, pluginMock);
  const plugin = new AddAssetHtmlPlugin({
    filepath: path.join(__dirname, 'my-file.js'),
    files: ['index.*'],
  });

  await plugin.addAllAssetsToCompilation(compilation, pluginData);

  expect(pluginData.assets).toMatchSnapshot();
});

test('filter option should include some files with string option', async () => {
  const compilation = { options: { output: { publicPath: 'vendor/' } } };
  const pluginData = Object.assign({ assets: { js: [], css: [] } }, pluginMock);
  const plugin = new AddAssetHtmlPlugin({
    filepath: path.join(__dirname, 'my-file.js'),
    files: 'index.*',
  });

  await plugin.addAllAssetsToCompilation(compilation, pluginData);

  expect(pluginData.assets).toMatchSnapshot();
});

test('filter option should include some files with string option', async () => {
  const pluginData = {
    scripts: [
      {
        tagName: 'script',
        voidTag: false,
        attributes: { src: 'polyfill.js' },
      },
      {
        tagName: 'script',
        voidTag: false,
        attributes: { src: 'index_bundle.js' },
      },
    ],
    styles: [],
    meta: [],
  };
  const plugin = new AddAssetHtmlPlugin({
    filepath: path.join(__dirname, 'my-file.js'),
    files: 'index.*',
    attributes: { nomodule: true },
  });

  plugin.addedAssets.push('polyfill.js');

  await plugin.alterAssetsAttributes(pluginData);

  expect(pluginData.scripts).toContainEqual({
    tagName: 'script',
    voidTag: false,
    attributes: { src: 'polyfill.js', nomodule: true },
  });
});

test('use globby to find multi file', async () => {
  const assets = [{ filepath: './src/*.js' }];
  const ret = await handleUrl(assets);
  expect(ret).toHaveLength(2);
});

test('filepath without globbyMagic should just return', async () => {
  const assets = [{ filepath: path.join(__dirname, 'my-file.js') }];
  const ret = await handleUrl(assets);
  expect(ret).toHaveLength(1);
});
