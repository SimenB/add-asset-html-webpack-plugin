import globby from 'globby';

/**
 * handle globby filepath and return an array with all matched assets.
 * 
 * @export
 * @param {Array} assets 
 * @returns 
 */
export default async function(assets) {
  const globbyAssets = [];
  const normalAssets = [];
  // if filepath is null or undefined, just bubble up.
  assets.forEach(
    asset =>
      asset.filepath && globby.hasMagic(asset.filepath)
        ? globbyAssets.push(asset)
        : normalAssets.push(asset)
  );
  const ret = [];
  const promises = [];
  globbyAssets.forEach(asset => {
    promises.push(
      globby(asset.filepath).then(paths => {
        paths.forEach(path => {
          ret.push(
            Object.assign({}, asset, {
              filepath: path,
            })
          );
        });
      })
    );
  });

  await Promise.all(promises);
  return ret.concat(normalAssets);
}
