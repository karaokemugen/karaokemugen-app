import {isMediaFile, asyncReadDir} from '../_utils/files';
import {resolve} from 'path';
import {resolvedPathJingles} from '../_utils/config';
import {getMediaInfo} from '../_utils/ffmpeg';
import logger from 'winston';
import sample from 'lodash.sample';

let allJingles = [];
let currentJingles = [];

const extractJingleFiles = async (jingleDir) => await asyncReadDir(jingleDir)
	.filter((file) => isMediaFile(file))
	.map((file) => ([file, resolve(jingleDir, file)]));

const extractAllJingleFiles = async () => resolvedPathJingles()
	.map((resolvedPath) => extractJingleFiles(resolvedPath))
	.reduce((jingleFiles, jingleFile) => jingleFiles.concat(jingleFile), []);

const getAllVideoGains = async (jingleFiles) => {
	const jinglesList = await jingleFiles
		.map((jinglefile) => ({
			file: jinglefile,
			gain: getMediaInfo(jinglefile).audiogain
		}));

	jinglesList.forEach((jingleData) => logger.debug(`[Jingles] Computed jingle ${jingleData.file} audio gain at ${jingleData.gain} dB`));

	return jinglesList;
};

export const buildJinglesList = async () => {
	const jingleFiles = await extractAllJingleFiles();
	const list = await getAllVideoGains(jingleFiles);

	currentJingles = currentJingles.concat(list);
	allJingles = allJingles.concat(list);
	return list;
};

export const getJingles = () => currentJingles;

export const removeJingle = (jingleToRemove) =>{
	currentJingles = currentJingles.filter(jingle => jingle.file !== jingleToRemove);
};

export function getSingleJingle() {
	const jingles = getJingles();
	if (jingles.length > 0) {
		logger.info('[Player] Jingle time !');
		const jingle = sample(jingles);
		//Let's remove the jingle we just selected so it won't be picked again next time.
		removeJingle(jingle.file);
		//If our current jingle files list is empty after the previous removal
		//Fill it again with the original list.
		if (currentJingles.length === 0) currentJingles = currentJingles.concat(allJingles);
		return jingle;
	}
}