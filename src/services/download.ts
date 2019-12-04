import {selectDownloadBLC, truncateDownloadBLC, insertDownloadBLC,  deleteDownloadBLC, emptyDownload, selectDownload, selectDownloads, updateDownload, deleteDownload, insertDownloads, selectPendingDownloads, initDownloads} from '../dao/download';
import Downloader from '../utils/downloader';
import Queue from 'better-queue';
import uuidV4 from 'uuid/v4';
import {resolvedPathMedias, resolvedPathSubs, resolvedPathKaras, resolvedPathSeries, resolvedPathTemp, resolvedPathTags} from '../lib/utils/config';
import {resolve} from 'path';
import internet from 'internet-available';
import logger from '../lib/utils/logger';
import {asyncMove, resolveFileInDirs, asyncStat, asyncUnlink, asyncReadDir} from '../lib/utils/files';
import {uuidRegexp, getTagTypeName} from '../lib/utils/constants';
import {integrateKaraFile, getAllKaras} from './kara';
import {integrateSeriesFile} from './series';
import { compareKarasChecksum } from '../dao/database';
import { vacuum } from '../lib/dao/database';
import { emitWS } from '../lib/utils/ws';
import got from 'got';
import { QueueStatus, KaraDownload, KaraDownloadRequest, KaraDownloadBLC, File } from '../types/download';
import { DownloadItem } from '../types/downloader';
import { KaraList, KaraParams } from '../lib/types/kara';
import { TagParams, Tag } from '../lib/types/tag';
import { deleteKara } from '../services/kara';
import { refreshAll } from '../lib/dao/database';
import { DBKara } from '../lib/types/database/kara';
import { getTags, integrateTagFile } from './tag';
import prettyBytes from 'pretty-bytes';
import { refreshKaras } from '../lib/dao/kara';

const queueOptions = {
	id: 'uuid',
	precondition: (cb: any) => {
		internet()
			.then(cb(null, true))
			.catch(cb(null, false));
	},
	preconditionRetryTimeout: 10 * 1000,
	cancelIfRunning: true
};

let q: any;

function emitQueueStatus(status: QueueStatus) {
	emitWS('downloadQueueStatus', status);
}

function queueDownload(input: KaraDownload, done: any) {
	logger.info(`[Download] Processing song : ${input.name}`);
	processDownload(input)
		.then(() => done())
		.catch(err => done(err));
}

export async function initDownloader() {
	initQueue();
	await initDownloads();
	await startDownloads();
	return;
}


function initQueue(drainEvent = true) {
	// We'll compare data dir checksum and execute refresh every 5 downloads and everytime the queue is drained
	let taskCounter = 0;
	q = new Queue(queueDownload, queueOptions);
	q.on('task_finish', () => {
		if (q.length > 0) logger.info(`[Download] ${q.length - 1} items left in queue`);
		taskCounter++;
		if (taskCounter >= 100) {
			logger.debug('[Download] Triggering database refresh');
			compareKarasChecksum(true);
			refreshAll();
			taskCounter = 0;
		}
		emitQueueStatus('updated');
	});
	q.on('task_failed', (taskId: string, err: any) => {
		logger.error(`[Download] Task ${taskId} failed : ${err}`);
		emitQueueStatus('updated');
	});
	q.on('empty', () => emitQueueStatus('updated'));
	if (drainEvent) q.on('drain', () => {
		logger.info('[Download] No tasks left, stopping queue');
		refreshAll().then(() => vacuum());
		compareKarasChecksum();
		taskCounter = 0;
		emitQueueStatus('updated');
		emitQueueStatus('stopped');
	});
}

export async function startDownloads() {
	if (q.length && q.length > 0) {
		resumeQueue();
	} else {
		const downloads = await selectPendingDownloads();
		try {
			await internet();
			downloads.forEach(dl => q.push(dl));
			logger.info('[Downloader] Download queue starting up');
			emitQueueStatus('started');
		} catch(err) {
			if (downloads.length > 0) logger.warn('[Download] There are planned downloads, but your computer seems offline');
			emitQueueStatus('stopped');
		}
	}
}

