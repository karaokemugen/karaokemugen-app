import { WS_CMD } from '../../../kmfrontend/src/utils/ws.js';
import { validateMediaInfo } from '../../lib/dao/karafile.js';
import { APIMessage, errMessage } from '../../lib/services/frontend.js';
import { previewHooks, processUploadedMedia } from '../../lib/services/karaCreation.js';
import { TagTypeNum } from '../../lib/types/tag.js';
import { ErrorKM } from '../../lib/utils/error.js';
import { abortAllMediaEncodingProcesses } from '../../lib/utils/ffmpeg.js';
import { check, isUUID } from '../../lib/utils/validators.js';
import { SocketIOApp } from '../../lib/utils/ws.js';
import { getKara, getKaraLyrics, getKaraMediaInfo, getKaras, getKMStats } from '../../services/kara.js';
import { createKara, editKara } from '../../services/karaCreation.js';
import { playSingleSong } from '../../services/karaEngine.js';
import {
	batchEditKaras,
	copyKaraToRepo,
	deleteMediaFiles,
	embedAudioFileCoverArt,
	encodeMediaFileToRepoDefaults,
	removeKara,
} from '../../services/karaManagement.js';
import { addKaraToPlaylist } from '../../services/playlist.js';
import { runChecklist } from '../middlewares.js';

