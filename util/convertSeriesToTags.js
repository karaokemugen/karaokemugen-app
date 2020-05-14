
const {readFile, readdir, writeFile} = require('fs');
const path = require('path');
const {promisify} = require('util');

const spath = path.resolve(process.argv[2], 'series');
const kpath = path.resolve(process.argv[2], 'karaokes');
const tpath = path.resolve(process.argv[2], 'tags');
const asyncReadFile = (...args) => passThroughFunction(readFile, args);
const asyncReadDir = (...args) => passThroughFunction(readdir, args);
const asyncWriteFile = (...args) => passThroughFunction(writeFile, args);

const passThroughFunction = (fn, args) => {
	if(!Array.isArray(args)) args = [args];
	return promisify(fn)(...args);
};

async function main() {
	const sdir = await asyncReadDir(spath);
	for (const file of sdir) {
		let series = await asyncReadFile(path.resolve(spath, file), 'utf-8');
		series = JSON.parse(series);
		series.tag = series.series;
		delete series.series;
		series.header.description = 'Karaoke Mugen Tag File'
		series.header.version = 1;
		series.tag.tid = series.tag.sid;
		delete series.tag.sid
		const filename = file.replace('series.json', `${series.tag.tid.substring(0, 8)}.tag.json`)
		series.tag.types = ['series'];
		series.header = JSON.sort(series.header);
		series.tag = JSON.sort(series.tag);
		await asyncWriteFile(path.resolve(tpath, filename), JSON.stringify(series, null, 2), 'utf-8');
	}
	const kdir = await asyncReadDir(kpath);
	for (const file of kdir) {
		let kara = await asyncReadFile(path.resolve(kpath, file), 'utf-8');
		kara = JSON.parse(kara);
		if (kara.data.sids && kara.data.sids.length > 0) {
			kara.data.tags.series = kara.data.sids;
			kara.data.tags = JSON.sort(kara.data.tags);
			await asyncWriteFile(path.resolve(kpath, file), JSON.stringify(kara, null, 2), 'utf-8');
		}

	}
}

function isObject(v) {
    return '[object Object]' === Object.prototype.toString.call(v);
};

JSON.sort = function(o) {
if (Array.isArray(o)) {
        return o.sort().map(JSON.sort);
    } else if (isObject(o)) {
        return Object
            .keys(o)
        .sort()
            .reduce(function(a, k) {
                a[k] = JSON.sort(o[k]);

                return a;
            }, {});
    }

    return o;
}

main().catch(err => console.log(err));

