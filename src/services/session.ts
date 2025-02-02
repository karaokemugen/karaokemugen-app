import { createObjectCsvWriter as csvWriter } from 'csv-writer';
import i18next from 'i18next';
import { resolve } from 'path';
import { v4 as uuidV4 } from 'uuid';

import { selectAllKaras } from '../dao/kara.js';
import {
	autoFillSessionEndedAt,
	cleanSessions,
	deleteSession,
	insertSession,
	replaceSession,
	selectSessions,
	updateSession,
} from '../dao/session.js';
import { APIMessage } from '../lib/services/frontend.js';
import { getConfig, resolvedPath } from '../lib/utils/config.js';
import { ErrorKM } from '../lib/utils/error.js';
import { sanitizeFile } from '../lib/utils/files.js';
import logger, { profile } from '../lib/utils/logger.js';
import { isUUID } from '../lib/utils/validators.js';
import { emitWS } from '../lib/utils/ws.js';
import { Session, SessionExports } from '../types/session.js';
import sentry from '../utils/sentry.js';
import { getState, setState } from '../utils/state.js';

const service = 'Sessions';

let sessionCheckIntervalID;

export async function getSessions() {
	try {
		const sessions = await selectSessions();
		sessions.forEach((e, i) => {
			if (e.seid === getState().currentSessionID) sessions[i].active = true;
		});
		return sessions;
	} catch (err) {
		logger.error(`Error getting sessions : ${err}`, { service });
		sentry.error(err);
		throw err instanceof ErrorKM ? err : new ErrorKM('SESSION_LIST_ERROR');
	}
}

export async function addSession(
	name: string,
	started_at?: string,
	ended_at?: string,
	activate?: boolean,
	flag_private?: boolean
): Promise<Session> {
	try {
		const date = started_at ? new Date(started_at) : new Date();
		const seid = uuidV4();
		const session = {
			seid,
			name,
			started_at: date,
			ended_at: ended_at ? new Date(ended_at) : null,
			private: flag_private || false,
		};
		await insertSession(session);
		if (activate) setActiveSession(session);
		return session;
	} catch (err) {
		logger.error(`Error creation a session : ${err}`, { service });
		sentry.error(err);
		throw err instanceof ErrorKM ? err : new ErrorKM('SESSION_CREATION_ERROR');
	}
}

export async function activateSession(seid: string) {
	try {
		const session = await findSession(seid);
		setActiveSession(session);
	} catch (err) {
		logger.error(`Error activating session ${seid} : ${err}`, { service });
		sentry.error(err);
		throw err instanceof ErrorKM ? err : new ErrorKM('SESSION_ACTIVATED_ERROR');
	}
}

export function setActiveSession(session: Session) {
	setState({
		currentSessionID: session.seid,
		currentSessionEndsAt: session.ended_at,
	});
}

export async function editSession(session: Session) {
	try {
		if (!isUUID(session.seid)) throw new ErrorKM('INVALID_DATA', 400, false);
		const oldSession = await findSession(session.seid);
		if (!oldSession) throw new ErrorKM('UNKNOWN_SESSION', 404, false);

		if (session.ended_at && new Date(session.ended_at).getTime() < new Date(session.started_at).getTime()) {
			throw new ErrorKM('ERROR_CODES.SESSION_END_BEFORE_START_ERROR', 400);
		}
		session.started_at
			? (session.started_at = new Date(session.started_at))
			: (session.started_at = oldSession.started_at);
		// Ended_at is optional
		if (session.ended_at) session.ended_at = new Date(session.ended_at);
		await updateSession(session);
		if (session.active) setActiveSession(session);
	} catch (err) {
		logger.error(`Error getting repos : ${err}`, { service });
		sentry.error(err);
		throw err instanceof ErrorKM ? err : new ErrorKM('SESSION_EDIT_ERROR');
	}
}

export async function removeSession(seid: string) {
	try {
		if (!isUUID(seid)) throw new ErrorKM('INVALID_DATA', 403, false);
		if (seid === getState().currentSessionID) throw new ErrorKM('SESSION_DELETE_ACTIVE_ERROR', 403, false);
		const session = await findSession(seid);
		if (!session) throw new ErrorKM('UNKNOWN_SESSION', 404, false);
		return await deleteSession(seid);
	} catch (err) {
		logger.error(`Error deleting session : ${err}`, { service });
		sentry.error(err);
		throw err instanceof ErrorKM ? err : new ErrorKM('SESSION_DELETE_ERROR');
	}
}

