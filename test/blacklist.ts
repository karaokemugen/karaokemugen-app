import {expect} from 'chai';

import {BLCSet, BLCSetFile} from '../src/types/blacklist';
import { allKIDs,commandBackend,getToken } from './util/util';

describe('Blacklist', () => {
	let token: string;
	const bannedKID = allKIDs[3];
	before(async () => {
		token = await getToken();
	});
	it(`Add a blacklist criteria (song ${bannedKID}`, async () => {
		const data = {
			blcs: [
				{
					type: 1001,
					value: bannedKID,
				}
			],
			set_id: 1
		};
		await commandBackend(token, 'createBLC', data);
	});

	let blc_id: number;

	it('Get list of blacklist criterias', async () => {
		return requestBlacklistCriterias(1);
	});

	it('Get blacklist', async () => {
		await requestBlacklist();
	});

	it('Delete a blacklist criteria', async () => {
		await commandBackend(token, 'deleteBLC', {blc_id, set_id:1});
	});

	it('Get list of blacklist criterias AFTER delete', async () => {
		return requestEmptyBLC(1);
	});

	it('Get blacklist AFTER delete', async () => {
		return requestEmptyBL();
	});

	it('Re-add a blacklist criteria', async () => {
		const data = {
			blcs: [
				{
					type: 1001,
					value: bannedKID,
				}
			],
			set_id: 1
		};

		await commandBackend(token, 'createBLC', data);
	});

	it('Empty list of blacklist criterias', async () => {
		await commandBackend(token, 'emptyBLCSet', {set_id: 1});
	});

	it('Get blacklist AFTER empty', async () => {
		return requestEmptyBL();
	});

	it('Get blacklist criterias AFTER empty', async () => {
		return requestEmptyBLC(1);
	});

	it('Re-add a blacklist criteria before testing sets', async () => {
		const data = {
			blcs: [
				{
					type: 1001,
					value: bannedKID,
				}
			],
			set_id: 1
		};

		await commandBackend(token, 'createBLC', data);
	});

	let BLCSetID: number;
	const newBLCSetName = 'Super Second set';

	it('Add a blacklist set', async () => {
		const data = await commandBackend(token, 'createBLCSet', {
			name: 'Second set'
		});
		expect(data.id).to.be.a('number').and.at.least(0);
		BLCSetID = data.id;
	});

	it('Edit blacklist set', async () => {
		await commandBackend(token, 'editBLCSet', {
			set_id: BLCSetID,
			name: newBLCSetName,
			flag_current: true
		});
	});

	it('Get blacklist AFTER switching to an empty set', async () => {
		return requestEmptyBL();
	});

	it('Get blacklist criterias AFTER switching to an empty set', async () => {
		return requestEmptyBLC(BLCSetID);
	});

	it('List all blacklist sets', async () => {
		const data = await commandBackend(token, 'getBLCSets');
		expect(data.length).to.be.at.least(2);
		for (const set of data) {
			testSet(set);
		}
		// Testing if the BLC Set we added is correct and our modifications worked
		const set = data.find((s: BLCSet) => s.blc_set_id === BLCSetID);
		expect(set.name).to.be.equal(newBLCSetName);
		expect(set.flag_current).to.be.true;
	});

	it('List specific blacklist set', async () => {
		const data = await commandBackend(token, 'getBLCSetInfo', {
			set_id: BLCSetID
		});
		testSet(data);
		// Testing if the BLC Set we added is correct and our modifications worked
		expect(data.name).to.be.equal(newBLCSetName);
		expect(data.flag_current).to.be.true;
	});

	it('Copy BLCs from set 1 to specific set', async () => {
		await commandBackend(token, 'copyBLCs', {fromSet_id: 1, toSet_id: BLCSetID});
	});

	it('Copy BLCs from set 1 to unknown set (should fail)', async () => {
		const data = await commandBackend(token, 'copyBLCs', {fromSet_id: 1, toSet_id: 666}, true);
		expect(data.code).to.be.equal(404);
	});

	it('Get list of blacklist criterias AFTER new set is current (should be equal to first set)', async () => {
		return requestBlacklistCriterias(2);
	});

	it('Get blacklist AFTER new set is current and has criterias', async () => {
		await requestBlacklist();
	});

	let BLCSetExport: BLCSetFile;

	it('Export blacklist set', async () => {
		const data  = await commandBackend(token, 'exportBLCSet', {set_id: 2});
		BLCSetExport = data;
		const setFile = data;
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

	});

	it('Import Blacklist Set', async () => {
		const data = {
			blcSet: JSON.stringify(BLCSetExport)
		};
		await commandBackend(token, 'importBLCSet', data);
	});

	let BLCSetIDToDelete: number;

	it('Add another blacklist set to delete later', async () => {
		const data = await commandBackend(token, 'createBLCSet', {
			name: 'Delete set'
		});
		expect(data.id).to.be.a('number').and.at.least(0);
		BLCSetIDToDelete = data.id;
	});

	it('Delete Blacklist Set', async () => {
		await commandBackend(token, 'deleteBLCSet', {set_id: BLCSetIDToDelete});
	});

	it('List all blacklist sets AFTER deleting one', async () => {
		const data = await commandBackend(token, 'getBLCSets');
		const set = data.find((s: BLCSet) => s.blc_set_id === BLCSetIDToDelete);
		expect(set).to.be.undefined;
	});

	async function requestEmptyBL() {
		const data = await commandBackend(token, 'getBlacklist');
		expect(data.content).to.have.lengthOf(0);
		expect(data.infos.count).to.be.equal(0);
	}

	async function requestEmptyBLC(id: number) {
		const data = await commandBackend(token, 'getBLCSet', {
			set_id: id
		});
		expect(data).to.have.lengthOf(0);
	}

	async function requestBlacklist() {
		const data = await commandBackend(token, 'getBlacklist', {set_id: 1});
		expect(data.content).to.have.lengthOf(1);
		expect(data.infos.count).to.be.equal(1);
		expect(data.content[0].kid).to.be.equal(bannedKID);
	}

	async function requestBlacklistCriterias(id: number) {
		const data = await commandBackend(token, 'getBLCSet', {
			set_id: id
		});
		blc_id = data[0].blcriteria_id.toString();
		expect(data.length).to.be.at.least(1);
		expect(data[0].type).to.be.equal(1001);
		expect(data[0].value.kid).to.be.equal(bannedKID);
	}

	function testSet(set: BLCSet) {
		expect(set.blc_set_id).to.be.a('number').and.at.least(1);
		expect(set.created_at).to.be.a('string');
		expect(set.flag_current).to.be.a('boolean');
		expect(set.modified_at).to.be.a('string');
		expect(set.name).to.be.a('string');
	}

});
