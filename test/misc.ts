import { expect } from 'chai';

import { uuidRegexp } from '../src/lib/utils/constants.js';
import { DBStats } from '../src/types/database/database.js';
import { allKIDs, commandBackend, getToken, setConfig } from './util/util.js';

describe('Main', () => {
	let token: string;
	before(async () => {
		token = await getToken();
	});
	it('Get settings', async () => {
		const data = await commandBackend(token, 'getSettings');
		expect(data).to.have.property('config');
		expect(data).to.have.property('state');
		expect(data).to.have.property('version');
		expect(data.state.appPath).to.be.a('string');
		expect(data.state.currentPlaid).to.be.a('string').and.match(uuidRegexp);
		expect(data.state.dataPath).to.be.a('string');
		expect(data.state.environment).to.satisfy((e: any) => e === undefined || typeof e === 'string');
		expect(data.state.os).to.be.a('string');
		expect(data.state.publicPlaid).to.be.a('string').and.match(uuidRegexp);
		expect(data.state.sentryTest).to.satisfy((e: any) => e === undefined || typeof e === 'boolean');
		expect(data.state.supportedLyrics).to.be.a('array');
		expect(data.state.supportedMedias).to.be.a('array');
		expect(data.config.System.FrontendPort).to.be.equal(1337);
		setConfig(data.config);
	});

	it('Get statistics', async () => {
		const data = await commandBackend(token, 'getStats');
		const stats: DBStats = data;
		expect(stats.authors).to.be.a('number').and.at.least(0);
		expect(stats.creators).to.be.a('number').and.at.least(0);
		expect(stats.duration).to.be.a('number').and.at.least(0);
		expect(stats.karas).to.be.a('number').and.at.least(0);
		expect(stats.authors).to.be.a('number').and.at.least(0);
		expect(stats.languages).to.be.a('number').and.at.least(0);
		expect(stats.played).to.be.a('number').and.at.least(0);
		expect(stats.playlists).to.be.a('number').and.at.least(0);
		expect(stats.series).to.be.a('number').and.at.least(0);
		expect(stats.singers).to.be.a('number').and.at.least(0);
		expect(stats.songwriters).to.be.a('number').and.at.least(0);
		expect(stats.tags).to.be.a('number').and.at.least(0);
	});

	it('Test catchphrases', async () => {
		const data = await commandBackend(token, 'getCatchphrase');
		expect(data).to.be.a('string');
	});

	it('Test logs', async () => {
		const data = await commandBackend(token, 'getLogs', { level: 'debug' });
		const levels = ['info', 'debug', 'error', 'warn'];
		for (const log of data) {
			expect(log.timestamp).to.be.a('string');
			if (log.service) expect(log.service).to.be.a('string');
			expect(log.message).to.be.a('string');
			expect(levels).to.include(log.level);
		}
	});

	it('Use FS API to query /', async () => {
		const data = await commandBackend(token, 'getFS', { path: '/' });
		for (const path of data.contents) {
			expect(path.isDirectory).to.be.a('boolean');
			expect(path.name).to.be.a('string');
		}
		expect(data.fullPath).to.be.a('string');
	});
	it('Put interface in closed mode and test an API', async () => {
		await commandBackend(token, 'updateSettings', { setting: { Frontend: { Mode: 0 } } });
		const publicToken = await getToken('publicTest');
		const data = await commandBackend(publicToken, 'getKara', { kid: allKIDs[0] }, true);
		expect(data.code === 503);
	});
	it('Return interface to open mode', async () => {
		const data = { setting: { Frontend: { Mode: 2 } } };
		await commandBackend(token, 'updateSettings', data);
	});
});
