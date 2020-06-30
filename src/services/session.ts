import { createObjectCsvWriter as csvWriter } from 'csv-writer';
import { resolve } from 'path';
import { v4 as uuidV4 } from 'uuid';

import {cleanSessions, deleteSession, insertSession, replaceSession,selectSessions, updateSession} from '../dao/session';
import { sanitizeFile } from '../lib/utils/files';
import logger from '../lib/utils/logger';
import { Session } from '../types/session';
import sentry from '../utils/sentry';
import { getState, setState } from '../utils/state';
import { getKaras, getSeriesSingers } from './kara';

export async function getSessions() {
	const sessions = await selectSessions();
	sessions.forEach((e, i) => {
		if (e.seid === getState().currentSessionID) sessions[i].active = true;
	});
	return sessions;
}

export async function addSession(name: string, started_at?: string, activate?: boolean, flag_private?: boolean): Promise<string> {
	const date = started_at
		? new Date(started_at)
		: new Date();
	const seid = uuidV4();
	await insertSession({
		seid: seid,
		name: name,
		started_at: date,
		private: flag_private || false
	});
	if (activate) setActiveSession(seid);
	return seid;
}

export function setActiveSession(seid: string) {
	setState({currentSessionID: seid});
}

export async function editSession(seid: string, name: string, started_at: string, flag_private: boolean) {
	const session = await findSession(seid);
	if (!session) throw {code: 404, msg: 'Session does not exist'};
	return updateSession({
		seid: seid,
		name: name,
		started_at: new Date(started_at),
		private: flag_private || false
	});
}

export async function removeSession(seid: string) {
	if (seid === getState().currentSessionID) throw {code: 403, msg: 'Current session cannot be removed, please set another one as current first.'};
	const session = await findSession(seid);
	if (!session) throw {code: 404, msg: 'Session does not exist'};
	return deleteSession(seid);
}

async function findSession(seid: string): Promise<Session> {
	const sessions = await selectSessions();
	return sessions.find(s => s.seid === seid);
}

export async function mergeSessions(seid1: string, seid2: string): Promise<Session> {
	// Get which session is the earliest starting date
	const session1 = await findSession(seid1);
	const session2 = await findSession(seid2);
	if (!session1 || !session2) throw {code: 404};
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
	};
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
	logger.debug('Sessions initialized', {service: 'Sessions'});
}

export async function exportSession(seid: string) {
	try {
		const session = await findSession(seid);
		if (!session) throw {code: 404, msg: 'Session does not exist'};
		const [requested, played] = await Promise.all([
			getKaras({mode: 'sessionRequested', modeValue: seid, token: { role: 'admin', username: 'admin'}}),
			getKaras({mode: 'sessionPlayed', modeValue: seid, token: { role: 'admin', username: 'admin'}})
		]);
		const csvRequested = csvWriter({
			path: resolve(getState().dataPath, sanitizeFile(session.name + '.' + session.started_at.toISOString() + '.requested.csv')),
			header: [
				{id: 'requested_at', title: 'REQUESTED AT'},
				{id: 'seriesinger', title: 'SERIES/SINGER'},
				{id: 'songtype', title: 'TYPE'},
				{id: 'order', title: 'ORDER'},
				{id: 'title', title: 'TITLE'}
			],
			alwaysQuote: true
		});
		const csvPlayed = csvWriter({
			path: resolve(getState().dataPath, sanitizeFile(session.name + '.' + session.started_at.toISOString() + '.played.csv')),
			header: [
				{id: 'played_at', title: 'PLAYED AT'},
				{id: 'seriesinger', title: 'SERIES/SINGER'},
				{id: 'songtype', title: 'TYPE'},
				{id: 'order', title: 'ORDER'},
				{id: 'title', title: 'TITLE'}
			],
			alwaysQuote: true
		});
		const csvPlayedCount = csvWriter({
			path: resolve(getState().dataPath, sanitizeFile(session.name + '.' + session.started_at.toISOString() + '.playedCount.csv')),
			header: [
				{id: 'count', title: 'PLAY COUNT'},
				{id: 'seriesinger', title: 'SERIES/SINGER'},
				{id: 'songtype', title: 'TYPE'},
				{id: 'order', title: 'ORDER'},
				{id: 'title', title: 'TITLE'}
			],
			alwaysQuote: true
		});
		const csvRequestedCount = csvWriter({
			path: resolve(getState().dataPath, sanitizeFile(session.name + '.' + session.started_at.toISOString() + '.requestedCount.csv')),
			header: [
				{id: 'count', title: 'REQUEST COUNT'},
				{id: 'seriesinger', title: 'SERIES/SINGER'},
				{id: 'songtype', title: 'TYPE'},
				{id: 'order', title: 'ORDER'},
				{id: 'title', title: 'TITLE'}
			],
			alwaysQuote: true
		});
		const recordsPlayed = played.content.map(k => {
			return {
				played_at: k.lastplayed_at.toLocaleString(),
				seriesinger: getSeriesSingers(k),
				songtype: k.songtypes.map(s => s.name).join(', '),
				order: k.songorder ? k.songorder : '',
				title: k.title,
				kid: k.kid
			};
		});
		const recordsRequested = requested.content.map(k => {
			return {
				requested_at: k.lastrequested_at.toLocaleString(),
				seriesinger: getSeriesSingers(k),
				songtype: k.songtypes.map(s => s.name).join(', '),
				order: k.songorder ? k.songorder : '',
				title: k.title,
				kid: k.kid
			};
		});
		// Get counts for KIDs
		const playedCount = {};
		const requestedCount = {};
		for (const k of recordsPlayed) {
			playedCount[k.kid]
				? playedCount[k.kid]++
				: playedCount[k.kid] = 1;
		}
		for (const k of recordsRequested) {
			requestedCount[k.kid]
				? requestedCount[k.kid]++
				: requestedCount[k.kid] = 1;
		}
		const recordsPlayedCount = recordsPlayed.filter((e, pos) => {
			return recordsPlayed.findIndex(i => i.kid === e.kid) === pos;
		}).map((k: any) => {
			const kara = Object.assign({}, k);
			kara.count = playedCount[k.kid];
			delete kara.played_at;
			delete kara.kid;
			return kara;
		});
		const recordsRequestedCount = recordsRequested.filter((e, pos) => {
			return recordsRequested.findIndex(i => i.kid === e.kid) === pos;
		}).map((k: any) => {
			const kara = Object.assign({}, k);
			kara.count = requestedCount[k.kid];
			delete kara.requested_at;
			delete kara.kid;
			return kara;
		});
		recordsRequestedCount.sort((a, b) => (a.count < b.count) ? 1 : -1);
		recordsPlayedCount.sort((a, b) => (a.count < b.count) ? 1 : -1);
		await Promise.all([
			csvPlayed.writeRecords(recordsPlayed),
			csvRequested.writeRecords(recordsRequested),
			csvPlayedCount.writeRecords(recordsPlayedCount),
			csvRequestedCount.writeRecords(recordsRequestedCount)
		]);
	} catch(err) {
		const error = new Error(err);
		sentry.error(error);
		throw error;
	}
}
