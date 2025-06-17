import fs from 'fs/promises';
import { basename, dirname, extname, resolve } from 'path';
import { v4 as uuidV4 } from 'uuid';

import { APIMessage } from '../lib/services/frontend.js';
import { defineSongname, processUploadedMedia } from '../lib/services/karaCreation.js';
import { DBTag } from '../lib/types/database/tag.js';
import { KaraFileV4 } from '../lib/types/kara.js';
import { resolvedPath } from '../lib/utils/config.js';
import { supportedFiles, tagTypes } from '../lib/utils/constants.js';
import { ErrorKM } from '../lib/utils/error.js';
import { fileExists } from '../lib/utils/files.js';
import { convertLangTo2B } from '../lib/utils/langs.js';
import logger from '../lib/utils/logger.js';
import Task from '../lib/utils/taskManager.js';
import { emitWS } from '../lib/utils/ws.js';
import { ImportBaseFile, ImportKaraObject } from '../types/repo.js';
import { createKara } from './karaCreation.js';
import { getRepo } from './repo.js';
import { addTag, getTags } from './tag.js';

const service = 'importBase';

function findMediaFile(fileName: string, dirName: string) {
	const ext = extname(fileName).substring(1);
	if (supportedFiles.audio.includes(ext) || supportedFiles.video.includes(ext)) {
		const mediafile = resolve(dirName, fileName);
		return mediafile;
	}
}

/** Remove audio files if video files with the same name exist. Prioritize video over audio */
function removeFileDuplicates(files: ImportBaseFile[], viewOnly = true) {
	for (const file of files) {
		// If we have a video, search for an audio file with similar name
		const ext = extname(file.oldFile);
		if (supportedFiles.video.includes(ext.slice(1))) {
			const base = file.oldFile.replaceAll(ext, '');
			files = files.filter(f => {
				const ext2 = extname(f.oldFile);
				const base2 = f.oldFile.replaceAll(ext2, '');

				if (base === base2 && supportedFiles.audio.includes(ext2.slice(1))) {
					if (viewOnly) file.oldFile = `${file.oldFile} (+ ${ext2.slice(1)})`;
					return false;
				}
				return true;
			});
		}
	}
	return files;
}

/** Determine names from folder to import from and tempalte */
export async function findFilesToImport(dirName: string, template: string, viewOnly = true): Promise<ImportBaseFile[]> {
	try {
		const dir = await fs.readdir(dirName, { withFileTypes: true });
		const files: ImportBaseFile[] = [];
		for (const file of dir) {
			if (file.isDirectory()) {
				// This is most possibly a ultrastar folder with the same name in different files.
				const subDirName = resolve(dirName, file.name);
				const subDirFiles = await fs.readdir(subDirName);
				for (const subDirFile of subDirFiles) {
					// We don't go any deeper
					const stat = await fs.stat(resolve(subDirName, subDirFile));
					if (stat.isFile()) {
						const foundFile = findMediaFile(subDirFile, resolve(dirName, subDirName));
						if (foundFile) files.push(translateKaraTemplate(foundFile, template));
					}
				}
			} else {
				const foundFile = findMediaFile(file.name, dirName);
				if (foundFile) files.push(translateKaraTemplate(foundFile, template));
			}
		}
		return removeFileDuplicates(files, viewOnly);
	} catch (err) {
		logger.error(`Error finding files to import : ${err}`, { service });
		throw err instanceof ErrorKM ? err : new ErrorKM('FIND_FILES_TO_IMPORT_ERROR', 500);
	}
}

function translateKaraTemplate(mediafile: string, template: string): ImportBaseFile {
	try {
		if (!template.includes('{title}')) throw new ErrorKM('IMPORT_SONG_TEMPLATE_MISSING_TITLE_ERROR', 400);
		const pattern = /{[^}]+\}/g;
		const patternDup = /\{(.*?)\}/g;
		const tags = [];
		let match: any;
		while ((match = patternDup.exec(template)) !== null) {
			if (tags.includes(match[1])) {
				throw new ErrorKM('IMPORT_SONG_TEMPLATE_ERROR_DUPLICATE_TAG', 400);
			}
			tags.push(match[1]);
		}
		const unfill = (
			fileTemplate: string,
			file: string,
			match = file.match(new RegExp(fileTemplate.replace(pattern, s => `(?<${s.slice(1, -1)}>.+)`)))
		) => match && match.groups;
		const ext = extname(mediafile).substring(1);
		const fileWithoutExt = basename(mediafile, `.${ext}`);
		const karaObj = unfill(template, fileWithoutExt) as ImportKaraObject;
		return {
			directory: dirname(mediafile),
			oldFile: mediafile,
			newFile: karaObj,
			tags: {},
		};
	} catch (err) {
		logger.error(`Error with matching template : ${err}`, { service });
		throw err instanceof ErrorKM ? err : new ErrorKM('IMPORT_SONG_TEMPLATE_ERROR', 400, false);
	}
}

