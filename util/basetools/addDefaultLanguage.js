const kpath = process.argv[2];
import * as path from 'path';
import { promises as fs } from 'fs';

async function main() {
	const dir = await fs.readdir(kpath);
	for (const file of dir) {
		if (!file.endsWith('.kara.json')) continue;
		const karaData = await fs.readFile(path.resolve(kpath, file), 'utf-8');
		const kara = JSON.parse(karaData);
		if (!kara.data.titles_default_language) {
			kara.data.titles_default_language = kara.data.titles.qjr === kara.data.titles.eng ? 'qjr' : 'eng';
			const dataOrdered = Object.keys(kara.data)
				.sort()
				.reduce((obj, key) => {
					obj[key] = kara.data[key];
					return obj;
				}, {});
			kara.data = dataOrdered;
			await fs.writeFile(path.resolve(kpath, file), JSON.stringify(kara, null, 2), 'utf-8');
		}
	}
}

main().catch(err => console.log(err));
