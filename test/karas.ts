import {expect} from 'chai';

import {testDownloads} from '../src/utils/constants';
import { getToken, request, testKara } from './util/util';

describe('Karas information', () => {
	const allKIDs = testDownloads.map(d => d.kid);
	let token: string;
	before(async () => {
		token = await getToken();
	});

	it('Get a random karaoke ID', async () => {
		return request
			.get('/api/karas?random=1')
			.set('Accept', 'application/json')
			.set('Authorization', token)
			.expect('Content-Type', /json/)
			.expect(200)
			.then(res => {
				expect(res.body.content).to.have.lengthOf(1);
				expect(res.body.infos.count).to.be.equal(1);
				expect(res.body.content[0].kid).to.be.oneOf(allKIDs);
			});
	});

	it('Get complete list of karaokes with Dragon Ball in their name', async () => {
		return request
			.get('/api/karas?filter=Dragon%20Ball')
			.set('Accept', 'application/json')
			.set('Authorization', token)
			.expect('Content-Type', /json/)
			.expect(200)
			.then(res => {
				// This is made so if we ever run tests on a full database, it'll work.
				for (const kara of res.body.content) {
					expect(kara.series[0].name).to.include('Dragon').and.include('.Ball');
				}
			});
	});

	it('Get song info from database', async () => {
		return request
			.get(`/api/karas/${allKIDs[0]}`)
			.set('Accept', 'application/json')
			.set('Authorization', token)
			.expect('Content-Type', /json/)
			.expect(200)
			.then(res => {
				expect(res.body.kid).to.be.equal(allKIDs[0]);
				testKara(res.body, 'kara');
			});
	});

	it('Get song lyrics', async () => {
		return request
			.get(`/api/karas/${allKIDs[0]}/lyrics`)
			.set('Accept', 'application/json')
			.set('Authorization', token)
			.expect('Content-Type', /json/)
			.expect(200)
			.then(res => {
				expect(res.body.length).to.be.at.least(1);
			});
	});

	it('Get year list', async () => {
		return request
			.get('/api/years')
			.set('Accept', 'application/json')
			.set('Authorization', token)
			.expect('Content-Type', /json/)
			.expect(200)
			.then(res => {
				expect(res.body.content.length).to.be.at.least(1);
				for (const year of res.body.content) {
					expect(year.year).to.be.not.NaN;
					expect(year.karacount).to.be.not.NaN;
				}
			});
	});
});

