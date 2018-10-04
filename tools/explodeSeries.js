const fs = require('fs');
const sanitizeFilename = require('sanitize-filename');
const deburr = require('lodash.deburr');

function sanitizeFile(file) {
	const replaceMap = {
		'·': '.',
		'・': '.',
		'Λ': 'A',
		'Я': 'R',
		'³': '3',
		'²': '2',
		'°': '0',
		'θ': '0',
		'Ø': '0',
		'○': 'O',
		'×': 'X',
		'Φ': 'O',
		'±': '+',
		'∀': 'A'
	};
	const replaceRegExp = new RegExp('[' + Object.keys(replaceMap).join('') + ']', 'ig');
	// Romanizing japanese characters by their romanization
	// Also making some obvious replacements of things we often find in japanese names.
	file = file.replace(/ô/g,'ou')
		.replace(/Ô/g,'Ou')
		.replace(/û/g,'uu')
		.replace(/µ's/g,'Mu\'s')
		.replace(/®/g,'(R)')
		.replace(/∆/g,'Delta')
		.replace(/;/g,' ')
		.replace(/\[/g,' ')
		.replace(/\]/g,' ')
		.replace(/[△:\/☆★+×†↑½♪＊*∞♥❤♡⇄♬]/g, ' ')
		.replace(/…/,'...')
		.replace(replaceRegExp, input => {
			return replaceMap[input];
		})
	;
	// Remove all diacritics and other non-ascii characters we might have left
	// Also, remove useless spaces.
	file = deburr(file)
		.replace(/[^\x00-\xFF]/g, ' ' )
		.replace(/ [ ]+/,' ')
	;
	// One last go using sanitizeFilename just in case.
	file = sanitizeFilename(file);
	return file;
}

const seriesFile = fs.readFileSync('./series.json',{encoding: 'utf8'});
const series = JSON.parse(seriesFile);
for (const s of series.series) {
	let output = {};
	output.header = {
		version: 2,
		description: 'Karaoke Mugen Series File'
	};
	output.series = {...s};
	const seriesName = sanitizeFile(s.name);
	fs.writeFileSync('./series/'+seriesName+'.series.json', JSON.stringify(output, null, 2), {encoding: 'utf8'});
}