async function processDownload(download: KaraDownload) {
	try {
		await setDownloadStatus(download.uuid, 'DL_RUNNING');
		let list = [];
		const localMedia = resolve(resolvedPathMedias()[0],download.urls.media.local);
		const localKara = resolve(resolvedPathKaras()[0],download.urls.kara.local);
		const localSeriesPath = resolve(resolvedPathSeries()[0]);
		const localTagsPath = resolve(resolvedPathTags()[0]);

		let bundle = {
			kara: localKara,
			series: [],
			tags: []
		};
		const tempDir = resolvedPathTemp();
		const tempMedia = resolve(tempDir, download.urls.media.local);
		const tempKara = resolve(tempDir, download.urls.kara.local);
		const tempSeriesPath = tempDir;
		const tempTagsPath = tempDir;

		// Check if media already exists in any media dir. If it does, do not try to redownload it.
		let mediaAlreadyExists = false;
		try {
			const existingMediaFile = await resolveFileInDirs(download.urls.media.local, resolvedPathMedias());
			// Check if file size are different
			const localMediaStat = await asyncStat(existingMediaFile);
			if (localMediaStat.size !== download.size) throw null;
			mediaAlreadyExists = true;
		} catch(err) {
			// File does not exist or sizes are different, we download it.
			list.push({
				filename: tempMedia,
				url: download.urls.media.remote,
				id: download.name
			});
		}

		let localLyrics: string;
		let tempLyrics: string;
		if (download.urls.lyrics.local !== null) {
			localLyrics = resolve(resolvedPathSubs()[0],download.urls.lyrics.local);
			tempLyrics = resolve(tempDir, download.urls.lyrics.local);
			list.push({
				filename: tempLyrics,
				url: download.urls.lyrics.remote,
				id: download.name
			})
		};
		list.push({
			filename: tempKara,
			url: download.urls.kara.remote,
			id: download.name
		});

		for (const serie of download.urls.serie) {
			if (typeof serie.local === 'string') {
				list.push({
					filename: resolve(tempSeriesPath, serie.local),
					url: serie.remote,
					id: download.name
				});
				bundle.series.push(resolve(localSeriesPath, serie.local));
			}
		}
		for (const tag of download.urls.tag) {
			if (typeof tag.local === 'string') {
				list.push({
					filename: resolve(tempTagsPath, tag.local),
					url: tag.remote,
					id: download.name
				});
				bundle.tags.push(resolve(localTagsPath, tag.local));
			}
		}

		await downloadFiles(download, list);
		// Delete files if they're already present
		try {
			if (!mediaAlreadyExists) await asyncMove(tempMedia, localMedia, {overwrite: true});
		} catch(err) {
			logger.error(`[Debug] Unable to move ${tempMedia} to ${localMedia}`);
		}
		try {
			if (download.urls.lyrics.local !== null) await asyncMove(tempLyrics, localLyrics, {overwrite: true});
		} catch(err) {
			logger.error(`[Debug] Unable to move ${tempLyrics} to ${localLyrics}`);
		}
		try {
			await asyncMove(tempKara, localKara, {overwrite: true});
		} catch(err) {
			logger.error(`[Debug] Unable to move ${tempKara} to ${localKara}`);
		}
		for (const seriefile of download.urls.serie) {
			if (typeof seriefile.local === 'string') {
				try {
					await asyncMove(resolve(tempSeriesPath, seriefile.local), resolve(localSeriesPath, seriefile.local), {overwrite: true});
				} catch(err) {
					logger.error(`[Debug] Unable to move ${resolve(tempSeriesPath, seriefile.local)} to ${resolve(localSeriesPath, seriefile.local)}`);
				}
			}
		}
		for (const tagfile of download.urls.tag) {
			if (typeof tagfile.local === 'string') {
				try {
					await asyncMove(resolve(tempTagsPath, tagfile.local), resolve(localTagsPath, tagfile.local), {overwrite: true});
				} catch(err) {
					logger.error(`[Debug] Unable to move ${resolve(tempTagsPath, tagfile.local)} to ${resolve(localTagsPath, tagfile.local)}`);
				}
			}
		}
		logger.info(`[Download] Finished downloading item "${download.name}"`);
		// Now adding our newly downloaded kara
		try {
			for (const serie of bundle.series) {
				try {
					const serieName = await integrateSeriesFile(serie);
					logger.debug(`[Download] Series "${serieName}" in database`);
				} catch(err) {
					logger.error(`[Download] Series "${serie}" not properly added to database`);
					throw err;
				}
			}
			for (const tag of bundle.tags) {
				try {
					const tagName = await integrateTagFile(tag);
					logger.debug(`[Download] Tag "${tagName}" in database`);
				} catch(err) {
					logger.error(`[Download] Tag "${tag}" not properly added to database`);
					throw err;
				}
			}
			try {
				await integrateKaraFile(bundle.kara);
				logger.info(`[Download] Song "${download.name}" added to database`);
				await setDownloadStatus(download.uuid, 'DL_DONE')
			} catch(err) {
				logger.error(`[Download] Song "${download.name}" not properly added to database`);
				throw err;
			}
		} catch(err) {
			logger.error(`[Download] Song "${download.name}" downloaded but not properly added to database. Regenerate your database manually after fixing errors`);
			throw err;
		}
	} catch(err) {
		setDownloadStatus(download.uuid, 'DL_FAILED');
		throw err;
	}
}

