import fs from 'fs/promises';
import { resolve } from 'path';

const kpath = 'app/karaokebase/karaokes';
const csv = [];

const dir = await fs.readdir(kpath);
for (const file of dir) {
	const rawdata = await fs.readFile(resolve(kpath, file), 'utf-8');
	const data = JSON.parse(rawdata);
	if (data.data.tags.langs.includes('4dcf9614-7914-42aa-99f4-dbce2e059133')) {
		csv.push(
			`${data.data.kid};${file};${data.data.titles.qjr || ''};${data.data.titles.eng || ''};${
				data.data.titles.jpn || ''
			}`
		);
	}
}

await fs.writeFile('titles.csv', csv.join('\n'), 'utf-8');
