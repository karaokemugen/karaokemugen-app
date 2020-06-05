import {db} from '../lib/dao/database';
import { Session } from '../types/session';
import { sqlcleanSessions,sqldeleteSession, sqlinsertSession, sqlreplacePlayed, sqlreplaceRequested, sqlselectSessions, sqlupdateSession } from './sql/session';

export async function selectSessions(): Promise<Session[]> {
	const sessions = await db().query(sqlselectSessions);
	return sessions.rows;
}

export function replaceSession(seid1: string, seid2: string) {
	return Promise.all([
		db().query(sqlreplacePlayed, [seid1, seid2]),
		db().query(sqlreplaceRequested, [seid1, seid2])
	]);
}
export function insertSession(session: Session) {
	return db().query(sqlinsertSession, [
		session.seid,
		session.name,
		session.started_at,
		session.private,
	]);
}

export function deleteSession(seid: string) {
	return db().query(sqldeleteSession, [seid]);
}

export function updateSession(session: Session) {
	return db().query(sqlupdateSession, [
		session.seid,
		session.name,
		session.started_at,
		session.private
	]);
}

export function cleanSessions() {
	return db().query(sqlcleanSessions);
}