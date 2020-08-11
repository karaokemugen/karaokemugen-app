import {expect} from 'chai';
import { resolve } from 'path';

import { User } from '../src/lib/types/user';
import { allLangs,getToken, request } from './util/util';

describe('Users', () => {
	let token: string;
	before(async () => {
		token = await getToken();
	});
	it('Create a new user', async () => {
		const data = {
			login: 'BakaToTest',
			password: 'ilyenapas'
		};
		return request
			.post('/api/users')
			.set('Accept', 'application/json')
			.send(data)
			.expect(200)
			.then(res => {
				expect(res.body.code).to.be.equal('USER_CREATED');
			});
	});

	it('Create new user (as admin)', async () => {
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
			.then(res => {
				expect(res.body.code).to.be.equal('USER_CREATED');
			});
	});

	it('Edit your own account', async () => {
		return request
			.put('/api/myaccount')
			.set('Authorization', token)
			.set('Accept', 'application/json')
			.field('nickname', 'toto')
			.attach('avatarfile', resolve(__dirname, '../assets/guestAvatars/vegeta.jpg'))
			.expect(200)
			.then(res => {
				expect(res.body.code).to.be.equal('USER_EDITED');
			});
	});

	it('List users AFTER create user', async () => {
		return request
			.get('/api/users/')
			.set('Authorization', token)
			.set('Accept', 'application/json')
			.expect(200)
			.then(res => {
				expect(res.body).to.be.an('array');
				expect(res.body.length).to.be.at.least(1);
				expect(res.body.some((u: User) => u.login === 'BakaToTest' && u.type === 1)).to.be.true;
				// Test all users info
				for (const user of res.body) {
					testUser(user);
				}
			});
	});

	it('View own user details', async () => {
		return request
			.get('/api/myaccount')
			.set('Authorization', token)
			.set('Accept', 'application/json')
			.expect(200)
			.then(res => {
				testUser(res.body, true);
			});
	});

	it('View user details', async () => {
		return request
			.get('/api/users/BakaToTest')
			.set('Authorization', token)
			.set('Accept', 'application/json')
			.expect(200)
			.then(res => {
				expect(res.body.type).to.be.equal(1);
				testUser(res.body);
			});
	});

	it('Delete an user', async () => {
		return request
			.delete('/api/users/BakaToTest')
			.set('Accept', 'application/json')
			.set('Authorization', token)
			.expect(200)
			.then(res => {
				expect(res.body.code).to.be.equal('USER_DELETED');
			});
	});

	it('Delete another user', async () => {
		return request
			.delete('/api/users/BakaToTest2')
			.set('Accept', 'application/json')
			.set('Authorization', token)
			.expect(200)
			.then(res => {
				expect(res.body.code).to.be.equal('USER_DELETED');
			});
	});
});

function testUser(u: User, full?: boolean) {
	expect(u.avatar_file).to.be.a('string');
	expect(u.flag_online).to.be.a('boolean');
	expect(u.last_login_at).to.be.a('string');
	expect(u.login).to.be.a('string');
	expect(u.nickname).to.be.a('string');
	expect(u.type).to.be.a('number').and.at.least(0).and.at.most(2);
	if (full) {
		expect(u.bio).to.satisfy((e:any) => typeof e === 'string' || e === null);
		expect(u.email).to.satisfy((e:any) => typeof e === 'string' || e === null);
		expect(u.fallback_series_lang).to.satisfy((e:any) => typeof e === 'string' || e === null);
		if (u.fallback_series_lang) {
			expect(allLangs).to.include(u.fallback_series_lang);
		}
		expect(u.fingerprint).to.satisfy((e:any) => typeof e === 'string' || e === null);
		expect(u.main_series_lang).to.satisfy((e:any) => typeof e === 'string' || e === null);
		if (u.main_series_lang) {
			expect(allLangs).to.include(u.main_series_lang);
		}
		expect(u.password).to.be.a('string');
		expect(u.series_lang_mode).to.be.a('number').and.at.least(-1).and.at.most(3);
		expect(u.url).to.satisfy((e:any) => typeof e === 'string' || e === null);
	}
}