import { basename, resolve } from 'path';
import { profile } from 'winston';

import { addKaraToStore, editKaraInStore, getStoreChecksum, removeKaraInStore, sortKaraStore } from '../dao/dataStore';
import { addKara, deleteKara as deleteKaraDB, getKaraMini, updateKara } from '../dao/kara';
import { getPlaylistKaraIDs } from '../dao/playlist';
import { updateKaraTags } from '../dao/tag';
import { databaseReady, saveSetting } from '../lib/dao/database';
import { refreshKaras, refreshYears } from '../lib/dao/kara';
import { getDataFromKaraFile, parseKara } from '../lib/dao/karafile';
import {refreshAllKaraTags,refreshKaraTags, refreshTags} from '../lib/dao/tag';
import { writeTagFile } from '../lib/dao/tagfile';
import { Kara, KaraTag } from '../lib/types/kara';
import { getConfig, resolvedPathRepos } from '../lib/utils/config';
import { getTagTypeName, tagTypes } from '../lib/utils/constants';
import { asyncCopy, asyncUnlink, resolveFileInDirs } from '../lib/utils/files';
import logger from '../lib/utils/logger';
import { createImagePreviews } from '../lib/utils/previews';
import Task from '../lib/utils/taskManager';
import { emitWS } from '../lib/utils/ws';
import sentry from '../utils/sentry';
import { getState } from '../utils/state';
import {getKara, getKaras} from './kara';
import { editKara } from './kara_creation';
import { getRepo, getRepos } from './repo';
import { getTag } from './tag';

export async function updateTags(kara: Kara) {
	const tagsAndTypes = [];
	for (const type of Object.keys(tagTypes)) {
		if (kara[type]) for (const tag of kara[type]) {
			// We can have either a name or a number for type
			tagsAndTypes.push({tid: tag.tid, type: tagTypes[type] || type});
		}
	}
	await updateKaraTags(kara.kid, tagsAndTypes);
}

export async function createKaraInDB(kara: Kara, opts = {refresh: true}) {
	await addKara(kara);
	emitWS('statsRefresh');
	await updateTags(kara);
	if (opts.refresh) await refreshKarasAfterDBChange(true);
}

export async function editKaraInDB(kara: Kara, opts = {
	refresh: true
}) {
	const promises = [updateKara(kara)];
	if (kara.newTags) promises.push(updateTags(kara));
	await Promise.all(promises);
	if (opts.refresh) await refreshKarasAfterDBChange(kara.newTags);
}

export async function deleteKara(kid: string, refresh = true) {
	const kara = await getKaraMini(kid);
	if (!kara) throw {code: 404, msg: `Unknown kara ID ${kid}`};
	// Remove files
	await deleteKaraDB(kid);
	emitWS('statsRefresh');
	try {
		await asyncUnlink((await resolveFileInDirs(kara.mediafile, resolvedPathRepos('Medias', kara.repository)))[0]);
	} catch(err) {
		logger.warn(`Non fatal : Removing mediafile ${kara.mediafile} failed`, {service: 'Kara', obj: err});
	}
	try {
		await asyncUnlink((await resolveFileInDirs(kara.karafile, resolvedPathRepos('Karas', kara.repository)))[0]);
	} catch(err) {
		logger.warn(`Non fatal : Removing karafile ${kara.karafile} failed`, {service: 'Kara', obj: err});
	}
	if (kara.subfile) try {
		await asyncUnlink((await resolveFileInDirs(kara.subfile, resolvedPathRepos('Lyrics', kara.repository)))[0]);
	} catch(err) {
		logger.warn(`Non fatal : Removing subfile ${kara.subfile} failed`, {service: 'Kara', obj: err});
	}

	removeKaraInStore(kara.kid);
	saveSetting('baseChecksum', getStoreChecksum());
	// Remove kara from database
	logger.info(`Song ${kara.karafile} removed`, {service: 'Kara'});

	if (refresh) {
		await refreshKaras();
		refreshTags();
		refreshAllKaraTags();
	}
}


export async function copyKaraToRepo(kid: string, repoName: string) {
	try {
		const kara = await getKara(kid, {role: 'admin', username: 'admin'});
		if (!kara) throw {code: 404};
		const repo = getRepo(repoName);
		if (!repo) throw {code: 404};
		const oldRepoName = kara.repository;
		kara.repository = repoName;
		const tasks = [];
		const karaFiles = await resolveFileInDirs(kara.karafile, resolvedPathRepos('Karas', oldRepoName));
		// Determine repository indexes so we know if we should edit our current database to change the kara's repository inside
		// Repositories are ordered by priority so if destination repo is lower, we don't edit the song in database.
		const repos = getRepos();
		const oldRepoIndex = repos.findIndex(r => r.Name === oldRepoName);
		const newRepoIndex = repos.findIndex(r => r.Name === repoName);
		if (newRepoIndex < oldRepoIndex) tasks.push(editKara(kara));
		tasks.push(asyncCopy(
			karaFiles[0],
			resolve(resolvedPathRepos('Karas', repoName)[0], kara.karafile),
			{ overwrite: true }
		));
		const mediaFiles = await resolveFileInDirs(kara.mediafile, resolvedPathRepos('Medias', oldRepoName));
		tasks.push(asyncCopy(
			mediaFiles[0],
			resolve(resolvedPathRepos('Medias', repoName)[0], kara.mediafile),
			{ overwrite: true }
		));
		const lyricsFiles = await resolveFileInDirs(kara.subfile, resolvedPathRepos('Lyrics', oldRepoName));
		tasks.push(asyncCopy(
			lyricsFiles[0],
			resolve(resolvedPathRepos('Lyrics', repoName)[0], kara.subfile),
			{ overwrite: true }
		));
		for (const tid of kara.tid) {
			const tag = await getTag(tid.split('~')[0]);
			// Modify tag file we just copied to change its repo
			tag.repository = repoName;
			tag.modified_at = new Date().toISOString();
			tasks.push(writeTagFile(tag, resolvedPathRepos('Tags', repoName)[0]));
		}
		await Promise.all(tasks);
	} catch(err) {
		if (err?.code === 404) throw err;
		sentry.error(err);
		throw err;
	}
}

