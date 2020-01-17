// KM Imports
import {asyncExists, asyncMkdirp} from '../lib/utils/files';
import logger from '../lib/utils/logger';
import internet from 'internet-available';

// Node modules
import fs from 'fs';
import { plugins as gitPlugins, pull as gitPull, clone as gitClone} from 'isomorphic-git';

gitPlugins.set('fs', fs);

export async function gitUpdate(gitDir: string, gitURL: string, element: string, localDirs: string[]): Promise<string[]> {
	try {
		if (!await asyncExists(gitDir) || !await asyncExists(gitDir + '/.git')) {
			logger.info(`[${element}] Downloading...`);
			if (!await internet()) throw 'Internet not available'
			// Git clone
			if (!await asyncExists(gitDir)) await asyncMkdirp(gitDir);
			await gitClone({
				dir: gitDir,
				url: gitURL
			})
			logger.info(`[${element}] Finished downloading`);
			return localDirs;
		} else {
			if (!await internet()) throw 'Internet not available'
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
