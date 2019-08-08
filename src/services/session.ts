import {selectSessions, insertSession, updateSession, deleteSession, cleanSessions, replaceSession} from '../dao/session';
import uuidV4 from 'uuid/v4';
import { getState, setState } from '../utils/state';
import { Session } from '../types/session';

export async function getSessions() {
	const sessions = await selectSessions();
	sessions.forEach((e, i) => {
		if (e.seid === getState().currentSessionID) sessions[i].active = true;
	});
	return sessions;
}

export async function addSession(name: string, started_at?: string, activate?: boolean): Promise<string> {
	const date = started_at
		? new Date(started_at)
		: new Date();
	const seid = uuidV4()
	await insertSession({
		seid: seid,
		name: name,
		started_at: date
	});
	if (activate) setActiveSession(seid);
	return seid;
}

export function setActiveSession(seid: string) {
	setState({currentSessionID: seid});
}

export async function editSession(seid: string, name: string, started_at: string) {
	const session = await findSession(seid);
	if (!session) throw 'Session does not exist';
	return await updateSession({
		seid: seid,
		name: name,
		started_at: new Date(started_at)
	});
}

export async function removeSession(seid: string) {
	if (seid === getState().currentSessionID) throw 'Current session cannot be removed, please set another one as current first.';
	const session = await findSession(seid);
	if (!session) throw 'Session does not exist';
	return await deleteSession(seid);
}

async function findSession(seid: string): Promise<Session> {
	const sessions = await selectSessions();
	return sessions.find(s => s.seid === seid);
}

export async function mergeSessions(seid1: string, seid2: string): Promise<Session> {
	// Get which session is the earliest starting date
	const session1 = await findSession(seid1);
	const session2 = await findSession(seid2);
	session1.active = session1.seid === getState().currentSessionID;
	session2.active = session2.seid === getState().currentSessionID;
	const started_at = session1.started_at < session2.started_at
		? session1.started_at
		: session2.started_at;
	const name = session1.started_at < session2.started_at
		? session1.name
		: session2.name;
	const seid = uuidV4();
	const session = {
		name: name,
		seid: seid,
		started_at: started_at
	}
	await insertSession(session);
	if (session1.active || session2.active) setActiveSession(seid);
	await Promise.all([
		replaceSession(seid1, seid),
		replaceSession(seid2, seid)
	]);
	await Promise.all([
		removeSession(seid1),
		removeSession(seid2)
	]);
	return session;
}

export async function initSession() {
	// First remove any session with no played AND no requested data
	await cleanSessions();

	const sessions = await selectSessions();
	// If last session is still on the same date as today, just set current session to this one
	if (sessions[0] && sessions[0].started_at.toDateString() === new Date().toDateString()) {
		setActiveSession(sessions[0].seid);
	} else {
		// If no session is found or session is on another day, create a new one
		setActiveSession(await addSession(new Date().toISOString(), new Date().toString()));
	}
}

