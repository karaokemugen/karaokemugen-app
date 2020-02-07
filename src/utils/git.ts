// KM Imports
import {asyncExists, asyncCheckOrMkdir, asyncRemove} from '../lib/utils/files';
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
			try {
				await internet();
			} catch (err) {
				throw 'Internet not available';
			}
			// Git clone
			try {
				await asyncCheckOrMkdir(gitDir);
				await gitClone({
					dir: gitDir,
					url: gitURL
				});
				logger.info(`[${element}] Finished downloading`);
				return localDirs;
			} catch(err) {
				throw err;
			}
		} else {
			try {
				await internet();
			} catch (err) {
				throw 'Internet not available';
			}
			logger.info(`[${element}] Updating...`);
			try {
				await gitPull({
					dir: gitDir
				})
			} catch(err) {
				//Pull failed, trying a clone
				//Issue is reported here :
				//https://github.com/isomorphic-git/isomorphic-git/issues/963
				logger.warn(`[${element}] Updating failed, trying wipe and reclone`)
				try {
					await asyncRemove(gitDir);
					return await gitUpdate(gitDir, gitURL, element, localDirs);
				} catch(err) {
					//Clone also failed, error might be elsewhere
					logger.error(`[${element}] Failed updating even with a reclone : ${err}`);
					throw 'git Error';
				}
			} finally {
				logger.info(`[${element}] Finished updating`);
				return null;
			}
		}
	} catch(err) {
		throw Error(err);
	}
}
