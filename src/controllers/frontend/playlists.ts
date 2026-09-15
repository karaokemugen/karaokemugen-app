import z from 'zod';
import { WS_CMD } from '../../../kmfrontend/src/utils/ws.mjs';
import { APIMessage } from '../../lib/services/frontend.js';
import { check, zAtLeastOne } from '../../lib/utils/validators.js';
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
import { tagTypesNum } from '../../lib/utils/constants.js';
import { PLImportConstraints } from '../../lib/services/playlist.js';
import { shuffleMethods } from '../../utils/constants.js';

const playlistLimit = ['duration', 'songs'];

export default function playlistsController(router: SocketIOApp) {
	router.route(WS_CMD.CREATE_AUTOMIX, async (socket, req) => {
		await runChecklist(socket, req);
		try {
			check(req.body, z.object({
				filters: zAtLeastOne(z.object({
					usersFavorites: z.array(z.string()).optional(),
					usersAnimeList: z.array(z.string()).optional(),
					years: z.array(z.number().int()).optional(),
					tags: z.array(z.object({
						tid: z.uuidv4(),
						type: z.number().refine(t => tagTypesNum.includes(t))
					})).optional(),
				})).optional(),
				limitType: z.enum(playlistLimit).optional(),
				limitNumber: z.number().int().min(0).optional(),
				playlistName: z.string().optional(),
				surprisePlaylist: z.boolean().optional(),
			}));
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
		check(
			req.body,
			z.object({
				name: z.string().min(1),
				flag_visible: z.boolean().optional(),
				flag_public: z.boolean().optional(),
				flag_current: z.boolean().optional(),
				flag_smart: z.boolean().optional(),
				flag_whitelist: z.boolean().optional(),
				flag_blacklist: z.boolean().optional(),
				flag_fallback: z.boolean().optional(),
			}).loose()
		);
		try {
			const plaid = await createPlaylist(req.body, req.token.username);
			return { plaid };
		} catch (err) {
			throw { code: err.code || 500, message: APIMessage(err.message) };
		}
	});
	router.route(WS_CMD.GET_PLAYLIST, async (socket, req) => {
		await runChecklist(socket, req, 'guest', 'limited');
		try {
			check(req.body, z.object({
				plaid: z.uuidv4(),
			}))
			const playlist = await getPlaylistInfo(req.body.plaid, req.token);
			return playlist;
		} catch (err) {
			throw { code: err.code || 500, message: APIMessage(err.message) };
		}
	});
	router.route(WS_CMD.EDIT_PLAYLIST, async (socket, req) => {
		await runChecklist(socket, req);
		check(req.body, z.object({
			plaid: z.uuidv4(),
			flag_smart: z.boolean().optional(),
			flag_smartlimit: z.boolean().optional(),
			type_smart: z.enum(['UNION', 'INTERSECT']).optional(),
			flag_current: z.boolean().optional(),
			flag_public: z.boolean().optional(),
			flag_whitelist: z.boolean().optional(),
			flag_blacklist: z.boolean().optional(),
			flag_fallback: z.boolean().optional(),
			description: z.string().optional(),
			flag_visible: z.boolean().optional(),
			flag_visible_online: z.boolean().optional(),
			contributors: z.array(z.object({username: z.string()})).optional(),
			smart_limit_order: z.enum(['newest', 'oldest']).optional(),
			smart_limit_number: z.number().int().min(1).optional(),
			smart_limit_type: z.enum(['songs', 'duration']).optional(),
		}));
		try {
			return await editPlaylist(req.body?.plaid, req.body);
		} catch (err) {
			throw { code: err.code || 500, message: APIMessage(err.message) };
		}
	});
	router.route(WS_CMD.DELETE_PLAYLIST, async (socket, req) => {
		await runChecklist(socket, req);
		try {
			check(req.body, z.object({
				plaid: z.uuidv4(),
			}));
			return await removePlaylist(req.body.plaid);
		} catch (err) {
			throw { code: err.code || 500, message: APIMessage(err.message) };
		}
	});
	router.route(WS_CMD.EMPTY_PLAYLIST, async (socket, req) => {
		await runChecklist(socket, req);
		// Empty playlist
		try {
			check(req.body, z.object({
				plaid: z.uuidv4(),
			}));
			return await emptyPlaylist(req.body.plaid);
		} catch (err) {
			throw { code: err.code || 500, message: APIMessage(err.message) };
		}
	});
	router.route(WS_CMD.EXPORT_PLAYLIST_MEDIA, async (socket, req) => {
		await runChecklist(socket, req);
		// Export all playlist kara medias to a local directory
		try {
			check(req.body, z.object({
				plaid: z.uuidv4(),
				exportDir: z.string(),
			}));
			return await exportPlaylistMedia(req.body.plaid, req.body.exportDir);
		} catch (err) {
			throw { code: err.code || 500, message: APIMessage(err.message) };
		}
	});
	router.route(WS_CMD.FIND_PLAYING_SONG_IN_PLAYLIST, async (socket, req) => {
		await runChecklist(socket, req, 'guest', 'limited');
		try {
			check(req.body, z.object({
				plaid: z.uuidv4(),
			}));
			const index = await findPlaying(req.body.plaid);
			return { index };
		} catch (err) {
			throw { code: err.code || 500, message: APIMessage(err.message) };
		}
	});
	router.route(WS_CMD.GET_PLAYLIST_CONTENTS, async (socket, req) => {
		await runChecklist(socket, req, 'guest', 'limited');
		try {
			check(req.body, z.object({
				plaid: z.uuidv4(),
				filter: z.string().optional(),
				from: z.number().int().min(0).optional(),
				size: z.number().int().min(1).optional(),
				random: z.number().int().min(1).optional(),
				orderByLikes: z.boolean().optional(),
				incomingSongs: z.boolean().optional(),
				filterByUser: z.string().optional(),
			}));
			return await getPlaylistContents(
				req.body.plaid,
				req.token,
				req.body.filter,
				req.langs,
				req.body.from,
				req.body.size,
				req.body.random,
				req.body.orderByLikes,
				req.body.incomingSongs,
				req.body.filterByUser
			);
		} catch (err) {
			throw { code: err.code || 500, message: APIMessage(err.message) };
		}
	});
	router.route(WS_CMD.GET_PLAYLIST_CONTENTS_MICRO, async (socket, req) => {
		await runChecklist(socket, req, 'guest', 'limited');
		try {
			check(req.body, z.object({
				plaid: z.uuidv4(),
			}));
			return await getPlaylistContentsMicro(req.body?.plaid, req.token);
		} catch (err) {
			throw { code: err.code || 500, message: APIMessage(err.message) };
		}
	});
	router.route(WS_CMD.ADD_KARA_TO_PLAYLIST, async (socket, req) => {
		await runChecklist(socket, req, 'admin');
		// add a kara to a playlist		
		try {
			check(req.body, z.object({ 
				kids: z.array(z.uuidv4()),
				plaid: z.uuidv4(),
				pos: z.number().int().optional(),
			}));
			return await addKaraToPlaylist({
				...req.body,
				requester: req.token.username,
				throwOnMissingKara: true,
			});
		} catch (err) {
			throw { code: err.code || 500, message: APIMessage(err.message) };
		}
	});
	router.route(WS_CMD.COPY_KARA_TO_PLAYLIST, async (socket, req) => {
		await runChecklist(socket, req);
		// add karas from a playlist to another
		try {
			check(req.body, z.object({ 
				plc_ids: z.array(z.number().int().min(1)),
				plaid: z.uuidv4(), 
				pos: z.number().int().optional(),
			}));	
			return await copyKaraToPlaylist(req.body.plc_ids, req.body.plaid, req.body.pos);
		} catch (err) {
			throw { code: err.code || 500, message: APIMessage(err.message) };
		}
	});
	router.route(WS_CMD.DELETE_KARA_FROM_PLAYLIST, async (socket, req) => {
		await runChecklist(socket, req, 'guest');
		try {
			check(req.body, z.object({ 
				plc_ids: z.array(z.number().int().min(1)),
			}));		
			return await removeKaraFromPlaylist(req.body.plc_ids, req.token);
		} catch (err) {
			throw { code: err.code || 500, message: APIMessage(err.message) };
		}
	});

	router.route(WS_CMD.GET_PLC, async (socket, req) => {
		await runChecklist(socket, req, 'guest', 'limited');
		try {
			check(req.body, z.object({ 
				plc_id: z.number().int().min(1),
			}));		
			return await getKaraFromPlaylist(req.body?.plc_id, req.token);
		} catch (err) {
			throw { code: err.code || 500, message: APIMessage(err.message) };
		}
	});
	router.route(WS_CMD.SWAP_PLCS, async (socket, req) => {
		await runChecklist(socket, req, 'guest', 'limited');
		try {
			check(req.body, z.object({ 
				plcid1: z.number().int().min(1),
				plcid2: z.number().int().min(1),
			}));		
			return await swapPLCs(req.body?.plcid1, req.body?.plcid2, req.token);
		} catch (err) {
			throw { code: err.code || 500, message: APIMessage(err.message) };
		}
	});
	router.route(WS_CMD.EDIT_PLC, async (socket, req) => {
		await runChecklist(socket, req);
		try {
			check(
				req.body,
				z.object({
					plc_ids: z.array(z.number().int().min(1)),
					pos: z.number().int().optional(),
					flag_playing: z.boolean().optional(),
					flag_free: z.boolean().optional(),
					flag_visible: z.boolean().optional(),
					flag_accepted: z.boolean().optional(),
					flag_refused: z.boolean().optional(),
				})
			);
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
	});
	router.route(WS_CMD.RANDOMIZE_PLC, async (socket, req) => {
		await runChecklist(socket, req);
		try {
			check(req.body, z.object({ 
				plc_ids: z.array(z.number().int().min(1)),
			}));		
			return await randomizePLC(req.body.plc_ids);
		} catch (err) {
			throw { code: err.code || 500, message: APIMessage(err.message) };
		}
	});
	router.route(WS_CMD.VOTE_PLC, async (socket, req) => {
		await runChecklist(socket, req, 'guest', 'limited');
		// Post an upvote
		try {
			check(req.body, z.object({ 
				plc_id: z.number().int().min(1),
				downvote: z.boolean().optional(),
			}));		
			return await vote(req.body.plc_id, req.token.username, req.body?.downvote);
		} catch (err) {
			throw { code: err.code || 500, message: APIMessage(err.message) };
		}
	});
	router.route(WS_CMD.EXPORT_PLAYLIST, async (socket, req) => {
		await runChecklist(socket, req);
		try {
			check(req.body, z.object({ 
				plaid: z.uuidv4(),
			}));		
			return await exportPlaylist(req.body.plaid);
		} catch (err) {
			throw { code: err.code || 500, message: APIMessage(err.message) };
		}
	});
	router.route(WS_CMD.IMPORT_PLAYLIST, async (socket, req) => {
		await runChecklist(socket, req);
		// Imports a playlist 
		// and its contents in an importable format (posted as JSON data)
		try {
			check(req.body, z.object({ 
				playlist: PLImportConstraints,
			}));
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
			check(req.body, z.object({ 
				plaid: z.uuidv4(),
				method: z.enum(shuffleMethods),
				fullShuffle: z.boolean().optional(),
			}));
			return await shufflePlaylist(req.body.plaid, req.body.method, req.body.fullShuffle);
		} catch (err) {
			throw { code: err.code || 500, message: APIMessage(err.message) };
		}
	});
}
