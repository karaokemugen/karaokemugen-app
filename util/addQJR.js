const tpath = 'app/karaokebase/tags';
const path = require('path');
const fs = require('fs/promises');

async function main() {
	const dir = await fs.readdir(tpath);
	for (const file of dir) {
		if (!file.endsWith('.tag.json')) continue;
		const tagData = await fs.readFile(path.resolve(tpath, file), 'utf-8');
		const tag = JSON.parse(tagData);
		if (tag.tag.i18n.jpn && !tag.tag.types.includes('langs')) {
			tag.tag.i18n.qjr = tag.tag.name;
			await fs.writeFile(path.resolve(tpath, file), JSON.stringify(tag, null, 2), 'utf-8');
		}
	}
}

main().catch(err => console.log(err));