import {basename, resolve} from 'path';
import {createKaraInDB, editKaraInDB} from './kara';
import { addKaraToStore, editKaraInStore, sortKaraStore, getStoreChecksum } from '../dao/dataStore';
import { saveSetting } from '../lib/dao/database';
import { Kara, NewKara } from '../lib/types/kara';
import { resolvedPathMedias, resolvedPathSubs, resolvedPathKaras, resolvedPathTemp } from '../lib/utils/config';
import { asyncUnlink, asyncExists, asyncCopy } from '../lib/utils/files';
import {generateKara} from '../lib/services/kara_creation';
import logger from '../lib/utils/logger';

export async function editKara(kara: Kara) {
	let newKara: NewKara;
	try {
		const mediaFile = resolve(resolvedPathMedias()[0], kara.mediafile);
		const subFile = kara.subfile
			? resolve(resolvedPathSubs()[0], kara.subfile)
			: kara.subfile;
		const karaFile = resolve(resolvedPathKaras()[0], kara.karafile);
		// Removing useless data
		delete kara.karafile;
		// Copying already present files in temp directory to be worked on with by generateKara
		if (!kara.mediafile_orig) {
			kara.noNewVideo = true;
			kara.mediafile_orig = kara.mediafile;
			if (!await asyncExists(mediaFile)) throw `Mediafile ${mediaFile} does not exist! Check your base files or upload a new media`;
			await asyncCopy(mediaFile, resolve(resolvedPathTemp(), kara.mediafile), {overwrite: true});
		}
		if (!kara.subfile_orig) {
			kara.subfile_orig = kara.subfile;
			if (kara.subfile) {
				if (!await asyncExists(subFile)) throw `Subfile ${subFile} does not exist! Check your base files or upload a new subfile`;
				await asyncCopy(subFile, resolve(resolvedPathTemp(), kara.subfile), {overwrite: true});
			}
		}
		// Treat files
		newKara = await generateKara(kara, resolvedPathKaras()[0], resolvedPathMedias()[0], resolvedPathSubs()[0]);

		const newMediaFile = resolve(resolvedPathMedias()[0],newKara.data.mediafile);

		//Removing previous files if they're different from the new ones (name changed, etc.)
		if (newKara.file.toLowerCase() !== karaFile.toLowerCase() && await asyncExists(karaFile)) {
			logger.info(`[KaraGen] Removing ${karaFile}`);
			await asyncUnlink(karaFile);
			// Remove karav3 file
			const karaV3File = karaFile.replace('\\karaokes\\','\\karas\\').replace('/karaokes/','/karas/').replace('.json','');
			logger.info(`[KaraGen] Removing ${karaV3File}`);
			await asyncUnlink(karaV3File);
		}
		if (newKara.data.subfile) {
			const newSubFile = resolve(resolvedPathSubs()[0],newKara.data.subfile);
			if (newSubFile.toLowerCase() !== subFile.toLowerCase() && subFile) {
				if (await asyncExists(subFile)) asyncUnlink(subFile);
			}
		}
		if (newMediaFile.toLowerCase() !== mediaFile.toLowerCase() && await asyncExists(mediaFile)) asyncUnlink(mediaFile);
	} catch(err) {
		logger.error(`[KaraGen] Error while editing kara : ${err}`);
		throw err;
	}
	editKaraInStore(newKara.data.kid, newKara.fileData);
	saveSetting('baseChecksum', getStoreChecksum());
	newKara.data.karafile = basename(newKara.file);
	// Update in database
	try {
		await editKaraInDB(newKara.data);
	} catch(err) {
		const errMsg = `${newKara.data.karafile} file generation is OK, but unable to edit karaoke in live database. Please regenerate database entirely if you wish to see your modifications : ${err}`;
		logger.warn(`[KaraGen] ${errMsg}`);
		throw errMsg;
	}
}

export async function createKara(kara: Kara) {
	const newKara = await generateKara(kara, resolvedPathKaras()[0], resolvedPathMedias()[0], resolvedPathSubs()[0]);
	addKaraToStore(newKara.fileData);
	sortKaraStore();
	saveSetting('baseChecksum', getStoreChecksum());
	try {
		newKara.data.karafile = basename(newKara.file);
		await createKaraInDB(newKara.data);
	} catch(err) {
		const errMsg = `.kara.json file is OK, but unable to add karaoke in live database. Please regenerate database entirely if you wish to see your modifications : ${err}`;
		logger.warn(`[KaraGen] ${errMsg}`);
		throw errMsg;
	}
	return newKara;
}
