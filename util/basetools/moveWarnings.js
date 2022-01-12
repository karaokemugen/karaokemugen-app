const kpath = 'app/karaokebase/karaokes';
const path = require('path');
const fs = require('fs/promises');

async function main() {
	const dir = await fs.readdir(kpath);
	for (const file of dir) {
		if (!file.endsWith('.kara.json')) continue;
		const karaData = await fs.readFile(path.resolve(kpath, file), 'utf-8');
		const kara = JSON.parse(karaData);
		const warnings = [];
		if (kara.data.tags.misc) {
			for (const tag of kara.data.tags.misc) {
				if (
					tag === '95ca7fca-3a9e-4f24-be25-05e21261e26e' ||
					tag === 'c973ea72-8a07-4f46-aca1-74f5db76dfff' ||
					tag === 'af7e0dfb-751f-463a-ac56-e8d6979c2979'
				) {
					warnings.push(tag);
				}
			}
			/** Code to remove warning tags from misc


			kara.data.tags.misc = kara.data.tags.misc.filter(
				t =>
					t !== '95ca7fca-3a9e-4f24-be25-05e21261e26e' &&
					t !== 'c973ea72-8a07-4f46-aca1-74f5db76dfff' &&
					t !== 'af7e0dfb-751f-463a-ac56-e8d6979c2979'
			);
			if (kara.data.tags.misc.length === 0) {
				delete kara.data.tags.misc;
			}
			*/
		}
		if (warnings.length > 0) {
			kara.data.tags.warnings = warnings;
			await fs.writeFile(path.resolve(kpath, file), JSON.stringify(kara, null, 2), 'utf-8');
			console.log(file);
		}
	}
}

main().catch(err => console.log(err));
