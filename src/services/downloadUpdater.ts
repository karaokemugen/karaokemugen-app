import internet from 'internet-available';
import merge from 'lodash.merge';
import sampleSize from 'lodash.samplesize';
import { dirname,resolve } from 'path';
import prettyBytes from 'pretty-bytes';

import { compareKarasChecksum } from '../dao/database';
import { emptyDownload } from '../dao/download';
import { refreshAll } from '../lib/dao/database';
import { extractAssInfos } from '../lib/dao/karafile';
import { APIMessage } from '../lib/services/frontend';
import { DBKara } from '../lib/types/database/kara';
import { DBTag } from '../lib/types/database/tag';
import { CompareParam, KaraList, KaraParams } from '../lib/types/kara';
import { repoStats } from '../lib/types/repo';
import { Tag, TagList, TagParams } from '../lib/types/tag';
import { getConfig, resolvedPathRepos } from '../lib/utils/config';
import { getTagTypeName } from '../lib/utils/constants';
import { asyncReadDir, asyncStat, asyncUnlink, resolveFileInDirs } from '../lib/utils/files';
import HTTP from '../lib/utils/http';
import logger, { profile } from '../lib/utils/logger';
import { once } from '../lib/utils/pubsub';
import Task from '../lib/utils/taskManager';
import { emitWS } from '../lib/utils/ws';
import { File, KaraDownloadRequest } from '../types/download';
import { testDownloads } from '../utils/constants';
import Downloader from '../utils/downloader';
import sentry from '../utils/sentry';
import { addDownloads, downloadFiles, getDownloadQueue, initDownloadQueue } from './download';
import { getDownloadBLC } from './downloadBLC';
import { getAllKaras, getKaras } from './kara';
import { deleteKara } from './karaManagement';
import { getTags, integrateTagFile } from './tag';

export async function getAllRemoteKaras(repository: string, params: KaraParams, compare?: CompareParam): Promise<KaraList> {
	if (repository) {
		return getRemoteKaras(repository, params, compare);
	} else {
		const repos = getConfig().System.Repositories.filter(r => r.Online && r.Enabled);
		const tasks = [];
		let totalMediaSize = 0;
		for (const repo of repos) {
			tasks.push(getRemoteKaras(repo.Name, params, compare));
			const {mediasize} = await getRemoteStats(repo.Name);
			totalMediaSize = totalMediaSize + +mediasize;
		}
		const allKaras: KaraList[] = await Promise.all(tasks);
		// Let's concatenate our stuff here
		const everything: KaraList = {
			content: [],
			infos: {
				count: 0,
				from: 0,
				to: 0
			}
		};
		allKaras.forEach(l => merge(everything, l));
		// To get total count we're going to remove all duplicated by repo to keep only one song from each repo.
		// Each song has a count property which gives us th enumber of songs for that query, so by adding them we get our total maximum count.
		everything.infos.count = 0;
		const everythingUnique = everything.content.filter((k: DBKara, i, self) => self.findIndex((k2:DBKara) => k2.repository === k.repository) === i);
		everythingUnique.forEach(k => everything.infos.count = +everything.infos.count + +k.count);
		everything.infos.to = +params.from + +params.size;
		everything.infos.totalMediaSize = totalMediaSize;
		return everything;
	}
}

async function getRemoteStats(repo: string): Promise<repoStats> {
	const res = await HTTP(`https://${repo}/api/karas/stats`, {
		responseType: 'json'
	});
	return res.body as repoStats;
}

async function getRemoteMedias(repo: string): Promise<DBKara[]> {
	const res = await HTTP.get(`https://${repo}/api/karas/medias`);
	return JSON.parse(res.body);
}

export async function getRemoteKaras(repo: string, params: KaraParams, compare?: CompareParam): Promise<KaraList> {
	//First get all karas we currently own
	const localKIDs = {};
	const query = params.q
		? `r=${repo}!${params.q}`
		: `r=${repo}`;
	if (compare === 'missing' || compare === 'updated') {
		const karas = await getKaras({
			filter: params.filter,
			token: {username: 'admin', role: 'admin'},
			q: query
		});
		karas.content.forEach(k => localKIDs[k.kid] = k.modified_at);
	}
	try {
		const res = await HTTP.post(`https://${repo}/api/karas/search`, {
			json: {
				filter: params.filter,
				size: params.size,
				from: params.from,
				q: params.q || '',
				localKaras: compare ? localKIDs : null,
				compare: compare
			}
		});
		return JSON.parse(res.body);
	} catch(err) {
		logger.warn(`Unable to fetch karas from repository ${repo}`, {service: 'Download', obj: err});
		logger.warn(`Repository ${repo} ignored`, {service: 'Download'});
		return {
			content: [],
			i18n: {},
			infos: {
				count: 0,
				from: 0,
				to: 0
			}
		};
	}
}

