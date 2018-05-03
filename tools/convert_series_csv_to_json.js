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
	const seriesFile = await asyncReadFile(process.argv[3], {encoding: 'utf8'});
	const series = seriesFile.split('\n');
	const content = await asyncReadFile(process.argv[2], {encoding: 'utf8'});
	csvForEach(content, ':', parsedContent => {
		const serie = parsedContent[0];
		const altNames = parsedContent[1];
		let obj = {
			aliases: null,
			name: serie,
			i18n: {
				jpn: serie
			}
		}
		if (altNames) obj.aliases = altNames.split('/');
		if (obj.aliases === null) delete obj.aliases;
		data.push(obj);							
	});
	let finalData = [];
	for (const serieName of series) {
		const seriesFound = data.some(serieObj => {
			if (serieObj.name === serieName) {
				finalData.push(serieObj);
				return true;			
			}
			return false;
		});		
		if (!seriesFound) finalData.push({
			name: serieName,
			i18n: {
				jpn: serieName
			}
		});
	}
	await asyncWriteFile('series.json', JSON.stringify({
		series: finalData
	}, null, 2), {encoding: 'utf8'});
	return finalData;	
}

main().then(content => console.log(content));