import {expect} from 'chai';
import { resolve } from 'path';

import { User } from '../src/lib/types/user';
import { allLangs,commandBackend,getToken } from './util/util';

const testUserData = {
	login: 'BakaToTest',
	password: 'ilyenapas'
};


describe('Users', () => {
	let token: string;
	before(async () => {
		token = await getToken();
	});
	it('Create a new user', async () => {
		const data = await commandBackend(undefined, 'createUser', testUserData);
		expect(data.code).to.be.equal(200);
	});

	it('Create new user (as admin)', async () => {
		const data = await commandBackend(token, 'createUser', {
			login: 'BakaToTest2',
			password: 'ilyenapas2',
			role: 'admin'
		});
		expect(data.code).to.be.equal(200);
	});

	it('Edit your own account', async () => {
		const data = await commandBackend(token, 'editMyAccount', {nickname: 'toto', avatar: resolve(__dirname, '../assets/guestAvatars/vegeta.jpg')});
		expect(data.code).to.be.equal(200);
	});

	it('Reset password with wrong security code', async () => {
		const data = await commandBackend(token, 'resetUserPassword', {username: 'BakaToTest', password: 'trololo'}, true);
		expect(data.message.code).to.be.equal('USER_RESETPASSWORD_WRONGSECURITYCODE');
	});

	it('Test short password error when resetting it', async () => {
		const res = await commandBackend(undefined, 'getState');
		const securityCode = res.securityCode;

		const data = await commandBackend(token, 'resetUserPassword', {username: 'BakaToTest', password: 'trololo', securityCode: securityCode}, true);
		expect(data.message.code).to.be.equal('USER_RESETPASSWORD_ERROR');
	});

	it('Reset password with right security code', async () => {
		const data = await commandBackend(undefined, 'getState');
		const securityCode = data.securityCode;
		await commandBackend(token, 'resetUserPassword', {username: 'BakaToTest', password: 'trololo2020', securityCode: securityCode});
	});

	it('List users AFTER create user', async () => {
		const data = await commandBackend(token, 'getUsers');
		expect(data).to.be.an('array');
		expect(data.length).to.be.at.least(1);
		expect(data.some((u: User) => u.login === 'bakatotest' && u.type === 1)).to.be.true;
		// Test all users info
		for (const user of data) {
			testUser(user);
		}
	});

	it('View own user details', async () => {
		const data = await commandBackend(token, 'getMyAccount');
		testUser(data, true);
	});

	it('View user details', async () => {
		const data = await commandBackend(token, 'getUser', {username: 'BakaToTest'});
		expect(data.type).to.be.equal(1);
		testUser(data);
	});

	it('Delete an user', async () => {
		const data = await commandBackend(token, 'deleteUser', {username: 'BakaToTest'});
		expect(data.code).to.be.equal(200);
	});

	it('Delete another user', async () => {
		const data = await commandBackend(token, 'deleteUser', {username: 'BakaToTest2'});
		expect(data.code).to.be.equal(200);
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
		expect(u.language).to.satisfy((e:any) => typeof e === 'string' || e === null);
		if (u.fallback_series_lang) {
			expect(allLangs).to.include(u.fallback_series_lang);
		}
		expect(u.main_series_lang).to.satisfy((e:any) => typeof e === 'string' || e === null);
		if (u.main_series_lang) {
			expect(allLangs).to.include(u.main_series_lang);
		}
		expect(u.series_lang_mode).to.be.a('number').and.at.least(-1).and.at.most(3);
		expect(u.url).to.satisfy((e:any) => typeof e === 'string' || e === null);
	}
}