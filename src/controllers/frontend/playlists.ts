import { WS_CMD } from '../../../kmfrontend/src/utils/ws.js';
import { APIMessage } from '../../lib/services/frontend.js';
import { bools } from '../../lib/utils/constants.js';
import { check } from '../../lib/utils/validators.js';
import { SocketIOApp } from '../../lib/utils/ws.js';
import {
	addKaraToPlaylist,
	copyKaraToPlaylist,
	createAutoMix,
	createPlaylist,
	editPlaylist,
	editPLC,
	emptyPlaylist,
	exportPlaylist,
	exportPlaylistMedia,
	findPlaying,
	getKaraFromPlaylist,
	getPlaylistContents,
	getPlaylistContentsMicro,
	getPlaylistInfo,
	getPlaylists,
	importPlaylist,
	randomizePLC,
	removeKaraFromPlaylist,
	removePlaylist,
	shufflePlaylist,
	swapPLCs,
} from '../../services/playlist.js';
import { vote } from '../../services/upvote.js';
import { runChecklist } from '../middlewares.js';

export default function playlistsController(router: SocketIOApp) {
	router.route(WS_CMD.CREATE_AUTOMIX, async (socket, req) => {
		await runChecklist(socket, req);
		try {
			return await createAutoMix(req.body, req.token.username);
		} catch (err) {
			throw { code: err.code || 500, message: APIMessage(err.message) };
		}
	});

	router.route(WS_CMD.GET_PLAYLISTS, async (socket, req) => {
		await runChecklist(socket, req, 'guest', 'limited');
		// Get list of playlists
		try {
			return await getPlaylists(req.token);
		} catch (err) {
			throw { code: err.code || 500, message: APIMessage(err.message) };
		}
	});

	router.route(WS_CMD.CREATE_PLAYLIST, async (socket, req) => {
		await runChecklist(socket, req);
		const validationErrors = check(req.body, {
			name: { presence: { allowEmpty: false } },
			flag_visible: { inclusion: bools },
			flag_public: { inclusion: bools },
			flag_current: { inclusion: bools },
			flag_smart: { inclusion: bools },
			flag_whitelist: { inclusion: bools },
			flag_blacklist: { inclusion: bools },
			flag_fallback: { inclusion: bools },
		});
		if (!validationErrors) {
			// No errors detected
			req.body.name = decodeURIComponent(req.body.name.trim());

			// Now we add playlist
			try {
				const plaid = await createPlaylist(req.body, req.token.username);
				return { plaid };
			} catch (err) {
				throw { code: err.code || 500, message: APIMessage(err.message) };
			}
		} else {
			// Errors detected
			// Sending BAD REQUEST HTTP code and error object.
			throw { code: 400, message: validationErrors };
		}
	});
	router.route(WS_CMD.GET_PLAYLIST, async (socket, req) => {
		await runChecklist(socket, req, 'guest', 'limited');
		try {
			const playlist = await getPlaylistInfo(req.body?.plaid, req.token);
			return playlist;
		} catch (err) {
			throw { code: err.code || 500, message: APIMessage(err.message) };
		}
	});
	router.route(WS_CMD.EDIT_PLAYLIST, async (socket, req) => {
		await runChecklist(socket, req);
		// No errors detected
		if (req.body.name) req.body.name = decodeURIComponent(req.body.name?.trim());

		// Now we add playlist
		try {
			return await editPlaylist(req.body?.plaid, req.body);
		} catch (err) {
			throw { code: err.code || 500, message: APIMessage(err.message) };
		}
	});
	router.route(WS_CMD.DELETE_PLAYLIST, async (socket, req) => {
		await runChecklist(socket, req);
		try {
			return await removePlaylist(req.body?.plaid);
		} catch (err) {
			throw { code: err.code || 500, message: APIMessage(err.message) };
		}
	});
	router.route(WS_CMD.EMPTY_PLAYLIST, async (socket, req) => {
		await runChecklist(socket, req);
		// Empty playlist
		try {
			return await emptyPlaylist(req.body?.plaid);
		} catch (err) {
			throw { code: err.code || 500, message: APIMessage(err.message) };
		}
	});
	router.route(WS_CMD.EXPORT_PLAYLIST_MEDIA, async (socket, req) => {
		await runChecklist(socket, req);
		// Export all playlist kara medias to a local directory
		try {
			return await exportPlaylistMedia(req.body?.plaid, req.body?.exportDir);
		} catch (err) {
			throw { code: err.code || 500, message: APIMessage(err.message) };
		}
	});
	router.route(WS_CMD.FIND_PLAYING_SONG_IN_PLAYLIST, async (socket, req) => {
		await runChecklist(socket, req, 'guest', 'limited');
		try {
			const index = await findPlaying(req.body?.plaid);
			return { index };
		} catch (err) {
			throw { code: 500 };
		}
	});
	router.route(WS_CMD.GET_PLAYLIST_CONTENTS, async (socket, req) => {
		await runChecklist(socket, req, 'guest', 'limited');
		try {
			return await getPlaylistContents(
				req.body?.plaid,
				req.token,
				req.body?.filter,
				req.langs,
				req.body?.from || 0,
				req.body?.size || 9999999,
				req.body?.random || 0,
				req.body?.orderByLikes,
				req.body?.incomingSongs,
				req.body?.filterByUser
			);
		} catch (err) {
			throw { code: err.code || 500, message: APIMessage(err.message) };
		}
	});
	router.route(WS_CMD.GET_PLAYLIST_CONTENTS_MICRO, async (socket, req) => {
		await runChecklist(socket, req, 'guest', 'limited');
		try {
			return await getPlaylistContentsMicro(req.body?.plaid, req.body?.username, req.token);
		} catch (err) {
			throw { code: err.code || 500, message: APIMessage(err.message) };
		}
	});
	router.route(WS_CMD.ADD_KARA_TO_PLAYLIST, async (socket, req) => {
		await runChecklist(socket, req, 'admin');
		// add a kara to a playlist
		const validationErrors = check(req.body, {
			kids: { presence: true, uuidArrayValidator: true },
		});
		if (!validationErrors) {
			try {
				return await addKaraToPlaylist({
					kids: req.body.kids,
					requester: req.token.username,
					plaid: req.body.plaid,
					pos: req.body.pos,
					throwOnMissingKara: true,
				});
			} catch (err) {
				throw { code: err.code || 500, message: APIMessage(err.message) };
			}
		} else {
			// Errors detected
			// Sending BAD REQUEST HTTP code and error object.
			throw { code: 400, message: validationErrors };
		}
	});
	router.route(WS_CMD.COPY_KARA_TO_PLAYLIST, async (socket, req) => {
		await runChecklist(socket, req);
		// add karas from a playlist to another
		const validationErrors = check(req.body, {
			plc_ids: { presence: true, numbersArrayValidator: true },
		});
		if (!validationErrors) {
			try {
				return await copyKaraToPlaylist(req.body.plc_ids, req.body.plaid, req.body.pos);
			} catch (err) {
				throw { code: err.code || 500, message: APIMessage(err.message) };
			}
		} else {
			// Errors detected
			// Sending BAD REQUEST HTTP code and error object.
			throw { code: 400, message: validationErrors };
		}
	});
	router.route(WS_CMD.DELETE_KARA_FROM_PLAYLIST, async (socket, req) => {
		await runChecklist(socket, req, 'guest');
		const validationErrors = check(req.body, {
			plc_ids: { presence: true, numbersArrayValidator: true },
		});
		if (!validationErrors) {
			try {
				return await removeKaraFromPlaylist(req.body.plc_ids, req.token);
			} catch (err) {
				throw { code: err.code || 500, message: APIMessage(err.message) };
			}
		} else {
			// Errors detected
			// Sending BAD REQUEST HTTP code and error object.
			throw { code: 400, message: validationErrors };
		}
	});

	router.route(WS_CMD.GET_PLC, async (socket, req) => {
		await runChecklist(socket, req, 'guest', 'limited');
		try {
			return await getKaraFromPlaylist(req.body?.plc_id, req.token);
		} catch (err) {
			throw { code: err.code || 500, message: APIMessage(err.message) };
		}
	});
	router.route(WS_CMD.SWAP_PLCS, async (socket, req) => {
		await runChecklist(socket, req, 'guest', 'limited');
		try {
			return await swapPLCs(req.body?.plcid1, req.body?.plcid2, req.token);
		} catch (err) {
			throw { code: err.code || 500, message: APIMessage(err.message) };
		}
	});
	router.route(WS_CMD.EDIT_PLC, async (socket, req) => {
		await runChecklist(socket, req);
		const validationErrors = check(req.body, {
			plc_ids: { numbersArrayValidator: true },
			flag_playing: { inclusion: bools },
			flag_free: { inclusion: bools },
			flag_visible: { inclusion: bools },
			flag_accepted: { inclusion: bools },
			flag_refused: { inclusion: bools },
		});
		if (!validationErrors) {
			try {
				return await editPLC(req.body.plc_ids, {
					pos: +req.body.pos,
					flag_playing: req.body.flag_playing,
					flag_free: req.body.flag_free,
					flag_visible: req.body.flag_visible,
					flag_accepted: req.body.flag_accepted,
					flag_refused: req.body.flag_refused,
				});
			} catch (err) {
				throw { code: err.code || 500, message: APIMessage(err.message) };
			}
		} else {
			// Errors detected
			// Sending BAD REQUEST HTTP code and error object.
			throw { code: 400, message: validationErrors };
		}
	});
	router.route(WS_CMD.RANDOMIZE_PLC, async (socket, req) => {
		await runChecklist(socket, req);
		try {
			return await randomizePLC(req.body?.plc_ids);
		} catch (err) {
			throw { code: err.code || 500, message: APIMessage(err.message) };
		}
	});
	router.route(WS_CMD.VOTE_PLC, async (socket, req) => {
		await runChecklist(socket, req, 'guest', 'limited');
		// Post an upvote
		try {
			return await vote(req.body?.plc_id, req.token.username, req.body?.downvote);
		} catch (err) {
			throw { code: err.code || 500, message: APIMessage(err.message) };
		}
	});
	router.route(WS_CMD.EXPORT_PLAYLIST, async (socket, req) => {
		await runChecklist(socket, req);
		try {
			return await exportPlaylist(req.body?.plaid);
		} catch (err) {
			throw { code: err.code || 500, message: APIMessage(err.message) };
		}
	});
	router.route(WS_CMD.IMPORT_PLAYLIST, async (socket, req) => {
		await runChecklist(socket, req);
		// Imports a playlist and its contents in an importable format (posted as JSON data)
		try {
			const data = await importPlaylist(req.body.playlist, req.token.username);
			const response = {
				plaid: data.plaid,
				unknownRepos: data.reposUnknown,
			};
			return { code: 200, message: APIMessage('PL_IMPORTED', response) };
		} catch (err) {
			throw { code: err.code || 500, message: APIMessage(err.message) };
		}
	});
	router.route(WS_CMD.SHUFFLE_PLAYLIST, async (socket, req) => {
		await runChecklist(socket, req);
		try {
			return await shufflePlaylist(req.body?.plaid, req.body?.method, req.body?.fullShuffle);
		} catch (err) {
			throw { code: err.code || 500, message: APIMessage(err.message) };
		}
	});
}
