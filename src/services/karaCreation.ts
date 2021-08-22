import { promises as fs } from 'fs';
import { copy } from 'fs-extra';
import {basename, dirname, resolve} from 'path';

import { addKaraToStore, editKaraInStore, getStoreChecksum, removeKaraInStore,sortKaraStore } from '../dao/dataStore';
import { saveSetting } from '../lib/dao/database';
import {generateKara, validateNewKara} from '../lib/services/karaCreation';
import { Kara, NewKara } from '../lib/types/kara';
import { resolvedPathRepos, resolvedPathTemp } from '../lib/utils/config';
import { asyncExists, asyncMove, resolveFileInDirs } from '../lib/utils/files';
import logger, { profile } from '../lib/utils/logger';
import Task from '../lib/utils/taskManager';
import sentry from '../utils/sentry';
import {getKara} from './kara';
import { createKaraInDB, editKaraInDB } from './karaManagement';
import { consolidateTagsInRepo } from './tag';

export async function editKara(kara: Kara, refresh = true) {
	const task = new Task({
		text: 'EDITING_SONG',
		subtext: kara.karafile
	});
	let newKara: NewKara;
	let karaFile: string;
	// Validation here, processing stuff later
	// No sentry triggered if validation fails
	try {
		const validationErrors = validateNewKara(kara);
		if (validationErrors) throw validationErrors;
	} catch(err) {
		throw {code: 400, msg: err};
	}
	try {
		profile('editKaraFile');
		const oldKara = await getKara(kara.kid, {role: 'admin', username: 'admin'});
		let mediaFile: string;
		let mediaDir: string;
		// If mediafile_orig is present, our user has uploaded a new song
		if (kara.mediafile_orig) {
			mediaFile = resolve(resolvedPathTemp(), kara.mediafile);
			try {
				mediaFile = (await resolveFileInDirs(oldKara.mediafile, resolvedPathRepos('Medias', kara.repository)))[0];
			} catch(err) {
				// File probably doesn't exist.
				logger.warn(`Media file ${oldKara.mediafile} does not exist, ignoring.`, {service: 'KaraGen'});
			}
		} else {
			try {
				mediaFile = (await resolveFileInDirs(kara.mediafile, resolvedPathRepos('Medias', kara.repository)))[0];
				mediaDir = dirname(mediaFile);
			} catch(err) {
				mediaDir = resolvedPathRepos('Medias', kara.repository)[0];
			}
		}
		mediaFile
			? mediaDir = dirname(mediaFile)
			: mediaDir = resolvedPathRepos('Medias', kara.repository)[0];
		let subFile = kara.subfile;
		let subDir: string;
		if (kara.subfile) {
			if (kara.subfile_orig) {
				subFile = resolve(resolvedPathTemp(), kara.subfile);
				if (oldKara.subfile) {
					subDir = dirname((await resolveFileInDirs(oldKara.subfile, resolvedPathRepos('Lyrics', kara.repository)))[0]);
				} else {
					subDir = resolvedPathRepos('Lyrics', kara.repository)[0];
				}
			} else {
				subFile = (await resolveFileInDirs(kara.subfile, resolvedPathRepos('Lyrics', kara.repository)))[0];
				subDir = dirname(subFile);
			}
		} else {
			subDir = resolvedPathRepos('Lyrics', kara.repository)[0];
		}
		karaFile = (await resolveFileInDirs(kara.karafile, resolvedPathRepos('Karaokes', kara.repository)))[0];
		const karaDir = dirname(karaFile);

		// Removing useless data
		delete kara.karafile;
		// Copying already present files in temp directory to be worked on with by generateKara
		if (!kara.mediafile_orig) {
			kara.noNewVideo = true;
		}
		if (!kara.subfile_orig) {
			if (kara.subfile) {
				if (!await asyncExists(subFile)) throw {code: 404, msg: `Subfile ${subFile} does not exist! Check your base files or upload a new subfile`};
				await copy(subFile, resolve(resolvedPathTemp(), kara.subfile), {overwrite: true});
			}
		}
		// Treat files
		newKara = await generateKara(kara, karaDir, mediaDir, subDir, oldKara);

		//Removing previous files if they're different from the new ones (name changed, etc.)
		if (newKara.file.toLowerCase() !== karaFile.toLowerCase() && await asyncExists(karaFile)) {
			logger.info(`Removing ${karaFile}`, {service: 'KaraGen'});
			await fs.unlink(karaFile);
		}
		if (newKara.data.subfile && oldKara.subfile && newKara.data.subfile.toLowerCase() !== oldKara.subfile.toLowerCase()) {
			const oldSubFiles = await resolveFileInDirs(oldKara.subfile, resolvedPathRepos('Lyrics', kara.repository));
			if (await asyncExists(oldSubFiles[0])) {
				logger.info(`Removing ${oldSubFiles[0]}`, {service: 'KaraGen'});
				await fs.unlink(oldSubFiles[0]);
			}
		}
		// Testing if we managed to get a mediaFile earlier, like, if the old mediaFile existed on disk.
		if (mediaFile && newKara.data.mediafile.toLowerCase() !== oldKara.mediafile.toLowerCase()) {
			try {
				const oldMediaFiles = await resolveFileInDirs(oldKara.mediafile, resolvedPathRepos('Medias', kara.repository));
				if (kara.noNewVideo) {
					const newMediaFile = resolve(resolvedPathRepos('Medias', kara.repository)[0], newKara.data.mediafile);
					logger.info(`Renaming ${oldMediaFiles[0]} to ${newMediaFile}`, {service: 'KaraGen'});
					await asyncMove(oldMediaFiles[0], newMediaFile, {overwrite: true});
				} else {
					logger.info(`Removing ${oldMediaFiles[0]}`, {service: 'KaraGen'});
					await fs.unlink(oldMediaFiles[0]);
				}
			} catch(err) {
				logger.warn(`Unable to remove/rename old mediafile ${oldKara.mediafile}`, {service: 'KaraGen', obj: err});
				// Non-fatal
			}
		}
	} catch(err) {
		logger.error('Error while editing kara', {service: 'KaraGen', obj: err});
		if (!err.msg) {
			sentry.addErrorInfo('args', JSON.stringify(arguments, null, 2));
			if (newKara) sentry.addErrorInfo('newKara', JSON.stringify(newKara, null, 2));
			sentry.error(err);
		}
		task.end();
		throw err;
	}
	try {
		if (karaFile === newKara.file) {
			await editKaraInStore(newKara.file);
		} else {
			removeKaraInStore(karaFile);
			await addKaraToStore(newKara.file);
			sortKaraStore();
		}
		saveSetting('baseChecksum', getStoreChecksum());
		newKara.data.karafile = basename(newKara.file);
		// Update in database
		profile('editKaraFile');
		await Promise.all([
			editKaraInDB(newKara.data, { refresh: refresh }),
			consolidateTagsInRepo(newKara.data)
		]);
	} catch(err) {
		const errMsg = `${newKara.data.karafile} file generation is OK, but unable to edit karaoke in live database. Please regenerate database entirely if you wish to see your modifications : ${err}`;
		logger.warn(errMsg, {service: 'KaraGen', obj: err});
		sentry.addErrorInfo('args', JSON.stringify(arguments, null, 2));
		sentry.addErrorInfo('newKara', JSON.stringify(newKara, null, 2));
		sentry.error(err, 'Warning');
		throw errMsg;
	} finally {
		task.end();
	}
}

