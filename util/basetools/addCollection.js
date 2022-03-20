import fs from 'fs/promises';
import { resolve } from 'path';

const [_node, _script, baseDir, tid, repo] = process.argv;

const karaDir = await fs.readdir(resolve(baseDir, 'karaokes/'));
const tagDir = await fs.readdir(resolve(baseDir, 'tags/'));
const sortObject = obj =>
	Object.keys(obj)
		.sort()
		.reduce((res, key) => ((res[key] = obj[key]), res), {});

console.log('Processing karas');
for (const file of karaDir) {
	const karaData = await fs.readFile(resolve(baseDir, 'karaokes/', file), 'utf-8');
	const kara = JSON.parse(karaData);
	if (!kara.data.tags.collections) {
		kara.data.tags.collections = [];
		kara.data.tags = sortObject(kara.data.tags);
	}
	if (!kara.data.tags.collections.includes(tid)) {
		kara.data.tags.collections.push(tid);
	}
	if (repo) {
		kara.data.repository = repo;
	}
	await fs.writeFile(resolve(baseDir, 'karaokes/', file), JSON.stringify(kara, null, 2), 'utf-8');
}
console.log('Processing tags');
for (const file of tagDir) {
	const tagData = await fs.readFile(resolve(baseDir, 'tags/', file), 'utf-8');
	const tag = JSON.parse(tagData);
	if (tag.tag.repository !== repo) {
		tag.tag.repository = repo;
		await fs.writeFile(resolve(baseDir, 'tags/', file), JSON.stringify(tag, null, 2), 'utf-8');
	}
}
