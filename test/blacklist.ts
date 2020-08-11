import {expect} from 'chai';

import {BLCSet, BLCSetFile} from '../src/types/blacklist';
import { allKIDs,getToken, request } from './util/util';

describe('Blacklist', () => {
	let token: string;
	const bannedKID = allKIDs[3];
	before(async () => {
		token = await getToken();
	});
	it('Add a blacklist criteria', () => {
		const data = {
			blcriteria_type: 1001,
			blcriteria_value: bannedKID
		};
		return request
			.post('/api/blacklist/set/1/criterias')
			.set('Accept', 'application/json')
			.set('Authorization', token)
			.send(data)
			.expect(201);
	});

	let blc_id: number;

	it('Get list of blacklist criterias', async () => {
		return requestBlacklistCriterias(1);
	});

	it('Get blacklist', async () => {
		return requestBlacklist();
	});

	it('Delete a blacklist criteria', () => {
		return request
			.delete('/api/blacklist/set/1/criterias/'+blc_id)
			.set('Accept', 'application/json')
			.set('Authorization', token)
			.expect(200);
	});

	it('Get list of blacklist criterias AFTER delete', async () => {
		return requestEmptyBLC();
	});

	it('Get blacklist AFTER delete', async () => {
		return requestEmptyBL();
	});

	it('Re-add a blacklist criteria', () => {
		const data = {
			'blcriteria_type': '1001',
			'blcriteria_value': bannedKID
		};
		return request
			.post('/api/blacklist/set/1/criterias')
			.set('Accept', 'application/json')
			.set('Authorization', token)
			.send(data)
			.expect(201);
	});

	it('Empty list of blacklist criterias', () => {
		return request
			.put('/api/blacklist/set/1/criterias/empty')
			.set('Accept', 'application/json')
			.set('Authorization', token)
			.expect(200);
	});

	it('Get blacklist AFTER empty', async () => {
		return requestEmptyBL();
	});

	it('Get blacklist criterias AFTER empty', async () => {
		return requestEmptyBL();
	});

	it('Re-add a blacklist criteria before testing sets', () => {
		const data = {
			blcriteria_type: 1001,
			blcriteria_value: bannedKID
		};
		return request
			.post('/api/blacklist/set/1/criterias')
			.set('Accept', 'application/json')
			.set('Authorization', token)
			.send(data)
			.expect(201);
	});

	let BLCSetID: number;
	const newBLCSetName = 'Super Second set';

	it('Add a blacklist set', async () => {
		const data = {
			name: 'Second set'
		};
		return request
			.post('/api/blacklist/set')
			.set('Accept', 'application/json')
			.set('Authorization', token)
			.send(data)
			.expect(201)
			.then(res => {
				expect(res.body.id).to.be.a('number').and.at.least(0);
				BLCSetID = res.body.id;
			});
	});

	it('Turn blacklist set current', async () => {
		return request
			.put(`/api/blacklist/set/${BLCSetID}/setCurrent`)
			.set('Accept', 'application/json')
			.set('Authorization', token)
			.expect(200);
	});

	it('Edit blacklist set', async () => {
		return request
			.put(`/api/blacklist/set/${BLCSetID}`)
			.set('Accept', 'application/json')
			.set('Authorization', token)
			.send({name: newBLCSetName})
			.expect(200);
	});

	it('Get blacklist AFTER switching to an empty set', async () => {
		return requestEmptyBL();
	});

	it('Get blacklist criterias AFTER switching to an empty set', async () => {
		return requestEmptyBL();
	});

	it('List all blacklist sets', async () => {
		return request
			.get('/api/blacklist/set')
			.set('Accept', 'application/json')
			.set('Authorization', token)
			.expect(200)
			.then(res => {
				expect(res.body.length).to.be.at.least(2);
				for (const set of res.body) {
					testSet(set);
				}
				// Testing if the BLC Set we added is correct and our modifications worked
				const set = res.body.find((s: BLCSet) => s.blc_set_id === BLCSetID);
				expect(set.name).to.be.equal(newBLCSetName);
				expect(set.flag_current).to.be.true;
			});
	});

	it(`List blacklist set ${BLCSetID}`, async () => {
		return request
			.get(`/api/blacklist/set/${BLCSetID}`)
			.set('Accept', 'application/json')
			.set('Authorization', token)
			.expect(200)
			.then(res => {
				testSet(res.body);
				// Testing if the BLC Set we added is correct and our modifications worked
				expect(res.body.name).to.be.equal(newBLCSetName);
				expect(res.body.flag_current).to.be.true;
			});
	});

	it(`Copy BLCs from set 1 to ${BLCSetID}`, async () => {
		return request
			.get('/api/blacklist/set/criterias/copy')
			.set('Accept', 'application/json')
			.set('Authorization', token)
			.send({fromSet_id: 1, toSet_id: BLCSetID})
			.expect(200);
	});

	it('Copy BLCs from set 1 to unknown set (should fail)', async () => {
		return request
			.get('/api/blacklist/set/criterias/copy')
			.set('Accept', 'application/json')
			.set('Authorization', token)
			.send({fromSet_id: 1, toSet_id: 666})
			.expect(404)
			.then(res => {
				expect(res.body.code).to.be.a('string').and.equal('BLC_COPY_ERROR');
			});
	});

	it('Get list of blacklist criterias AFTER new set is current (should be equal to first set)', async () => {
		return requestBlacklistCriterias(2);
	});

	it('Get blacklist AFTER new set is curernt and has criterias', async () => {
		return requestBlacklist();
	});

	let BLCSetExport: BLCSetFile;

	it(`Export blacklist set ${BLCSetID}`, async () => {
		return request
			.get('/api/blacklist/set/2/export')
			.set('Accept', 'application/json')
			.set('Authorization', token)
			.expect(200)
			.then(res => {
				const setFile = res.body;
				expect(setFile.blcSet).to.be.an('array');
				expect(setFile.blcSet.length).to.be.at.least(1);
				for (const blcset of setFile.blcSet) {
					expect(blcset.blcriteria_id).to.be.a('number').and.at.least(1);
					expect(blcset.type).to.be.a('number').and.at.least(1);
					expect(blcset.value).to.exist;
				}
				expect(setFile.blcSetInfo.created_at).to.be.a('string');
				expect(setFile.blcSetInfo.modified_at).to.be.a('string');
				expect(setFile.blcSetInfo.name).to.be.a('string').and.equal(newBLCSetName);
				expect(setFile.header.description).to.be.equal('Karaoke Mugen BLC Set File');
				expect(setFile.header.version).to.be.a('number');
				BLCSetExport = res.body;
			});
	});

	it('Import Blacklist Set', async () => {
		const data = {
			blcSet: JSON.stringify(BLCSetExport)
		};
		return request
			.post('/api/blacklist/set/import')
			.set('Authorization', token)
			.set('Accept', 'application/json')
			.send(data)
			.expect(200);
	});

	let BLCSetIDToDelete: number;

	it('Add another blacklist set to delete later', async () => {
		const data = {
			name: 'Delete set'
		};
		return request
			.post('/api/blacklist/set')
			.set('Accept', 'application/json')
			.set('Authorization', token)
			.send(data)
			.expect(201)
			.then(res => {
				expect(res.body.id).to.be.a('number').and.at.least(0);
				BLCSetIDToDelete = res.body.id;
			});
	});

	it(`Delete Blacklist Set ${BLCSetIDToDelete}`, async () => {
		return request
			.delete(`/api/blacklist/set/${BLCSetIDToDelete}`)
			.set('Authorization', token)
			.set('Accept', 'application/json')
			.expect(200);
	});

	it('List all blacklist sets AFTER deleting one', async () => {
		return request
			.get('/api/blacklist/set')
			.set('Accept', 'application/json')
			.set('Authorization', token)
			.expect(200)
			.then(res => {
				const set = res.body.find((s: BLCSet) => s.blc_set_id === BLCSetIDToDelete);
				expect(set).to.be.undefined;
			});
	});

	async function requestEmptyBL() {
		return request
			.get('/api/blacklist')
			.set('Accept', 'application/json')
			.set('Authorization', token)
			.expect('Content-Type', /json/)
			.expect(200)
			.then(res => {
				expect(res.body.content).to.have.lengthOf(0);
				expect(res.body.infos.count).to.be.equal(0);
			});
	}

	async function requestEmptyBLC() {
		return request
			.get('/api/blacklist/set/1/criterias')
			.set('Accept', 'application/json')
			.set('Authorization', token)
			.expect('Content-Type', /json/)
			.expect(200)
			.then(res => {
				expect(res.body).to.have.lengthOf(0);
			});
	}

	async function requestBlacklist() {
		return request
			.get('/api/blacklist')
			.set('Accept', 'application/json')
			.set('Authorization', token)
			.expect('Content-Type', /json/)
			.expect(200)
			.then(res => {
				expect(res.body.content).to.have.lengthOf(1);
				expect(res.body.infos.count).to.be.equal(1);
				expect(res.body.content[0].kid).to.be.equal(bannedKID);
			});
	}

	async function requestBlacklistCriterias(id: number) {
		return request
			.get(`/api/blacklist/set/${id}/criterias`)
			.set('Accept', 'application/json')
			.set('Authorization', token)
			.expect('Content-Type', /json/)
			.expect(200)
			.then(res => {
				blc_id = res.body[0].blcriteria_id.toString();
				expect(res.body.length).to.be.at.least(1);
				expect(res.body[0].type).to.be.equal(1001);
				expect(res.body[0].value.kid).to.be.equal(bannedKID);
			});
	}

	function testSet(set: BLCSet) {
		expect(set.blc_set_id).to.be.a('number').and.at.least(1);
		expect(set.created_at).to.be.a('string');
		expect(set.flag_current).to.be.a('boolean');
		expect(set.modified_at).to.be.a('string');
		expect(set.name).to.be.a('string');
	}

});
