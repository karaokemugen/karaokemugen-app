import {expect} from 'chai';

import {commandBackend, passwordAdmin,usernameAdmin} from './util/util';

describe('Auth', () => {
	it('Login / Sign in (as guest)', async () => {
		const data = await commandBackend(undefined, 'loginGuest');
		expect(data.role).to.be.equal('guest');
	});
	it('Login / Sign in', async () => {
		const data = await commandBackend(undefined, 'login', {
			username: usernameAdmin,
			password: passwordAdmin
		});
		expect(data.role).to.be.equal('admin');
		expect(data.username).to.be.equal(data.username);
	});

	it('Login / Sign in Error 401', async () => {
		try {
			await commandBackend(undefined, 'login', {
				username: '',
				password: ''
			}, true);
		} catch(err) {
			console.log(err);
			expect(err.code).to.be.equal(401);
		}

	});
});