async function downloadFiles(download: KaraDownload, list: DownloadItem[]) {
	const downloader = new Downloader(list, { bar: true });
	// Launch downloads
	return new Promise((resolve, reject) => {
		downloader.download(fileErrors => {
			if (fileErrors.length > 0) {
				setDownloadStatus(download.uuid, 'DL_FAILED')
					.then(() => {
						reject(`Error downloading file : ${fileErrors.toString()}`);
					}).catch(err => {
						reject(`Error downloading file : ${fileErrors.toString()} - setting failed status failed too! (${err})`);
					});
			} else {
				resolve();
			}
		});
	});
}

export function pauseQueue() {
	// Queue is paused but the current running task is not paused.
	emitQueueStatus('paused');
	return q.pause();
}

export function resumeQueue() {
	emitQueueStatus('started');
	return q.resume();
}

export async function addDownloads(repo: string, downloads: KaraDownloadRequest[]): Promise<string> {
	const currentDls = await getDownloads();
	downloads = downloads.filter(dl => {
		if (currentDls.find(cdl => dl.name === cdl.name &&
			(cdl.status === 'DL_RUNNING' ||
			cdl.status === 'DL_PLANNED')
			)
		) return false;
		return true;
	});
	if (downloads.length === 0) throw 'No downloads added, all are already in queue or running';
	const dls: KaraDownload[] = downloads.map(dl => {
		const seriefiles = dl.seriefiles.map(s => {
			return {
				remote: `https://${repo}/downloads/series/${s}`,
				local: s
			}
		});
		const tagfiles = dl.tagfiles.map(t => {
			return {
				remote: `https://${repo}/downloads/tags/${t}`,
				local: t
			}
		});
		return {
			uuid: uuidV4(),
			urls: {
				media: {
					remote: `https://${repo}/downloads/medias/${dl.mediafile}`,
					local: dl.mediafile
				},
				lyrics: {
					remote: `https://${repo}/downloads/lyrics/${dl.subfile}`,
					local: dl.subfile
				},
				kara: {
					remote: `https://${repo}/downloads/karaokes/${dl.karafile}`,
					local: dl.karafile
				},
				serie: seriefiles,
				tag: tagfiles
			},
			name: dl.name,
			size: dl.size,
			status: 'DL_PLANNED'
		};
	});
	await insertDownloads(dls);
	try {
		await internet();
		dls.forEach(dl => q.push(dl));
		return `${dls.length} download(s) queued`;
	} catch(err) {
		return `${dls.length} Download(s) queued but no internet connection available`;
	}
}

