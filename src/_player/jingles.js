import {isMediaFile, asyncReadDir} from '../_common/utils/files';
import {emit} from '../_common/utils/pubsub';
import {resolve} from 'path';
import {resolvedPathJingles} from '../_common/utils/config';
import {getMediaInfo} from '../_common/utils/ffmpeg';
const logger = require('winston');

export let jinglesList = [];
export let currentJinglesList = [];

async function extractAllJingleFiles() {
	let jingleFiles = [];
	for (const resolvedPath of resolvedPathJingles()) {
		jingleFiles = jingleFiles.concat(await extractJingleFiles(resolvedPath));
	}
	return jingleFiles;
}

async function extractJingleFiles(jingleDir) {
	const jingleFiles = [];
	const dirListing = await asyncReadDir(jingleDir);
	for (const file of dirListing) {
		if (isMediaFile(file)) {
			jingleFiles.push(resolve(jingleDir, file));
		}
	}
	return jingleFiles;
}

async function getAllVideoGains(jingleFiles) {	
	let jinglesList = [];
	for (const jinglefile of jingleFiles) {
		const videodata = await getMediaInfo(jinglefile);
		jinglesList.push(
			{ 
				file: jinglefile,
				gain: videodata.audiogain
			});
		logger.debug(`[Jingles] Computed jingle ${jinglefile} audio gain at ${videodata.audiogain} dB`);
	}	
	return jinglesList;
}

export async function buildJinglesList() {
	const jingleFiles = await extractAllJingleFiles();
	const list = await getAllVideoGains(jingleFiles);		
	emit('jinglesReady',list);
	return list;
}