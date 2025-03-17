import { promises as fs } from 'fs';
import { sample } from 'lodash';
import { basename, resolve } from 'path';

import { resolvedPath } from '../lib/utils/config.js';
import { audioFileRegexp, backgroundFileRegexp, supportedFiles } from '../lib/utils/constants.js';
import { replaceExt } from '../lib/utils/files.js';
import logger from '../lib/utils/logger.js';
import { BackgroundList, BackgroundType } from '../types/backgrounds.js';
import Sentry from '../utils/sentry.js';
import { getState } from '../utils/state.js';
import { initPlayer, quitmpv } from './player.js';

const service = 'Backgrounds';

export const backgroundTypes = ['pause', 'stop', 'poll', 'bundled'] as const;

/** Find a background for the player to use */
export async function getBackgroundAndMusic(type: BackgroundType = 'stop'): Promise<BackgroundList> {
	//load default and is bundled background, then edit it
	const files = await getBackgroundFiles('bundled');
	const customFiles = await getBackgroundFiles(type);

	if (customFiles.pictures.length > 0) files.pictures = customFiles.pictures;
	if (customFiles.music.length > 0) files.music = customFiles.music;

	//assign backgrounds
	const backgroundImageFile = sample(files.pictures);
	// First, try to find a "neighbour" audio file
	let backgroundMusicFile = files.music.find(
		f =>
			replaceExt(f, '') === replaceExt(backgroundImageFile, '') &&
			supportedFiles.audio.some(extension => f.endsWith(extension))
	);
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
	let restartMpv = false;
	if (!backgroundTypes.includes(type)) throw { code: 400 };
	if (getState().backgrounds.picture === file || getState().backgrounds.music === file) {
		restartMpv = true;
		await quitmpv();
	}
	await fs.unlink(resolve(resolvedPath('Backgrounds'), type, file));
	if (restartMpv) initPlayer().catch();
}

export async function addBackgroundFile(type: BackgroundType, file: Express.Multer.File) {
	if (!backgroundTypes.includes(type)) throw { code: 400 };
	await fs.copyFile(
		resolve(resolvedPath('Temp'), basename(file.filename)),
		resolve(resolvedPath('Backgrounds'), type, basename(file.originalname))
	);
}
