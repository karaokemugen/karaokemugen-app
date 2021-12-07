import sample from 'lodash.sample';
import { Socket } from 'socket.io';

import { getKMStats, shutdown } from '../../components/engine';
import { getMpvAudioOutputs } from '../../components/mpv';
import { generateDB } from '../../dao/database';
import { getSettings, saveSetting } from '../../lib/dao/database';
import { generateDatabase } from '../../lib/services/generation';
import { APIData } from '../../lib/types/api';
import { getConfig } from '../../lib/utils/config';
import { browseFs } from '../../lib/utils/files';
import { enableWSLogging, readLog } from '../../lib/utils/logger';
import { SocketIOApp } from '../../lib/utils/ws';
import { getMigrationsFrontend, setMigrationsFrontend } from '../../services/migrationsFrontend';
import { getFeeds } from '../../services/proxyFeeds';
import { destroyRemote, initRemote } from '../../services/remote';
import { updateSongsLeft } from '../../services/user';
import { backupConfig, editSetting, getPublicConfig } from '../../utils/config';
import { initializationCatchphrases } from '../../utils/constants';
import { getDisplays } from '../../utils/displays';
import { dumpPG, restorePG } from '../../utils/postgresql';
import { getPlayerState, getPublicState, getState } from '../../utils/state';
import { APIMessage, errMessage } from '../common';
import { runChecklist } from '../middlewares';

export default function miscController(router: SocketIOApp) {
	router.route('getMigrationsFrontend', async (socket: Socket, req: APIData) => {
		await runChecklist(socket, req, 'admin', 'open');
		try {
			return getMigrationsFrontend();
		} catch (err) {
			throw { code: 500 };
		}
	});
	router.route('setMigrationsFrontend', async (socket: Socket, req: APIData) => {
		await runChecklist(socket, req, 'admin', 'open');
		try {
			return await setMigrationsFrontend(req.body.mig);
		} catch (err) {
			throw { code: 500 };
		}
	});

	router.route('getRemoteData', async (socket: Socket, req: APIData) => {
		await runChecklist(socket, req, 'admin', 'open');
		try {
			const state = getState();
			if (state.remoteAccess) {
				const settings = await getSettings();
				return { active: true, info: state.remoteAccess, token: settings.remoteToken };
			} else {
				return { active: false };
			}
		} catch (err) {
			throw { code: 500 };
		}
	});
	router.route('resetRemoteToken', async (socket: Socket, req: APIData) => {
		await runChecklist(socket, req, 'admin', 'open');
		try {
			await destroyRemote();
			await saveSetting('remoteToken', '');
			await initRemote();
		} catch (err) {
			throw { code: 500 };
		}
	});
	router.route('shutdown', async (socket: Socket, req: APIData) => {
		await runChecklist(socket, req, 'admin', 'open');
		try {
			shutdown();
		} catch (err) {
			throw { code: 500 };
		}
	});

	router.route('getSettings', async (socket: Socket, req: APIData) => {
		await runChecklist(socket, req, 'guest', 'closed', { optionalAuth: true });
		return {
			version: getState().version,
			config: req.user?.type === 0 ? getConfig() : getPublicConfig(),
			state: getPublicState(req.user?.type === 0),
		};
	});
	router.route('updateSettings', async (socket: Socket, req: APIData) => {
		await runChecklist(socket, req);
		try {
			return await editSetting(req.body.setting);
		} catch (err) {
			const code = 'SETTINGS_UPDATE_ERROR';
			errMessage(code, err);
			throw { code: err?.code || 500, message: APIMessage(code) };
		}
	});
	router.route('getDisplays', async (socket: Socket, req: APIData) => {
		await runChecklist(socket, req);
		return getDisplays();
	});
	router.route('getAudioDevices', async (socket: Socket, req: APIData) => {
		await runChecklist(socket, req);
		return getMpvAudioOutputs();
	});
	router.route('getStats', async (socket: Socket, req: APIData) => {
		await runChecklist(socket, req, 'guest', 'closed');
		try {
			return await getKMStats();
		} catch (err) {
			const code = 'STATS_ERROR';
			errMessage(code, err);
			throw { code: err?.code || 500, message: APIMessage(code) };
		}
	});

	router.route('refreshUserQuotas', async (socket: Socket, req: APIData) => {
		await runChecklist(socket, req, 'guest', 'limited');
		updateSongsLeft(req.token.username).catch(() => {});
	});

	router.route('getPlayerStatus', async (socket: Socket, req: APIData) => {
		await runChecklist(socket, req, 'guest', 'limited');
		return getPlayerState();
	});

	router.route('getNewsFeed', async () => {
		try {
			return await getFeeds();
		} catch (err) {
			throw { code: 500 };
		}
	});

	router.route('getCatchphrase', async (_socket: Socket, _req: APIData) => {
		return sample(initializationCatchphrases);
	});

	router.route('getLogs', async (socket: Socket, req: APIData) => {
		await runChecklist(socket, req, 'admin', 'open');
		try {
			// Align socket
			enableWSLogging(req.body.level);
			// remote environments doesn't support rooms... yet
			// Polling is used for remote
			// FIXME: find a way to support this (maybe not)
			if ('join' in socket) socket.join('logs');
			return await readLog(req.body.level);
		} catch (err) {
			throw { code: 500, message: APIMessage('ERROR_READING_LOGS') };
		}
	});

	router.route('backupSettings', async (socket: Socket, req: APIData) => {
		await runChecklist(socket, req);
		try {
			await backupConfig();
			return { code: 200, message: APIMessage('CONFIG_BACKUPED') };
		} catch (err) {
			throw { code: 500, message: APIMessage('CONFIG_BACKUPED_ERROR') };
		}
	});

	router.route('generateDatabase', async (socket: Socket, req: APIData) => {
		await runChecklist(socket, req, 'admin', 'open');
		try {
			await generateDB();
			return { code: 200, message: APIMessage('DATABASE_GENERATED') };
		} catch (err) {
			const code = 'DATABASE_GENERATED_ERROR';
			errMessage(code, err);
			throw { code: err?.code || 500, message: APIMessage(code) };
		}
	});
	router.route('validateFiles', async (socket: Socket, req: APIData) => {
		await runChecklist(socket, req, 'admin', 'open');
		try {
			await generateDatabase({
				validateOnly: true,
			});
			return { code: 200, message: APIMessage('FILES_VALIDATED') };
		} catch (err) {
			const code = 'FILES_VALIDATED_ERROR';
			errMessage(code, err);
			throw { code: err?.code || 500, message: APIMessage(code) };
		}
	});
	router.route('dumpDatabase', async (socket: Socket, req: APIData) => {
		await runChecklist(socket, req, 'admin', 'open');
		try {
			await dumpPG();
			return { code: 200, message: APIMessage('DATABASE_DUMPED') };
		} catch (err) {
			throw { code: 500, message: APIMessage('DATABASE_DUMPED_ERROR') };
		}
	});

	router.route('restoreDatabase', async (socket: Socket, req: APIData) => {
		await runChecklist(socket, req, 'admin', 'open');
		try {
			await restorePG();
			return APIMessage('DATABASE_RESTORED');
		} catch (err) {
			throw { code: 500, message: APIMessage('DATABASE_RESTORED_ERROR') };
		}
	});
	router.route('getFS', async (socket: Socket, req: APIData) => {
		await runChecklist(socket, req, 'admin', 'open');
		try {
			return await browseFs(req.body.path, req.body.onlyMedias);
		} catch (err) {
			const code = 'FS_ERROR';
			errMessage(code, err);
			throw { code: err?.code || 500, message: APIMessage(code) };
		}
	});
}
