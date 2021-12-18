import { createObjectCsvWriter as csvWriter } from 'csv-writer';
import i18next from 'i18next';
import { resolve } from 'path';
import { v4 as uuidV4 } from 'uuid';

import { APIMessage } from '../controllers/common';
import { selectAllKaras } from '../dao/kara';
import {
	autoFillSessionEndedAt,
	cleanSessions,
	deleteSession,
	insertSession,
	replaceSession,
	selectSessions,
	updateSession,
} from '../dao/session';
import { getConfig, resolvedPath } from '../lib/utils/config';
import { sanitizeFile } from '../lib/utils/files';
import logger, { profile } from '../lib/utils/logger';
import { emitWS } from '../lib/utils/ws';
import { Session, SessionExports } from '../types/session';
import sentry from '../utils/sentry';
import { getState, setState } from '../utils/state';
import { getSongSeriesSingers, getSongTitle, getSongVersion } from './kara';

export async function getSessions() {
	const sessions = await selectSessions();
	sessions.forEach((e, i) => {
		if (e.seid === getState().currentSessionID) sessions[i].active = true;
	});
	return sessions;
}

export async function addSession(
	name: string,
	started_at?: string,
	ended_at?: string,
	activate?: boolean,
	flag_private?: boolean
): Promise<Session> {
	const date = started_at ? new Date(started_at) : new Date();
	const seid = uuidV4();
	const session = {
		seid: seid,
		name: name,
		started_at: date,
		ended_at: ended_at ? new Date(ended_at) : null,
		private: flag_private || false,
	};
	await insertSession(session);
	if (activate) setActiveSession(session);
	return session;
}

export function setActiveSession(session: Session) {
	setState({
		currentSessionID: session.seid,
		currentSessionEndsAt: session.ended_at,
	});
}

export async function editSession(session: Session) {
	const oldSession = await findSession(session.seid);
	if (!oldSession) throw { code: 404, msg: 'ERROR_CODES.SESSION_NOT_FOUND' };
	if (session.ended_at && new Date(session.ended_at).getTime() < new Date(session.started_at).getTime())
		throw { code: 409, msg: 'ERROR_CODES.SESSION_END_BEFORE_START_ERROR' };
	session.started_at
		? (session.started_at = new Date(session.started_at))
		: (session.started_at = oldSession.started_at);
	// Ended_at is optional
	if (session.ended_at) session.ended_at = new Date(session.ended_at);
	await updateSession(session);
	if (session.active) setActiveSession(session);
}

export async function removeSession(seid: string) {
	if (seid === getState().currentSessionID) throw { code: 403 };
	const session = await findSession(seid);
	if (!session) throw { code: 404 };
	return deleteSession(seid);
}

export async function findSession(seid: string): Promise<Session> {
	const sessions = await selectSessions();
	return sessions.find(s => s.seid === seid);
}

export async function mergeSessions(seid1: string, seid2: string): Promise<Session> {
	// Get which session is the earliest starting date
	const [session1, session2] = await Promise.all([findSession(seid1), findSession(seid2)]);
	if (!session1 || !session2) throw { code: 404 };
	session1.active = session1.seid === getState().currentSessionID;
	session2.active = session2.seid === getState().currentSessionID;
	const started_at = session1.started_at < session2.started_at ? session1.started_at : session2.started_at;
	const ended_at = session1.ended_at > session2.ended_at ? session1.ended_at : session2.ended_at;
	const name = session1.started_at < session2.started_at ? session1.name : session2.name;
	const seid = uuidV4();
	const session = {
		name: name,
		seid: seid,
		started_at: new Date(started_at),
		ended_at: new Date(ended_at),
		private: session1.private || session2.private,
	};
	await insertSession(session);
	if (session1.active || session2.active) setActiveSession(session);
	await Promise.all([replaceSession(seid1, seid), replaceSession(seid2, seid)]);
	await Promise.all([removeSession(seid1), removeSession(seid2)]);
	return session;
}

export async function initSession() {
	profile('initSession');
	// First remove any session with no played AND no requested data
	await cleanSessions();

	const sessions = await selectSessions();
	// If last session is still on the same date as today, just set current session to this one
	if (
		sessions[0]?.started_at instanceof Date &&
		sessions[0]?.started_at.toDateString() === new Date().toDateString()
	) {
		setActiveSession(sessions[0]);
	} else {
		// If no session is found or session is on another day, create a new one
		const date = new Date();
		setActiveSession(
			await addSession(
				i18next.t('NEW_SESSION_NAME', { date: date.toLocaleString(), interpolation: { escapeValue: false } }),
				date.toISOString()
			)
		);
	}
	await autoFillSessionEndedAt(getState().currentSessionID);
	// Check every minute if we should be notifying the end of session to the operator
	setInterval(checkSessionEnd, 1000 * 60);
	logger.debug('Sessions initialized', { service: 'Sessions' });
	profile('initSession');
}

function checkSessionEnd() {
	if (!getState().currentSessionEndsAt) return;
	const currentDateInt = new Date().getTime();
	const sessionDateInt = getState().currentSessionEndsAt.getTime();
	const sessionWarnDateInt = sessionDateInt - getConfig().Karaoke.MinutesBeforeEndOfSessionWarning * 60 * 1000;
	// We substr at 0, 16 to compare only dates up to a minute.
	const sessionWarnDate = new Date(sessionWarnDateInt).toISOString().substring(0, 16);
	const currentDate = new Date(currentDateInt).toISOString().substring(0, 16);
	if (currentDate === sessionWarnDate) {
		logger.info('Notifying operator of end of session being near', { service: 'Sessions' });
		emitWS(
			'operatorNotificationWarning',
			APIMessage(
				'NOTIFICATION.OPERATOR.INFO.END_OF_SESSION_NEAR',
				getConfig().Karaoke.MinutesBeforeEndOfSessionWarning
			)
		);
	}
}