export async function findSession(seid: string): Promise<Session> {
	try {
		if (!isUUID(seid)) {
			throw new ErrorKM('INVALID_DATA', 400, false);
		}
		const sessions = await selectSessions();
		return sessions.find(s => s.seid === seid);
	} catch (err) {
		logger.error(`Error getting sessions : ${err}`, { service });
		sentry.error(err);
		throw err instanceof ErrorKM ? err : new ErrorKM('SESSION_GET_ERROR');
	}
}

export async function mergeSessions(seid1: string, seid2: string): Promise<Session> {
	try {
		if (!isUUID(seid1) || !isUUID(seid2)) {
			throw new ErrorKM('INVALID_DATA', 400, false);
		}

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
			name,
			seid,
			started_at: new Date(started_at),
			ended_at: new Date(ended_at),
			private: session1.private || session2.private,
		};
		await insertSession(session);
		if (session1.active || session2.active) setActiveSession(session);
		await Promise.all([replaceSession(seid1, seid), replaceSession(seid2, seid)]);
		await Promise.all([removeSession(seid1), removeSession(seid2)]);
		return session;
	} catch (err) {
		logger.error(`Error merging sessions : ${err}`, { service });
		sentry.error(err);
		throw err instanceof ErrorKM ? err : new ErrorKM('SESSION_MERGE_ERROR');
	}
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
	sessionCheckIntervalID = setInterval(checkSessionEnd, 1000 * 60);
	logger.debug('Sessions initialized', { service });
	profile('initSession');
}

export function stopSessionSystem() {
	if (sessionCheckIntervalID) clearInterval(sessionCheckIntervalID);
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
		logger.info('Notifying operator of end of session being near', { service });
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
		if (!isUUID(seid)) throw new ErrorKM('INVALID_DATA', 400, false);
		const session = await findSession(seid);
		if (!session) throw new ErrorKM('UNKNOWN_SESSION', 404);
		const [requested, played] = await Promise.all([
			selectAllKaras({ order: 'sessionRequested', q: `seid:${seid}`, blacklist: false, ignoreCollections: true }),
			selectAllKaras({ order: 'sessionPlayed', q: `seid:${seid}`, blacklist: false, ignoreCollections: true }),
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
				{ id: 'songname', title: 'SONG NAME' },
			],
			alwaysQuote: true,
		});
		const csvPlayed = csvWriter({
			path: resolve(resolvedPath('SessionExports'), sessionExports.played),
			header: [
				{ id: 'played_at', title: 'PLAYED AT' },
				{ id: 'songname', title: 'SONG NAME' },
			],
			alwaysQuote: true,
		});
		const csvPlayedCount = csvWriter({
			path: resolve(resolvedPath('SessionExports'), sessionExports.playedCount),
			header: [
				{ id: 'count', title: 'PLAY COUNT' },
				{ id: 'songname', title: 'SONG NAME' },
			],
			alwaysQuote: true,
		});
		const csvRequestedCount = csvWriter({
			path: resolve(resolvedPath('SessionExports'), sessionExports.requestedCount),
			header: [
				{ id: 'count', title: 'REQUEST COUNT' },
				{ id: 'songname', title: 'SONG NAME' },
			],
			alwaysQuote: true,
		});
		const recordsPlayed = played.map(k => {
			return {
				played_at: k.lastplayed_at.toLocaleString(),
				songname: k.songname,
				kid: k.kid,
			};
		});
		const recordsRequested = requested.map(k => {
			return {
				requested_at: k.lastrequested_at.toLocaleString(),
				songname: k.songname,
				kid: k.kid,
			};
		});
		// Get counts for KIDs
		const playedCount = {};
		const requestedCount = {};
		for (const k of recordsPlayed) {
			playedCount[k.kid] ? (playedCount[k.kid] += 1) : (playedCount[k.kid] = 1);
		}
		for (const k of recordsRequested) {
			requestedCount[k.kid] ? (requestedCount[k.kid] += 1) : (requestedCount[k.kid] = 1);
		}
		const recordsPlayedCount = recordsPlayed
			.filter((e, pos) => {
				return recordsPlayed.findIndex(i => i.kid === e.kid) === pos;
			})
			.map((k: any) => {
				const kara = { ...k };
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
				const kara = { ...k };
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
		logger.error(`Error exporting session ${seid} : ${err}`, { service });
		sentry.error(err);
		throw err instanceof ErrorKM ? err : new ErrorKM('SESSION_EXPORT_ERROR');
	}
}
