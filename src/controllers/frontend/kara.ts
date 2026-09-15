import z from 'zod';
import { WS_CMD } from '../../../kmfrontend/src/utils/ws.mjs';
import { karaConstraintsV4, validateMediaInfo } from '../../lib/dao/karafile.js';
import { APIMessage } from '../../lib/services/frontend.js';
import { previewHooks, processUploadedMedia } from '../../lib/services/karaCreation.js';
import { abortAllMediaEncodingProcesses } from '../../lib/utils/ffmpeg.js';
import { check, isUUID, zFilename, zQParam } from '../../lib/utils/validators.js';
import { SocketIOApp } from '../../lib/utils/ws.js';
import { getKara, getKaraLyrics, getKaraMediaInfo, getKaras, getKMStats } from '../../services/kara.js';
import { createKara, editKara } from '../../services/karaCreation.js';
import { playSingleSong } from '../../services/karaEngine.js';
import {
	batchActions,
	batchEditKaras,
	copyKaraToRepo,
	deleteMediaFiles,
	embedAudioFileCoverArt,
	encodeMediaFileToRepoDefaults,
	removeKara,
} from '../../services/karaManagement.js';
import { addKaraToPlaylist } from '../../services/playlist.js';
import { runChecklist } from '../middlewares.js';
import { orderParams, tagTypesNum } from '../../lib/utils/constants.js';
import { fixAspectRatioBackgroundMode } from '../../lib/utils/mediaInfoValidation.js';

