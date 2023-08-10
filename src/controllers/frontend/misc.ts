import { sample } from 'lodash';
import { Socket } from 'socket.io';

import { initKaraBase, shutdown } from '../../components/engine.js';
import { getMpvAudioOutputs } from '../../components/mpv.js';
import { getSettings, saveSetting } from '../../lib/dao/database.js';
import { generateDatabase } from '../../lib/services/generation.js';
import { APIData } from '../../lib/types/api.js';
import { getConfig } from '../../lib/utils/config.js';
import { enableWSLogging, readLog } from '../../lib/utils/logger.js';
import { SocketIOApp } from '../../lib/utils/ws.js';
import { getMigrationsFrontend, setMigrationsFrontend } from '../../services/migrationsFrontend.js';
import { getFeeds } from '../../services/proxyFeeds.js';
import { destroyRemote, initRemote } from '../../services/remote.js';
import { updateSongsLeft } from '../../services/user.js';
import { backupConfig, editSetting, getPublicConfig } from '../../utils/config.js';
import { initializationCatchphrases } from '../../utils/constants.js';
import { getDisplays } from '../../utils/displays.js';
import { browseFs } from '../../utils/files.js';
import { selectLogFile } from '../../utils/logger.js';
import { dumpPG, restorePG } from '../../utils/postgresql.js';
import { getPlayerState, getPublicState, getState } from '../../utils/state.js';
import { APIMessage, errMessage } from '../common.js';
import { runChecklist } from '../middlewares.js';

export default function miscController(router: SocketIOApp) {
	router.route('openLogFile', async (socket: Socket, req: APIData) => {
		await runChecklist(socket, req, 'admin');
		try {
			await selectLogFile();
		} catch (err) {
			throw { code: 500, msg: err };
		}
	});
	router.route('getMigrationsFrontend', async (socket: Socket, req: APIData) => {
		await runChecklist(socket, req, 'admin', 'open');
		try {
			return await getMigrationsFrontend();
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
			}
			return { active: false };
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
	router.route('getElectronVersions', async (socket: Socket, req: APIData) => {
		await runChecklist(socket, req, 'guest', 'closed', { optionalAuth: true });
		return { ...process.versions };
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

	router.route('getCatchphrase', async (_socket: Socket, _req: APIData) => sample(initializationCatchphrases));

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
			await initKaraBase();
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
			await initKaraBase();
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
