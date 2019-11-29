const kpath = 'karasV3';
const spath = 'series';
const outpath = 'karasV4';

const {readFile, readdir, writeFile} = require('fs');
const path = require('path');
const {promisify} = require('util');
const {parse} = require('ini');

const asyncReadFile = (...args) => passThroughFunction(readFile, args);
const asyncReadDir = (...args) => passThroughFunction(readdir, args);
const asyncWriteFile = (...args) => passThroughFunction(writeFile, args);

const passThroughFunction = (fn, args) => {
	if(!Array.isArray(args)) args = [args];
	return promisify(fn)(...args);
};

async function readAllSeries() {
	const series = [];
	const dir = await asyncReadDir(spath);
	for (const file of dir) {
		let data = await asyncReadFile(path.resolve(spath, file), 'utf-8');
		const serie = JSON.parse(data);
		series.push(serie.series);
	}
	return series;
}

function findSID(series, name) {
	const serie = series.find(s => s.name === name);
	if (serie) return serie.sid;
}

async function main() {
	const dir = await asyncReadDir(kpath);
	const series = await readAllSeries();
	for (const file of dir) {
		console.log(file);
		let data = await asyncReadFile(path.resolve(kpath, file), 'utf-8');
		data = data.replace(/\r/g, '');
		const content = parse(data);
		let songorder = undefined;
		if (content.order !== '') songorder = +content.order;
		const sids = [];
		content.series.split(',').sort().forEach(s => {
			const sid = findSID(series, s);
			if (sid) sids.push(sid);
		});
		const o = {
			header: {
				version: 4,
				description: 'Karaoke Mugen Karaoke Data File'
			},
			medias: [{}],
			data: {
				authors: content.author.split(',').sort().filter(e => e !== ''),
				created_at: new Date(content.dateadded * 1000).toString(),
				creators: content.creator.split(',').sort().filter(e => e !== ''),
				groups: content.groups.split(',').sort().filter(e => e !== ''),
				kid: content.KID,
				langs: content.lang.split(',').sort(),
				modified_at: new Date(content.datemodif * 1000).toString(),
				repository: 'kara.moe',
				title: content.title,
				sids: sids,
				singers: content.singer.split(',').sort().filter(e => e !== ''),
				songorder: songorder,
				songtype: content.type,
				songwriters: content.songwriter.split(',').sort().filter(e => e !== ''),
				tags: content.tags.split(',').sort().filter(e => e !== ''),
				year: +content.year,
			}
		};
		const arr = content.title.split(' ~ ');
		arr.length > 1
			? o.medias[0].version = arr[arr.length-1]
			: o.medias[0].version = 'Default';

		o.medias[0].filename = content.mediafile;
		o.medias[0].audiogain = +content.mediagain;
		o.medias[0].filesize = +content.mediasize;
		o.medias[0].duration = +content.mediaduration;
		o.medias[0].default = true;
		content.subfile !== 'dummy.ass'
			? o.medias[0].lyrics = [{
				filename: content.subfile,
				default: true,
				version: 'Default'
			}]
			: o.medias[0].lyrics = [];
		o.data.title = content.title;

		asyncWriteFile(path.resolve(outpath, `${file}.json`), JSON.stringify(o, null, 2), 'utf-8');
	}
}

main().catch(err => console.log(err));