export default function karaController(router: SocketIOApp) {
	router.route(WS_CMD.GET_KARAS, async (socket, req) => {
		await runChecklist(socket, req, 'guest', 'limited');
		try {
			check(req.body, z.object({ 
				filter: z.string().optional(),
				from: z.number().int().min(0).optional(),
				size: z.number().int().min(1).optional(),
				order: z.enum(orderParams).optional(),
				direction: z.enum(['asc', 'desc']).optional(),
				q: zQParam.optional(),
				random: z.number().int().min(1).optional(),
				blacklist: z.boolean().optional(),
				parentsOnly: z.boolean().optional(),
				ignoreCollections: z.boolean().optional(),
			}).optional());
			return await getKaras({
				...req.body,
				lang: req.langs,
				username: req.token.username,				
			});
		} catch (err) {
			throw { code: err.code || 500, message: APIMessage(err.message) };
		}
	});
	router.route(WS_CMD.CREATE_KARA, async (socket, req) => {
		await runChecklist(socket, req, 'admin', 'open');
		try {
			check(req.body, z.object({
				kara: karaConstraintsV4
			}));
			await createKara(req.body);
			return { code: 200, message: APIMessage('KARA_CREATED') };
		} catch (err) {
			throw { code: err.code || 500, message: APIMessage(err.message) };
		}
	});
	router.route(WS_CMD.GET_KARA_MEDIA_INFO, async (socket, req) => {
		await runChecklist(socket, req, 'admin', 'open');
		try {
			check(req.body, z.object({
				kid: z.uuidv4(),
			}));
			return await getKaraMediaInfo(req.body.kid);
		} catch (err) {
			throw { code: err.code || 500, message: APIMessage(err.message) };
		}
	});
	router.route(WS_CMD.VALIDATE_MEDIA_INFO, async (socket, req) => {
		await runChecklist(socket, req, 'admin', 'open');
		try {
			check(req.body, z.object({
				mediaInfo: z.object({
					mediaType: z.enum(['audio', 'video']),
					fileExtension: z.string(),
					overallBitrate: z.number(),
					duration: z.number().int(),
					videoResolution: z.object({ height: z.number().int(), width: z.number().int()}).optional(),
					videoColorspace: z.string(),
					audioCodec: z.string(),
					hasCoverArt: z.coerce.boolean(),
					videoOffset: z.number().optional(),
					audioOffset: z.number().optional(),
					videoCodec: z.string(),
					videoAspectRatio: z.object({
						pixelAspectRatio: z.string(),
						displayAspectRatio: z.string(),
					})
				}),
				repository: z.string(),
			}));
			return await validateMediaInfo(req.body.mediaInfo, req.body.repository);
		} catch (err) {
			throw { code: err.code || 500, message: APIMessage(err.message) };
		}
	});
	router.route(WS_CMD.PROCESS_UPLOADED_MEDIA, async (socket, req) => {
		await runChecklist(socket, req, 'admin', 'open');
		try {
			check(req.body, z.object({
				filename: z.string(),
				origFilename: z.union([zFilename('video'), zFilename('audio')]),
			}));
			const processMediaResult = await processUploadedMedia(req.body.filename, req.body.origFilename);
			return { ...processMediaResult, filePath: undefined };
		} catch (err) {
			throw { code: err.code || 500, message: APIMessage(err.message) };
		}
	});
	router.route(WS_CMD.EMBED_AUDIO_FILE_COVER_ART, async (socket, req) => {
		await runChecklist(socket, req, 'admin', 'open');
		try {
			check(
				req.body,
				z.object({
						coverPictureFilename: z.string(),
						kid: z.uuidv4().optional(),
						tempFilename: z.string().optional(),
					})
					.refine(data => (data.kid !== undefined) || (data.tempFilename !== undefined), {
						message: 'Neither kid nor mediaFilename has been received but atleast one needs to be set',
					})
			);
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
			check(req.body, z.object({
				kid: z.uuidv4().optional(),
				filename: z.string().optional(),
				repo: z.string().optional(),
				encodeOptions: z.object({
					trim: z.boolean().optional(),
					fixAspectRatioMode: z.enum(fixAspectRatioBackgroundMode).optional(),
				}).optional(),
			}));
			return await encodeMediaFileToRepoDefaults(
				req.body.kid,
				req.body.filename,
				req.body.repo,
				req.body.encodeOptions
			);
		} catch (err) {
			throw { code: err?.code || 500, message: APIMessage(err.message) };
		}
	});
	router.route(WS_CMD.ABORT_MEDIA_ENCODING, async (socket, req) => {
		await runChecklist(socket, req, 'admin', 'open');
		try {
			return abortAllMediaEncodingProcesses();
		} catch (err) {
			throw { code: err?.code || 500, message: APIMessage(err.message) };
		}
	});
	router.route(WS_CMD.PREVIEW_HOOKS, async (socket, req) => {
		await runChecklist(socket, req, 'admin', 'open');
		try {
			check(req.body, z.object({
				kara: karaConstraintsV4,
			}));
			return await previewHooks(req.body);
		} catch (err) {
			throw { code: err.code || 500, message: APIMessage(err.message) };
		}
	});
	router.route(WS_CMD.GET_KARA, async (socket, req) => {
		await runChecklist(socket, req, 'guest', 'limited');
		try {
			check(req.body, z.object({
				kid: z.uuidv4(),
			}));
			return await getKara(req.body.kid, req.token);
		} catch (err) {
			throw { code: err.code || 500, message: APIMessage(err.message) };
		}
	});
	router.route(WS_CMD.DELETE_KARAS, async (socket, req) => {
		await runChecklist(socket, req, 'admin', 'open');
		try {
			check(req.body, z.object({ kids: z.array(z.uuidv4()) }));
			await removeKara(req.body.kids);
			return { code: 200, message: APIMessage('KARA_DELETED') };
		} catch (err) {
			throw { code: err.code || 500, message: APIMessage(err.message) };
		}		
	});
	router.route(WS_CMD.ADD_KARA_TO_PUBLIC_PLAYLIST, async (socket, req) => {
		await runChecklist(socket, req, 'guest', 'open');
		// Add Kara to the playlist currently used depending on mode		
		try {
			check(req.body, z.object({ kids: z.array(z.uuidv4()) }));
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
			check(req.body, z.object({ 
				kara: karaConstraintsV4,
				modifiedLyrics: z.boolean().optional(),
				modifiedMedia: z.boolean().optional(),
			}));
			await editKara(req.body);
			return { code: 200, message: APIMessage('KARA_EDITED') };
		} catch (err) {
			throw { code: err.code || 500, message: APIMessage(err.message) };
		}
	});
	router.route(WS_CMD.GET_KARA_LYRICS, async (socket, req) => {
		await runChecklist(socket, req, 'guest', 'limited');
		try {
			check(req.body, z.object({ kid: z.uuidv4() }));
			return await getKaraLyrics(req.body.kid);
		} catch (err) {
			throw { code: err.code || 500, message: APIMessage(err.message) };
		}
	});
	router.route(WS_CMD.COPY_KARA_TO_REPO, async (socket, req) => {
		await runChecklist(socket, req, 'admin', 'open');
		if (!isUUID(req.body.kid)) throw { code: 400 };
		try {
			check(req.body, z.object({ 
				kid: z.uuidv4(),
				repo: z.string(),
			}));
			await copyKaraToRepo(req.body.kid, req.body.repo);
			return { code: 200, message: APIMessage('SONG_COPIED') };
		} catch (err) {
			throw { code: err.code || 500, message: APIMessage(err.message) };
		}
	});
	router.route(WS_CMD.PLAY_KARA, async (socket, req) => {
		await runChecklist(socket, req);
		check(req.body, z.object({ kid: z.uuidv4() }));
		return playSingleSong(req.body.kid);
	});
	router.route(WS_CMD.EDIT_KARAS, async (socket, req) => {
		await runChecklist(socket, req, 'admin', 'open');
		// This is async so we always return
		try {
			check(req.body, z.object({
				plaid: z.uuidv4(),
				action: z.enum(batchActions),
				id: z.string(),
				type: z.number().refine(t => tagTypesNum.includes(t)).optional(),
			}));
		} catch (err) {
			throw { code: err.code || 500, message: APIMessage(err.message) };
		}
		batchEditKaras(req.body.plaid, req.body.action, req.body.id, req.body.type).catch(() => {});
	});
	router.route(WS_CMD.DELETE_MEDIA_FILES, async (socket, req) => {
		await runChecklist(socket, req, 'admin', 'open');
		try {
			check(req.body, z.object({
				files: z.array(z.string()),
				repo: z.string(),
			}));
			return await deleteMediaFiles(req.body.files, req.body.repo);
		} catch (err) {
			throw { code: err.code || 500, message: APIMessage(err.message) };
		}
	});

	router.route(WS_CMD.GET_STATS, async (socket, req) => {
		await runChecklist(socket, req, 'guest', 'closed');
		try {
			check(req.body, z.object({
				repoNames: z.array(z.string()).optional(),
			}).optional());
			return await getKMStats(req.body?.repoNames);
		} catch (err) {
			throw { code: err.code || 500, message: APIMessage(err.message) };
		}
	});
}
