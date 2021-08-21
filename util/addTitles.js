const kpath = 'app/karaokebase/karaokes';
const path = require('path');
const fs = require('fs/promises');

async function main() {
	const dir = await fs.readdir(kpath);
	for (const file of dir) {
		if (!file.endsWith('.kara.json')) continue;
		const karaData = await fs.readFile(path.resolve(kpath, file), 'utf-8');
		const kara = JSON.parse(karaData);
		kara.data.titles = {};
		kara.data.titles.eng = kara.data.title;
		if (kara.data.tags.langs.includes('4dcf9614-7914-42aa-99f4-dbce2e059133')) kara.data.titles.qjr = kara.data.title;
		const dataOrdered = Object.keys(kara.data).sort().reduce(
			(obj, key) => {
			  obj[key] = kara.data[key];
			  return obj;
			},
			{}
		  );
		kara.data = dataOrdered;
		await fs.writeFile(path.resolve(kpath, file), JSON.stringify(kara, null, 2), 'utf-8');
	}
}

main().catch(err => console.log(err));