export async function getDownloads() {
	return await selectDownloads();
}

export async function getDownload(uuid: string) {
	return await selectDownload(uuid);
}

export async function setDownloadStatus(uuid: string, status: string) {
	return await updateDownload(uuid, status);
}

export async function retryDownload(uuid: string) {
	const dl = await selectDownload(uuid);
	if (!dl) throw 'Download ID unknown';
	if (dl.status === 'DL_RUNNING') throw 'Download is already running!';
	if (dl.status === 'DL_PLANNED') throw 'Download is already planned!';
	await setDownloadStatus(uuid, 'DL_PLANNED');
	q.push(dl);
	emitQueueStatus('started');
}

export async function removeDownload(uuid: string) {
	const dl = await selectDownload(uuid);
	if (!dl) throw 'Download ID unknown';
	if (dl.status === 'DL_RUNNING' ) throw 'Running downloads cannot be cancelled';
	await deleteDownload(uuid);
	q.cancel(uuid);
	emitQueueStatus('updated');
}

export async function wipeDownloads() {
	q.destroy();
	initQueue();
	emitQueueStatus('stopped');
	return await emptyDownload();
}

export async function getDownloadBLC() {
	return await selectDownloadBLC();
}

export async function addDownloadBLC(blc: KaraDownloadBLC) {
	if (blc.type < 0 && blc.type > 1006) throw `Incorrect BLC type (${blc.type})`;
	if ((blc.type <= 1001) && !new RegExp(uuidRegexp).test(blc.value)) throw `Blacklist criteria value mismatch : type ${blc.type} must have UUID value`;
	if ((blc.type >= 1002) && isNaN(blc.value)) throw `Blacklist criteria type mismatch : type ${blc.type} must have a numeric value!`;
	return await insertDownloadBLC(blc);
}

export async function removeDownloadBLC(id: number) {
	const dlBLC = await selectDownloadBLC();
	if (!dlBLC.some(e => e.dlblc_id === id )) throw 'DL BLC ID does not exist';
	return await deleteDownloadBLC(id);
}

export async function emptyDownloadBLC() {
	return await truncateDownloadBLC();
}

export async function getRemoteKaras(repo: string, params: KaraParams): Promise<KaraList> {
	const URLParams = [];
	if (params.filter) URLParams.push(['filter', params.filter])
	if (params.size) URLParams.push(['size', params.size + ''])
	if (params.from) URLParams.push(['from', params.from + ''])
	params.q
		? URLParams.push(['q', params.q])
		: URLParams.push(['q', '']);
	const queryParams = new URLSearchParams(URLParams);
	const res = await got(`https://${repo}/api/karas/search?${queryParams.toString()}`);
	return JSON.parse(res.body);
}

export async function getRemoteTags(repo: string, params: TagParams): Promise<any> {
	const queryParams = new URLSearchParams([
		['type', params.type + '']
	]);
	const res = await got(`https://${repo}/api/karas/tags?${queryParams.toString()}`);
	return JSON.parse(res.body);
}

