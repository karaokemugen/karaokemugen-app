import {extractMediaFiles} from '../lib/utils/files';
import {resolve} from 'path';
import {resolvedPathJingles, getConfig} from '../lib/utils/config';
import logger from 'winston';
import sample from 'lodash.sample';
import cloneDeep from 'lodash.clonedeep';
import { Media } from '../types/medias';
import { editSetting } from '../utils/config';
import {gitUpdate} from '../utils/git';

let allSeries = {};
let currentSeries = {};

export async function updateJingles() {
	try {
		const localDirs = await gitUpdate(resolve(resolvedPathJingles()[0], 'KaraokeMugen/'), 'https://lab.shelter.moe/karaokemugen/jingles.git', 'Jingles', getConfig().System.Path.Jingles);
		if (localDirs) editSetting({System: {Path: {Jingles: localDirs}}});
	} catch(err) {
		logger.warn(`[Jingles] Error updating jingles : ${err}`);
		throw err;
	}
}

export async function buildJinglesList() {
	allSeries = {};
	for (const resolvedPath of resolvedPathJingles()) {
		const medias = await extractMediaFiles(resolvedPath);
		for (const media of medias) {
			const serie = media.filename.split(' - ')[0];
			if (!allSeries[serie]) allSeries[serie] = [];
			allSeries[serie].push({
				file: media.filename,
				gain: media.gain
			});
		}
	}
	logger.debug(`[Jingles] Computed jingles : ${JSON.stringify(allSeries, null, 2)}`);
	currentSeries = cloneDeep(allSeries);
}

export function getSingleSponsor(): Media {
	return sample(allSeries['Sponsor']);
}

export function getSingleJingle(): Media {
	//If our current jingle serie files list is empty after the previous removal
	//Fill it again with the original list.
	if (Object.keys(allSeries).length === 0) return null;
	if (Object.keys(currentSeries).length === 0) currentSeries = cloneDeep(allSeries);
	logger.info('[Player] Jingle time !');
	const jinglesSeries = sample(Object.keys(currentSeries));
	const jingle = sample(currentSeries[jinglesSeries]);
	//Let's remove the serie of the jingle we just selected so it won't be picked again next time.
	delete currentSeries[jinglesSeries];
	return jingle;
}