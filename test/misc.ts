import {expect} from 'chai';

import {DBStats} from '../src/types/database/database';
import { getConfig,getToken, request, setConfig } from './util/util';

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
				expect(res.body.state.environment).to.be.a('string');
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

	it('Update settings', () => {
		const data = getConfig();
		data.Frontend.Permissions.AllowViewWhitelist = true;
		return request
			.put('/api/settings')
			.set('Accept', 'application/json')
			.set('Authorization', token)
			.send(data)
			.expect('Content-Type', /json/)
			.expect(200);
	});
});

