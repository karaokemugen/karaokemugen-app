import {expect} from 'chai';

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
				expect(res.body.config.Frontend.Port).to.be.equal(1337);
				setConfig(res.body);
			});
	});

	it('Get statistics', () => {
		return request
			.get('/api/stats')
			.set('Accept', 'application/json')
			.set('Authorization', token)
			.expect('Content-Type', /json/)
			.expect(200)
			.then(res => {
				expect(res.body.authors).to.be.a('number').and.at.least(0);
				expect(res.body.blacklist).to.be.a('number').and.at.least(0);
				expect(res.body.creators).to.be.a('number').and.at.least(0);
				expect(res.body.duration).to.be.a('number').and.at.least(0);
				expect(res.body.kara).to.be.a('number').and.at.least(0);
				expect(res.body.authors).to.be.a('number').and.at.least(0);
				expect(res.body.languages).to.be.a('number').and.at.least(0);
				expect(res.body.played).to.be.a('number').and.at.least(0);
				expect(res.body.playlists).to.be.a('number').and.at.least(0);
				expect(res.body.series).to.be.a('number').and.at.least(0);
				expect(res.body.singers).to.be.a('number').and.at.least(0);
				expect(res.body.songwriters).to.be.a('number').and.at.least(0);
				expect(res.body.tags).to.be.a('number').and.at.least(0);
				expect(res.body.whitelist).to.be.a('number').and.at.least(0);
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