export default function karaController(router: SocketIOApp) {
	router.route(WS_CMD.GET_KARAS, async (socket, req) => {
		await runChecklist(socket, req, 'guest', 'limited');
		try {
			const order = req.body?.order === '' ? undefined : req.body?.order;
			return await getKaras({
				filter: req.body?.filter,
				lang: req.langs,
				from: +req.body?.from || 0,
				size: +req.body?.size || 9999999,
				order: order,
				direction: req.body?.direction,
				q: req.body?.q,
				username: req.token.username,
				random: req.body?.random,
				blacklist: req.body?.blacklist,
				parentsOnly: req.body?.parentsOnly,
				ignoreCollections: req.body?.ignoreCollections,
			});
		} catch (err) {
			throw { code: err.code || 500, message: APIMessage(err.message) };
		}
	});
	router.route(WS_CMD.CREATE_KARA, async (socket, req) => {
		await runChecklist(socket, req, 'admin', 'open');
		try {
			await createKara(req.body);
			return { code: 200, message: APIMessage('KARA_CREATED') };
		} catch (err) {
			throw { code: err.code || 500, message: APIMessage(err.message) };
		}
	});
	router.route(WS_CMD.GET_KARA_MEDIA_INFO, async (socket, req) => {
		await runChecklist(socket, req, 'admin', 'open');
		try {
			return await getKaraMediaInfo(req.body.kid);
		} catch (err) {
			throw { code: err.code || 500, message: APIMessage(err.message) };
		}
	});
	router.route(WS_CMD.VALIDATE_MEDIA_INFO, async (socket, req) => {
		await runChecklist(socket, req, 'admin', 'open');
		try {
			if (!req.body.mediaInfo || !req.body.repository) throw { code: 400 };
			return await validateMediaInfo(req.body.mediaInfo, req.body.repository);
		} catch (err) {
			throw { code: err.code || 500, message: APIMessage(err.message) };
		}
	});
	router.route(WS_CMD.PROCESS_UPLOADED_MEDIA, async (socket, req) => {
		await runChecklist(socket, req, 'admin', 'open');
		try {
			const mediaInfo = await processUploadedMedia(req.body.filename, req.body.origFilename);
			return { ...mediaInfo, filePath: undefined };
		} catch (err) {
			throw { code: err.code || 500, message: APIMessage(err.message) };
		}
	});
	router.route(WS_CMD.EMBED_AUDIO_FILE_COVER_ART, async (socket, req) => {
		await runChecklist(socket, req, 'admin', 'open');
		try {
			const mediaInfo = await embedAudioFileCoverArt(req.body.coverPictureFilename, {
				kid: req.body.kid,
				tempFileName: req.body.tempFilename,
			});
			return { ...mediaInfo, filePath: undefined };
		} catch (err) {
			throw { code: err.code || 500, message: APIMessage(err.message) };
		}
	});
	router.route(WS_CMD.ENCODE_MEDIA_FILE_TO_REPO_DEFAULTS, async (socket, req) => {
		await runChecklist(socket, req, 'admin', 'open');
		try {
			return await encodeMediaFileToRepoDefaults(
				req.body.kid,
				req.body.filename,
				req.body.repo,
				req.body.encodeOptions
			);
		} catch (err) {
			const errMessageCode = (err instanceof ErrorKM && err.message) || 'ENCODE_MEDIA_ERROR';
			errMessage(errMessageCode, err);
			throw { code: err?.code || 500, message: APIMessage(errMessageCode) };
		}
	});
	router.route(WS_CMD.ABORT_MEDIA_ENCODING, async (socket, req) => {
		await runChecklist(socket, req, 'admin', 'open');
		try {
			return abortAllMediaEncodingProcesses();
		} catch (err) {
			const code = 'ENCODE_MEDIA_ERROR';
			errMessage(code, err);
			throw { code: err?.code || 500, message: APIMessage(code) };
		}
	});
	router.route(WS_CMD.PREVIEW_HOOKS, async (socket, req) => {
		await runChecklist(socket, req, 'admin', 'open');
		try {
			return await previewHooks(req.body);
		} catch (err) {
			throw { code: err.code || 500, message: APIMessage(err.message) };
		}
	});
	router.route(WS_CMD.GET_KARA, async (socket, req) => {
		await runChecklist(socket, req, 'guest', 'limited');
		try {
			return await getKara(req.body?.kid, req.token);
		} catch (err) {
			throw { code: err.code || 500, message: APIMessage(err.message) };
		}
	});
	router.route(WS_CMD.DELETE_KARAS, async (socket, req) => {
		await runChecklist(socket, req, 'admin', 'open');
		const validationErrors = check(req.body, {
			kids: { presence: true, uuidArrayValidator: true },
		});
		if (!validationErrors) {
			try {
				await removeKara(req.body.kids);
				return { code: 200, message: APIMessage('KARA_DELETED') };
			} catch (err) {
				throw { code: err.code || 500, message: APIMessage(err.message) };
			}
		}
		return null;
	});
	router.route(WS_CMD.ADD_KARA_TO_PUBLIC_PLAYLIST, async (socket, req) => {
		await runChecklist(socket, req, 'guest', 'open');
		// Add Kara to the playlist currently used depending on mode
		if (req.body.kids.some(kid => !isUUID(kid))) throw { code: 400 };
		try {
			return await addKaraToPlaylist({
				kids: req.body.kids,
				requester: req.token.username,
				throwOnMissingKara: true,
			});
		} catch (err) {
			throw { code: err.code || 500, message: APIMessage(err.message) };
		}
	});
	router.route(WS_CMD.EDIT_KARA, async (socket, req) => {
		await runChecklist(socket, req, 'admin', 'open');
		try {
			await editKara(req.body);
			return { code: 200, message: APIMessage('KARA_EDITED') };
		} catch (err) {
			throw { code: err.code || 500, message: APIMessage(err.message) };
		}
	});
	router.route(WS_CMD.GET_KARA_LYRICS, async (socket, req) => {
		await runChecklist(socket, req, 'guest', 'limited');
		if (!isUUID(req.body.kid)) throw { code: 400 };
		try {
			return await getKaraLyrics(req.body.kid);
		} catch (err) {
			throw { code: err.code || 500, message: APIMessage(err.message) };
		}
	});
	router.route(WS_CMD.COPY_KARA_TO_REPO, async (socket, req) => {
		await runChecklist(socket, req, 'admin', 'open');
		if (!isUUID(req.body.kid)) throw { code: 400 };
		try {
			await copyKaraToRepo(req.body.kid, req.body.repo);
			return { code: 200, message: APIMessage('SONG_COPIED') };
		} catch (err) {
			throw { code: err.code || 500, message: APIMessage(err.message) };
		}
	});
	router.route(WS_CMD.PLAY_KARA, async (socket, req) => {
		await runChecklist(socket, req);
		return playSingleSong(req.body.kid);
	});
	router.route(WS_CMD.EDIT_KARAS, async (socket, req) => {
		await runChecklist(socket, req, 'admin', 'open');
		// This is async so we always return
		batchEditKaras(req.body.plaid, req.body.action, req.body.tid, +req.body.type as TagTypeNum).catch(() => {});
	});
	router.route(WS_CMD.DELETE_MEDIA_FILES, async (socket, req) => {
		await runChecklist(socket, req, 'admin', 'open');
		try {
			return await deleteMediaFiles(req.body.files, req.body.repo);
		} catch (err) {
			throw { code: err.code || 500, message: APIMessage(err.message) };
		}
	});

	router.route(WS_CMD.GET_STATS, async (socket, req) => {
		await runChecklist(socket, req, 'guest', 'closed');
		try {
			return await getKMStats(req.body?.repoNames);
		} catch (err) {
			throw { code: err.code || 500, message: APIMessage(err.message) };
		}
	});
}