export async function exportSession(seid: string): Promise<SessionExports> {
	try {
		const session = await findSession(seid);
		if (!session) throw { code: 404, msg: 'Session does not exist' };
		const [requested, played] = await Promise.all([
			selectAllKaras({ order: 'sessionRequested', q: `seid:${seid}` }),
			selectAllKaras({ order: 'sessionPlayed', q: `seid:${seid}` }),
		]);
		const sessionExports: SessionExports = {
			requested: sanitizeFile(`${session.name}.${session.started_at.toISOString()}.requested.csv`),
			played: sanitizeFile(`${session.name}.${session.started_at.toISOString()}.played.csv`),
			playedCount: sanitizeFile(`${session.name}.${session.started_at.toISOString()}.playedCount.csv`),
			requestedCount: sanitizeFile(`${session.name}.${session.started_at.toISOString()}.requestedCount.csv`),
		};
		const csvRequested = csvWriter({
			path: resolve(resolvedPath('SessionExports'), sessionExports.requested),
			header: [
				{ id: 'requested_at', title: 'REQUESTED AT' },
				{ id: 'seriesinger', title: 'SERIES/SINGER' },
				{ id: 'songtype', title: 'TYPE' },
				{ id: 'order', title: 'ORDER' },
				{ id: 'title', title: 'TITLE' },
				{ id: 'version', title: 'VERSION' },
			],
			alwaysQuote: true,
		});
		const csvPlayed = csvWriter({
			path: resolve(resolvedPath('SessionExports'), sessionExports.played),
			header: [
				{ id: 'played_at', title: 'PLAYED AT' },
				{ id: 'seriesinger', title: 'SERIES/SINGER' },
				{ id: 'songtype', title: 'TYPE' },
				{ id: 'order', title: 'ORDER' },
				{ id: 'title', title: 'TITLE' },
				{ id: 'version', title: 'VERSION' },
			],
			alwaysQuote: true,
		});
		const csvPlayedCount = csvWriter({
			path: resolve(resolvedPath('SessionExports'), sessionExports.playedCount),
			header: [
				{ id: 'count', title: 'PLAY COUNT' },
				{ id: 'seriesinger', title: 'SERIES/SINGER' },
				{ id: 'songtype', title: 'TYPE' },
				{ id: 'order', title: 'ORDER' },
				{ id: 'title', title: 'TITLE' },
				{ id: 'version', title: 'VERSION' },
			],
			alwaysQuote: true,
		});
		const csvRequestedCount = csvWriter({
			path: resolve(resolvedPath('SessionExports'), sessionExports.requestedCount),
			header: [
				{ id: 'count', title: 'REQUEST COUNT' },
				{ id: 'seriesinger', title: 'SERIES/SINGER' },
				{ id: 'songtype', title: 'TYPE' },
				{ id: 'order', title: 'ORDER' },
				{ id: 'title', title: 'TITLE' },
				{ id: 'version', title: 'VERSION' },
			],
			alwaysQuote: true,
		});
		const recordsPlayed = played.map(k => {
			return {
				played_at: k.lastplayed_at.toLocaleString(),
				seriesinger: getSongSeriesSingers(k),
				version: getSongVersion(k),
				songtype: k.songtypes.map(s => s.name).join(', '),
				order: k.songorder ? k.songorder : '',
				title: getSongTitle(k),
				kid: k.kid,
			};
		});
		const recordsRequested = requested.map(k => {
			return {
				requested_at: k.lastrequested_at.toLocaleString(),
				seriesinger: getSongSeriesSingers(k),
				version: getSongVersion(k),
				songtype: k.songtypes.map(s => s.name).join(', '),
				order: k.songorder ? k.songorder : '',
				title: getSongTitle(k),
				kid: k.kid,
			};
		});
		// Get counts for KIDs
		const playedCount = {};
		const requestedCount = {};
		for (const k of recordsPlayed) {
			playedCount[k.kid] ? playedCount[k.kid]++ : (playedCount[k.kid] = 1);
		}
		for (const k of recordsRequested) {
			requestedCount[k.kid] ? requestedCount[k.kid]++ : (requestedCount[k.kid] = 1);
		}
		const recordsPlayedCount = recordsPlayed
			.filter((e, pos) => {
				return recordsPlayed.findIndex(i => i.kid === e.kid) === pos;
			})
			.map((k: any) => {
				const kara = Object.assign({}, k);
				kara.count = playedCount[k.kid];
				delete kara.played_at;
				delete kara.kid;
				return kara;
			});
		const recordsRequestedCount = recordsRequested
			.filter((e, pos) => {
				return recordsRequested.findIndex(i => i.kid === e.kid) === pos;
			})
			.map((k: any) => {
				const kara = Object.assign({}, k);
				kara.count = requestedCount[k.kid];
				delete kara.requested_at;
				delete kara.kid;
				return kara;
			});
		recordsRequestedCount.sort((a, b) => (a.count < b.count ? 1 : -1));
		recordsPlayedCount.sort((a, b) => (a.count < b.count ? 1 : -1));
		await Promise.all([
			csvPlayed.writeRecords(recordsPlayed),
			csvRequested.writeRecords(recordsRequested),
			csvPlayedCount.writeRecords(recordsPlayedCount),
			csvRequestedCount.writeRecords(recordsRequestedCount),
		]);
		return sessionExports;
	} catch (err) {
		sentry.error(err);
		throw err;
	}
}
