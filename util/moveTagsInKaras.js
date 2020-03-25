const {readFile, readdir, writeFile} = require('fs');
const path = require('path');
const {promisify} = require('util');

const kpath = path.resolve(process.argv[3]);
const tid = process.argv[2];
const typeFrom = process.argv[4];
const typeTo = process.argv[5];

const asyncReadFile = (...args) => passThroughFunction(readFile, args);
const asyncReadDir = (...args) => passThroughFunction(readdir, args);
const asyncWriteFile = (...args) => passThroughFunction(writeFile, args);

const passThroughFunction = (fn, args) => {
	if(!Array.isArray(args)) args = [args];
	return promisify(fn)(...args);
};

async function main() {
	const karas = await asyncReadDir(kpath);
	for (const karafile of karas) {
		const karaRAW = await asyncReadFile(path.resolve(kpath, karafile), 'utf-8');
		const kara = JSON.parse(karaRAW);
		if (kara.data.tags[typeFrom] && kara.data.tags[typeFrom].includes(tid)) {
			console.log('Modifying ' + karafile);
			kara.data.tags[typeFrom] = kara.data.tags[typeFrom].filter(t => t !== tid);
			if (kara.data.tags[typeFrom].length === 0) delete kara.data.tags[typeFrom];
			kara.data.tags[typeTo]
				? kara.data.tags[typeTo].push(tid)
				: kara.data.tags[typeTo] = [tid];
			await asyncWriteFile(path.resolve(kpath, karafile), JSON.stringify(kara, null, 2), 'utf-8');
		}
	}
}

main()