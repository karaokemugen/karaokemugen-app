import {extractMediaFiles} from '../lib/utils/files';
import {resolve} from 'path';
import {getConfig, resolvedPathIntros} from '../lib/utils/config';
import logger from 'winston';
import sample from 'lodash.sample';
import { Media } from '../types/medias';
import { editSetting } from '../utils/config';
import {gitUpdate} from '../utils/git';

let allIntros: Media[];
let currentIntros: Media[];

export async function updateIntros() {
	try {
		const localDirs = await gitUpdate(resolve(resolvedPathIntros()[0], 'KaraokeMugen/'), 'https://lab.shelter.moe/karaokemugen/intros.git', 'Intros', getConfig().System.Path.Intros);
		if (localDirs) editSetting({System: {Path: {Intros: localDirs}}});
	} catch(err) {
		logger.warn(`[Jingles] Error updating jingles : ${err}`);
		throw err;
	}
}

export async function buildIntrosList() {
	allIntros = [];
	currentIntros = [];
	for (const resolvedPath of resolvedPathIntros()) {
		const medias = await extractMediaFiles(resolvedPath);
		for (const media of medias) {
			allIntros.push({
				file: media.filename,
				gain: media.gain
			});
		}
	}
	logger.debug(`[Intros] Computed intros : ${JSON.stringify(allIntros, null, 2)}`);
}

export function getSingleIntro(): Media {
	//If our current jingle serie files list is empty after the previous removal
	//Fill it again with the original list.
	if (allIntros.length === 0) return null;
	if (currentIntros.length === 0) currentIntros = allIntros;
	// If IntroVideoFile is provided, search for it. If undefined or not found, pick one at random.
	const intro = currentIntros.find(i => i.file === getConfig().Playlist.IntroVideoFile) || sample(currentIntros);
	//Let's remove the serie of the jingle we just selected so it won't be picked again next time.
	currentIntros = currentIntros.filter(e => e.file === intro.file);
	return intro;
}