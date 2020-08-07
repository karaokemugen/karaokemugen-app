import supertest from 'supertest';

export const request = supertest('http://localhost:1337');
export const usernameAdmin = 'adminTest';
export const passwordAdmin = 'ceciestuntest';

export async function getToken(): Promise<string> {
	const res = await request
		.post('/api/auth/login')
		.set('Accept', 'application/json')
		.send({
			username: usernameAdmin,
			password: passwordAdmin
		})
		.expect(200);
	return res.body.token;
}