export async function updateBase(repo: string) {
	// First, make sure we wipe the download queue before updating.
	if (!q) initQueue(false);
	await emptyDownload();
	logger.info('[Update] Computing songs to add/remove/update...');
	try {
		logger.info('[Update] Getting local and remote song inventory');
		const karas = await getKaraInventory(repo);
		logger.info('[Update] Removing songs...');
		await cleanAllKaras(repo, karas.local, karas.remote);
		logger.info('[Update] Adding updated/new songs...');
		const [updatedSongs, newSongs] = await Promise.all([
			updateAllKaras(repo, karas.local, karas.remote),
			downloadAllKaras(repo, karas.local, karas.remote)
		]);
		if (updatedSongs === 0 && newSongs === 0) return true;
		await waitForUpdateQueueToFinish();
		return true;
	} catch(err) {
		logger.error(`[Update] Base update failed : ${err}`);
		throw err;
	}
}

async function waitForUpdateQueueToFinish() {
	return new Promise((resolve, reject) => {
		// We'll redefine the drain event of the queue to resolve once the queue is drained.
		q.on('drain', () => {
			compareKarasChecksum()
			refreshAll()
			.then(() => {
				vacuum();
				resolve();
			}).catch(err => {
				logger.error(`[Download] Error while draining queue : ${err}`);
				reject();
			});
		});
	});
}
async function getKaraInventory(repo: string) {
	const [local, remote] = await Promise.all([
		getAllKaras(),
		getRemoteKaras(repo, {})
	]);
	return {
		local,
		remote
	}
}

export async function downloadAllKaras(repo: string, local?: KaraList, remote?: KaraList): Promise<number> {
	if (!local || !remote) {
		const karas = await getKaraInventory(repo);
		local = karas.local;
		remote = karas.remote;
	}
	const localKIDs = local.content.map(k => k.kid);
	let karasToAdd = remote.content.filter(k => !localKIDs.includes(k.kid));
	const initialKarasToAddCount = karasToAdd.length;
	// Among those karaokes, we need to establish which ones we'll filter out via the download blacklist criteria
	logger.info('[Update] Applying blacklist (if present)');

	const [blcs, tags] = await Promise.all([
		getDownloadBLC(),
		getTags({})
	]);
	for (const blc of blcs) {
		let filterFunction: Function;
		if (blc.type === 0) filterFunction = filterTagName;
		if (blc.type >= 2 && blc.type < 1000) filterFunction = filterTagID;
		if (blc.type === 1000) filterFunction = filterSeriesName;
		if (blc.type === 1001) filterFunction = filterKID;
		if (blc.type === 1002) filterFunction = filterDurationLonger;
		if (blc.type === 1003) filterFunction = filterDurationShorter;
		if (blc.type === 1004) filterFunction = filterTitle;
		if (blc.type === 1005) filterFunction = filterYearOlder;
		if (blc.type === 1006) filterFunction = filterYearYounger;
		karasToAdd = karasToAdd.filter(k => filterFunction(k, blc.value, blc.type, tags.content));
	}
	const downloads = karasToAdd.map(k => {
		return {
			size: k.mediasize,
			mediafile: k.mediafile,
			subfile: k.subfile,
			karafile: k.karafile,
			seriefiles: k.seriefiles,
			tagfiles: k.tagfiles,
			name: k.karafile.replace('.kara.json','')
		}
	});
	logger.info(`[Update] Adding ${karasToAdd.length} new songs.`);
	if (initialKarasToAddCount !== karasToAdd.length) logger.info(`[Update] ${initialKarasToAddCount - karasToAdd.length} songs have been blacklisted`);
	if (karasToAdd.length > 0) await addDownloads(repo, downloads);
	return karasToAdd.length;
}

function filterTitle(k: DBKara, value: string): boolean {
	return !k.title.includes(value);
}

function filterTagName(k: DBKara, value: string): boolean {
	return !k.tag_names.includes(value);
}

function filterKID(k: DBKara, value: string): boolean {
	return k.kid !== value;
}

function filterSeriesName(k: DBKara, value: string): boolean {
	return !k.serie.includes(value);
}

