import {asyncExists, asyncMkdirp} from '../lib/utils/files';
import logger from 'winston';
import { getState } from '../utils/state';
import fs from 'fs';
import { plugins as gitPlugins, pull as gitPull, clone as gitClone} from 'isomorphic-git';

gitPlugins.set('fs', fs);

export async function gitUpdate(gitDir: string, gitURL: string, element: string, localDirs: string[]): Promise<string[]> {
	try {
		if (!await asyncExists(gitDir) || !await asyncExists(gitDir + '/.git')) {
			logger.info(`[${element}] Downloading...`);
			// Git clone
			if (!await asyncExists(gitDir)) await asyncMkdirp(gitDir);
			await gitClone({
				dir: gitDir,
				url: gitURL
			})
			logger.info(`[${element}] Finished downloading`);
			const appPath = getState().appPath;
			if (gitDir.includes(appPath)) {
				gitDir = gitDir.split(appPath)[1].replace(/\\/g,'/');
			}
			if (!localDirs.includes(gitDir)) localDirs.push(gitDir);
			return localDirs;
		} else {
			logger.info(`[${element}] Updating...`);
			await gitPull({
				dir: gitDir
			})
			logger.info(`[${element}] Finished updating`);
			return null;
		}
	} catch(err) {
		throw Error(err);
	}
}
