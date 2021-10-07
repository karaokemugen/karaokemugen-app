import { expect } from 'chai';

import { uuidRegexp } from '../src/lib/utils/constants';
import { Session } from '../src/types/session';
import { commandBackend, getToken } from './util/util';

describe('Sessions', () => {
	let token: string;
	let initialSession: Session;
	let createdSession: Session;
	let toMergeSession: Session;
	before(async () => {
		token = await getToken();
	});
	it('Add session', async () => {
		const data = await commandBackend(token, 'createSession', {
			name: 'My session',
			date: new Date().toISOString(),
			private: true,
		});
		expect(data.message.code).to.be.equal('SESSION_CREATED');
	});

	it('Add session for merge', async () => {
		const data = await commandBackend(token, 'createSession', {
			name: 'My session',
			date: new Date().toISOString(),
			private: true,
		});
		expect(data.message.code).to.be.equal('SESSION_CREATED');
	});

	it('List sessions', async () => {
		const data = await commandBackend(token, 'getSessions');
		for (const s of data) {
			if (s.active) expect(s.active).to.be.true;
			if (s.ended_at) expect(s.ended_at).to.be.a('string');
			expect(s.name).to.be.a('string');
			expect(s.played).to.be.a('number').and.at.least(0);
			expect(s.requested).to.be.a('number').and.at.least(0);
			expect(s.private).to.be.a('boolean');
			expect(s.seid).to.be.a('string').and.match(new RegExp(uuidRegexp));
			expect(s.started_at).to.be.a('string');
		}
		initialSession = data[0];
		createdSession = data[1];
		toMergeSession = data[2];
	});

	const newName = 'My NEW session';
	const unknownSession = '4354820c-a5d2-4315-9581-5691794a4d1c';
	it('Edit unknown session should fail', async () => {
		const data = await commandBackend(
			token,
			'editSession',
			{ seid: unknownSession, name: newName, ended_at: '2020-08-20 19:30:00' },
			true
		);
		expect(data.message.code).to.be.equal('SESSION_EDIT_ERROR');
	});

	it('Edit session', async () => {
		const data = await commandBackend(token, 'editSession', {
			seid: createdSession.seid,
			name: newName,
			ended_at: '2020-08-20 19:30:00',
		});
		expect(data.message.code).to.be.equal('SESSION_EDITED');
	});

	it('Set session as active', async () => {
		const data = await commandBackend(token, 'activateSession', { seid: createdSession.seid });
		expect(data.message.code).to.be.equal('SESSION_ACTIVATED');
	});

	it('List sessions after change', async () => {
		const data = await commandBackend(token, 'getSessions');
		const session = data.find((s: Session) => s.seid === createdSession.seid);
		expect(session.active).to.be.true;
		expect(session.ended_at).to.not.be.null;
		createdSession = session;
	});

	it('Delete active session (should fail)', async () => {
		const data = await commandBackend(token, 'deleteSession', { seid: createdSession.seid }, true);
		expect(data.message.code).to.be.equal('SESSION_DELETE_ERROR');
	});

	it('Delete unused session', async () => {
		const data = await commandBackend(token, 'deleteSession', { seid: initialSession.seid });
		expect(data.message.code).to.be.equal('SESSION_DELETED');
	});

	it('List sessions after delete', async () => {
		const data = await commandBackend(token, 'getSessions');
		const session = data.find((s: Session) => s.seid === initialSession.seid);
		expect(session).to.be.undefined;
	});

	it('Export session', async () => {
		const session = await commandBackend(token, 'exportSession', { seid: createdSession.seid });
		expect(session).to.not.be.undefined;
	});

	let mergedSession: Session;

	it('Merge sessions', async () => {
		const data = await commandBackend(token, 'mergeSessions', {
			seid1: createdSession.seid,
			seid2: toMergeSession.seid,
		});
		expect(data.message.code).to.be.equal('SESSION_MERGED');
		mergedSession = data.message.data.session;
	});

	it('List sessions after merge', async () => {
		const data = await commandBackend(token, 'getSessions');
		let session = data.find((s: Session) => s.seid === createdSession.seid);
		expect(session).to.be.undefined;
		session = data.find((s: Session) => s.seid === toMergeSession.seid);
		expect(session).to.be.undefined;
		session = data.find((s: Session) => s.seid === mergedSession.seid);
		expect(session.seid).to.be.equal(mergedSession.seid);
	});
});