export async function createKara(kara: Kara) {
	const task = new Task({
		text: 'CREATING_SONG',
		subtext: kara.title
	});
	let newKara: NewKara;
	// Validation here, processing stuff later
	// No sentry triggered if validation fails
	try {
		const validationErrors = validateNewKara(kara);
		if (validationErrors) throw validationErrors;
	} catch(err) {
		throw {code: 400, msg: err};
	}
	try {
		newKara = await generateKara(kara, resolvedPathRepos('Karaokes', kara.repository)[0], resolvedPathRepos('Medias', kara.repository)[0], resolvedPathRepos('Lyrics', kara.repository)[0]);
		await addKaraToStore(newKara.file);
		sortKaraStore();
		saveSetting('baseChecksum', getStoreChecksum());
	} catch(err) {
		logger.error('Error while creating kara', {service: 'KaraGen', obj: err});
		if (!err.msg) {
			sentry.addErrorInfo('args', JSON.stringify(arguments, null, 2));
			if (newKara) sentry.addErrorInfo('newKara', JSON.stringify(newKara, null, 2));
			sentry.error(err);
		}
		task.end();
		throw err;
	}
	try {
		newKara.data.karafile = basename(newKara.file);
		await Promise.all([
			createKaraInDB(newKara.data),
			consolidateTagsInRepo(newKara.data)
		]);
		return newKara;
	} catch(err) {
		const errMsg = `.kara.json file is OK, but unable to add karaoke in live database. Please regenerate database entirely if you wish to see your modifications : ${err}`;
		logger.warn(errMsg, {service: 'KaraGen', obj: err});
		sentry.addErrorInfo('args', JSON.stringify(arguments, null, 2));
		sentry.addErrorInfo('newKara', JSON.stringify(newKara, null, 2));
		sentry.error(err, 'Warning');
		throw err;
	} finally {
		task.end();
	}
}
