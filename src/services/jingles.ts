import {isMediaFile, asyncReadDir, asyncExists, asyncMkdirp} from '../lib/utils/files';
import {resolve} from 'path';
import {resolvedPathJingles} from '../lib/utils/config';
import {getMediaInfo} from '../lib/utils/ffmpeg';
import logger from 'winston';
import sample from 'lodash.sample';
import cloneDeep from 'lodash.clonedeep';
import { Jingle } from '../types/jingles';
import fs from 'fs';
import { EventEmitter } from 'events';
import Bar from '../lib/utils/bar';
const git = require('isomorphic-git');

const emitter = new EventEmitter();
git.plugins.set('fs', fs);
git.plugins.set('emitter', emitter)
let allSeries = {};
let currentSeries = {};

export async function updateJingles() {
	const gitDir = resolve(resolvedPathJingles()[0], 'KaraokeMugen/');
	try {
		if (!await asyncExists(gitDir)) {
			logger.info('[Jingles] Downloading jingles');
			// Git clone
			await asyncMkdirp(gitDir);
			const bar = new Bar({
				message: 'Downloading jingles  ',
				event: 'jinglesProgress'
			}, 100);
			emitter.on('progress', (progress: ProgressEvent) => {
				console.log(progress);
				bar.setTotal(progress.total);
				bar.update(progress.loaded);
			});
			await git.clone({
				dir: gitDir,
				singleBranch: true,
				url: 'https://lab.shelter.moe/karaokemugen/jingles'
			})
			emitter.off('progress', () => {});
			bar.stop();
		} else {
			logger.info('[Jingles] Updating jingles');
			const bar = new Bar({
				message: 'Updating jingles     ',
				event: 'jinglesProgress'
			}, 100);
			emitter.on('progress', (progress: ProgressEvent) => {
				bar.setTotal(progress.total);
				bar.update(progress.loaded);
			});
			await git.pull({
				dir: gitDir,
				ref: 'master',
				singleBranch: true
			})
			emitter.off('progress', () => {});
			bar.stop();
			buildJinglesList();
		}
	} catch(err) {
		logger.warn(`[Jingles] Error updating jingles : ${err}`);
	}
}

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