function filterTagID(k: DBKara, value: string, type: number, tags: Tag[]): boolean {
	// Find tag
	const tag = tags.find(e => e.tid === value);
	if (tag) {
		let typeName = getTagTypeName(type);
		return k[typeName].every((e: Tag) => !e.tid.includes(tag.tid));
	} else {
		// Tag isn't found in database, weird but could happen for some obscure reasons. We'll return true.
		logger.warn(`[Update] Tag ${value} not found in database when trying to blacklist songs to download, will ignore it.`)
		return true;
	}
}

function filterDurationLonger(k: DBKara, value: string) {
	// Remember we want to return only songs that are no longer than value
	return k.duration <= +value;
}

function filterDurationShorter(k: DBKara, value: string) {
	// Remember we want to return only songs that are no shorter than value
	return k.duration >= +value;
}

function filterYearOlder(k: DBKara, value: string) {
	return k.year <= +value;
}

function filterYearYounger(k: DBKara, value: string) {
	return k.year >= +value;
}

export async function cleanAllKaras(repo: string, local?: KaraList, remote?: KaraList) {
	if (!local || !remote) {
		const karas = await getKaraInventory(repo);
		local = karas.local;
		remote = karas.remote;
	}
	const localKIDs = local.content.map(k => k.kid);
	const remoteKIDs = remote.content.map(k => k.kid);
	const karasToRemove = localKIDs.filter(kid => !remoteKIDs.includes(kid));
	// Now we have a list of KIDs to remove
	logger.info(`[Update] Removing ${karasToRemove.length} songs`);
	const promises = [];
	karasToRemove.forEach(kid => promises.push(deleteKara(kid, false)));
	await Promise.all(promises);
	if (karasToRemove.length > 0) {
		compareKarasChecksum(true);
		refreshKaras();
	}
}

export async function updateAllKaras(repo: string, local?: KaraList, remote?: KaraList): Promise<number> {
	if (!local || !remote) {
		const karas = await getKaraInventory(repo);
		local = karas.local;
		remote = karas.remote;
	}
	const karasToUpdate = local.content.filter(k => {
		const rk = remote.content.find(rk => rk.kid === k.kid);
		if (rk && rk.modified_at > k.modified_at) return true;
	}).map(k => k.kid);
	const downloads = remote.content.filter(k => karasToUpdate.includes(k.kid)).map(k => {
		return {
			size: k.mediasize,
			mediafile: k.mediafile,
			subfile: k.subfile,
			karafile: k.karafile,
			seriefiles: k.seriefiles,
			tagfiles: k.tagfiles,
			name: k.karafile.replace('.kara.json','')
		}
	});
	logger.info(`[Update] Updating ${karasToUpdate.length} songs`);
	if (karasToUpdate.length > 0) await addDownloads(repo, downloads);
	return karasToUpdate.length;
}

let updateRunning = false;

async function listRemoteMedias(repo: string): Promise<File[]> {
	logger.info('[Update] Fetching current media list');
	emitWS('downloadProgress', {
		text: 'Listing media files to download',
		value: 0,
		total: 100
	});
	emitWS('downloadBatchProgress', {
		text: 'Updating...',
		value: 3,
		total: 5
	});
	const remote = await getRemoteKaras(repo, {});
	return remote.content.map(k => {
		return {
			basename: k.mediafile,
			size: k.mediasize
		};
	});
}

