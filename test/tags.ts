import {expect} from 'chai';
import { readFileSync } from 'fs';
import {resolve} from 'path';

import { DBTag } from '../src/lib/types/database/tag';
import { TagFile } from '../src/lib/types/tag';
import { allLangs, getToken, request, testTag } from './util/util';

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
			'fre': 'Mon super tag'
		},
		repository: 'Local',
		types: [8]
	};
	const tag2: any = {
		name: 'My mega tag',
		short: 'MEGA',
		problematic: false,
		noLiveDownload: true,
		aliases: ['meg'],
		i18n: {
			'fre': 'Mon mega tag',
			'eng': 'My mega tag can\'t be this cute'
		},
		repository: 'kara.moe',
		types: [2]
	};
	it('Get tag list', async () => {
		return request
			.get('/api/tags')
			.set('Accept', 'application/json')
			.set('Authorization', token)
			.expect('Content-Type', /json/)
			.expect(200)
			.then(res => {
				expect(res.body.content.length).to.be.at.least(1);
				expect(res.body.infos.count).to.be.at.least(1);
				const tags: DBTag[] = res.body.content;
				for (const tag of tags) {
					testTag(tag, 'tag');
				}
			});
	});
	it('Get tag list for type 5', async () => {
		return request
			.get('/api/tags?type=5')
			.set('Accept', 'application/json')
			.set('Authorization', token)
			.expect('Content-Type', /json/)
			.expect(200)
			.then(res => {
				const tags: DBTag[] = res.body.content;
				for (const tag of tags) {
					expect(tag.types).to.include(5);
				}
			});
	});
	it('Get tag list with filter Toei', async () => {
		return request
			.get('/api/tags?filter=Toei')
			.set('Accept', 'application/json')
			.set('Authorization', token)
			.expect('Content-Type', /json/)
			.expect(200)
			.then(res => {
				expect(res.body.content).to.have.lengthOf(1);
			});
	});
	it('Add first tag', async () => {
		return request
			.post('/api/tags')
			.set('Accept', 'application/json')
			.set('Authorization', token)
			.expect('Content-Type', /json/)
			.send(tag1)
			.expect(201)
			.then(async res => {
				expect(res.body.code).to.be.equal('TAG_CREATED');
				testTag(res.body.data, 'tag');
				tag1.tid = res.body.data.tid;
				tag1.tagfile = res.body.data.tagfile;
				// Verify the file exists
				const tagPath = resolve(repoPath, tag1.repository, 'tags/', tag1.tagfile);
				const tagFile = readFileSync(tagPath, 'utf-8');
				const tagData = JSON.parse(tagFile);
				testTagFile(tagData, tag1);
			});
	});
	it('Add second tag', async () => {
		return request
			.post('/api/tags')
			.set('Accept', 'application/json')
			.set('Authorization', token)
			.expect('Content-Type', /json/)
			.send(tag2)
			.expect(201)
			.then(async res => {
				expect(res.body.code).to.be.equal('TAG_CREATED');
				testTag(res.body.data, 'tag');
				tag2.tid = res.body.data.tid;
				tag2.tagfile = res.body.data.tagfile;
				// Verify the file exists
				const tagFile = readFileSync(resolve(repoPath, tag2.repository, 'tags/', tag2.tagfile), 'utf-8');
				const tagData = JSON.parse(tagFile);
				testTagFile(tagData, tag2);
			});
	});
	it('Get tag list with our two tags', async () => {
		return request
			.get('/api/tags')
			.set('Accept', 'application/json')
			.set('Authorization', token)
			.expect('Content-Type', /json/)
			.expect(200)
			.then(res => {
				const tags: DBTag[] = res.body.content;
				expect(tags.some(t => t.tid === tag1.tid)).to.be.true;
				expect(tags.some(t => t.tid === tag2.tid)).to.be.true;
			});
	});
	it('Get single tag', async () => {
		return request
			.get(`/api/tags/${tag1.tid}`)
			.set('Accept', 'application/json')
			.set('Authorization', token)
			.expect('Content-Type', /json/)
			.expect(200)
			.then(res => {
				testTag(res.body, 'tag');
			});
	});
	it('Edit tag', async () => {
		tag1.name = tag2.name;
		return request
			.put(`/api/tags/${tag1.tid}`)
			.set('Accept', 'application/json')
			.set('Authorization', token)
			.expect('Content-Type', /json/)
			.send(tag1)
			.expect(200);
	});
	it('Get single tag after edit', async () => {
		return request
			.get(`/api/tags/${tag1.tid}`)
			.set('Accept', 'application/json')
			.set('Authorization', token)
			.expect('Content-Type', /json/)
			.expect(200)
			.then(res => {
				expect(res.body.name).to.be.equal(tag2.name);
			});
	});
	it('List duplicate tags', async () => {
		return request
			.get('/api/tags/duplicate')
			.set('Accept', 'application/json')
			.set('Authorization', token)
			.expect('Content-Type', /json/)
			.expect(200)
			.then(res => {
				expect(res.body.content).to.be.lengthOf(2);
				for (const tag of res.body.content) {
					testTag(tag, 'tag');
				}
				expect(res.body.content[0].name).to.be.equal(res.body.content[1].name);
			});
	});

	let tagToDelete: DBTag;

	it('Merge tags', async () => {
		return request
			.post(`/api/tags/merge/${tag1.tid}/${tag2.tid}`)
			.set('Accept', 'application/json')
			.set('Authorization', token)
			.expect('Content-Type', /json/)
			.expect(200)
			.then(res => {
				expect(res.body.code).to.be.equal('TAGS_MERGED');
				expect(res.body.data.types).to.include(tag1.types[0]);
				expect(res.body.data.types).to.include(tag2.types[0]);
				tagToDelete = res.body.data;
			});
	});
	it('Delete tag', async () => {
		return request
			.delete(`/api/tags/${tagToDelete.tid}`)
			.set('Accept', 'application/json')
			.set('Authorization', token)
			.expect('Content-Type', /json/)
			.expect(200)
			.then(res => {
				expect(res.body.code).to.be.equal('TAG_DELETED');
			});
	});
});

function testTagFile(tag: TagFile, tagData: DBTag) {
	// Not testing the entierety of the file again tagData because I'm a bit lazy.
	// Sue me if it bites us in the ass later.
	expect(tag.header.description).to.be.equal('Karaoke Mugen Tag File');
	expect(tag.header.version).to.be.a('number').and.at.least(1);
	if (tag.tag.aliases) expect(tag.tag.aliases).to.satisfy((e:any) => e === undefined || Array.isArray(e));
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