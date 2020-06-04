import {db} from '../lib/dao/database';
import { Session } from '../types/session';
const sql = require('./sql/session');

export async function selectSessions(): Promise<Session[]> {
	const sessions = await db().query(sql.selectSessions);
	return sessions.rows;
}

export function replaceSession(seid1: string, seid2: string) {
	return Promise.all([
		db().query(sql.replacePlayed, [seid1, seid2]),
		db().query(sql.replaceRequested, [seid1, seid2])
	]);
}
export function insertSession(session: Session) {
	return db().query(sql.insertSession, [
		session.seid,
		session.name,
		session.started_at,
		session.private,
	]);
}

export function deleteSession(seid: string) {
	return db().query(sql.deleteSession, [seid]);
}

export function updateSession(session: Session) {
	return db().query(sql.updateSession, [
		session.seid,
		session.name,
		session.started_at,
		session.private
	]);
}

export function cleanSessions() {
	return db().query(sql.cleanSessions);
}