export async function batchEditKaras(playlist_id: number, action: 'add' | 'remove', tid: string, type: number) {
	// Checks
	const task = new Task({
		text: 'EDITING_KARAS_BATCH_TAGS',
	});
	try {
		type = +type;
		const tagType = getTagTypeName(type);
		if (!tagType) throw 'Type unknown';
		const pl = await getPlaylistKaraIDs(playlist_id);
		if (pl.length === 0) throw 'Playlist unknown or empty';
		task.update({
			value: 0,
			total: pl.length
		});
		if (action !== 'add' && action !== 'remove') throw 'Unkown action';
		const tag = await getTag(tid);
		if (!tag) throw 'Unknown tag';
		logger.info(`Batch tag edit starting : adding ${tid} in type ${type} for all songs in playlist ${playlist_id}`, {service: 'Kara'});
		for (const plc of pl) {
			const kara = await getKara(plc.kid, {username: 'admin', role: 'admin'});
			if (!kara) {
				logger.warn(`Batch tag edit : kara ${plc.kid} unknown. Ignoring.`, {service: 'Kara'});
				continue;
			}
			task.update({
				subtext: kara.karafile
			});
			let modified = false;
			if (kara[tagType].length > 0 && action === 'remove') {
				if (kara[tagType].find((t: KaraTag) => t.tid === tid)) modified = true;
				kara[tagType] = kara[tagType].filter((t: KaraTag) => t.tid !== tid);
			}
			if (action === 'add' && !kara[tagType].find((t: KaraTag) => t.tid === tid)) {
				modified = true;
				kara[tagType].push(tag);
			}
			if (modified) {
				await editKara(kara, false);
			} else {
				logger.info(`Batch edit tag : skipping ${kara.karafile} since no actions taken`, {service: 'Kara'});
			}
			task.incr();
		}
		refreshKaraTags();
		refreshKaras();
		await databaseReady();
		logger.info('Batch tag edit finished', {service: 'Kara'});
	} catch(err) {
		logger.info('Batch tag edit failed', {service: 'Kara', obj: err});
	} finally {
		task.end();
	}
}

export async function refreshKarasAfterDBChange(newTags: boolean) {
	profile('RefreshAfterDBChange');
	logger.debug('Refreshing DB after kara change', {service: 'DB'});
	if (newTags) {
		await refreshKaraTags();
		await refreshTags();
	}
	await refreshKaras();
	await refreshYears();
	logger.debug('Done refreshing DB after kara change', {service: 'DB'});
	profile('RefreshAfterDBChange');
}

export async function integrateKaraFile(file: string) {
	const karaFileData = await parseKara(file);
	const karaFile = basename(file);
	const karaData = await getDataFromKaraFile(karaFile, karaFileData);
	const karaDB = await getKara(karaData.kid, {role: 'admin', username: 'admin'});
	if (karaDB) {
		await editKaraInDB(karaData, { refresh: false });
		try {
			const oldKaraFile = (await resolveFileInDirs(karaDB.karafile, resolvedPathRepos('Karas', karaDB.repository)))[0];
			if (karaDB.karafile !== karaData.karafile) {
				await asyncUnlink(oldKaraFile);
				removeKaraInStore(oldKaraFile);
				addKaraToStore(file);
			} else {
				editKaraInStore(oldKaraFile);
			}
		} catch(err) {
			logger.warn(`Failed to remove ${karaDB.karafile}, does it still exist?`, {service: 'Kara'});
		}
		if (karaDB.mediafile !== karaData.mediafile) try {
			await asyncUnlink((await resolveFileInDirs(karaDB.mediafile, resolvedPathRepos('Medias', karaDB.repository)))[0]);
		} catch(err) {
			logger.warn(`Failed to remove ${karaDB.mediafile}, does it still exist?`, {service: 'Kara'});
		}
		if (karaDB.subfile && karaDB.subfile !== karaData.subfile) try {
			await asyncUnlink((await resolveFileInDirs(karaDB.subfile, resolvedPathRepos('Lyrics', karaDB.repository)))[0]);
		} catch(err) {
			logger.warn(`Failed to remove ${karaDB.subfile}, does it still exist?`, {service: 'Kara'});
		}
		sortKaraStore();
	} else {
		await createKaraInDB(karaData, { refresh: false });
	}
	// Do not create image previews if running this from the command line.
	if (!getState().opt.generateDB && getConfig().Frontend.GeneratePreviews) createImagePreviews(await getKaras({mode: 'kid', modeValue: karaData.kid, token: {username: 'admin', role: 'admin'}}), 'single');
	saveSetting('baseChecksum', getStoreChecksum());
}