async function compareMedias(localFiles: File[], remoteFiles: File[], repo: string): Promise<boolean> {
	let removedFiles:string[] = [];
	let addedFiles:File[] = [];
	let updatedFiles:File[] = [];
	const mediasPath = resolvedPathMedias()[0];
	logger.info('[Update] Comparing your medias with the current ones');
	emitWS('downloadProgress', {
		text: 'Comparing your media files with Karaoke Mugen\'s latest files',
		value: 0,
		total: 100
	});
	emitWS('downloadBatchProgress', {
		text: 'Updating...',
		value: 4,
		total: 5
	});
	for (const remoteFile of remoteFiles) {
		const filePresent = localFiles.some(localFile => {
			if (localFile.basename === remoteFile.basename) {
				if (localFile.size !== remoteFile.size) updatedFiles.push(remoteFile);
				return true;
			}
			return false;
		});
		if (!filePresent) addedFiles.push(remoteFile);
	}
	for (const localFile of localFiles) {
		const filePresent = remoteFiles.some(remoteFile => {
			return localFile.basename === remoteFile.basename;
		});
		if (!filePresent) removedFiles.push(localFile.basename);
	}
	// Remove files to update to start over their download
	for (const file of updatedFiles) {
		await asyncUnlink(resolve(mediasPath, file.basename));
	}
	const filesToDownload = addedFiles.concat(updatedFiles);
	if (removedFiles.length > 0) await removeFiles(removedFiles, mediasPath);
	emitWS('downloadProgress', {
		text: 'Comparing your base with Karaoke Mugen\'s latest files',
		value: 100,
		total: 100
	});
	if (filesToDownload.length > 0) {
		filesToDownload.sort((a,b) => {
			return (a.basename > b.basename) ? 1 : ((b.basename > a.basename) ? -1 : 0);
		});
		let bytesToDownload = 0;
		for (const file of filesToDownload) {
			bytesToDownload = bytesToDownload + file.size;
		}
		logger.info(`[Update] Downloading ${filesToDownload.length} new/updated medias (size : ${prettyBytes(bytesToDownload)})`);
		await downloadMedias(filesToDownload, mediasPath, repo);
		logger.info('[Update] Done updating medias');
		return true;
	} else {
		logger.info('[Update] No new medias to download');
		return false;
	}
}

function downloadMedias(files: File[], mediasPath: string, repo: string): Promise<void> {
	let list = [];
	for (const file of files) {
		list.push({
			filename: resolve(mediasPath, file.basename),
			url: `https://${repo}/downloads/medias/${encodeURIComponent(file.basename)}`,
			size: file.size
		});
	}
	const mediaDownloads = new Downloader(list, {
		bar: true
	});
	return new Promise((resolve: any, reject: any) => {
		mediaDownloads.download(fileErrors => {
			if (fileErrors.length > 0) {
				reject(`Error downloading these medias : ${fileErrors.toString()}`);
			} else {
				resolve();
			}
		});
	});
}

async function listLocalMedias(): Promise<File[]> {
	const mediaFiles = await asyncReadDir(resolvedPathMedias()[0]);
	let localMedias = [];
	for (const file of mediaFiles) {
		const mediaStats = await asyncStat(resolve(resolvedPathMedias()[0], file));
		localMedias.push({
			basename: file,
			size: mediaStats.size
		});
	}
	logger.debug('[Update] Listed local media files');
	return localMedias;
}

async function removeFiles(files: string[], dir: string): Promise<void> {
	for (const file of files) {
		await asyncUnlink(resolve(dir, file));
		logger.info(`[Update] Removed : ${file}`);
	}
}

export async function updateMedias(repo: string): Promise<boolean> {
	if (updateRunning) throw 'An update is already running, please wait for it to finish.';
	updateRunning = true;
	try {
		const [remoteMedias, localMedias] = await Promise.all([
			listRemoteMedias(repo),
			listLocalMedias()
		]);
		const updateVideos = await compareMedias(localMedias, remoteMedias, repo);

		updateRunning = false;
		emitWS('downloadProgress', {
			text: 'Done',
			value: 100,
			total: 100
		});
		emitWS('downloadBatchProgress', {
			text: 'Update done!',
			value: 100,
			total: 100
		});
		return !!updateVideos;
	} catch (err) {
		emitWS('downloadProgress', {
			text: 'Done',
			value: 100,
			total: 100
		});
		emitWS('downloadBatchProgress', {
			text: 'Update failed!',
			value: 100,
			total: 100
		});
		updateRunning = false;
		throw err;
	}
}
