const kpath = 'app/karaokebase/karaokes';
const parentsFile = 'parents.yaml';

import yaml from 'js-yaml';
import { readFileSync, writeFileSync } from 'fs';
import * as path from 'path';

const parentsData = readFileSync(parentsFile, 'utf-8');
const p = yaml.load(parentsData);

for (const kara of p.parents) {
	let karaParentData = '';
	try {
		karaParentData = readFileSync(path.resolve(kpath, kara.karaParent));
	} catch (err) {
		console.log(kara.karaParent, 'not found');
		continue;
	}
	const karaParent = JSON.parse(karaParentData);
	const kid = karaParent.data.kid;
	for (const child of kara.sons) {
		let karaChildData = '';
		try {
			karaChildData = readFileSync(path.resolve(kpath, child));
		} catch (err) {
			console.log(child, 'not found');
			continue;
		}
		const karaChild = JSON.parse(karaChildData);
		if (karaChild.data.parents) {
			if (!karaChild.data.parents.includes(kid)) karaChild.data.parents.push(kid);
		} else {
			karaChild.data.parents = [kid];
			const ordered = Object.keys(karaChild.data)
				.sort()
				.reduce((obj, key) => {
					obj[key] = karaChild.data[key];
					return obj;
				}, {});
			karaChild.data = { ...ordered };
		}
		writeFileSync(path.resolve(kpath, child), JSON.stringify(karaChild, null, 2));
	}
}
