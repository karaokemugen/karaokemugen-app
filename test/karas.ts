import {expect} from 'chai';

import {DBKara} from '../src/lib/types/database/kara';
import { allKIDs,getToken, request, testKara } from './util/util';

const jpnTag = '4dcf9614-7914-42aa-99f4-dbce2e059133~5';

describe('Karas information', () => {
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
				expect(res.body.content[0].kid).to.be.oneOf(allKIDs);
			});
	});

	it('Get all japanese songs', async () => {
		return request
			.get(`/api/karas?searchValue=t:${jpnTag}&searchType=search`)
			.set('Accept', 'application/json')
			.set('Authorization', token)
			.expect('Content-Type', /json/)
			.expect(200)
			.then(res => {
				for (const kara of res.body.content) {
					expect(kara.tid).to.include(jpnTag);
				}
			});
	});

	it('Get songs from 2004', async () => {
		return request
			.get('/api/karas?searchType=search&searchValue=y:2004')
			.set('Accept', 'application/json')
			.set('Authorization', token)
			.expect('Content-Type', /json/)
			.expect(200)
			.then(res => {
				for (const kara of res.body.content) {
					expect(kara.year).to.be.equal(2004);
				}
			});
	});

	it('Get songs from 2004 AND japanese', async () => {
		return request
			.get(`/api/karas?searchType=search&searchValue=y:2004!t:${jpnTag}`)
			.set('Accept', 'application/json')
			.set('Authorization', token)
			.expect('Content-Type', /json/)
			.expect(200)
			.then(res => {
				for (const kara of res.body.content) {
					expect(kara.year).to.be.equal(2004);
					expect(kara.tid).to.include(jpnTag);
				}
			});
	});

	it('Get songs in most recent order', async () => {
		return request
			.get('/api/karas?searchType=recent')
			.set('Accept', 'application/json')
			.set('Authorization', token)
			.expect('Content-Type', /json/)
			.expect(200)
			.then(res => {
				const dateList = res.body.content.map((k: DBKara) => k.created_at);
				const dateList2 = [].concat(dateList);
				dateList2.sort();
				expect(JSON.stringify(dateList)).to.be.equal(JSON.stringify(dateList2.reverse()));
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
					expect(kara.series[0].name).to.include('Dragon').and.include('Ball');
					testKara(kara, {tagDetails: 'short', kara: true});
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
				testKara(res.body, {tagDetails: 'full', kara: true});
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

