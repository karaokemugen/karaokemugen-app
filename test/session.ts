import {expect} from 'chai';

import { uuidRegexp } from '../src/lib/utils/constants';
import { Session } from '../src/types/session';
import { getToken, request } from './util/util';

describe('Sessions', () => {
	let token: string;
	let initialSession: Session;
	let createdSession: Session;
	let toMergeSession: Session;
	before(async () => {
		token = await getToken();
	});
	it('Add session', () => {
		return request
			.post('/api/sessions')
			.set('Accept', 'application/json')
			.set('Authorization', token)
			.send({name: 'My session', date: new Date().toISOString(), private: true})
			.expect(201)
			.then(res => {
				expect(res.body.code).to.be.equal('SESSION_CREATED');
			});
	});

	it('Add session for merge', () => {
		return request
			.post('/api/sessions')
			.set('Accept', 'application/json')
			.set('Authorization', token)
			.send({name: 'My session', date: new Date().toISOString(), private: true})
			.expect(201)
			.then(res => {
				expect(res.body.code).to.be.equal('SESSION_CREATED');
			});
	});

	it('List sessions', () => {
		return request
			.get('/api/sessions')
			.set('Accept', 'application/json')
			.set('Authorization', token)
			.expect(200)
			.then(res => {
				for (const s of res.body) {
					if (s.active) expect(s.active).to.be.true;
					if (s.ended_at) expect(s.ended_at).to.be.a('string');
					expect(s.name).to.be.a('string');
					expect(s.played).to.be.a('number').and.at.least(0);
					expect(s.requested).to.be.a('number').and.at.least(0);
					expect(s.private).to.be.a('boolean');
					expect(s.seid).to.be.a('string').and.match(new RegExp(uuidRegexp));
					expect(s.started_at).to.be.a('string');
				}
				initialSession = res.body[0];
				createdSession = res.body[1];
				toMergeSession = res.body[2];
			});
	});

	const newName = 'My NEW session';
	const unknownSession = '4354820c-a5d2-4315-9581-5691794a4d1c';
	it('Edit unknown session should fail', () => {
		return request
			.put(`/api/sessions/${unknownSession}`)
			.set('Accept', 'application/json')
			.set('Authorization', token)
			.send({name: newName, ended_at: '2020-08-20 19:30:00'})
			.expect(404)
			.then(res => {
				expect(res.body.code).to.be.equal('SESSION_EDIT_ERROR');
			});
	});

	it('Edit session', () => {
		return request
			.put(`/api/sessions/${createdSession.seid}`)
			.set('Accept', 'application/json')
			.set('Authorization', token)
			.send({name: newName, ended_at: '2020-08-20 19:30:00'})
			.expect(200)
			.then(res => {
				expect(res.body.code).to.be.equal('SESSION_EDITED');
			});
	});

	it('Set session as active', () => {
		return request
			.post(`/api/sessions/${createdSession.seid}`)
			.set('Accept', 'application/json')
			.set('Authorization', token)
			.expect(200)
			.then(res => {
				expect(res.body.code).to.be.equal('SESSION_ACTIVATED');
			});
	});

	it('List sessions after change', () => {
		return request
			.get('/api/sessions')
			.set('Accept', 'application/json')
			.set('Authorization', token)
			.expect(200)
			.then(res => {
				const session = res.body.find((s: Session) => s.seid === createdSession.seid);
				expect(session.active).to.be.true;
				expect(session.ended_at).to.not.be.null;
				createdSession = session;
			});
	});

	it('Delete active session (should fail)', () => {
		return request
			.delete(`/api/sessions/${createdSession.seid}`)
			.set('Accept', 'application/json')
			.set('Authorization', token)
			.expect(403)
			.then(res => {
				expect(res.body.code).to.be.equal('SESSION_DELETE_ERROR');
			});
	});

	it('Delete unused session', () => {
		return request
			.delete(`/api/sessions/${initialSession.seid}`)
			.set('Accept', 'application/json')
			.set('Authorization', token)
			.expect(200)
			.then(res => {
				expect(res.body.code).to.be.equal('SESSION_DELETED');
			});
	});

	it('List sessions after delete', () => {
		return request
			.get('/api/sessions')
			.set('Accept', 'application/json')
			.set('Authorization', token)
			.expect(200)
			.then(res => {
				const session = res.body.find((s: Session) => s.seid === initialSession.seid);
				expect(session).to.be.undefined;
			});
	});

	it('Export session', () => {
		return request
			.get(`/api/sessions/${createdSession.seid}/export`)
			.set('Accept', 'application/json')
			.set('Authorization', token)
			.expect(200)
			.then(res => {
				expect(res.body.code).to.be.equal('SESSION_EXPORTED');
			});
	});

	let mergedSession: Session;

	it('Merge sessions', () => {
		return request
			.post('/api/sessions/merge')
			.set('Accept', 'application/json')
			.set('Authorization', token)
			.send({seid1: createdSession.seid, seid2: toMergeSession.seid})
			.expect(200)
			.then(res => {
				expect(res.body.code).to.be.equal('SESSION_MERGED');
				mergedSession = res.body.data.session;
			});
	});

	it('List sessions after merge', () => {
		return request
			.get('/api/sessions')
			.set('Accept', 'application/json')
			.set('Authorization', token)
			.expect(200)
			.then(res => {
				let session = res.body.find((s: Session) => s.seid === createdSession.seid);
				expect(session).to.be.undefined;
				session = res.body.find((s: Session) => s.seid === toMergeSession.seid);
				expect(session).to.be.undefined;
				session = res.body.find((s: Session) => s.seid === mergedSession.seid);
				expect(session.seid).to.be.equal(mergedSession.seid);
			});
	});
});