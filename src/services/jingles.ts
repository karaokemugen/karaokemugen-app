import {isMediaFile, asyncReadDir, asyncExists, asyncMkdirp} from '../lib/utils/files';
import {resolve} from 'path';
import {resolvedPathJingles, getConfig} from '../lib/utils/config';
import {getMediaInfo} from '../lib/utils/ffmpeg';
import logger from 'winston';
import sample from 'lodash.sample';
import cloneDeep from 'lodash.clonedeep';
import { Jingle } from '../types/jingles';
import fs from 'fs';
import { editSetting } from '../utils/config';
import { getState } from '../utils/state';
import { plugins as gitPlugins, pull as gitPull, clone as gitClone} from 'isomorphic-git';

gitPlugins.set('fs', fs);
let allSeries = {};
let currentSeries = {};

export async function updateJingles() {
	let gitDir = resolve(resolvedPathJingles()[0], 'KaraokeMugen/');
	try {
		if (!await asyncExists(gitDir) || !await asyncExists(gitDir + '/.git')) {
			logger.info('[Jingles] Downloading jingles');
			// Git clone
			if (!await asyncExists(gitDir)) await asyncMkdirp(gitDir);
			await gitClone({
				dir: gitDir,
				url: 'https://lab.shelter.moe/karaokemugen/jingles'
			})
			logger.info('[Jingles] Finished downloading jingles');
			const conf = getConfig();
			const jingleDirs = conf.System.Path.Jingles;
			const appPath = getState().appPath;
			if (gitDir.includes(appPath)) {
				gitDir = gitDir.split(appPath)[1].replace(/\\/g,'/');
			}
			if (!jingleDirs.includes(gitDir)) jingleDirs.push(gitDir);
			editSetting({System: {Path: {Jingles: jingleDirs}}});
			buildJinglesList();
		} else {
			logger.info('[Jingles] Updating jingles');
			await gitPull({
				dir: gitDir,
				ref: 'master',
				singleBranch: true
			})
			logger.info('[Jingles] Finished updating jingles');
			buildJinglesList();
		}
	} catch(err) {
		console.log(err);
		logger.warn(`[Jingles] Error updating jingles : ${err}`);
	}
}

async function extractJingleFiles(jingleDir: string) {
	const dirListing = await asyncReadDir(jingleDir);
	for (const file of dirListing) {
		if (isMediaFile(file)) {
			getVideoGain(file, jingleDir);
		}
	}
}

async function getVideoGain(file: string, jingleDir: string) {
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
	allSeries = {};
	currentSeries = {};
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