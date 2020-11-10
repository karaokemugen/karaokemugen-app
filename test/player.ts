import { expect } from 'chai';

import { uuidRegexp } from '../src/lib/utils/constants';
import { commandBackend, getToken } from './util/util';

describe('Player', () => {
	let token: string;
	before(async () => {
		token = await getToken();
	});
	it('Get player status', async () => {
		const data = await commandBackend(token, 'getPlayerStatus');
		expect(data.currentRequester).to.satisfy((e:any) => typeof e === 'string' || e === null);
		expect(data.currentSessionID).to.be.a('string').and.match(new RegExp(uuidRegexp));
		expect(data.defaultLocale).to.be.a('string').and.have.lengthOf(2);
		expect(data.mediaType).to.be.equal('background');
		expect(data.onTop).to.be.a('boolean');
		expect(data.stopping).to.be.a('boolean');
	});
});
