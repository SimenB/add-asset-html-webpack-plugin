/* eslint import/no-extraneous-dependencies: ["error", { "devDependencies": true }] */
/* eslint-env jest */

import path from 'path';
import assert from 'power-assert';
import sinon from 'sinon';
import Promise from 'bluebird';
import AddAssetHtmlPlugin from './src/index';
import addAllAssetsToCompilation from './src/addAllAssetsToCompilation';

const pluginMock = {
  plugin: {
    addFileToAssets: filename => Promise.resolve(path.basename(filename)),
  },
};

test('assets should always be an array', () => {
  assert(Array.isArray(new AddAssetHtmlPlugin({}).assets));
  assert(Array.isArray(new AddAssetHtmlPlugin([]).assets));
  assert(Array.isArray(new AddAssetHtmlPlugin().assets));
});

test('assets should should be reversed', () => {
  assert.deepEqual(new AddAssetHtmlPlugin(['a', 'b']).assets, ['b', 'a']);
});

test.concurrent('should invoke callback on success', async () => {
  const callback = sinon.stub();

  await addAllAssetsToCompilation([], {}, pluginMock, callback);

  assert(callback.calledOnce);
  assert(callback.calledWithExactly(null, pluginMock));
});

test.concurrent('should invoke callback on error', async () => {
  const callback = sinon.stub();
  const compilation = { errors: [] };

  await addAllAssetsToCompilation([{}], compilation, pluginMock, callback);

  assert(compilation.errors.length === 1);
  assert(compilation.errors[0].message === 'No filepath defined');

  assert(callback.calledOnce);
  assert(callback.calledWithExactly(compilation.errors[0], pluginMock));
});

test.concurrent("should add file using compilation's publicPath", async () => {
  const callback = sinon.stub();
  const compilation = { options: { output: { publicPath: 'vendor/' } } };
  const pluginData = Object.assign({ assets: { js: [], css: [] } }, pluginMock);

  await addAllAssetsToCompilation([{ filepath: path.join(__dirname, 'my-file.js') }], compilation, pluginData, callback);

  assert.deepEqual(pluginData.assets.css, []);
  assert.deepEqual(pluginData.assets.js, ['vendor/my-file.js']);

  assert(callback.calledOnce);
  assert(callback.calledWithExactly(null, pluginData));
});

test.concurrent('should used passed in publicPath', async () => {
  const callback = sinon.stub();
  const compilation = { options: { output: { publicPath: 'vendor/' } } };
  const pluginData = Object.assign({ assets: { js: [], css: [] } }, pluginMock);

  await addAllAssetsToCompilation([{ filepath: 'my-file.js', publicPath: 'pp' }], compilation, pluginData, callback);

  assert.deepEqual(pluginData.assets.css, []);
  assert.deepEqual(pluginData.assets.js, ['pp/my-file.js']);

  assert(callback.calledOnce);
  assert(callback.calledWithExactly(null, pluginData));
});

// No idea what this does, actually... Coverage currently hits it, but the logic is untested.
test('should handle missing `publicPath`');

test.concurrent('should add file missing "/" to public path', async () => {
  const callback = sinon.stub();
  const compilation = { options: { output: { publicPath: 'vendor' } } };
  const pluginData = Object.assign({ assets: { js: [], css: [] } }, pluginMock);

  await addAllAssetsToCompilation([{ filepath: 'my-file.js' }], compilation, pluginData, callback);

  assert.deepEqual(pluginData.assets.css, []);
  assert.deepEqual(pluginData.assets.js, ['vendor/my-file.js']);

  assert(callback.calledOnce);
  assert(callback.calledWithExactly(null, pluginData));
});

