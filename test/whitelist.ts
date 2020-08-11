import {expect} from 'chai';
import sample from 'lodash.sample';

import { allKIDs,getToken, request } from './util/util';

describe('Whitelist', () => {
	const kid = sample(allKIDs);
	let token: string;
	before(async () => {
		token = await getToken();
	});
	it('Add song to whitelist', () => {
		const data = {
			kid: [kid],
			reason: 'Because reasons'
		};
		return request
			.post('/api/whitelist')
			.set('Accept', 'application/json')
			.set('Authorization', token)
			.send(data)
			.expect(201);
	});

	it('Get whitelist', async () => {
		return request
			.get('/api/whitelist')
			.set('Accept', 'application/json')
			.set('Authorization', token)
			.expect('Content-Type', /json/)
			.expect(200)
			.then(res => {
				expect(res.body.content).to.have.lengthOf(1);
				expect(res.body.content).to.satisfy((wlcs:any[]) => wlcs.some(wlc => wlc.kid === kid));
			});
	});

	it('Get list of karaokes in a playlist and see if flag_whitelisted is true', async () => {
		return request
			.get('/api/playlists/1/karas')
			.set('Accept', 'application/json')
			.set('Authorization', token)
			.expect('Content-Type', /json/)
			.expect(200)
			.then(res => {
				expect(res.body.content.length).to.be.at.least(1);
				const plc = res.body.content.find(plc => plc.kid === kid);
				expect(plc.flag_whitelisted).to.be.true;
			});
	});

	it('Delete whitelist item', () => {
		const data = {
			kid: [kid]
		};
		return request
			.delete('/api/whitelist/')
			.set('Accept', 'application/json')
			.set('Authorization', token)
			.send(data)
			.expect(200);
	});

	it('Get whitelist AFTER delete', async () => {
		return request
			.get('/api/whitelist')
			.set('Accept', 'application/json')
			.set('Authorization', token)
			.expect('Content-Type', /json/)
			.expect(200)
			.then(res => {
				expect(res.body.content).to.have.lengthOf(0);
			});
	});

	it('Add song to whitelist again', () => {
		const data = {
			kid: [kid],
			reason: 'Because reasons'
		};
		return request
			.post('/api/whitelist')
			.set('Accept', 'application/json')
			.set('Authorization', token)
			.send(data)
			.expect(201);
	});

	it('Empty whitelist', () => {
		return request
			.put('/api/whitelist/empty')
			.set('Accept', 'application/json')
			.set('Authorization', token)
			.expect(200);
	});

	it('Get whitelist AFTER empty', async () => {
		return request
			.get('/api/whitelist')
			.set('Accept', 'application/json')
			.set('Authorization', token)
			.expect('Content-Type', /json/)
			.expect(200)
			.then(res => {
				expect(res.body.content).to.have.lengthOf(0);
			});
	});
});