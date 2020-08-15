import {expect} from 'chai';

import { getToken, request } from './util/util';

describe('Song Poll', () => {
	let token: string;
	before(async () => {
		token = await getToken();
	});
	it('Get current poll status', () => {
		return request
			.get('/api/songpoll')
			.set('Accept', 'application/json')
			.set('Authorization', token)
			.expect(425)
			.then(res => {
				expect(res.body.code).to.be.equal('POLL_NOT_ACTIVE');
			});
	});

	it('Set poll', async () => {
		const data = {
			index: 1
		};
		return request
			.post('/api/songpoll')
			.set('Accept', 'application/json')
			.set('Authorization', token)
			.send(data)
			.expect(425)
			.then(res => {
				expect(res.body.code).to.be.equal('POLL_NOT_ACTIVE');
			});
	});

});