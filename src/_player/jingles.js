import {isVideoFile, asyncReadDir} from '../_common/utils/files';
import {resolve} from 'path';
import {resolvedPathJingles} from '../_common/utils/config';
import {getVideoGain} from '../_common/utils/ffmpeg';
import {eachLimit} from 'async';
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
		if (isVideoFile(file)) {
			jingleFiles.push(resolve(jingleDir, file));
		}
	}
	return jingleFiles;
}

async function getAllVideoGains(jingleFiles) {
	eachLimit(jingleFiles,3,(jinglefile,callback) => {
		// Calculate gain here
		getVideoGain(jinglefile).then((audiogain) => {
			jinglesList.push(
				{ 
					file: jinglefile,
					gain: audiogain.data
				}
			);
			logger.debug(`[Jingles] Computed jingle ${jinglefile} audio gain at ${audiogain.data} dB`);
			callback();
		})
			.catch((err) => {
				callback(err);
			});		
	},(err) => {
		if (err) {
			logger.error(`[Jingles] Failed computing jingle audio gain data : ${err}`);
			throw err;
		} else {
			logger.info('[Jingles] Finished computing jingle audio gain data');			
			console.log(jinglesList);
			return jinglesList;
		}
	});	
}

export async function buildJinglesList() {
	const jingleFiles = await extractAllJingleFiles();
	const list = await getAllVideoGains(jingleFiles);	
	console.log('LISTE2: '+list);
	return list;
}