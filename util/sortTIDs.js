const kpath = '../times/karaokes';

const {readFile, readdir, writeFile} = require('fs');
const path = require('path');
const {promisify} = require('util');

const asyncReadFile = (...args) => passThroughFunction(readFile, args);
const asyncReadDir = (...args) => passThroughFunction(readdir, args);
const asyncWriteFile = (...args) => passThroughFunction(writeFile, args);

const passThroughFunction = (fn, args) => {
	if(!Array.isArray(args)) args = [args];
	return promisify(fn)(...args);
};

async function main() {
	const dir = await asyncReadDir(kpath);
	for (const file of dir) {
		const karaFile = await asyncReadFile(path.resolve(kpath, file), 'utf-8');
		const kara = JSON.parse(karaFile);
		for (const tagType of Object.keys(kara.data.tags)) {
			kara.data.tags[tagType].sort();
		}
		if (JSON.stringify(kara, null, 2) !== karaFile) {
			await asyncWriteFile(path.resolve(kpath, file), JSON.stringify(kara, null, 2), 'utf-8');
		}
	}
}

main().catch(err => console.log(err));