export async function getAllRemoteTags(repository: string, params: TagParams): Promise<TagList> {
	if (repository) {
		return getRemoteTags(repository, params);
	} else {
		const repos = getConfig().System.Repositories.filter(r => r.Online && r.Enabled);
		const tasks = [];
		repos.forEach(repo => tasks.push(getRemoteTags(repo.Name, params)));
		const allTags: TagList[] = await Promise.all(tasks);
		const everything: TagList = {
			content: [],
			infos: {
				count: 0,
				from: 0,
				to: 0
			}
		};
		allTags.forEach(l => {
			everything.content = everything.content.concat(l.content.filter(tag => tag.karacount && Object.keys(tag.karacount).length > 0));
		});
		// To get total count we're going to remove all duplicated by repo to keep only one tag from each repo.
		// Each tag has a count property which gives us the number of tags for that query, so by adding them we get our total maximum count.
		everything.infos.count = 0;
		const everythingUnique = everything.content.filter((t: DBTag, i, self) => self.findIndex((t2:DBTag) => t2.name === t.name) === i);
		everything.content = everythingUnique;
		everything.infos.count = everything.infos.to = everything.content.length;
		return everything;
	}
}

export async function getRemoteTags(repo: string, params: TagParams = {}): Promise<TagList> {
	const res = await HTTP(`https://${repo}/api/karas/tags${params.type ? '/' + params.type : '' }`);
	return JSON.parse(res.body);
}

export async function updateAllBases() {
	const reposTagsUpdated = {};
	for (const repo of getConfig().System.Repositories.filter(r => r.Online && r.Enabled)) {
		try {
			logger.info(`Updating base from repository ${repo.Name}`, {service: 'Update'});
			reposTagsUpdated[repo.Name] = await updateBase(repo.Name);
		} catch(err) {
			logger.warn(`Repository ${repo.Name} failed to update properly`, {service: 'Update', obj: err});
			emitWS('error', APIMessage('BASES_SYNC_ERROR', {repo: repo.Name, err: err.msg ? err.msg : err}));
		}
	}
	// If one repo updated tags, we need to refresh everything.
	if (Object.values(reposTagsUpdated).find(e => e)) await refreshAll();
}

export async function updateBase(repo: string) {
	// First, make sure we wipe the download queue before updating.
	if (!getDownloadQueue()) initDownloadQueue();
	await emptyDownload();
	logger.info('Computing songs to add/remove/update...', {service: 'Update'});
	try {
		logger.info('Getting local and remote song inventory', {service: 'Update'});
		const karas = await getKaraInventory(repo);
		logger.info('Removing songs...', {service: 'Update'});
		await cleanKaras(repo, karas.local, karas.remote).catch(() => {
			logger.warn('Cleaning karas failed, going on anyway', {service: 'Update'});
		});
		logger.info('Adding updated/new songs...', {service: 'Update'});
		const [updatedSongs, newSongs] = await Promise.all([
			updateKaras(repo, karas.local, karas.remote),
			downloadKaras(repo, karas.local, karas.remote)
		]);
		if (updatedSongs.length > 0) await addDownloads(updatedSongs);
		if (newSongs.length > 0) await addDownloads(newSongs);
		if (updatedSongs.length > 0 || newSongs.length > 0) {
			await waitForUpdateQueueToFinish();
		}
		// Now checking tags and series if we're missing any
		logger.info('Getting local and remote tags inventory', {service: 'Update'});
		const tags = await getTagsInventory(repo);
		const updatedTags = await updateTags(repo, tags.local, tags.remote);
		return updatedTags > 0;
	} catch(err) {
		logger.error('Base update failed', {service: 'Update', obj: err});
		throw err;
	}
}

function waitForUpdateQueueToFinish() {
	return new Promise<void>(resolve => {
		once('downloadQueueDrained', () => {
			resolve();
		});
	});
}

async function getTagsInventory(repo: string) {
	const [local, remote] = await Promise.all([
		getTags({}),
		getRemoteTags(repo)
	]);
	local.content = local.content.filter(t => t.repository === repo);
	return {
		local,
		remote
	};
}

