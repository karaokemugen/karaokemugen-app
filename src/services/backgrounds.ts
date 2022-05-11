import { promises as fs } from 'fs';
import { sample } from 'lodash';
import { basename, resolve } from 'path';

import { resolvedPath } from '../lib/utils/config';
import { audioFileRegexp, backgroundFileRegexp } from '../lib/utils/constants';
import { replaceExt } from '../lib/utils/files';
import logger from '../lib/utils/logger';
import { BackgroundList, BackgroundType } from '../types/backgrounds';
import Sentry from '../utils/sentry';
import { getState } from '../utils/state';

const service = 'Backgrounds';

export const backgroundTypes = ['pause', 'stop', 'poll', 'bundled'] as const;

/** Find a background for the player to use */
export async function getBackgroundAndMusic(type: BackgroundType): Promise<BackgroundList> {
	let files = await getBackgroundFiles(type);
	// If no picture available, pick from bundled backgrounds
	if (files.pictures.length === 0) files = await getBackgroundFiles('bundled');
	const backgroundImageFile = sample(files.pictures);
	// First, try to find a "neighbour" mp3
	let backgroundMusicFile = files.music.find(f => f === replaceExt(backgroundImageFile, '.mp3'));
	if (!backgroundMusicFile && files.music.length > 0) {
		backgroundMusicFile = sample(files.music);
	}
	return {
		pictures: [backgroundImageFile],
		music: [backgroundMusicFile],
	};
}

export async function getBackgroundFiles(type: BackgroundType = 'pause'): Promise<BackgroundList> {
	try {
		const path =
			type === 'bundled'
				? resolve(resolvedPath('BundledBackgrounds'))
				: resolve(resolvedPath('Backgrounds'), type);
		const files = await fs.readdir(path);
		return {
			pictures: files.filter(f => backgroundFileRegexp.test(f)).map(f => resolve(path, f)),
			music: files.filter(f => audioFileRegexp.test(f)).map(f => resolve(path, f)),
		};
	} catch (err) {
		logger.error('Unable to get background files', { service, obj: err });
		Sentry.addErrorInfo('args', type);
		Sentry.error(err);
		throw err;
	}
}

export async function removeBackgroundFile(type: BackgroundType, file: string) {
	if (!backgroundTypes.includes(type)) throw { code: 400 };
	if (getState().backgrounds.picture === file || getState().backgrounds.music === file)
		throw { code: 409, msg: 'BACKGROUND_FILE_DELETE_ERROR_IN_USE' };
	await fs.unlink(resolve(resolvedPath('Backgrounds'), type, file));
}

export async function addBackgroundFile(type: BackgroundType, file: Express.Multer.File) {
	if (!backgroundTypes.includes(type)) throw { code: 400 };
	await fs.copyFile(
		resolve(resolvedPath('Temp'), basename(file.filename)),
		resolve(resolvedPath('Backgrounds'), type, basename(file.originalname))
	);
}
