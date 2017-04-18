import glob from 'glob';
import {normalize} from 'path';

/**
 * judge the url whether has magic via glob
 * If user used glob url then make some handle meanwhile return result
 * Long may the sun shine :)
 *
 * @author Owen
 * @email  469564715@qq.com
 * @github github/numerhero
 * @date   2017-04-18
 * @param  {array}                 assets [user options via user transmited]
 * @return {array}                        [handle result]
 */
export default function (assets) {
    let m = [];
    let n = [];
    let boff = 0;
    try {
        assets.forEach(v => glob.hasMagic(v.filepath)
            ? m.push(v)
            : n.push(v)
        );
    } catch (e) {
        throw new Error(e);
    }

    let b = [];
    m.forEach(v => {
        let t = v
        let k = glob.sync(v.filepath);
        k.forEach(v => b.push(Object.assign(t, {filepath: v})));
    });

    return b.concat(n);
}