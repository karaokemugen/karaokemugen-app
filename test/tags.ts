import { expect } from 'chai';
import { readFileSync } from 'fs';
import { resolve } from 'path';

import { DBTag } from '../src/lib/types/database/tag';
import { TagFile } from '../src/lib/types/tag';
import { allLangs, commandBackend, getToken, testTag } from './util/util';

describe('Tags', () => {
	let token: string;
	before(async () => {
		token = await getToken();
	});
	const repoPath = `${__dirname}/../app/repos`;
	const tag1: any = {
		name: 'My super tag',
		short: 'SUPER',
		problematic: false,
		noLiveDownload: true,
		aliases: ['sup'],
		i18n: {
			fre: 'Mon super tag',
		},
		repository: 'Local',
		types: [8],
	};
	const tag2: any = {
		name: 'My mega tag',
		short: 'MEGA',
		problematic: false,
		noLiveDownload: true,
		aliases: ['meg'],
		i18n: {
			fre: 'Mon mega tag',
			eng: "My mega tag can't be this cute",
		},
		repository: 'Local',
		types: [2],
	};
	it('Get tag list', async () => {
		const data = await commandBackend(token, 'getTags');
		expect(data.content.length).to.be.at.least(1);
		expect(data.infos.count).to.be.at.least(1);
		const tags: DBTag[] = data.content;
		for (const tag of tags) {
			testTag(tag, 'tag');
		}
	});
	it('Get tag list for type 5', async () => {
		const data = await commandBackend(token, 'getTags', {
			type: 5,
		});
		const tags: DBTag[] = data.content;
		for (const tag of tags) {
			expect(tag.types).to.include(5);
		}
	});
	it('Get tag list with filter Toei', async () => {
		const data = await commandBackend(token, 'getTags', {
			filter: 'Toei',
		});
		expect(data.content.length).to.have.greaterThan(0);
	});
	it('Add first tag', async () => {
		const data = await commandBackend(token, 'addTag', tag1);
		expect(data.code).to.be.equal(200);
		testTag(data.message.data, 'tag');
		tag1.tid = data.message.data.tid;
		tag1.tagfile = data.message.data.tagfile;
		// Verify the file exists
		const tagPath = resolve(repoPath, tag1.repository, 'json/tags/', tag1.tagfile);
		const tagFile = readFileSync(tagPath, 'utf-8');
		const tagData = JSON.parse(tagFile);
		testTagFile(tagData, tag1);
	});
	it('Add second tag', async () => {
		const data = await commandBackend(token, 'addTag', tag2);
		expect(data.code).to.be.equal(200);
		testTag(data.message.data, 'tag');
		tag2.tid = data.message.data.tid;
		tag2.tagfile = data.message.data.tagfile;
		// Verify the file exists
		const tagFile = readFileSync(resolve(repoPath, tag2.repository, 'json/tags/', tag2.tagfile), 'utf-8');
		const tagData = JSON.parse(tagFile);
		testTagFile(tagData, tag2);
	});
	it('Get tag list with our two tags', async () => {
		const data = await commandBackend(token, 'getTags');
		const tags: DBTag[] = data.content;
		expect(tags.some((t) => t.tid === tag1.tid)).to.be.true;
		expect(tags.some((t) => t.tid === tag2.tid)).to.be.true;
	});
	it('Get single tag', async () => {
		const data = await commandBackend(token, 'getTag', { tid: tag1.tid });
		testTag(data, 'tag');
	});
	it('Edit tag', async () => {
		tag1.name = tag2.name;
		await commandBackend(token, 'editTag', tag1);
	});
	it('Get single tag after edit', async () => {
		const data = await commandBackend(token, 'getTag', { tid: tag1.tid });
		expect(data.name).to.be.equal(tag2.name);
	});
	it('List duplicate tags', async () => {
		const data = await commandBackend(token, 'getTags', {
			duplicates: true,
		});
		expect(data.content.length).to.be.greaterThan(1);
		for (const tag of data.content) {
			testTag(tag, 'tag');
			const dupeTag = data.content.find((t) => t.tid !== tag.tid && t.name === tag.name);
			expect(dupeTag.name).to.be.a('string');
		}
	});

	let tagToDelete: DBTag;

	it('Merge tags', async () => {
		const data = await commandBackend(token, 'mergeTags', { tid1: tag1.tid, tid2: tag2.tid });
		expect(data.code).to.be.equal(200);
		expect(data.message.data.types).to.include(tag1.types[0]);
		expect(data.message.data.types).to.include(tag2.types[0]);
		tagToDelete = data.message.data;
	});
	it('Delete tag', async () => {
		const data = await commandBackend(token, 'deleteTag', { tids: [tagToDelete.tid] });
		expect(data.code).to.be.equal(200);
	});
});

function testTagFile(tag: TagFile, tagData: DBTag) {
	// Not testing the entierety of the file again tagData because I'm a bit lazy.
	// Sue me if it bites us in the ass later.
	expect(tag.header.description).to.be.equal('Karaoke Mugen Tag File');
	expect(tag.header.version).to.be.a('number').and.at.least(1);
	if (tag.tag.aliases) expect(tag.tag.aliases).to.satisfy((e: any) => e === undefined || Array.isArray(e));
	expect(tag.tag.name).to.be.a('string').and.equal(tagData.name);
	if (tag.tag.problematic) expect(tag.tag.problematic).to.be.a('boolean').and.equal(tagData.problematic);
	if (tag.tag.noLiveDownload) expect(tag.tag.noLiveDownload).to.be.a('boolean').and.equal(tagData.noLiveDownload);
	if (tag.tag.short) expect(tag.tag.short).to.be.a('string').and.equal(tagData.short);
	expect(tag.tag.i18n).to.be.an('object');
	for (const val of Object.values(tag.tag.i18n)) {
		expect(val).to.be.a('string');
	}
	const langs = Object.keys(tag.tag.i18n);
	// Langs should be included in all Langs
	for (const lang of langs) {
		expect(allLangs).to.include(lang);
	}
	expect(tag.tag.types).to.be.an('array');
	for (const type of tag.tag.types) {
		expect(type).to.be.a('string');
	}
}
