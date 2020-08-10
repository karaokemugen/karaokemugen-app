import {expect} from 'chai';
import langs from 'langs';
import supertest from 'supertest';

import { DBTag } from '../../src/lib/types/database/tag';
import { md5Regexp,tagTypes, uuidRegexp } from '../../src/lib/utils/constants';
import {Config} from '../../src/types/config';
import { testDownloads } from '../../src/utils/constants';

export const request = supertest('http://localhost:1337');
export const usernameAdmin = 'adminTest';
export const passwordAdmin = 'ceciestuntest';
export const allLangs = langs.codes('2B');
export const allKIDs = testDownloads.map(d => d.kid);
export let token: any;

export async function getToken(): Promise<string> {
	if (!token) {
		const res = await request
			.post('/api/auth/login')
			.set('Accept', 'application/json')
			.send({
				username: usernameAdmin,
				password: passwordAdmin
			})
			.expect(200);
		token = res.body.token;
	}
	return token;
}


let config: Config;

export function getConfig(): Config {
	return config;
}

export function setConfig(newConfig: Config) {
	config = newConfig;
}

export function testKara(kara: any, type: 'kara'|'plc') {
	for (const tagType of Object.keys(tagTypes)) {
		expect(kara[tagType]).to.be.an('array');
		for (const tag of kara[tagType]) {
			if (type === 'kara') testTag(tag as any);
			if (type === 'plc') testTag(tag as any, true);
		}
	}
	if (type === 'kara') expect(kara.created_at).to.be.a('string');
	expect(kara.duration).to.be.a('number').and.at.least(0);
	if (type === 'plc') expect(kara.flag_blacklisted).to.be.a('boolean');
	expect(kara.flag_dejavu).to.be.a('boolean');
	expect(kara.flag_favorites).to.be.a('boolean');
	if (type === 'plc') expect(kara.flag_free).to.be.a('boolean');
	expect(kara.flag_inplaylist).to.be.a('boolean');
	expect(kara.flag_upvoted).to.be.a('boolean');
	if (type === 'plc') expect(kara.flag_visible).to.be.a('boolean');
	if (type === 'plc') expect(kara.flag_whitelisted).to.be.a('boolean');
	expect(kara.gain).to.be.a('number');
	if (type === 'plc') expect(kara.kara_created_at).to.be.a('string');
	if (type === 'plc') expect(kara.kara_modified_at).to.be.a('string');
	expect(kara.karafile).to.be.a('string');
	expect(kara.kid).to.be.a('string').and.match(new RegExp(uuidRegexp));
	expect(kara.lastplayed_ago).to.satisfy((e:any) => typeof e === 'string' || e === null);
	if (type === 'kara') expect(kara.lastrequested_at).to.satisfy((e:any) => typeof e === 'string' || e === null);
	expect(kara.lastplayed_at).to.satisfy((e:any) => typeof e === 'string' || e === null);
	expect(kara.mediafile).to.be.a('string');
	expect(kara.mediasize).to.be.a('number').and.at.least(0);
	expect(kara.modified_at).to.be.a('string');
	if (type === 'kara') {
		expect(kara.my_public_plc_id).to.be.an('array');
		for (const plcid of kara.my_public_plc_id) {
			expect(plcid).to.satisfy((p:any) => typeof p === 'number' || p === null);
		}
	}
	if (type === 'plc') {
		expect(kara.nickname).to.be.a('string');
	}
	expect(kara.played).to.be.a('number').and.at.least(0);
	if (type === 'plc') expect(kara.playlist_id).to.be.a('number').and.at.least(0);
	if (type === 'plc') expect(kara.playlistcontent_id).to.be.a('number').and.at.least(0);
	if (type === 'plc') expect(kara.pos).to.be.a('number').and.at.least(0);
	expect(kara.requested).to.be.a('number').and.at.least(0);
	expect(kara.songorder).to.satisfy((s:any) => typeof s === 'number' || s === null);
	expect(kara.subchecksum).to.satisfy((s:any) => (typeof s === 'string' && new RegExp(md5Regexp).test(s)) || s === null);
	expect(kara.subfile).to.satisfy((s:any) => typeof s === 'string' || s === null);
	if (type === 'kara') {
		expect(kara.tid).to.be.an('array');
		for (const tid of kara.tid) {
			expect(tid).to.be.a('string').and.match(new RegExp(uuidRegexp));
		}
	}
	if (type === 'plc') expect(kara.time_before_play).to.satisfy((s:any) => typeof s === 'number' || s === null);
	expect(kara.title).to.be.a('string');
	if (type === 'plc') expect(kara.upvotes).to.be.a('number').and.at.least(0);
	if (type === 'plc') expect(kara.username).to.be.a('string');
	expect(kara.year).to.be.a('number');
}

export function testTag(tag: DBTag, full?: boolean) {
	expect(tag.name).to.be.a('string');
	expect(tag.problematic).to.be.a('boolean');
	expect(tag.short).to.satisfy((val: any) => typeof val === 'string' || val === null);
	expect(tag.tid).to.be.a('string').and.match(new RegExp(uuidRegexp));
	if (full) {
		expect(tag.aliases).to.be.an('array');
		expect(tag.i18n).to.be.an('object');
		for (const val of Object.values(tag.i18n)) {
			expect(val).to.be.a('string');
		}
		const langs = Object.keys(tag.i18n);
		// Langs should be included in all Langs
		expect(allLangs).to.include(langs);
		expect(tag.karacount).to.satisfy((karacounts: any) => {
			if (karacounts === null) return true;
			if (Array.isArray(karacounts)) {
				return karacounts.every(kc => typeof kc.count === 'number' && typeof kc.type === 'number');
			}
			return false;
		});
		expect(tag.modified_at).to.be.a('string');
		expect(tag.repository).to.be.a('string');
		expect(tag.tagfile).to.be.a('string');
		expect(tag.types).to.be.an('array');
		for (const type of tag.types) {
			expect(type).to.be.a('number');
		}
	}
}