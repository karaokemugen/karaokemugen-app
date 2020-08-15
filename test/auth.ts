import {expect} from 'chai';

import {passwordAdmin, request,usernameAdmin} from './util/util';

describe('Auth', () => {
	it('Login / Sign in (as guest)', async () => {
		const data = {
			fingerprint: '666'
		};
		return request
			.post('/api/auth/login/guest')
			.set('Accept', 'application/json')
			.send(data)
			.expect(200)
			.then(res => {
				expect(res.body.role).to.be.equal('guest');
			});
	});
	it('Login / Sign in', async () => {
		const data = {
			username: usernameAdmin,
			password: passwordAdmin
		};
		return request
			.post('/api/auth/login')
			.set('Accept', 'application/json')
			.send(data)
			.expect(200)
			.then(res => {
				expect(res.body.role).to.be.equal('admin');
				expect(res.body.username).to.be.equal(data.username);
			});
	});

	it('Login / Sign in Error 401', async () => {
		const data = {
			username: '',
			password: ''
		};
		return request
			.post('/api/auth/login')
			.set('Accept', 'application/json')
			.send(data)
			.expect(401);
	});
});