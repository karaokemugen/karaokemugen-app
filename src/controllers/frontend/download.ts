
import { Router } from 'express';

import {addDownloadBLC, addDownloads, cleanAllKaras, downloadAllKaras, downloadRandomSongs,getAllRemoteKaras, getAllRemoteTags, getDownloadBLC, getDownloads, pauseQueue, removeDownloadBLC, startDownloads, updateAllBases, updateAllKaras, updateAllMedias, wipeDownloads} from '../../services/download';
import { APIMessage,errMessage } from '../common';
import {requireAdmin, requireAuth, requireValidUser, updateUserLoginTime} from '../middlewares/auth';
import {requireNotDemo} from '../middlewares/demo';
import { getLang } from '../middlewares/lang';

export default function downloadController(router: Router) {

	router.route('/downloads')
	/**
 * @api {post} /downloads Add downloads to queue
 * @apiName PostDownloads
 * @apiVersion 3.1.0
 * @apiGroup Downloader
 * @apiPermission admin
 * @apiHeader authorization Auth token received from logging in
 * @apiParam {Object[]} downloads Download object
 * @apiParam {string} downloads/kid Song KID
 * @apiParam {string} downloads/name Song name (purely cosmetic)
 * @apiParam {number} downloads/size Size in bytes of downloads (usually mediasize)
 * @apiParam {string} downloads/repository Name (domain) of the repository to download from
 * @apiSuccessExample Success-Response:
 * HTTP/1.1 200 OK
 * @apiErrorExample Error-Response:
 * HTTP/1.1 500 Internal Server Error
 * @apiErrorExample Error-Response:
 * HTTP/1.1 409 Conflict
 */
		.post(requireNotDemo, requireAuth, requireValidUser, requireAdmin, async (req: any, res: any) => {
			try {
				const numberOfDLs = await addDownloads(req.body.downloads);
				res.status(200).json(APIMessage('DOWNLOADS_QUEUED', numberOfDLs));
			} catch(err) {
				const code = 'DOWNLOADS_QUEUED_ERROR';
				errMessage(code, err);
				res.status(err?.code || 500).json(APIMessage(code));
			}
		})
	/**
 * @api {get} /downloads Get queued downloads
 * @apiName GetDownloads
 * @apiVersion 3.1.0
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
		.get(requireNotDemo, requireAuth, requireValidUser, requireAdmin, async (_req: any, res: any) => {
			try {
				const downloads = await getDownloads();
				res.json(downloads);
			} catch(err) {
				const code = 'DOWNLOADS_GET_ERROR';
				errMessage(code, err);
				res.status(500).json(APIMessage(code));
			}
		})
		/**
 * @api {delete} /downloads Empty download queue
 * @apiName DeleteDownloads
 * @apiVersion 3.1.0
 * @apiGroup Downloader
 * @apiPermission admin
 * @apiHeader authorization Auth token received from logging in
 * @apiSuccessExample Success-Response:
 * HTTP/1.1 200 OK
 * @apiErrorExample Error-Response:
 * HTTP/1.1 500 Internal Server Error
 * "Error wiping downloads: ..."
 */
		.delete(requireNotDemo, requireAuth, requireValidUser, requireAdmin, async (_req: any, res: any) => {
			try {
				await wipeDownloads();
				res.status(200).json();
			} catch(err) {
				const code = 'DOWNLOADS_WIPE_ERROR';
				errMessage(code, err);
				res.status(500).json(APIMessage(code));
			}
		});
	router.route('/downloads/pause')
	/**
 * @api {put} /downloads/pause Pause queue
 * @apiName PauseDownloads
 * @apiVersion 3.1.0
 * @apiGroup Downloader
 * @apiPermission admin
 * @apiHeader authorization Auth token received from logging in
 * @apiSuccessExample Success-Response:
 * HTTP/1.1 200 OK
 * @apiErrorExample Error-Response:
 * HTTP/1.1 500 Internal Server Error
 * "Error pausing downloads: ..."
 */
		.put(requireNotDemo, requireAuth, requireValidUser, requireAdmin, async (_req: any, res: any) => {
			try {
				await pauseQueue();
				res.status(200).json();
			} catch(err) {
				const code = 'DOWNLOADS_PAUSE_ERROR';
				errMessage(code, err);
				res.status(500).json(APIMessage(code));
			}
		});
	router.route('/downloads/random')
		/**
	 * @api {post} /downloads/random Download random songs
	 * @apiName PostDownloadsRandom
	 * @apiVersion 3.2.2
	 * @apiGroup Downloader
	 * @apiPermission admin
	 * @apiHeader authorization Auth token received from logging in
	 * @apiDescription This is used for first runs of the app to seed it with some songs.
	 * @apiSuccessExample Success-Response:
	 * HTTP/1.1 200 OK
	 * @apiErrorExample Error-Response:
	 * HTTP/1.1 500 Internal Server Error
	 */
		.post(requireNotDemo, requireAuth, requireValidUser, requireAdmin, async (_req: any, res: any) => {
			try {
				await downloadRandomSongs();
				res.status(200).json(APIMessage('DOWNLOADS_STARTED'));
			} catch(err) {
				res.status(500).json(APIMessage('DOWNLOADS_START_ERROR', err));
			}
		});
	router.route('/downloads/start')
	/**
 * @api {put} /downloads/start Start queue
 * @apiName StartDownloads
 * @apiVersion 3.1.0
 * @apiGroup Downloader
 * @apiPermission admin
 * @apiHeader authorization Auth token received from logging in
 * @apiSuccessExample Success-Response:
 * HTTP/1.1 200 OK
 * @apiErrorExample Error-Response:
 * HTTP/1.1 500 Internal Server Error
 * "Error starting downloads: ..."
 */
		.put(requireNotDemo, requireAuth, requireValidUser, requireAdmin, async (_req: any, res: any) => {
			try {
				await startDownloads();
				res.status(200).json(APIMessage('DOWNLOADS_STARTED'));
			} catch(err) {
				const code = 'DOWNLOADS_START_ERROR';
				errMessage(code, err);
				res.status(500).json(APIMessage(code));
			}
		});
	router.route('/downloads/blacklist/criterias')
	/**
 * @api {get} /downloads/blacklist/criterias List download blacklist criterias
 * @apiName GetDownloadBLC
 * @apiVersion 3.1.0
 * @apiGroup Downloader
 * @apiPermission admin
 * @apiHeader authorization Auth token received from logging in
 * @apiSuccessExample Success-Response:
 * HTTP/1.1 200 OK
 * [
 * 	<See GET /blacklist/criterias>
 * ]
 * @apiErrorExample Error-Response:
 * HTTP/1.1 500 Internal Server Error
 * "Error getting download BLCs : ..."
 */
		.get(requireNotDemo, requireAuth, requireValidUser, requireAdmin, async (_req: any, res: any) => {
			try {
				const blc = await getDownloadBLC();
				res.status(200).json(blc);
			} catch(err) {
				const code = 'DOWNLOADS_BLC_GET_ERROR';
				errMessage(code, err);
				res.status(500).json(APIMessage(code));
			}
		})
	/**
 * @api {post} /downloads/blacklist/criterias Add download blacklist criteria
 * @apiName PostDownloadBLC
 * @apiVersion 3.1.0
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
		.post(requireNotDemo, requireAuth, requireValidUser, requireAdmin, async (req: any, res: any) => {
			try {
				await addDownloadBLC({ type: req.body.type, value: req.body.value});
				res.status(200).json();
			} catch(err) {
				const code = 'DOWNLOADS_BLC_ADDED_ERROR';
				errMessage(code, err);
				res.status(err?.code || 500).json(APIMessage(code));
			}
		});
	router.route('/downloads/blacklist/criterias/:id')
	/**
 * @api {delete} /downloads/blacklist/criterias/:id Remove download criteria
 * @apiName DeleteDownloadBLC
 * @apiVersion 3.1.0
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
		.delete(requireNotDemo, requireAuth, requireValidUser, requireAdmin, async (req: any, res: any) => {
			try {
				await removeDownloadBLC(parseInt(req.params.id));
				res.status(200).json();
			} catch(err) {
				const code = 'DOWNLOADS_BLC_REMOVE_ERROR';
				errMessage(code, err);
				res.status(err?.code || 500).json(APIMessage(code));
			}
		});
	router.route('/karas/remote')
	/**
 * @api {get} /karas/remote Get complete list of karaokes (remote)
 * @apiName GetKarasRemote
 * @apiVersion 3.2.0
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
		.get(getLang, requireAuth, requireNotDemo, requireValidUser, updateUserLoginTime, requireAdmin, async (req: any, res: any) => {
			try {
				const karas = await getAllRemoteKaras(req.query.repository, {
					filter: req.query.filter,
					q: req.query.q ? req.query.q : '',
					from: +req.query.from || 0,
					size: +req.query.size || 9999999,
				}, req.query.compare);
				res.json(karas);
			} catch(err) {
				const code = 'REMOTE_SONG_LIST_ERROR';
				errMessage(code, err);
				res.status(500).json(APIMessage(code));
			}
		});

	router.route('/downloads/update')
		/**
 * @api {post} /downloads/update Update all local songs with remote repository
 * @apiName updateDownloads
 * @apiVersion 3.1.0
 * @apiGroup Downloader
 * @apiPermission admin
 * @apiHeader authorization Auth token received from logging in
 * @apiSuccessExample Success-Response:
 * HTTP/1.1 200 OK
 * @apiErrorExample Error-Response:
 * HTTP/1.1 500 Internal Server Error
 * "Error computing update : ..."
 */
		.post(requireNotDemo, requireAuth, requireValidUser, requireAdmin, (_req, res) => {
			try {
				updateAllKaras();
				res.status(200).json(APIMessage('SONGS_UPDATES_IN_PROGRESS'));
			} catch(err) {
				// This is async above, so response has already been sent
			}
		});
	router.route('/downloads/sync')
		/**
 * @api {post} /downloads/sync Sync with remote repositories
 * @apiName syncDownloads
 * @apiVersion 3.2.0
 * @apiGroup Downloader
 * @apiPermission admin
 * @apiHeader authorization Auth token received from logging in
 * @apiSuccessExample Success-Response:
 * HTTP/1.1 200 OK
 * @apiErrorExample Error-Response:
 * HTTP/1.1 500 Internal Server Error
 * "Error computing update : ..."
 */
		.post(requireNotDemo, requireAuth, requireValidUser, requireAdmin, (_req, res) => {
			try {
				updateAllBases();
				res.status(200).json(APIMessage('BASES_SYNC_IN_PROGRESS'));
			} catch(err) {
				// This is async above, so response has already been sent
			}
		});
	router.route('/downloads/all')
	/**
 * @api {post} /downloads/all Download all songs from all repositories
 * @apiName PostDownloadAll
 * @apiVersion 3.1.0
 * @apiGroup Downloader
 * @apiPermission admin
 * @apiHeader authorization Auth token received from logging in
 * @apiSuccessExample Success-Response:
 * HTTP/1.1 200 OK
 * @apiErrorExample Error-Response:
 * HTTP/1.1 500 Internal Server Error
 * "Error computing update: ..."
 */
		.post(requireNotDemo, requireAuth, requireValidUser, requireAdmin, (_req, res) => {
			try {
				downloadAllKaras();
				res.status(200).json(APIMessage('DOWNLOAD_SONGS_IN_PROGRESS'));
			} catch(err) {
				// This is async above, so response has already been sent
			}
		});
	router.route('/downloads/clean')
		/**
 * @api {post} /downloads/clean Remove all local karas not on remote repositories
 * @apiName CleanDownloads
 * @apiVersion 3.1.0
 * @apiGroup Downloader
 * @apiPermission admin
 * @apiHeader authorization Auth token received from logging in
 * @apiSuccessExample Success-Response:
 * HTTP/1.1 200 OK
 * @apiErrorExample Error-Response:
 * HTTP/1.1 500 Internal Server Error
 * "Error computing update: ..."
 */
		.post(requireNotDemo, requireAuth, requireValidUser, requireAdmin, (_req, res) => {
			try {
				cleanAllKaras();
				res.status(200).json(APIMessage('CLEAN_SONGS_IN_PROGRESS'));
			} catch(err) {
				// This is async above, so response has already been sent
			}
		});
	router.route('/downloads/updateMedias')
	/**
 * @api {post} /downloads/updateMedias Only syncs medias, not kara data files
 * @apiName MediaDownloads
 * @apiVersion 3.1.0
 * @apiGroup Downloader
 * @apiPermission admin
 * @apiDescription Used by KaraokeBase GIT users to only update their media files and not their karaoke metadata files.
 * @apiHeader authorization Auth token received from logging in
 * @apiSuccessExample Success-Response:
 * HTTP/1.1 200 OK
 */
		.post(requireAuth, requireValidUser, requireAdmin, (_req: any, res: any) => {
			try {
				updateAllMedias();
				res.status(200).json(APIMessage('UPDATING_MEDIAS_IN_PROGRESS'));
			} catch(err) {
				// This is async, blabla.
			}
		});
	router.route('/tags/remote')
	/**
 * @api {get} /tags/remote List all remote Tags
 * @apiName GetTagsRemote
 * @apiVersion 3.1.0
 * @apiGroup Downloader
 * @apiPermission admin
 * @apiHeader authorization Auth token received from logging in
 * @apiParam {string} [repository] Repository to get tags from. If not specified, all repositories are queried.
 * @apiParam {number} [type] Tag type to display. If none it'll return everything
 * @apiSuccessExample Success-Response:
 * HTTP/1.1 200 OK
 * [
 * 	<See GET /blacklist/criterias>
 * ]
 * @apiErrorExample Error-Response:
 * HTTP/1.1 500 Internal Server Error
 * "Error getting download BLCs : ..."
 */
		.get(requireNotDemo, requireAuth, requireValidUser, requireAdmin, async (req, res) => {
			try {
				const tags = await getAllRemoteTags(req.query.repository as string, {
					type: +req.query.type
				});
				res.json(tags);
			} catch(err) {
				const code = 'REMOTE_TAGS_ERROR';
				errMessage(code, err);
				res.status(500).json(APIMessage(code));
			}
		});
}
