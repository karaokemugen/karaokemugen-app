import {expect} from 'chai';

import { commandBackend, getToken } from './util/util';

describe('Song Poll', () => {
	let token: string;
	before(async () => {
		token = await getToken();
	});
	it('Get current poll status', async () => {
		const data = await commandBackend(token, 'getPoll', undefined, true);
		expect(data.message.code).to.be.equal('POLL_NOT_ACTIVE');
	});

	it('Set poll', async () => {
		const data = await commandBackend(token, 'votePoll', {index: 1}, true);
		expect(data.message.code).to.be.equal('POLL_NOT_ACTIVE');
	});

});