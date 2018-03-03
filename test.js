import path from 'path';
import AddAssetHtmlPlugin from './src/index';
import addAllAssetsToCompilation from './src/addAllAssetsToCompilation';
import handleUrl from './src/handleUrl';

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
  expect(await addAllAssetsToCompilation([], {}, pluginMock)).toEqual(
    pluginMock,
  );
});

test('should invoke callback on error', async () => {
  const compilation = { errors: [] };

  await expect(
    addAllAssetsToCompilation([{}], compilation, pluginMock),
  ).rejects.toThrowError();

  expect(compilation.errors).toMatchSnapshot();
});

test('should reject on error', async () => {
  expect.hasAssertions();
  const compilation = { errors: [] };

  try {
    await addAllAssetsToCompilation([{}], compilation, pluginMock);
  } catch (e) {
    expect(compilation.errors).toMatchSnapshot();
    expect(compilation.errors[0]).toBe(e);
  }
});

test("should add file using compilation's publicPath", async () => {
  const compilation = { options: { output: { publicPath: 'vendor/' } } };
  const pluginData = Object.assign({ assets: { js: [], css: [] } }, pluginMock);

  await addAllAssetsToCompilation(
    [{ filepath: path.join(__dirname, 'my-file.js') }],
    compilation,
    pluginData,
  );

  expect(pluginData.assets).toMatchSnapshot();
});

test('should used passed in publicPath', async () => {
  const compilation = { options: { output: { publicPath: 'vendor/' } } };
  const pluginData = Object.assign({ assets: { js: [], css: [] } }, pluginMock);

  await addAllAssetsToCompilation(
    [{ filepath: 'my-file.js', publicPath: 'pp' }],
    compilation,
    pluginData,
  );

  expect(pluginData.assets).toMatchSnapshot();
});

// TODO: No idea what this does, actually... Coverage currently hits it, but the logic is untested.
test('should handle missing `publicPath`');

test('should add file missing "/" to public path', async () => {
  const compilation = { options: { output: { publicPath: 'vendor' } } };
  const pluginData = Object.assign({ assets: { js: [], css: [] } }, pluginMock);

  await addAllAssetsToCompilation(
    [{ filepath: 'my-file.js' }],
    compilation,
    pluginData,
  );

  expect(pluginData.assets).toMatchSnapshot();
});

test('should add sourcemap to compilation', async () => {
  const addFileToAssetsStub = jest.fn();
  const compilation = { options: { output: {} } };
  const pluginData = {
    assets: { js: [], css: [] },
    plugin: { addFileToAssets: addFileToAssetsStub },
  };
  addFileToAssetsStub.mockReturnValue(Promise.resolve('my-file.js'));

  await addAllAssetsToCompilation(
    [{ filepath: 'my-file.js' }],
    compilation,
    pluginData,
  );

  expect(pluginData.assets).toMatchSnapshot();

  expect(addFileToAssetsStub).toHaveBeenCalledTimes(2);
  expect(addFileToAssetsStub.mock.calls[0]).toEqual([
    'my-file.js',
    compilation,
  ]);
  expect(addFileToAssetsStub.mock.calls[1]).toEqual([
    'my-file.js.map',
    compilation,
  ]);
});

test('should skip adding sourcemap to compilation if set to false', async () => {
  const addFileToAssetsStub = jest.fn();
  const compilation = { options: { output: {} } };
  const pluginData = {
    assets: { js: [], css: [] },
    plugin: { addFileToAssets: addFileToAssetsStub },
  };
  addFileToAssetsStub.mockReturnValue(Promise.resolve('my-file.js'));

  await addAllAssetsToCompilation(
    [{ filepath: 'my-file.js', includeSourcemap: false }],
    compilation,
    pluginData,
  );

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

  await addAllAssetsToCompilation(
    [{ filepath: 'my-file.js', hash: true }],
    compilation,
    pluginData,
  );

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

  await addAllAssetsToCompilation(
    [{ filepath: 'my-file.css', typeOfAsset: 'css' }],
    compilation,
    pluginData,
  );

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

  await addAllAssetsToCompilation(
    [{ filepath: 'my-file.js', outputPath: 'assets' }],
    compilation,
    pluginData,
  );

  expect(pluginData.assets).toMatchSnapshot();

  expect(compilation.assets['my-file.js']).toBeUndefined();
  expect(compilation.assets['assets/my-file.js']).toEqual(source);
  expect(compilation.assets['my-file.js.map']).toBeUndefined();
  expect(compilation.assets['assets/my-file.js.map']).toEqual(source);
});

test('filter option should exclude some files', async () => {
  const compilation = { options: { output: { publicPath: 'vendor/' } } };
  const pluginData = Object.assign({ assets: { js: [], css: [] } }, pluginMock);

  await addAllAssetsToCompilation(
    [
      {
        filepath: path.join(__dirname, 'my-file.js'),
        files: ['something-weird'],
      },
    ],
    compilation,
    pluginData,
  );

  expect(pluginData.assets).toMatchSnapshot();
});

test('filter option should include some files', async () => {
  const compilation = { options: { output: { publicPath: 'vendor/' } } };
  const pluginData = Object.assign({ assets: { js: [], css: [] } }, pluginMock);

  await addAllAssetsToCompilation(
    [{ filepath: path.join(__dirname, 'my-file.js'), files: ['index.*'] }],
    compilation,
    pluginData,
  );

  expect(pluginData.assets).toMatchSnapshot();
});

test('filter option should include some files with string option', async () => {
  const compilation = { options: { output: { publicPath: 'vendor/' } } };
  const pluginData = Object.assign({ assets: { js: [], css: [] } }, pluginMock);

  await addAllAssetsToCompilation(
    [{ filepath: path.join(__dirname, 'my-file.js'), files: 'index.*' }],
    compilation,
    pluginData,
  );

  expect(pluginData.assets).toMatchSnapshot();
});

test('use globby to find multi file', async () => {
  const assets = [{ filepath: './src/*.js' }];
  const ret = await handleUrl(assets);
  expect(ret).toHaveLength(3);
});

test('filepath without globbyMagic should just return', async () => {
  const assets = [{ filepath: path.join(__dirname, 'my-file.js') }];
  const ret = await handleUrl(assets);
  expect(ret).toHaveLength(1);
});
