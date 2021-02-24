import { Socket } from 'socket.io';

import { APIData } from '../../lib/types/api';
import { SocketIOApp } from '../../lib/utils/ws';
import {addDownloads, getDownloads, pauseQueue, startDownloads, wipeDownloads} from '../../services/download';
import { addDownloadBLC, getDownloadBLC, removeDownloadBLC } from '../../services/downloadBLC';
import { cleanAllKaras, downloadAllKaras, downloadRandomSongs, getAllRemoteKaras, getAllRemoteTags, updateAllBases, updateAllKaras, updateAllMedias } from '../../services/downloadUpdater';
import { APIMessage,errMessage } from '../common';
import { runChecklist } from '../middlewares';

export default function downloadController(router: SocketIOApp) {

	router.route('addDownloads', async (socket: Socket, req: APIData) => {
	/**
 * @api {post} Add downloads to queue
 * @apiName addDownloads
 * @apiVersion 5.0.0
 * @apiGroup Downloader
 * @apiPermission admin
 * @apiHeader authorization Auth token received from logging in
 * @apiParam {Object[]} downloads Download object
 * @apiParam {string} downloads/kid Song KID
 * @apiParam {string} downloads/name Song name (purely cosmetic)
 * @apiParam {number} downloads/size Size in bytes of downloads (usually mediasize)
 * @apiParam {string} downloads/repository Name (domain) of the repository to download from
 *
 * @apiError DOWNLOADS_QUEUED_ERROR Error adding downloads to the queue
 * @apiError DOWNLOADS_QUEUED_ALREADY_ADDED_ERROR No downloads added, all are already in queue or running
 *
 * @apiSuccessExample Success-Response:
 * HTTP/1.1 200 OK
 * @apiErrorExample Error-Response:
 * HTTP/1.1 500 Internal Server Error
 * @apiErrorExample Error-Response:
 * HTTP/1.1 409 Conflict
 */
		await runChecklist(socket, req, 'admin', 'open', {allowInDemo: false, optionalAuth: false});
		try {
			const numberOfDLs = await addDownloads(req.body.downloads);
			return APIMessage('DOWNLOADS_QUEUED', numberOfDLs);
		} catch(err) {
			const msg = 'DOWNLOADS_QUEUED_ERROR';
			errMessage(err?.msg || msg, err);
			throw {code: err?.code || 500, message: APIMessage(err?.msg || msg)};
		}
	});
	router.route('getDownloads', async (socket: Socket, req: APIData) => {
	/**
 * @api {get} Get queued downloads
 * @apiName getDownloads
 * @apiVersion 5.0.0
 * @apiGroup Downloader
 * @apiPermission admin
 * @apiHeader authorization Auth token received from logging in
 * @apiSuccess {Object[]} downloads Queued download objects
 * @apiSuccess {string} downloads/name Name of song in queue (cosmetic)
 * @apiSuccess {Object} downloads/urls List of URLs for the various files needed: `media`, `lyrics`, `kara`, `serie` and `tag`. Tag and Serie are arrays, the rest are objects with a `remote` URL and `local` file property
 * @apiSuccess {number} downloads/size Size in bytes for download
 * @apiSuccess {uuid} downloads/uuid Download UUID
 * @apiSuccess {date} downloads/started_at When the download was started
 * @apiSuccess {string} downloads/status Status codes : `DL_PLANNED`, `DL_DONE`, `DL_FAILED`, `DL_RUNNING`
 * @apiSuccessExample Success-Response:
 * HTTP/1.1 200 OK
 * [
 * 	{
 * 		name: "ENG - Cowboy Bebop - OP - Tank",
 * 		urls: {
 * 			media: {
 * 				remote: "http://xxx/downloads/ENG - Cowboy Bebop - OP - Tank.mp4",
 * 				local: "ENG - Cowboy Bebop - OP - Tank.mp4"
 * 			}
 * 			...
 * 		},
 * 		size: 12931930,
 * 		uuid: "3e1efc1c-e289-4445-8637-b944a6b00c6f",
 * 		started_at: 2019-12-31T01:21:00
 * 		status: "DL_PLANNED"
 * 	},
 * 	...
 * ]
 * @apiErrorExample Error-Response:
 * HTTP/1.1 500 Internal Server Error
 * "Error getting downloads: ..."
 */
		await runChecklist(socket, req, 'admin', 'open', {allowInDemo: false, optionalAuth: false});
		try {
			const downloads = await getDownloads();
			return downloads;
		} catch(err) {
			const code = 'DOWNLOADS_GET_ERROR';
			errMessage(code, err);
			throw {code: err?.code || 500, message: APIMessage(code)};
		}
	});	
	router.route('deleteDownloads', async (socket: Socket, req: APIData) => {
	/**
 * @api {delete} Empty download queue
 * @apiName deleteDownloads
 * @apiVersion 5.0.0
 * @apiGroup Downloader
 * @apiPermission admin
 * @apiHeader authorization Auth token received from logging in
 * @apiSuccessExample Success-Response:
 * HTTP/1.1 200 OK
 * @apiErrorExample Error-Response:
 * HTTP/1.1 500 Internal Server Error
 * "Error wiping downloads: ..."
 */
		await runChecklist(socket, req, 'admin', 'open', {allowInDemo: false, optionalAuth: false});
		try {
			return await wipeDownloads();
		} catch(err) {
			const code = 'DOWNLOADS_WIPE_ERROR';
			errMessage(code, err);
			throw {code: err?.code || 500, message: APIMessage(code)};
		}
	});
	router.route('pauseDownloads', async (socket: Socket, req: APIData) => {
	/**
 * @api {put} Pause queue
 * @apiName pauseDownloads
 * @apiVersion 5.0.0
 * @apiGroup Downloader
 * @apiPermission admin
 * @apiHeader authorization Auth token received from logging in
 * @apiSuccessExample Success-Response:
 * HTTP/1.1 200 OK
 * @apiErrorExample Error-Response:
 * HTTP/1.1 500 Internal Server Error
 * "Error pausing downloads: ..."
 */
		await runChecklist(socket, req, 'admin', 'open', {allowInDemo: false, optionalAuth: false});
		try {
			return await pauseQueue();
		} catch(err) {
			const code = 'DOWNLOADS_PAUSE_ERROR';
			errMessage(code, err);
			throw {code: err?.code || 500, message: APIMessage(code)};
		}
	});
	router.route('addRandomDownloads', async (socket: Socket, req: APIData) => {
		/**
	 * @api {post} Download random songs
	 * @apiName addRandomDownloads
	 * @apiVersion 5.0.0
	 * @apiGroup Downloader
	 * @apiPermission admin
	 * @apiHeader authorization Auth token received from logging in
	 * @apiDescription This is used for first runs of the app to seed it with some songs.
	 * @apiSuccessExample Success-Response:
	 * HTTP/1.1 200 OK
	 * @apiErrorExample Error-Response:
	 * HTTP/1.1 500 Internal Server Error
	 */
		await runChecklist(socket, req, 'admin', 'open', {allowInDemo: false, optionalAuth: false});
		try {
			await downloadRandomSongs();
			return APIMessage('DOWNLOADS_STARTED');
		} catch(err) {
			throw APIMessage('DOWNLOADS_START_ERROR', err);
		}
	});
	router.route('startDownloadQueue', async (socket: Socket, req: APIData) => {
	/**
 * @api {put} Start queue
 * @apiName startDownloadQueue
 * @apiVersion 5.0.0
 * @apiGroup Downloader
 * @apiPermission admin
 * @apiHeader authorization Auth token received from logging in
 * @apiSuccessExample Success-Response:
 * HTTP/1.1 200 OK
 * @apiErrorExample Error-Response:
 * HTTP/1.1 500 Internal Server Error
 * "Error starting downloads: ..."
 */
		await runChecklist(socket, req, 'admin', 'open', {allowInDemo: false, optionalAuth: false});
		try {
			await startDownloads();
			return APIMessage('DOWNLOADS_STARTED');
		} catch(err) {
			const code = 'DOWNLOADS_START_ERROR';
			errMessage(code, err);
			throw {code: err?.code || 500, message: APIMessage(code)};
		}
	});
	router.route('getDownloadBLCs', async (socket: Socket, req: APIData) => {
	/**
 * @api {get} List download blacklist criterias
 * @apiName getDownloadBLCs
 * @apiVersion 5.0.0
 * @apiGroup Downloader
 * @apiPermission admin
 * @apiHeader authorization Auth token received from logging in
 * @apiSuccessExample Success-Response:
 * HTTP/1.1 200 OK
 * [
 * 	<See getBLCSet>
 * ]
 * @apiErrorExample Error-Response:
 * HTTP/1.1 500 Internal Server Error
 * "Error getting download BLCs : ..."
 */
		await runChecklist(socket, req, 'admin', 'open', {allowInDemo: false, optionalAuth: false});
		try {
			return await getDownloadBLC();
		} catch(err) {
			const code = 'DOWNLOADS_BLC_GET_ERROR';
			errMessage(code, err);
			throw {code: err?.code || 500, message: APIMessage(code)};
		}
	});
	router.route('addDownloadBLC', async (socket: Socket, req: APIData) => {
	/**
 * @api {post} Add download blacklist criteria
 * @apiName addDownloadBLC
 * @apiVersion 5.0.0
 * @apiGroup Downloader
 * @apiPermission admin
 * @apiHeader authorization Auth token received from logging in
 * @apiParam {number} type Blacklist criteria type (see documentation)
 * @apiParam {string} value Value for that blacklist criteria
 * @apiSuccessExample Success-Response:
 * HTTP/1.1 200 OK
 * @apiErrorExample Error-Response:
 * HTTP/1.1 500 Internal Server Error
 * @apiErrorExample Error-Response:
 * HTTP/1.1 400 Bad Request
 */
		await runChecklist(socket, req, 'admin', 'open', {allowInDemo: false, optionalAuth: false});
		try {
			return await addDownloadBLC({ type: req.body.type, value: req.body.value});
		} catch(err) {
			const code = 'DOWNLOADS_BLC_ADDED_ERROR';
			errMessage(code, err);
			throw {code: err?.code || 500, message: APIMessage(code)};
		}
	});
	router.route('deleteDownloadBLC', async (socket: Socket, req: APIData) => {
	/**
 * @api {delete} Remove download criteria
 * @apiName deleteDownloadBLC
 * @apiVersion 5.0.0
 * @apiGroup Downloader
 * @apiPermission admin
 * @apiHeader authorization Auth token received from logging in
 * @apiParam {number} id Download BLC ID to remove
 * @apiSuccessExample Success-Response:
 * HTTP/1.1 200 OK
 * @apiErrorExample Error-Response:
 * HTTP/1.1 500 Internal Server Error
 * @apiErrorExample Error-Response:
 * HTTP/1.1 404 Not Found
 */
		await runChecklist(socket, req, 'admin', 'open', {allowInDemo: false, optionalAuth: false});
		try {
			return await removeDownloadBLC(+req.body.id);
		} catch(err) {
			const code = 'DOWNLOADS_BLC_REMOVE_ERROR';
			errMessage(code, err);
			throw {code: err?.code || 500, message: APIMessage(code)};
		}
	});
	router.route('getRemoteKaras', async (socket: Socket, req: APIData) => {
	/**
 * @api {get} Get complete list of karaokes (remote)
 * @apiName getRemoteKaras
 * @apiVersion 5.0.0
 * @apiGroup Downloader
 * @apiPermission public
 * @apiHeader authorization Auth token received from logging in
 * @apiParam {String} [filter] Filter list by this string.
 * @apiParam {Number} [from=0] Return only the results starting from this position. Useful for continuous scrolling. 0 if unspecified
 * @apiParam {Number} [size=999999] Return only x number of results. Useful for continuous scrolling. 999999 if unspecified.
 * @apiParam {String} [q] Query. It's a string comprised of criterias separated by `!`. Criterias are `y:` for year and `t:` for tag + type. Example, all songs with tags UUIDs a (singer) and b (songwriter) and year 1990 is `t:a~2,b~8!y:1990`. Refer to tag types to find out which number is which type.
 * @apiParam {String} [repository] If specified, will check karas at the indicated online repository. If not, will check all repositories
 * @apiParam {String} [compare] Either null, `missing` or `updated` to further filter the repository's songs compared to the local ones
 * @apiSuccess {Object[]} content/karas Array of `kara` objects
 * @apiSuccess {Number} infos/count Number of karaokes in playlist
 * @apiSuccess {Number} infos/from Starting position of listing
 * @apiSuccess {Number} infos/to End position of listing
 *
 * @apiSuccessExample Success-Response:
 * HTTP/1.1 200 OK
 * {
 *       "content": [
 *           {
 *               <See public/karas/:id object without i18n in tags>
 *           },
 *           ...
 *       ],
 * 		 "i18n": {
 * 			 "<tag UUID>": {
 * 				"eng": "English version",
 * 				"fre": "Version française"
 * 			 }
 * 			 ...
 * 		 },
 *       "infos": {
 *           "count": 3,
 * 			 "from": 0,
 * 			 "to": 120
 * 			 "totalMediaSize": 3189209892389
 *       }
 * }
 * @apiError SONG_LIST_ERROR Unable to fetch list of karaokes
 * @apiError WEBAPPMODE_CLOSED_API_MESSAGE API is disabled at the moment.
 * @apiErrorExample Error-Response:
 * HTTP/1.1 500 Internal Server Error
 * @apiErrorExample Error-Response:
 * HTTP/1.1 403 Forbidden
 */
		await runChecklist(socket, req, 'admin', 'open', {allowInDemo: false, optionalAuth: false});
		try {
			return await getAllRemoteKaras(req.body.repository, {
				filter: req.body.filter,
				q: req.body.q ? req.body.q : '',
				from: +req.body.from || 0,
				size: +req.body.size || 9999999,
			}, req.body.compare);
		} catch(err) {
			const code = 'REMOTE_SONG_LIST_ERROR';
			errMessage(code, err);
			throw {code: err?.code || 500, message: APIMessage(code)};
		}
	});

	router.route('updateAllBases', async (socket: Socket, req: APIData) => {
		/**
 * @api {post} Update all local songs with remote repository
 * @apiName updateAllBases
 * @apiVersion 5.0.0
 * @apiGroup Downloader
 * @apiPermission admin
 * @apiHeader authorization Auth token received from logging in
 * @apiSuccessExample Success-Response:
 * HTTP/1.1 200 OK
 * @apiErrorExample Error-Response:
 * HTTP/1.1 500 Internal Server Error
 * "Error computing update : ..."
 */
		await runChecklist(socket, req, 'admin', 'open', {allowInDemo: false, optionalAuth: false});
		try {
			updateAllKaras();
			return APIMessage('SONGS_UPDATES_IN_PROGRESS');
		} catch(err) {
			// This is async above, so response has already been sent
		}
	});
	router.route('syncAllBases', async (socket: Socket, req: APIData) => {
		/**
 * @api {post} Sync with remote repositories
 * @apiName syncAllBases
 * @apiVersion 5.0.0
 * @apiGroup Downloader
 * @apiPermission admin
 * @apiHeader authorization Auth token received from logging in
 * @apiSuccessExample Success-Response:
 * HTTP/1.1 200 OK
 * @apiErrorExample Error-Response:
 * HTTP/1.1 500 Internal Server Error
 * "Error computing update : ..."
 */
		await runChecklist(socket, req, 'admin', 'open', {allowInDemo: false, optionalAuth: false});
		try {
			updateAllBases();
			return APIMessage('BASES_SYNC_IN_PROGRESS');
		} catch(err) {
			// This is async above, so response has already been sent
		}
	});
	router.route('downloadAllBases', async (socket: Socket, req: APIData) => {
	/**
 * @api {post} Download all songs from all repositories
 * @apiName downloadAllBases
 * @apiVersion 5.0.0
 * @apiGroup Downloader
 * @apiPermission admin
 * @apiHeader authorization Auth token received from logging in
 * @apiSuccessExample Success-Response:
 * HTTP/1.1 200 OK
 * @apiErrorExample Error-Response:
 * HTTP/1.1 500 Internal Server Error
 * "Error computing update: ..."
 */
		await runChecklist(socket, req, 'admin', 'open', {allowInDemo: false, optionalAuth: false});
		try {
			downloadAllKaras();
			return APIMessage('DOWNLOAD_SONGS_IN_PROGRESS');
		} catch(err) {
			// This is async above, so response has already been sent
		}
	});
	router.route('cleanAllBases', async (socket: Socket, req: APIData) => {
		/**
 * @api {post} Remove all local karas not on remote repositories
 * @apiName cleanAllBases
 * @apiVersion 5.0.0
 * @apiGroup Downloader
 * @apiPermission admin
 * @apiHeader authorization Auth token received from logging in
 * @apiSuccessExample Success-Response:
 * HTTP/1.1 200 OK
 * @apiErrorExample Error-Response:
 * HTTP/1.1 500 Internal Server Error
 * "Error computing update: ..."
 */
		await runChecklist(socket, req, 'admin', 'open', {allowInDemo: false, optionalAuth: false});
		try {
			cleanAllKaras();
			return APIMessage('CLEAN_SONGS_IN_PROGRESS');
		} catch(err) {
			// This is async above, so response has already been sent
		}
	});
	router.route('updateAllMedias', async (socket: Socket, req: APIData) => {
	/**
 * @api {post} Only syncs medias, not kara data files
 * @apiName updateAllMedias
 * @apiVersion 5.0.0
 * @apiGroup Downloader
 * @apiPermission admin
 * @apiDescription Used by KaraokeBase GIT users to only update their media files and not their karaoke metadata files.
 * @apiHeader authorization Auth token received from logging in
 * @apiSuccessExample Success-Response:
 * HTTP/1.1 200 OK
 */
		await runChecklist(socket, req, 'admin', 'open', {allowInDemo: false, optionalAuth: false});
		try {
			updateAllMedias();
			return APIMessage('UPDATING_MEDIAS_IN_PROGRESS');
		} catch(err) {
			// This is async, blabla.
		}
	});
	router.route('getRemoteTags', async (socket: Socket, req: APIData) => {
	/**
 * @api {get} List all remote Tags
 * @apiName getRemoteTags
 * @apiVersion 5.0.0
 * @apiGroup Downloader
 * @apiPermission admin
 * @apiHeader authorization Auth token received from logging in
 * @apiParam {string} [repository] Repository to get tags from. If not specified, all repositories are queried.
 * @apiParam {number} [type] Tag type to display. If none it'll return everything
 * @apiSuccessExample Success-Response:
 * HTTP/1.1 200 OK
 * [
 * 	<See getBLCSet>
 * ]
 * @apiErrorExample Error-Response:
 * HTTP/1.1 500 Internal Server Error
 * "Error getting download BLCs : ..."
 */
		await runChecklist(socket, req, 'admin', 'open', {allowInDemo: false, optionalAuth: false});
		try {
			return await getAllRemoteTags(req.body?.repository, {
				type: +req.body?.type
			});
		} catch(err) {
			const code = 'REMOTE_TAGS_ERROR';
			errMessage(code, err);
			throw {code: err?.code || 500, message: APIMessage(code)};
		}
	});
}
