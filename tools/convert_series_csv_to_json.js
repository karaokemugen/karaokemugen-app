import {forEach as csvForEach} from 'csv-string';
import {readFile, writeFile} from 'fs';
import {promisify} from 'util';

export function asyncReadFile(...args) {
	return promisify(readFile)(...args);
}
export function asyncWriteFile(...args) {
	return promisify(writeFile)(...args);
}


async function main() {
	let data = [];
	const content = await asyncReadFile(process.argv[2], {encoding: 'utf8'});
	csvForEach(content, ':', parsedContent => {
		const serie = parsedContent[0];
		const altNames = parsedContent[1];
		let aliases = null;
		if (altNames) aliases = altNames.split('/');
		data.push({
			aliases: aliases,					
			name: serie,
			i18n: {
				jpn: serie,
				fre: null,
			}
		});							
	});
	await asyncWriteFile('series.json', JSON.stringify({
		series: data
	}), {encoding: 'utf8'});
	return data;	
}

main().then(content => console.log(content));