async function getKaraInventory(repo: string) {
	const [local, remote] = await Promise.all([
		getAllKaras(),
		getRemoteKaras(repo, {})
	]);
	local.content = local.content.filter(k => k.repository === repo);
	return {
		local,
		remote
	};
}

export async function downloadAllKaras() {
	for (const repo of getConfig().System.Repositories.filter(r => r.Online && r.Enabled)) {
		try {
			logger.info(`Downloading all songs from repository ${repo.Name}`, {service: 'Update'});
			const downloads = await downloadKaras(repo.Name);
			if (downloads.length > 0) await addDownloads(downloads);
		} catch(err) {
			logger.warn(`Repository ${repo.Name} failed to download all songs properly`, {service: 'Update', obj: err});
			emitWS('error', APIMessage('DOWNLOAD_SONGS_ERROR', {repo: repo.Name, err: err}));
		}
	}
}

export async function downloadKaras(repo: string, local?: KaraList, remote?: KaraList): Promise<KaraDownloadRequest[]> {
	const task = new Task({
		text: 'DOWNLOADING_REPO',
		subtext: repo
	});
	try {
		if (!local || !remote) {
			const karas = await getKaraInventory(repo);
			local = karas.local;
			remote = karas.remote;
		}
		const localKIDs = local.content.map(k => k.kid);
		let karasToAdd = remote.content.filter(k => !localKIDs.includes(k.kid));
		const initialKarasToAddCount = karasToAdd.length;
		// Among those karaokes, we need to establish which ones we'll filter out via the download blacklist criteria
		logger.info('Applying blacklist (if present)', {service: 'Update'});

		const [blcs, tags] = await Promise.all([
			getDownloadBLC(),
			getTags({})
		]);
		for (const blc of blcs) {
			let filterFunction: any = null;
			if (blc.type === 0) filterFunction = filterTagName;
			if (blc.type >= 1 && blc.type < 1000) filterFunction = filterTagID;
			if (blc.type === 1001) filterFunction = filterKID;
			if (blc.type === 1002) filterFunction = filterDurationLonger;
			if (blc.type === 1003) filterFunction = filterDurationShorter;
			if (blc.type === 1004) filterFunction = filterTitle;
			if (blc.type === 1005) filterFunction = filterYearOlder;
			if (blc.type === 1006) filterFunction = filterYearYounger;
			if (!filterFunction) {
				logger.error(`Unknown BLC type : ${JSON.stringify(blc)}`, {service: 'DownloadBLC'});
				sentry.addErrorInfo('BLC', JSON.stringify(blc));
				sentry.addErrorInfo('allBLCs', JSON.stringify(blcs));
				const err = new Error(`Unknown BLC type ${JSON.stringify(blc)}`);
				sentry.error(err, 'Warning');
				continue;
			}
			karasToAdd = karasToAdd.filter(k => filterFunction(k, blc.value, blc.type, tags.content));
		}
		const downloads = karasToAdd.map(k => {
			return {
				size: k.mediasize,
				mediafile: k.mediafile,
				kid: k.kid,
				name: k.karafile.replace('.kara.json',''),
				repository: repo
			};
		});
		logger.info(`Adding ${karasToAdd.length} new songs.`, {service: 'Update'});
		if (initialKarasToAddCount !== karasToAdd.length) logger.info(`${initialKarasToAddCount - karasToAdd.length} songs have been blacklisted`, {service: 'Update'});
		return downloads;
	} catch(err) {
		sentry.error(err);
		throw err;
	} finally {
		task.end();
	}
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

function filterTagID(k: DBKara, value: string, type: number, tags: Tag[]): boolean {
	// Find tag
	const tag = tags.find(e => e.tid === value);
	if (tag) {
		const typeName = getTagTypeName(type);
		return k[typeName].every((e: Tag) => !e.tid.includes(tag.tid));
	} else {
		// Tag isn't found in database, weird but could happen for some obscure reasons. We'll return true.
		logger.warn(`Tag ${value} not found in database when trying to blacklist songs to download, will ignore it.`, {service: 'Update'});
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

export async function cleanAllKaras() {
	for (const repo of getConfig().System.Repositories.filter(r => r.Online && r.Enabled)) {
		try {
			logger.info(`Cleaning songs not in repository ${repo.Name} anymore`, {service: 'Update'});
			await cleanKaras(repo.Name);
		} catch(err) {
			logger.warn(`Repository ${repo.Name} failed to clean songs properly`, {service: 'Update', obj: err});
			emitWS('error', APIMessage('CLEAN_SONGS_ERROR', {repo: repo.Name, err: err}));
		}
	}
}

export async function cleanKaras(repo: string, local?: KaraList, remote?: KaraList) {
	const task = new Task({
		text: 'CLEANING_REPO',
		subtext: repo
	});
	try {
		if (!local || !remote) {
			const karas = await getKaraInventory(repo);
			local = karas.local;
			remote = karas.remote;
		}
		//Return early if repository is not reachable / does return no songs
		if (remote.content.length === 0) {
			logger.warn(`Repository ${repo} likely unreachable or not returning any song. Ignoring its cleanup`, {service: 'Download'});
			return;
		}
		const localKIDs = local.content.map(k => k.kid);
		const remoteKIDs = remote.content.map(k => k.kid);
		const karasToRemove = localKIDs.filter(kid => !remoteKIDs.includes(kid));
		// Now we have a list of KIDs to remove
		logger.info(`Removing ${karasToRemove.length} songs`, {service: 'Update'});
		const promises = [];
		promises.push(deleteKara(karasToRemove, false));
		await Promise.all(promises);
		if (karasToRemove.length > 0) {
			compareKarasChecksum();
			refreshAll();
		}
	} catch(err) {
		sentry.error(err);
		throw err;
	} finally {
		task.end();
	}
}

export async function updateAllKaras() {
	for (const repo of getConfig().System.Repositories.filter(r => r.Online && r.Enabled)) {
		try {
			logger.info(`Updating all songs from repository ${repo.Name}`, {service: 'Update'});
			const downloads = await updateKaras(repo.Name);
			if (downloads.length > 0) {
				await addDownloads(downloads);
				await waitForUpdateQueueToFinish();
			}
			// Now checking tags and series if we're missing any
			const tags = await getTagsInventory(repo.Name);
			const updatedTags = await updateTags(repo.Name, tags.local, tags.remote);
			if (updatedTags > 0) await refreshAll();
		} catch(err) {
			logger.warn(`Repository ${repo.Name} failed to update songs properly`, {service: 'Update', obj: err});
			emitWS('error', APIMessage('SONGS_UPDATE_ERROR', {repo: repo.Name, err: err}));
		}
	}
}

async function updateTags(repo: string, local: TagList, remote: TagList) {
	logger.info('Starting tag update process...', {service: 'Update'});
	const task = new Task({
		text: 'UPDATING_REPO',
		subtext: repo
	});
	try {
		profile('tagUpdate');
		const tagsToUpdate = [];
		for (const t of local.content) {
			const rt = remote.content.find(rt => rt.tid === t.tid);
			if (!rt) continue;
			// When grabbed from the remote API we get a string, while the local API returns a date object. So, well... sorrymasen.
			if (rt?.modified_at as unknown > t.modified_at.toISOString()) {
				tagsToUpdate.push({tag: rt, oldFile: t.tagfile});
				continue;
			}
		}

		logger.info(`Updating ${tagsToUpdate.length} tags`, {service: 'Update'});
		if (tagsToUpdate.length > 0) {
			const list = [];
			const newTagFiles = [];
			for (const t of tagsToUpdate) {
				try {
					const oldFiles = await resolveFileInDirs(t.oldFile, resolvedPathRepos('Tags', repo));
					const oldPath = dirname(oldFiles[0]);
					const newTagFile = resolve(oldPath, t.tag.tagfile);
					newTagFiles.push(newTagFile);
					list.push({
						filename: newTagFile,
						url: `https://${repo}/downloads/tags/${encodeURIComponent(t.tag.tagfile)}`
					});
				} catch(err) {
					logger.error(`Could not find old tag file ${t.oldFile} in ${repo} repository. Discarding update for now.`);
					continue;
				}
			}
			await downloadFiles(null, list, task);
			for (const f of newTagFiles) {
				await integrateTagFile(f);
			}
		}
		return tagsToUpdate.length;
	} catch(err) {
		sentry.error(err);
		throw err;
	} finally {
		profile('tagUpdate');
		task.end();
	}
}

export async function updateKaras(repo: string, local?: KaraList, remote?: KaraList): Promise<KaraDownloadRequest[]> {
	logger.info('Starting kara update process...', {service: 'Update'});
	const task = new Task({
		text: 'UPDATING_REPO',
		subtext: repo
	});
	try {
		if (!local || !remote) {
			const karas = await getKaraInventory(repo);
			local = karas.local;
			remote = karas.remote;
		}
		profile('karasUpdate');
		const karasToUpdate = [];
		for (const k of local.content) {
			const rk = remote.content.find(rk => rk.kid === k.kid);
			if (!rk) continue;
			// When grabbed from the remote API we get a string, while the local API returns a date object. So, well... sorrymasen.
			if (rk?.modified_at as unknown > k.modified_at.toISOString()) {
				karasToUpdate.push(k.kid);
				continue;
			}
			// We also check the case where there has been a mismatch between local and remote on media or lyrics.
			let localMedia: string;
			try {
				localMedia = (await resolveFileInDirs(k.mediafile, resolvedPathRepos('Medias', repo)))[0];
				const localMediaStats = await asyncStat(localMedia);
				if (localMediaStats.size !== rk.mediasize) {
					karasToUpdate.push(k.kid);
					continue;
				}
			} catch(err) {
				//No local media found, redownloading the song
				karasToUpdate.push(k.kid);
				continue;
			}
			// Now checking for lyrics
			if (rk.subfile) {
				let localLyrics: string;
				// Subchecksum can be non existant if song was a hardsub
				if (!k.subchecksum) {
					try {
						localLyrics = (await resolveFileInDirs(k.subfile, resolvedPathRepos('Lyrics', repo)))[0];
						k.subchecksum = await extractAssInfos(localLyrics);
					} catch(err) {
						//No local lyrics found, redownloading the song
						karasToUpdate.push(k.kid);
						continue;
					}
				}
				if (rk.subchecksum !== k.subchecksum) {
					karasToUpdate.push(k.kid);
					continue;
				}
			}
		}
		profile('karasUpdate');
		const downloads = remote.content.filter(k => karasToUpdate.includes(k.kid)).map(k => {
			return {
				size: k.mediasize,
				mediafile: k.mediafile,
				kid: k.kid,
				name: k.karafile.replace('.kara.json',''),
				repository: k.repository
			};
		});
		logger.info(`Updating ${karasToUpdate.length} songs`, {service: 'Update'});
		return downloads;
	} catch(err) {
		sentry.error(err);
		throw err;
	} finally {
		task.end();
	}
}

let updateRunning = false;

async function listRemoteMedias(repo: string): Promise<File[]> {
	logger.info('Fetching current media list', {service: 'Update'});
	profile('listRemoteMedias');
	const remote = await getRemoteMedias(repo);
	profile('listRemoteMedias');
	return remote.map(m => {
		return {
			basename: m.mediafile,
			size: m.mediasize
		};
	});
}

async function compareMedias(localFiles: File[], remoteFiles: File[], repo: string): Promise<boolean> {
	const removedFiles:string[] = [];
	const addedFiles:File[] = [];
	const updatedFiles:File[] = [];
	const mediasPath = resolvedPathRepos('Medias', repo)[0];
	logger.info('Comparing your medias with the current ones', {service: 'Update'});
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
	if (filesToDownload.length > 0) {
		filesToDownload.sort((a,b) => {
			return (a.basename > b.basename) ? 1 : ((b.basename > a.basename) ? -1 : 0);
		});
		let bytesToDownload = 0;
		for (const file of filesToDownload) {
			bytesToDownload = bytesToDownload + file.size;
		}
		logger.info(`Downloading ${filesToDownload.length} new/updated medias (size : ${prettyBytes(bytesToDownload)})`, {service: 'Update'});
		await downloadMedias(filesToDownload, mediasPath, repo);
		logger.info('Done updating medias', {service: 'Update'});
		return true;
	} else {
		logger.info('No new medias to download', {service: 'Update'});
		return false;
	}
}

async function downloadMedias(files: File[], mediasPath: string, repo: string): Promise<void> {
	const list = [];
	for (const file of files) {
		list.push({
			filename: resolve(mediasPath, file.basename),
			url: `https://${repo}/downloads/medias/${encodeURIComponent(file.basename)}`,
			size: file.size
		});
	}
	const downloadTask = new Task({
		text: 'DOWNLOADING_MEDIAS',
		value: 0,
		total: files.length
	});
	const mediaDownloads = new Downloader({
		task: downloadTask
	});
	const fileErrors = await mediaDownloads.download(list);
	downloadTask.end();
	if (fileErrors.length > 0) {
		throw (`Error downloading these medias : ${fileErrors.toString()}`);
	}
}

async function listLocalMedias(repo: string): Promise<File[]> {
	profile('listLocalMedias');
	const mediaFiles = await asyncReadDir(resolvedPathRepos('Medias', repo)[0]);
	const localMedias = [];
	for (const file of mediaFiles) {
		try {
			const mediaPath = await resolveFileInDirs(file, resolvedPathRepos('Medias', repo));
			const mediaStats = await asyncStat(mediaPath[0]);
			localMedias.push({
				basename: file,
				size: mediaStats.size
			});
		} catch {
			logger.info(`Local media file ${file} not found`, {service: 'Update'});
		}
	}
	logger.debug('Listed local media files', {service: 'Update'});
	profile('listLocalMedias');
	return localMedias;
}

async function removeFiles(files: string[], dir: string): Promise<void> {
	for (const file of files) {
		await asyncUnlink(resolve(dir, file));
		logger.info('Removed', {service: 'Update', obj: file});
	}
}

export async function updateAllMedias() {
	for (const repo of getConfig().System.Repositories.filter(r => r.Online && r.Enabled)) {
		try {
			logger.info(`Updating medias from repository ${repo.Name}`, {service: 'Update'});
			await updateMedias(repo.Name);
		} catch(err) {
			logger.warn(`Repository ${repo.Name} failed to update medias properly`, {service: 'Update', obj: err});
			emitWS('error', APIMessage('UPDATING_MEDIAS_ERROR', {repo: repo.Name, err: err}));
		}
	}
}

export async function updateMedias(repo: string): Promise<boolean> {
	if (updateRunning) throw 'An update is already running, please wait for it to finish.';
	updateRunning = true;
	const task = new Task({
		text: 'UPDATING_MEDIAS',
		subtext: repo
	});
	try {
		const [remoteMedias, localMedias] = await Promise.all([
			listRemoteMedias(repo),
			listLocalMedias(repo)
		]);
		const updateVideos = await compareMedias(localMedias, remoteMedias, repo);

		updateRunning = false;
		return !!updateVideos;
	} catch (err) {
		updateRunning = false;
		throw err;
	} finally {
		task.end();
	}
}

/** Download random songs from online repository */
export async function downloadRandomSongs() {
	try {
		await internet();
	} catch(err) {
		logger.warn('Internet not available : no sample songs are going to be downloaded', {service: 'Samples'});
		return;
	}
	const conf = getConfig();
	const onlineRepos = conf.System.Repositories.filter(r => r.Online && r.Enabled);
	try {
		if (!onlineRepos[0]) throw 'Unable to download samples, no repository online and enabled available';
		logger.info('Downloading samples...', {service: 'Samples'});
		const karas = await getRemoteKaras(onlineRepos[0].Name, {});
		// Downloading samples here, 3 japanese, 1 french, 1 english, 1 italian.
		const samples = [
			sampleSize(karas.content.filter(k => filterSamples(k, 'jpn')), 3),
			sampleSize(karas.content.filter(k => filterSamples(k, 'fre')), 1),
			sampleSize(karas.content.filter(k => filterSamples(k, 'eng')), 1),
			sampleSize(karas.content.filter(k => filterSamples(k, 'ita')), 1)
		];
		const downloads = samples.flat();
		await addDownloads(downloads.map((s: DBKara) => {
			return {
				mediafile: s.mediafile,
				kid: s.kid,
				name: s.karafile,
				size: s.mediasize,
				repository: s.repository
			};
		}));
	} catch(err) {
		logger.error('Unable to download samples', {service: 'Samples', obj: err});
	}
}

/** Only used for tests : downloads 6 specific test songs */
export async function downloadTestSongs() {
	await addDownloads(testDownloads);
}

/* Filter rules for samples so we don't download giant songs */
function filterSamples(k: DBKara, lang: string): boolean {
	const maxDuration = 91;
	const maxSize = 50000000;
	const minSize = 20000000;
	return k.langs.some(t => t.name === lang) &&
		k.duration < maxDuration &&
		k.mediasize > minSize &&
		k.mediasize < maxSize;
}

/** Migration from 3.x to 4.x -- safely delete this in a few versions */
export async function redownloadSongs() {
	const karas = await getAllKaras();
	const downloads = karas.content.map(k => {
		return {
			kid: k.kid,
			mediafile: k.mediafile,
			size: k.mediasize,
			repository: k.repository,
			name: k.karafile.replace('.kara.json', '')
		};
	});
	await addDownloads(downloads);
}
