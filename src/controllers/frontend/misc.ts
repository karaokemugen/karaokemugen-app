import { sample } from 'lodash';

import { WS_CMD } from '../../../kmfrontend/src/utils/ws.js';
import { initKaraBase, shutdown } from '../../components/engine.js';
import { getMpvAudioOutputs } from '../../components/mpv/mpv.js';
import { APIMessage } from '../../lib/services/frontend.js';
import { generateDatabase } from '../../lib/services/generation.js';
import { getConfig, setConfig } from '../../lib/utils/config.js';
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
import { runChecklist } from '../middlewares.js';

export default function miscController(router: SocketIOApp) {
	router.route(WS_CMD.OPEN_LOG_FILE, async (socket, req) => {
		await runChecklist(socket, req, 'admin');
		try {
			await selectLogFile();
		} catch (err) {
			throw { code: err.code || 500, message: APIMessage(err.message) };
		}
	});
	router.route(WS_CMD.GET_MIGRATIONS_FRONTEND, async (socket, req) => {
		await runChecklist(socket, req, 'admin', 'open');
		try {
			return await getMigrationsFrontend();
		} catch (err) {
			throw { code: 500 };
		}
	});
	router.route(WS_CMD.SET_MIGRATIONS_FRONTEND, async (socket, req) => {
		await runChecklist(socket, req, 'admin', 'open');
		try {
			return await setMigrationsFrontend(req.body.mig);
		} catch (err) {
			throw { code: 500 };
		}
	});

	router.route(WS_CMD.GET_REMOTE_DATA, async (socket, req) => {
		await runChecklist(socket, req, 'admin', 'open');
		try {
			const state = getState();
			if (state.remoteAccess) {
				return { active: true, info: state.remoteAccess, token: getConfig().Online.RemoteToken };
			}
			return { active: false };
		} catch (err) {
			throw { code: 500 };
		}
	});
	router.route(WS_CMD.RESET_REMOTE_TOKEN, async (socket, req) => {
		await runChecklist(socket, req, 'admin', 'open');
		try {
			await destroyRemote();
			setConfig({ Online: { RemoteToken: null } });
			await initRemote();
		} catch (err) {
			throw { code: 500 };
		}
	});
	router.route(WS_CMD.SHUTDOWN, async (socket, req) => {
		await runChecklist(socket, req, 'admin', 'open');
		shutdown().catch(() => {});
	});

	router.route(WS_CMD.GET_SETTINGS, async (socket, req) => {
		await runChecklist(socket, req, 'guest', 'closed', { optionalAuth: true });
		return {
			version: getState().version,
			config: req.user?.type === 0 ? getConfig() : getPublicConfig(),
			state: getPublicState(req.user?.type === 0),
		};
	});
	router.route(WS_CMD.GET_ELECTRON_VERSIONS, async (socket, req) => {
		await runChecklist(socket, req, 'guest', 'closed', { optionalAuth: true });
		return { ...process.versions };
	});
	router.route(WS_CMD.UPDATE_SETTINGS, async (socket, req) => {
		await runChecklist(socket, req);
		try {
			return await editSetting(req.body.setting);
		} catch (err) {
			throw { code: err.code || 500, message: APIMessage(err.message) };
		}
	});
	router.route(WS_CMD.GET_DISPLAYS, async (socket, req) => {
		await runChecklist(socket, req);
		return getDisplays();
	});
	router.route(WS_CMD.GET_AUDIO_DEVICES, async (socket, req) => {
		await runChecklist(socket, req);
		return getMpvAudioOutputs();
	});

	router.route(WS_CMD.REFRESH_USER_QUOTAS, async (socket, req) => {
		await runChecklist(socket, req, 'guest', 'limited');
		updateSongsLeft(req.token.username).catch(() => {});
	});

	router.route(WS_CMD.GET_PLAYER_STATUS, async (socket, req) => {
		await runChecklist(socket, req, 'guest', 'limited');
		return getPlayerState();
	});

	router.route(WS_CMD.GET_NEWS_FEED, async () => {
		try {
			return await getFeeds();
		} catch (err) {
			throw { code: 500 };
		}
	});

	router.route(WS_CMD.GET_CATCHPHRASE, async (_socket, _req) => sample(initializationCatchphrases));

	router.route(WS_CMD.GET_LOGS, async (socket, req) => {
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

	router.route(WS_CMD.BACKUP_SETTINGS, async (socket, req) => {
		await runChecklist(socket, req);
		try {
			await backupConfig();
			return { code: 200, message: APIMessage('CONFIG_BACKUPED') };
		} catch (err) {
			throw { code: err.code || 500, message: APIMessage(err.message) };
		}
	});

	router.route(WS_CMD.GENERATE_DATABASE, async (socket, req) => {
		await runChecklist(socket, req, 'admin', 'open');
		try {
			await initKaraBase();
			return { code: 200, message: APIMessage('DATABASE_GENERATED') };
		} catch (err) {
			throw { code: 500, message: APIMessage('DATABASE_GENERATED_ERROR') };
		}
	});
	router.route(WS_CMD.VALIDATE_FILES, async (socket, req) => {
		await runChecklist(socket, req, 'admin', 'open');
		try {
			await generateDatabase({
				validateOnly: true,
			});
			return { code: 200, message: APIMessage('FILES_VALIDATED') };
		} catch (err) {
			throw { code: 500, message: APIMessage('FILES_VALIDATED_ERROR') };
		}
	});
	router.route(WS_CMD.DUMP_DATABASE, async (socket, req) => {
		await runChecklist(socket, req, 'admin', 'open');
		try {
			await dumpPG();
			return { code: 200, message: APIMessage('DATABASE_DUMPED') };
		} catch (err) {
			throw { code: 500, message: APIMessage('DATABASE_DUMPED_ERROR') };
		}
	});

	router.route(WS_CMD.RESTORE_DATABASE, async (socket, req) => {
		await runChecklist(socket, req, 'admin', 'open');
		try {
			await restorePG();
			await initKaraBase();
			return APIMessage('DATABASE_RESTORED');
		} catch (err) {
			throw { code: 500, message: APIMessage('DATABASE_RESTORED_ERROR') };
		}
	});
	router.route(WS_CMD.GET_FS, async (socket, req) => {
		await runChecklist(socket, req, 'admin', 'open');
		try {
			return await browseFs(req.body.path, req.body.onlyMedias);
		} catch (err) {
			throw { code: 500, message: APIMessage('FS_ERROR') };
		}
	});
}
