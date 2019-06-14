import {isMediaFile, asyncReadDir} from '../lib/utils/files';
import {resolve} from 'path';
import {resolvedPathJingles} from '../lib/utils/config';
import {getMediaInfo} from '../lib/utils/ffmpeg';
import logger from 'winston';
import sample from 'lodash.sample';
import cloneDeep from 'lodash.clonedeep';
import { Jingle } from '../types/jingles';

let allSeries = {};
let currentSeries = {};

async function extractJingleFiles(jingleDir: string) {
	const dirListing = await asyncReadDir(jingleDir);
	for (const file of dirListing) {
		if (isMediaFile(file)) {
			getAllVideoGains(file, jingleDir);
		}
	}
}

async function getAllVideoGains(file: string, jingleDir: string) {
	const jinglefile = resolve(jingleDir, file);
	const videodata = await getMediaInfo(jinglefile);
	const serie = file.split(' - ')[0];
	if (!allSeries[serie]) allSeries[serie] = [];
	allSeries[serie].push({
		file: jinglefile,
		gain: videodata.gain
	});
	logger.debug(`[Jingles] Computed jingle ${jinglefile} audio gain at ${videodata.gain} dB`);
}

export function buildJinglesList() {
	for (const resolvedPath of resolvedPathJingles()) {
		extractJingleFiles(resolvedPath);
	}
}

export function getSingleJingle(): Jingle {
	//If our current jingle serie files list is empty after the previous removal
	//Fill it again with the original list.
	if (Object.keys(currentSeries).length === 0) {
		currentSeries = cloneDeep(allSeries);
	} else {
		logger.info('[Player] Jingle time !');
		const jinglesSeries = sample(Object.keys(currentSeries));
		const jingle = sample(currentSeries[jinglesSeries]);
		//Let's remove the serie of the jingle we just selected so it won't be picked again next time.
		delete currentSeries[jinglesSeries];
		return jingle;
	}
}