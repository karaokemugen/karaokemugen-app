import {expect} from 'chai';

import { getToken, request } from './util/util';

describe('Blacklist', () => {
	let token: string;
	const bannedKID = '5737c5b2-7ea4-414f-8c92-143838a402f6';
	before(async () => {
		token = await getToken();
	});
	it('Add a blacklist criteria', () => {
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

	let blc_id: number;

	it('Get list of blacklist criterias', async () => {
		return request
			.get('/api/blacklist/set/1/criterias')
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
	});

	it('Get blacklist', async () => {
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

	it('Get list of blacklist criterias AFTER empty', async () => {
		return request
			.get('/api/blacklist/set/1/criterias')
			.set('Accept', 'application/json')
			.set('Authorization', token)
			.expect('Content-Type', /json/)
			.expect(200)
			.then(res => {
				expect(res.body).to.have.lengthOf(0);
			});
	});

	it('Get blacklist AFTER empty', async () => {
		return requestEmptyBL();
	});

	it('Get blacklist criterias AFTER empty', async () => {
		return requestEmptyBL();
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

});
