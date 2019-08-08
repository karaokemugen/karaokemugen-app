import {db} from '../lib/dao/database';
import { Session } from '../types/session';
const sql = require('./sql/session');

export async function selectSessions(): Promise<Session[]> {
	const sessions = await db().query(sql.selectSessions);
	return sessions.rows;
}

export async function replaceSession(seid1: string, seid2: string) {
	return await Promise.all([
		db().query(sql.replacePlayed, [seid1, seid2]),
		db().query(sql.replaceRequested, [seid1, seid2])
	]);
};
export async function insertSession(session: Session) {
	return await db().query(sql.insertSession, [
		session.seid,
		session.name,
		session.started_at
	]);
}

export async function deleteSession(seid: string) {
	return await db().query(sql.deleteSession, [seid]);
}

export async function updateSession(session: Session) {
	return await db().query(sql.updateSession, [
		session.seid,
		session.name,
		session.started_at
	]);
}

export async function cleanSessions() {
	return await db().query(sql.cleanSessions);
}