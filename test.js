/* eslint import/no-extraneous-dependencies: ["error", { "devDependencies": true }] */

import path from 'path';
import test from 'ava';
import sinon from 'sinon';
import Promise from 'bluebird';
import AddAssetHtmlPlugin from './src/index';
import addAllAssetsToCompilation from './src/addAllAssetsToCompilation';

const pluginMock = {
  plugin: {
    addFileToAssets: filename => Promise.resolve(path.basename(filename)),
  },
};

test('assets should always be an array', t => {
  t.true(Array.isArray(new AddAssetHtmlPlugin({}).assets));
  t.true(Array.isArray(new AddAssetHtmlPlugin([]).assets));
  t.true(Array.isArray(new AddAssetHtmlPlugin().assets));
});

test('assets should should be reversed', t => {
  t.deepEqual(new AddAssetHtmlPlugin(['a', 'b']).assets, ['b', 'a']);
});

test('should invoke callback on success', async t => {
  const callback = sinon.stub();

  await addAllAssetsToCompilation([], {}, pluginMock, callback);

  t.true(callback.calledOnce);
  t.true(callback.calledWithExactly(null, pluginMock));
});

test('should invoke callback on error', async t => {
  const callback = sinon.stub();
  const compilation = { errors: [] };

  await addAllAssetsToCompilation([{}], compilation, pluginMock, callback);

  t.true(compilation.errors.length === 1);
  t.true(compilation.errors[0].message === 'No filepath defined');

  t.true(callback.calledOnce);
  t.true(callback.calledWithExactly(compilation.errors[0], pluginMock));
});

test("should add file using compilation's publicPath", async t => {
  const callback = sinon.stub();
  const compilation = { options: { output: { publicPath: 'vendor/' } } };
  const pluginData = Object.assign({ assets: { js: [], css: [] } }, pluginMock);

  await addAllAssetsToCompilation([{ filepath: path.join(__dirname, 'my-file.js') }], compilation, pluginData, callback);

  t.deepEqual(pluginData.assets.css, []);
  t.deepEqual(pluginData.assets.js, ['vendor/my-file.js']);

  t.true(callback.calledOnce);
  t.true(callback.calledWithExactly(null, pluginData));
});

test('should used passed in publicPath', async t => {
  const callback = sinon.stub();
  const compilation = { options: { output: { publicPath: 'vendor/' } } };
  const pluginData = Object.assign({ assets: { js: [], css: [] } }, pluginMock);

  await addAllAssetsToCompilation([{ filepath: 'my-file.js', publicPath: 'pp' }], compilation, pluginData, callback);

  t.deepEqual(pluginData.assets.css, []);
  t.deepEqual(pluginData.assets.js, ['pp/my-file.js']);

  t.true(callback.calledOnce);
  t.true(callback.calledWithExactly(null, pluginData));
});

// No idea what this does, actually... Coverage currently hits it, but the logic is untested.
test.todo('should handle missing `publicPath`');

test('should add file missing "/" to public path', async t => {
  const callback = sinon.stub();
  const compilation = { options: { output: { publicPath: 'vendor' } } };
  const pluginData = Object.assign({ assets: { js: [], css: [] } }, pluginMock);

  await addAllAssetsToCompilation([{ filepath: 'my-file.js' }], compilation, pluginData, callback);

  t.deepEqual(pluginData.assets.css, []);
  t.deepEqual(pluginData.assets.js, ['vendor/my-file.js']);

  t.true(callback.calledOnce);
  t.true(callback.calledWithExactly(null, pluginData));
});

test('should add sourcemap to compilation', async t => {
  const callback = sinon.stub();
  const addFileToAssetsStub = sinon.stub();
  const compilation = { options: { output: {} } };
  const pluginData = { assets: { js: [], css: [] }, plugin: { addFileToAssets: addFileToAssetsStub } };
  addFileToAssetsStub.returns(Promise.resolve('my-file.js'));

  await addAllAssetsToCompilation([{ filepath: 'my-file.js' }], compilation, pluginData, callback);

  t.deepEqual(pluginData.assets.css, []);
  t.deepEqual(pluginData.assets.js, ['my-file.js']);

  t.true(callback.calledOnce);
  t.true(callback.calledWithExactly(null, pluginData));

  t.true(addFileToAssetsStub.calledTwice);
  t.true(addFileToAssetsStub.getCall(0).args[0] === 'my-file.js');
  t.true(addFileToAssetsStub.getCall(1).args[0] === 'my-file.js.map');
});

test('should skip adding sourcemap to compilation if set to false', async t => {
  const callback = sinon.stub();
  const addFileToAssetsStub = sinon.stub();
  const compilation = { options: { output: {} } };
  const pluginData = { assets: { js: [], css: [] }, plugin: { addFileToAssets: addFileToAssetsStub } };
  addFileToAssetsStub.returns(Promise.resolve('my-file.js'));

  await addAllAssetsToCompilation([{ filepath: 'my-file.js', includeSourcemap: false }], compilation, pluginData, callback);

  t.deepEqual(pluginData.assets.css, []);
  t.deepEqual(pluginData.assets.js, ['my-file.js']);

  t.true(callback.calledOnce);
  t.true(callback.calledWithExactly(null, pluginData));

  t.true(addFileToAssetsStub.calledOnce);
  t.true(addFileToAssetsStub.getCall(0).args[0] === 'my-file.js');
});

test('should include hash of file content if option is set', async t => {
  const callback = sinon.stub();
  const compilation = {
    options: { output: {} },
    assets: { 'my-file.js': { source: () => 'some source code is cool to have;' } },
  };
  const pluginData = Object.assign({ assets: { js: [], css: [] } }, pluginMock);

  await addAllAssetsToCompilation([{ filepath: 'my-file.js', hash: true }], compilation, pluginData, callback);

  t.deepEqual(pluginData.assets.css, []);
  t.deepEqual(pluginData.assets.js, ['my-file.js?5329c141291f07ab06c6']);

  t.true(callback.calledOnce);
  t.true(callback.calledWithExactly(null, pluginData));
});

test('should add to css if `typeOfAsset` is css', async t => {
  const callback = sinon.stub();
  const compilation = {
    options: { output: {} },
    assets: { 'my-file.js': { source: () => 'some source code is cool to have;' } },
  };
  const pluginData = Object.assign({ assets: { js: [], css: [] } }, pluginMock);

  await addAllAssetsToCompilation([{ filepath: 'my-file.css', typeOfAsset: 'css' }], compilation, pluginData, callback);

  t.deepEqual(pluginData.assets.css, ['my-file.css']);
  t.deepEqual(pluginData.assets.js, []);

  t.true(callback.calledOnce);
  t.true(callback.calledWithExactly(null, pluginData));
});

test('should replace compilation assets key if `outputPath` is set', async t => {
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

  t.deepEqual(pluginData.assets.css, []);
  t.deepEqual(pluginData.assets.js, ['my-file.js']);

  t.is(compilation.assets['my-file.js'], undefined);
  t.deepEqual(compilation.assets['assets/my-file.js'], source);
  t.is(compilation.assets['my-file.js.map'], undefined);
  t.deepEqual(compilation.assets['assets/my-file.js.map'], source);
});
