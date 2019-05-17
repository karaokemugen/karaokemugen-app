
const {safeLoad} = require('js-yaml');

const {readFile, readdir, writeFile} = require('fs');
const {join, resolve} = require('path');
const {promisify} = require('util');
const {parse, stringify} = require('ini');
const {createHash} = require('crypto');
const parallel = require('async-await-parallel');
const asyncReadFile = (...args) => passThroughFunction(readFile, args);
const asyncReadDir = (...args) => passThroughFunction(readdir, args);
const asyncWriteFile = (...args) => passThroughFunction(writeFile, args);
const merge = require('lodash.merge');
const defaults = {
	System: {
		Path: {
			Karas: ['app/data/karaokes'],
			Lyrics: ['app/data/lyrics'],
			Series: ['app/data/series']
		}
	}
};

const passThroughFunction = (fn, args) => {
	if(!Array.isArray(args)) args = [args];
	return promisify(fn)(...args);
};

const checksum = (str, algorithm = 'md5', encoding = 'hex') => createHash(algorithm)
	.update(str, 'utf8')
	.digest(encoding);

const appPath = join(__dirname,'../');

main().then((() => console.log('Finished validation'))).catch((err) => console.log(err));

async function main() {
	const config = await asyncReadFile('config.yml', 'utf-8');
	const conf = merge(defaults, safeLoad(config));
	const karaPath = resolve(appPath, conf.System.Path.Karas[0], '../karas');
	const karaFiles = await asyncReadDir(karaPath);
	const karaPromises = [];
	for (const karaFile of karaFiles) {
		karaPromises.push(() => validateKaraV3(karaPath, karaFile, conf));
	}
	await parallel(karaPromises, 32);
}

async function validateKaraV3(karaPath, karaFile, conf) {
	const karaData = await asyncReadFile(resolve(karaPath, karaFile), 'utf-8');
	const kara = parse(karaData);
	if (kara.subfile !== 'dummy.ass') {
		const subFile = resolve(appPath, conf.System.Path.Lyrics[0], kara.subfile);
		const subchecksum = await extractAssInfos(subFile);
		if (subchecksum !== kara.subchecksum) {
			kara.subchecksum = subchecksum;
			await asyncWriteFile(resolve(karaPath, karaFile), stringify(kara));
			console.log(`${karaFile} updated`);
		}
	}
}

async function extractAssInfos(subFile) {
	let ass;
	let subChecksum;
	ass = await asyncReadFile(subFile, {encoding: 'utf8'});
	ass = ass.replace(/\r/g, '');
	subChecksum = checksum(ass);
	return subChecksum;
}
