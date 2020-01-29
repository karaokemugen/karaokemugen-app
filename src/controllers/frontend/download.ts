
import {requireAuth, requireValidUser, requireAdmin} from '../middlewares/auth';
import {requireNotDemo} from '../middlewares/demo';

import {getDownloadBLC, addDownloadBLC, removeDownloadBLC, emptyDownloadBLC, getDownloads, removeDownload, retryDownload, pauseQueue, startDownloads, addDownloads, wipeDownloads, updateAllKaras, downloadAllKaras, cleanAllKaras, updateMedias, getRemoteTags} from '../../services/download';
import {getRepos} from '../../services/repo';
import { Router } from 'express';
import { getConfig } from '../../lib/utils/config';

export default function downloadController(router: Router) {

	router.route('/repos')
	/**
 * @api {get} /repos Get repository list
 * @apiName GetRepos
 * @apiVersion 3.1.0
 * @apiGroup Downloader
 * @apiPermission admin
 * @apiHeader authorization Auth token received from logging in
 * @apiSuccess {Object[]} repo Repository object
 * @apiSuccess {string} repo/name Repository name
 * @apiSuccess {date} repo/last_downloaded_at Last time a song has been downloaded from there
 *
 * @apiSuccessExample Success-Response:
 * HTTP/1.1 200 OK
 * [
 * 	{
 * 		"name": "kara.moe",
 * 		"last_downloaded_at": "2019-12-31"
 * 	}
 * ]
 * @apiErrorExample Error-Response:
 * HTTP/1.1 500 Internal Server Error
 */
		.get(requireNotDemo, requireAuth, requireValidUser, requireAdmin, async (_req: any, res: any) => {
		try {
			const repos = await getRepos();
			res.json(repos);
		} catch(err) {
			res.status(500).send(`Error getting repositories: ${err}`);
		}
	});
	router.route('/downloads')
	/**
 * @api {post} /downloads Add downloads to queue
 * @apiName PostDownloads
 * @apiVersion 3.1.0
 * @apiGroup Downloader
 * @apiPermission admin
 * @apiHeader authorization Auth token received from logging in
 * @apiParam {string} repository Name (domain) of the repository to download from
 * @apiParam {Object[]} downloads Download object
 * @apiParam {string[]} downloads/seriefiles List of serie files to download
 * @apiParam {string[]} downloads/tagfiles List of tag files to download
 * @apiParam {string} downloads/mediafile Media file to download
 * @apiParam {string} downloads/karafile Karaoke metadata file to download
 * @apiParam {string} downloads/subfile Lyrics file to download
 * @apiParam {string} downloads/name Song name (purely cosmetic)
 * @apiParam {number} downloads/size Size in bytes of downloads (usually mediasize)
 * @apiSuccessExample Success-Response:
 * HTTP/1.1 200 OK
 * "5 download(s) queued"
 * @apiErrorExample Error-Response:
 * HTTP/1.1 500 Internal Server Error
 * "Error while adding download: ..."
 */
		.post(requireNotDemo, requireAuth, requireValidUser, requireAdmin, async (req: any, res: any) => {
			try {
				const msg = await addDownloads(req.body.repository,req.body.downloads);
				res.status(200).send(msg);
			} catch(err) {
				res.status(500).send(`Error while adding download: ${err}`);
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
 * @apiSuccess {string} downloads/status Status codes : `DL_PLANNED`, `DL_DONE`, `PL_FAILED`, `PL_RUNNING`
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
				res.status(500).send(`Error getting downloads: ${err}`);
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
			res.status(200).send('Download queue emptied completely');
		} catch(err) {
			res.status(500).send(`Error wiping downloads: ${err}`);
		}
	});
	router.route('/downloads/:uuid')
/**
 * @api {delete} /downloads/:uuid Remove download from queue
 * @apiName DeleteDownload
 * @apiVersion 3.1.0
 * @apiGroup Downloader
 * @apiPermission admin
 * @apiHeader authorization Auth token received from logging in
 * @apiParam {uuid} uuid Download to remove from queue
 * @apiSuccessExample Success-Response:
 * HTTP/1.1 200 OK
 * @apiErrorExample Error-Response:
 * HTTP/1.1 500 Internal Server Error
 * "Error removing download: ..."
 */
		.delete(requireNotDemo, requireAuth, requireValidUser, requireAdmin, async (req: any, res: any) => {
		try {
			await removeDownload(req.params.uuid);
			res.status(200).send('Download removed');
		} catch(err) {
			res.status(500).send(`Error removing download: ${err}`);
		}
	});
	router.route('/downloads/:uuid/retry')
/**
 * @api {put} /downloads/:uuid/retry Retry a failed download
 * @apiName RetryDownload
 * @apiVersion 3.1.0
 * @apiGroup Downloader
 * @apiPermission admin
 * @apiHeader authorization Auth token received from logging in
 * @apiParam {uuid} uuid Download to remove from queue
 * @apiSuccessExample Success-Response:
 * HTTP/1.1 200 OK
 * @apiErrorExample Error-Response:
 * HTTP/1.1 500 Internal Server Error
 * "Error retrying download: ..."
 */
		.put(requireNotDemo, requireAuth, requireValidUser, requireAdmin, async (req: any, res: any) => {
		try {
			await retryDownload(req.params.uuid);
			res.status(200).send('Download back into queue');
		} catch(err) {
			res.status(500).send(`Error retrying download: ${err}`);
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
			res.status(200).send('Downloads paused');
		} catch(err) {
			res.status(500).send(`Error pausing downloads: ${err}`);
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
			res.status(200).send('Downloads starting');
		} catch(err) {
			res.status(500).send(`Error starting downloads: ${err}`);
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
			res.status(500).send(`Error getting download BLCs : ${err}`);
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
 * "Error adding download BLC : ..."
 */
		.post(requireNotDemo, requireAuth, requireValidUser, requireAdmin, async (req: any, res: any) => {
		try {
			await addDownloadBLC({ type: req.body.type, value: req.body.value});
			res.status(200).send('Download blacklist criteria added');
		} catch(err) {
			res.status(500).send(`Error adding download BLC : ${err}`);
		}
	})
	/**
 * @api {delete} /downloads/blacklist/criterias Empty download blacklist criterias
 * @apiName DeleteDownloadBLCs
 * @apiVersion 3.1.0
 * @apiGroup Downloader
 * @apiPermission admin
 * @apiHeader authorization Auth token received from logging in
 * @apiSuccessExample Success-Response:
 * HTTP/1.1 200 OK
 * @apiErrorExample Error-Response:
 * HTTP/1.1 500 Internal Server Error
 * "Error emptying download BLC : ..."
 */
		.delete(requireNotDemo, requireAuth, requireValidUser, requireAdmin, async (_req: any, res: any) => {
		try {
			await emptyDownloadBLC();
			res.status(200).send('Download blacklist criterias emptied');
		} catch(err) {
			res.status(500).send(`Error emptying download BLC : ${err}`);
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
 * "Error removing download BLC : ..."
 */
		.delete(requireNotDemo, requireAuth, requireValidUser, requireAdmin, async (req: any, res: any) => {
		try {
			await removeDownloadBLC(parseInt(req.params.id));
			res.status(200).send('Download blacklist criteria removed');
		} catch(err) {
			res.status(500).send(`Error removing download BLC : ${err}`);
		}
	});
	router.route('/downloads/update')
		/**
 * @api {post} /downloads/update Update all local songs with remote
 * @apiName updateDownloads
 * @apiVersion 3.1.0
 * @apiGroup Downloader
 * @apiPermission admin
 * @apiHeader authorization Auth token received from logging in
 * @apiParam {string} repository Repository to query for updates
 * @apiSuccessExample Success-Response:
 * HTTP/1.1 200 OK
 * @apiErrorExample Error-Response:
 * HTTP/1.1 500 Internal Server Error
 * "Error computing update : ..."
 */
		.post(requireNotDemo, requireAuth, requireValidUser, requireAdmin, async (req, res) => {
		try {
			await updateAllKaras(req.body.repository);
			res.status(200).send('Update in progress');
		} catch(err) {
			res.status(500).send(`Error computing update: ${err}`);
		}
	});
	router.route('/downloads/all')
	/**
 * @api {post} /downloads/all Download all songs from remote
 * @apiName PostDownloadAll
 * @apiVersion 3.1.0
 * @apiGroup Downloader
 * @apiPermission admin
 * @apiHeader authorization Auth token received from logging in
 * @apiParam {string} repository Repository to query for updates
 * @apiSuccessExample Success-Response:
 * HTTP/1.1 200 OK
 * @apiErrorExample Error-Response:
 * HTTP/1.1 500 Internal Server Error
 * "Error computing update: ..."
 */
		.post(requireNotDemo, requireAuth, requireValidUser, requireAdmin, async (req, res) => {
		try {
			await downloadAllKaras(req.body.repository);
			res.status(200).send('Download in progress');
		} catch(err) {
			res.status(500).send(`Error computing update: ${err}`);
		}
	});
	router.route('/downloads/clean')
		/**
 * @api {post} /downloads/clean Remove all local karas not on remote
 * @apiName CleanDownloads
 * @apiVersion 3.1.0
 * @apiGroup Downloader
 * @apiPermission admin
 * @apiHeader authorization Auth token received from logging in
 * @apiParam {string} repository Repository to query for updates
 * @apiSuccessExample Success-Response:
 * HTTP/1.1 200 OK
 * @apiErrorExample Error-Response:
 * HTTP/1.1 500 Internal Server Error
 * "Error computing update: ..."
 */
		.post(requireNotDemo, requireAuth, requireValidUser, requireAdmin, async (req, res) => {
		try {
			await cleanAllKaras(req.body.repository);
			res.status(200).send('Cleanup in progress');
		} catch(err) {
			res.status(500).send(`Error computing update: ${err}`);
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
		.post(requireAuth, requireValidUser, requireAdmin, async (_req: any, res: any) => {
			updateMedias(getConfig().Online.Host);
			res.status(200).send('Medias are being updated, check Karaoke Mugen\'s console to follow its progression');
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
			const tags = await getRemoteTags(req.query.repository, {
				type: req.query.type
			});
			res.json(tags);
		} catch(err) {
			res.status(500).send(`Unable to get all remote tags : ${err}`);
		}
	});
}