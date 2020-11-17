import {expect} from 'chai';

import {DBStats} from '../src/types/database/database';
import { allKIDs, getToken, request, setConfig } from './util/util';

describe('Main', () => {
	let token: string;
	before(async () => {
		token = await getToken();
	});
	it('Get settings', async () => {
		return request
			.get('/api/settings')
			.set('Accept', 'application/json')
			.set('Authorization', token)
			.expect('Content-Type', /json/)
			.expect(200)
			.then(res => {
				expect(res.body).to.have.property('config');
				expect(res.body).to.have.property('state');
				expect(res.body).to.have.property('version');
				expect(res.body.state.appPath).to.be.a('string');
				expect(res.body.state.currentPlaylistID).to.be.a('number');
				expect(res.body.state.dataPath).to.be.a('string');
				expect(res.body.state.environment).to.satisfy((e:any) => e === undefined || typeof e === 'string');
				expect(res.body.state.os).to.be.a('string');
				expect(res.body.state.publicPlaylistID).to.be.a('number');
				expect(res.body.state.sentryTest).to.satisfy((e:any) => e === undefined || typeof e === 'boolean');
				expect(res.body.state.supportedLyrics).to.be.a('array');
				expect(res.body.state.supportedMedias).to.be.a('array');
				expect(res.body.state.wsLogNamespace).to.be.a('string');
				expect(res.body.config.Frontend.Port).to.be.equal(1337);
				setConfig(res.body.config);
			});
	});

	it('Get statistics', async () => {
		return request
			.get('/api/stats')
			.set('Accept', 'application/json')
			.set('Authorization', token)
			.expect('Content-Type', /json/)
			.expect(200)
			.then(res => {
				const stats: DBStats = res.body;
				expect(stats.authors).to.be.a('number').and.at.least(0);
				expect(stats.blacklist).to.be.a('number').and.at.least(0);
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
				expect(stats.whitelist).to.be.a('number').and.at.least(0);
			});
	});

	it('Test catchphrases', async () => {
		return request
			.get('/api/catchphrase')
			.set('Accept', 'application/json')
			.set('Authorization', token)
			.expect('Content-Type', /json/)
			.expect(200)
			.then(res => {
				expect(res.body).to.be.a('string');
			});
	});

	it('Test logs', async () => {
		return request
			.get('/api/log/debug')
			.set('Accept', 'application/json')
			.set('Authorization', token)
			.expect('Content-Type', /json/)
			.expect(200)
			.then(res => {
				const levels = ['info', 'debug', 'error', 'warn'];
				for (const log of res.body) {
					expect(log.timestamp).to.be.a('string');
					if (log.service) expect(log.service).to.be.a('string');
					expect(log.message).to.be.a('string');
					expect(levels).to.include(log.level);
				}
			});
	});
	it('Use FS API to query /', async () => {
		return request
			.post('/api/fs')
			.set('Accept', 'application/json')
			.set('Authorization', token)
			.send({path: '/'})
			.expect('Content-Type', /json/)
			.expect(200)
			.then(res => {
				for (const path of res.body.contents) {
					expect(path.isDirectory).to.be.a('boolean');
					expect(path.name).to.be.a('string');
				}
				expect(res.body.fullPath).to.be.a('string');
			});
	});
	it('Put interface in closed mode and test an API', async () => {
		const data = { setting: { Frontend: { Mode: 0 }}};
		await request
			.put('/api/settings')
			.set('Accept', 'application/json')
			.set('Authorization', token)
			.send(data)
			.expect('Content-Type', /json/)
			.expect(200);
		const publicToken = await getToken('publicTest');
		return request
			.get(`/api/karas/${allKIDs[0]}`)
			.set('Accept', 'application/json')
			.set('Authorization', publicToken)
			.expect('Content-Type', /json/)
			.expect(503);
	});
	it('Return interface to open mode', async () => {
		const data = { setting: { Frontend: { Mode: 2 }}};
		return request
			.put('/api/settings')
			.set('Accept', 'application/json')
			.set('Authorization', token)
			.send(data)
			.expect('Content-Type', /json/)
			.expect(200);
	});
});

