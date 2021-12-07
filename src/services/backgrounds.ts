import { promises as fs } from 'fs';
import sample from 'lodash.sample';
import { resolve } from 'path';

import { resolvedPath } from '../lib/utils/config';
import { audioFileRegexp, imageFileRegexp } from '../lib/utils/constants';
import { replaceExt } from '../lib/utils/files';
import { BackgroundList, BackgroundType } from '../types/backgrounds';

export const backgroundTypes = ['pause', 'stop', 'poll', 'bundled'] as const;
/** Find a background for the player to use */

export async function getBackgroundAndMusic(type: BackgroundType): Promise<BackgroundList> {
	let files = await getBackgroundFiles(type);
	// If no picture available, pick from bundled backgrounds
	if (files.pictures.length === 0) files = await getBackgroundFiles('bundled');
	const backgroundImageFile = sample(files.pictures);
	// First, try to find a "neighbour" mp3
	let backgroundMusicFile = files.music.find((f) => f === replaceExt(backgroundImageFile, '.mp3'));
	if (!backgroundMusicFile && files.music.length > 0) {
		backgroundMusicFile = sample(files.music);
	}
	return {
		pictures: [backgroundImageFile],
		music: [backgroundMusicFile],
	};
}

export async function getBackgroundFiles(type: BackgroundType = 'pause'): Promise<BackgroundList> {
	const path =
		type === 'bundled' ? resolve(resolvedPath('BundledBackgrounds')) : resolve(resolvedPath('Backgrounds'), type);
	const files = await fs.readdir(path);
	return {
		pictures: files.filter((f) => f.match(imageFileRegexp)).map((f) => resolve(path, f)),
		music: files.filter((f) => f.match(audioFileRegexp)).map((f) => resolve(path, f)),
	};
}

export async function removeBackgroundFile(type: BackgroundType, file: string) {
	await fs.unlink(resolve(resolvedPath('Backgrounds'), type, file));
}

export async function addBackgroundFile(type: BackgroundType, file: Express.Multer.File) {
	await fs.copyFile(
		resolve(resolvedPath('Temp'), file.filename),
		resolve(resolvedPath('Backgrounds'), type, file.originalname)
	);
}
