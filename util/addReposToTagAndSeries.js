
const {readFile, readdir, writeFile} = require('fs');
const path = require('path');
const {promisify} = require('util');

const spath = path.resolve(process.argv[3] || './', 'series');
const tpath = path.resolve(process.argv[3] || './', 'tags');

const asyncReadFile = (...args) => passThroughFunction(readFile, args);
const asyncReadDir = (...args) => passThroughFunction(readdir, args);
const asyncWriteFile = (...args) => passThroughFunction(writeFile, args);

const passThroughFunction = (fn, args) => {
	if(!Array.isArray(args)) args = [args];
	return promisify(fn)(...args);
};

async function main() {
	const sdir = await asyncReadDir(spath);
	const tdir = await asyncReadDir(tpath);
	for (const file of sdir) {
		let series = await asyncReadFile(path.resolve(spath, file), 'utf-8');
		series = JSON.parse(series);
		series.series.repository = process.argv[2];
		await asyncWriteFile(path.resolve(spath, file), JSON.stringify(series, null, 2), 'utf-8');
	}
	for (const file of tdir) {
		let tag = await asyncReadFile(path.resolve(tpath, file), 'utf-8');
		tag = JSON.parse(tag);
		tag.tag.repository = process.argv[2];
		await asyncWriteFile(path.resolve(tpath, file), JSON.stringify(tag, null, 2), 'utf-8');
	}
}

main().catch(err => console.log(err));

