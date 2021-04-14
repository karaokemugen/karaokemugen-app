import {expect} from 'chai';
import sample from 'lodash.sample';

import { allKIDs,commandBackend,getToken } from './util/util';

describe('Whitelist', () => {
	const kid = sample(allKIDs);
	let token: string;
	before(async () => {
		token = await getToken();
	});
	it('Add song to whitelist', async () => {
		const data = {
			kids: [kid],
			reason: 'Because reasons'
		};
		await commandBackend(token, 'addKaraToWhitelist', data);
	});

	it('Get whitelist', async () => {
		const data = await commandBackend(token, 'getWhitelist');
		expect(data.content).to.have.lengthOf(1);
		expect(data.content).to.satisfy((wlcs:any[]) => wlcs.some(wlc => wlc.kid === kid));
	});

	it('Get list of karaokes in a playlist and see if flag_whitelisted is true', async () => {
		const data = await commandBackend(token, 'getPlaylistContents', {pl_id: 1});
		expect(data.content.length).to.be.at.least(1);
		const plc = data.content.find(plc => plc.kid === kid);
		expect(plc.flag_whitelisted).to.be.true;
	});

	it('Delete whitelist item', async () => {
		const data = {
			kids: [kid]
		};
		await commandBackend(token, 'deleteKaraFromWhitelist', data);
	});

	it('Get whitelist AFTER delete', async () => {
		const data = await commandBackend(token, 'getWhitelist');
		expect(data.content).to.have.lengthOf(0);
	});

	it('Add song to whitelist again', async () => {
		const data = {
			kids: [kid],
			reason: 'Because reasons'
		};
		await commandBackend(token, 'addKaraToWhitelist', data);
	});

	it('Empty whitelist', async () => {
		await commandBackend(token, 'emptyWhitelist');
	});

	it('Get whitelist AFTER empty', async () => {
		const data = await commandBackend(token, 'getWhitelist');
		expect(data.content).to.have.lengthOf(0);
	});
});