/** Analyze import base files, create missing tags in database and return the karas object with its TIDs */
async function populateTags(baseKaras: ImportBaseFile[], repoDest: string): Promise<ImportBaseFile[]> {
	// We'll do a first pass to gather all tags, see which ones do exist and create those who don't
	const tags = await getTags({});
	const tagPromises = [];
	for (const i in baseKaras) {
		if ({}.hasOwnProperty.call(baseKaras, i)) {
			const kara = baseKaras[i];
			for (const key of Object.keys(kara?.newFile || {})) {
				// These too are ignored, they're not tags.
				if (key === 'title' || key === 'year') continue;
				// We assume that if there are several items in a tag they're separated by ,
				// Like "Axelle Red, Kyo - Dernière Danse Remix"
				const items = kara.newFile[key].split(',');
				items.forEach((_, i2) => (items[i2] = items[i2].trim()));
				for (const item of items) {
					const tag = tags.content.find(t => t.name === item && t.types.includes(tagTypes[key]));
					const tid = tag?.tid || uuidV4();
					if (!tag) {
						tagPromises.push(
							await addTag({
								name: item,
								tid,
								types: [tagTypes[key]],
								repository: repoDest,
							})
						);
					}
					if (!kara.tags[key]) kara.tags[key] = [];
					kara.tags[key].push(tid);
				}
			}
		}
	}
	return baseKaras;
}

async function importBaseKara(karaObj: ImportBaseFile, repoDest: string, tags: DBTag[]) {
	try {
		logger.info(`Importing ${karaObj.oldFile}...`, { service });
		const mediafile = karaObj.oldFile;
		// We have our kara and its informations, now let's play guessing games.
		// Reject song if it has no title.
		if (!karaObj.newFile.title) throw new ErrorKM('IMPORT_NO_TITLE_ERROR', 400);
		// Determine if file has a subtitle we can use
		const dir = dirname(mediafile);
		const basefile = basename(mediafile, extname(mediafile));
		let subfile = '';
		let subfileExt = '';
		for (const ext of supportedFiles.lyrics) {
			const possibleSubfile = resolve(dir, `${basefile}.${ext}`);
			if (await fileExists(possibleSubfile)) {
				subfile = possibleSubfile;
				subfileExt = ext;
				break;
			}
		}
		// Default language
		// Determine if we can convert it to a ISO code
		const language = karaObj.newFile.langs ? convertLangTo2B(karaObj.newFile.langs[0]) : 'und';
		const date = new Date();
		// We process subfile but don't remove the source as it belogns to the user.
		const media = await processUploadedMedia(mediafile, mediafile, false);
		const kid = uuidV4();
		if (subfile) {
			const tempSubFile = resolve(resolvedPath('Temp'), `temp_${kid}.${subfileExt}`);
			await fs.copyFile(subfile, tempSubFile);
			subfile = tempSubFile;
		}
		const kara: KaraFileV4 = {
			meta: {},
			header: {
				version: 4,
				description: 'Karaoke Mugen Karaoke Data File',
			},
			medias: [
				{
					filename: media.filename,
					version: 'Default',
					duration: media.duration,
					filesize: media.size,
					loudnorm: media.loudnorm,
					default: true,
					lyrics: subfile
						? [
								{
									filename: subfile,
									version: 'Default',
									default: true,
								},
							]
						: [],
				},
			],
			data: {
				kid,
				year: karaObj.newFile.year,
				titles: {},
				titles_default_language: language,
				ignoreHooks: false,
				created_at: date.toISOString(),
				modified_at: date.toISOString(),
				tags: karaObj.tags,
				repository: repoDest,
			},
		};
		kara.data.titles[language] = karaObj.newFile.title;
		const songname = await defineSongname(kara, tags);
		kara.data.songname = songname.songname;
		await createKara({
			kara,
		});
	} catch (err) {
		logger.error(`Error importing song into base : ${err}`, { service });
		throw err instanceof ErrorKM ? err : new ErrorKM('IMPORT_SONG_ERROR', 500);
	}
}

export async function importBase(source: string, template: string, repoDest: string) {
	const task = new Task({
		text: 'BASE_IMPORT.IMPORTING_BASE',
	});
	try {
		getRepo(repoDest);
		let files = [];
		task.update({
			subtext: 'BASE_IMPORT.ANALYZING_FILES',
		});
		files = await findFilesToImport(source, template, false);
		task.update({
			subtext: 'BASE_IMPORT.CREATING_METADATA',
		});
		files = await populateTags(files, repoDest);
		let filesProcessed = 0;
		task.update({
			total: files.length,
			value: filesProcessed,
		});
		// We reread tags again in case any got added.
		const tags = await getTags({});
		const errors = [];
		for (const file of files) {
			let newOldFile = file.oldFile.replace(source.replaceAll('/', '\\'), '');
			if (newOldFile.startsWith('/') || newOldFile.startsWith('\\')) newOldFile = newOldFile.slice(1);
			task.update({
				subtext: newOldFile,
				value: filesProcessed,
			});
			try {
				await importBaseKara(file, repoDest, tags.content);
				filesProcessed += 1;
			} catch (err) {
				logger.warn(`Failed to import ${file.oldFile} : ${err}`, { service });
				errors.push({
					file,
					err: err.message,
				});
			}
		}
		if (errors.length > 0) {
			emitWS(
				'operatorNotificationError',
				APIMessage('NOTIFICATION.OPERATOR.ERROR.IMPORT_BASE_OK_BUT_ERRORS_SEE_LOGS')
			);
		}
	} catch (err) {
		logger.error(`Error importing base : ${err}`, { service });
		emitWS('operatorNotificationError', APIMessage('NOTIFICATION.OPERATOR.ERROR.IMPORT_BASE_FAILED', err));
	} finally {
		if (task) task.end();
	}
}
