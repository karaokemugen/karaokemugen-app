import {notStrictEqual, strictEqual} from 'assert';
import supertest from 'supertest';

import {Config} from '../src/types/config';
import { getToken } from './util/util';

let config: Config;

export function getConfig(): Config {
	return config;
}

export function setConfig(newConfig: Config) {
	config = newConfig;
}


const request = supertest('http://localhost:1337');

let currentPlaylistID: number;
let currentPLCID: number;

describe('Users', () => {
	let token: string;
	before(async () => {
		token = await getToken();
	});
	it('Create a new user', () => {
		const data = {
			login: 'BakaToTest',
			password: 'ilyenapas'
		};
		return request
			.post('/api/users')
			.set('Accept', 'application/json')
			.send(data)
			.expect(200)
			.then(response => {
				strictEqual(response.body.code,'USER_CREATED');
			});
	});

	it('Create new user (as admin)', () => {
		const data = {
			login: 'BakaToTest2',
			password: 'ilyenapas2',
			role: 'admin'
		};
		return request
			.post('/api/users')
			.set('Authorization', token)
			.set('Accept', 'application/json')
			.send(data)
			.expect(200)
			.then(response => {
				strictEqual(response.body.code,'USER_CREATED');
			});
	});

	it('Edit your own account', () => {
		const data = {
			nickname: 'toto'
		};
		return request
			.put('/api/myaccount')
			.set('Authorization', token)
			.set('Accept', 'application/json')
			.send(data)
			.expect(200)
			.then(response => {
				strictEqual(response.body.code,'USER_EDITED');
			});
	});

	it('List users', () => {
		return request
			.get('/api/users/')
			.set('Authorization', token)
			.set('Accept', 'application/json')
			.expect(200)
			.then(response => {
				response.body.forEach(element => {
					if (element.login === 'BakaToTest') {
						strictEqual(element.type, 1);
					}
				});
			});
	});

	it('View own user details', () => {
		return request
			.get('/api/myaccount')
			.set('Authorization', token)
			.set('Accept', 'application/json')
			.expect(200)
			.then(response => {
				strictEqual(response.body.nickname, 'toto');
			});
	});

	it('View user details', () => {
		return request
			.get('/api/users/BakaToTest')
			.set('Authorization', token)
			.set('Accept', 'application/json')
			.expect(200)
			.then(response => {
				strictEqual(response.body.type, 1);
			});
	});

	it('Delete an user', () => {
		return request
			.delete('/api/users/BakaToTest')
			.set('Accept', 'application/json')
			.set('Authorization', token)
			.expect(200)
			.then(response => {
				strictEqual(response.body.code, 'USER_DELETED');
			});
	});
});

describe('Whitelist', () => {
	let token: string;
	before(async () => {
		token = await getToken();
	});
	it('Add song to whitelist', () => {
		const data = {
			'kid': ['495e2635-38a9-42db-bdd0-df4d27329c87'],
			'reason': 'Because reasons'
		};
		return request
			.post('/api/whitelist')
			.set('Accept', 'application/json')
			.set('Authorization', token)
			.send(data)
			.expect(201);
	});

	it('Get whitelist', () => {
		return request
			.get('/api/whitelist')
			.set('Accept', 'application/json')
			.set('Authorization', token)
			.expect('Content-Type', /json/)
			.expect(200)
			.then(response => {
				strictEqual(response.body.content.length, 1);
			});
	});

	it('Delete whitelist item', () => {
		const data = {
			kid: ['495e2635-38a9-42db-bdd0-df4d27329c87']
		};
		return request
			.delete('/api/whitelist/')
			.set('Accept', 'application/json')
			.set('Authorization', token)
			.send(data)
			.expect(200);
	});

	it('Empty whitelist', () => {
		return request
			.put('/api/whitelist/empty')
			.set('Accept', 'application/json')
			.set('Authorization', token)
			.expect(200);
	});
});

describe('Main', () => {
	let token: string;
	before(async () => {
		token = await getToken();
	});
	it('Get settings', () => {
		return request
			.get('/api/settings')
			.set('Accept', 'application/json')
			.set('Authorization', token)
			.expect('Content-Type', /json/)
			.expect(200)
			.then(response =>{
				strictEqual(response.body.config.Frontend.Port, 1337);
				setConfig(response.body);
			});
	});

	it('Get statistics', () => {
		return request
			.get('/api/stats')
			.set('Accept', 'application/json')
			.set('Authorization', token)
			.expect('Content-Type', /json/)
			.expect(200);
	});

	it('Update settings', () => {
		const data = getConfig();
		data.Frontend.Permissions.AllowViewWhitelist = true;
		return request
			.put('/api/settings')
			.set('Accept', 'application/json')
			.set('Authorization', token)
			.send(data)
			.expect('Content-Type', /json/)
			.expect(200);
	});
});