test.concurrent('should add sourcemap to compilation', async () => {
  const callback = sinon.stub();
  const addFileToAssetsStub = sinon.stub();
  const compilation = { options: { output: {} } };
  const pluginData = { assets: { js: [], css: [] }, plugin: { addFileToAssets: addFileToAssetsStub } };
  addFileToAssetsStub.returns(Promise.resolve('my-file.js'));

  await addAllAssetsToCompilation([{ filepath: 'my-file.js' }], compilation, pluginData, callback);

  assert.deepEqual(pluginData.assets.css, []);
  assert.deepEqual(pluginData.assets.js, ['my-file.js']);

  assert(callback.calledOnce);
  assert(callback.calledWithExactly(null, pluginData));

  assert(addFileToAssetsStub.calledTwice);
  assert(addFileToAssetsStub.getCall(0).args[0] === 'my-file.js');
  assert(addFileToAssetsStub.getCall(1).args[0] === 'my-file.js.map');
});

test.concurrent('should skip adding sourcemap to compilation if set to false', async () => {
  const callback = sinon.stub();
  const addFileToAssetsStub = sinon.stub();
  const compilation = { options: { output: {} } };
  const pluginData = { assets: { js: [], css: [] }, plugin: { addFileToAssets: addFileToAssetsStub } };
  addFileToAssetsStub.returns(Promise.resolve('my-file.js'));

  await addAllAssetsToCompilation([{ filepath: 'my-file.js', includeSourcemap: false }], compilation, pluginData, callback);

  assert.deepEqual(pluginData.assets.css, []);
  assert.deepEqual(pluginData.assets.js, ['my-file.js']);

  assert(callback.calledOnce);
  assert(callback.calledWithExactly(null, pluginData));

  assert(addFileToAssetsStub.calledOnce);
  assert(addFileToAssetsStub.getCall(0).args[0] === 'my-file.js');
});

test.concurrent('should include hash of file content if option is set', async () => {
  const callback = sinon.stub();
  const compilation = {
    options: { output: {} },
    assets: { 'my-file.js': { source: () => 'some source code is cool to have;' } },
  };
  const pluginData = Object.assign({ assets: { js: [], css: [] } }, pluginMock);

  await addAllAssetsToCompilation([{ filepath: 'my-file.js', hash: true }], compilation, pluginData, callback);

  assert.deepEqual(pluginData.assets.css, []);
  assert.deepEqual(pluginData.assets.js, ['my-file.js?5329c141291f07ab06c6']);

  assert(callback.calledOnce);
  assert(callback.calledWithExactly(null, pluginData));
});

test.concurrent('should add to css if `typeOfAsset` is css', async () => {
  const callback = sinon.stub();
  const compilation = {
    options: { output: {} },
    assets: { 'my-file.js': { source: () => 'some source code is cool to have;' } },
  };
  const pluginData = Object.assign({ assets: { js: [], css: [] } }, pluginMock);

  await addAllAssetsToCompilation([{ filepath: 'my-file.css', typeOfAsset: 'css' }], compilation, pluginData, callback);

  assert.deepEqual(pluginData.assets.css, ['my-file.css']);
  assert.deepEqual(pluginData.assets.js, []);

  assert(callback.calledOnce);
  assert(callback.calledWithExactly(null, pluginData));
});

test.concurrent('should replace compilation assets key if `outputPath` is set', async () => {
  const callback = sinon.stub();
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
  const pluginData = { assets: { js: [], css: [] }, plugin: { addFileToAssets: addFileToAssetsMock } };

  await addAllAssetsToCompilation([{ filepath: 'my-file.js', outputPath: 'assets' }], compilation, pluginData, callback);

  assert.deepEqual(pluginData.assets.css, []);
  assert.deepEqual(pluginData.assets.js, ['my-file.js']);

  assert(compilation.assets['my-file.js'] === undefined);
  assert.deepEqual(compilation.assets['assets/my-file.js'], source);
  assert(compilation.assets['my-file.js.map'] === undefined);
  assert.deepEqual(compilation.assets['assets/my-file.js.map'], source);
});
