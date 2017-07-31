import globby from 'globby';

export default async function(assets) {
  const globbyAssets = [];
  const normalAssets = [];
  try {
    assets.forEach(
      asset =>
        globby.hasMagic(asset.filepath)
          ? globbyAssets.push(asset)
          : normalAssets.push(asset)
    );
  } catch (e) {
    return assets;
  }
  const ret = [];
  const promises = [];
  for (let i = 0; i < globbyAssets.length; i++) {
    const current = globbyAssets[i];
    promises.push(
      globby(current.filepath).then(paths => {
        paths.forEach(path => {
          ret.push(
            Object.assign({}, current, {
              filepath: path,
            })
          );
        });
      })
    );
  }

  await Promise.all(promises);
  return ret.concat(normalAssets);
}
