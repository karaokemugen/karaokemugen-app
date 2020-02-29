// KM Imports
const internet = require('internet-available');

// Node modules
const fs = require('fs');
const {mkdirpSync, removeSync} = require('fs-extra');
const { pull, clone}  = require('isomorphic-git');
const { parentPort, workerData } = require('worker_threads');
const http = require('isomorphic-git/http/node');

function logger(msg) {
	parentPort.postMessage({
		type: 'log',
		data: msg
	});
}

async function gitUpdate(o) {
	try {
		if (!fs.existsSync(o.gitDir) || !fs.existsSync(o.gitDir + '/.git')) {
			logger(`[${o.type}] Downloading...`);
			try {
				await internet();
			} catch (err) {
				throw 'Internet not available';
			}
			// Git clone
			try {
				try {
					mkdirpSync(o.gitDir);
				} catch(err) {
					// Non-fatal
				}
				await clone({
					fs: fs,
					http: http,
					dir: o.gitDir,
					url: o.gitURL
				});
				logger(`[${o.type}] Finished downloading`);
				return o.localDirs;
			} catch(err) {
				throw err;
			}
		} else {
			try {
				await internet();
			} catch (err) {
				throw 'Internet not available';
			}
			logger(`[${o.type}] Updating...`);
			try {
				await pull({
					fs: fs,
					http: http,
					dir: o.gitDir,
					author: {
						name: 'KMApp',
						email: 'kmapp@karaokes.moe'
					}
				});
			} catch(err) {
				//Pull failed, trying a clone
				//Issue is reported here :
				//https://github.com/isomorphic-git/isomorphic-git/issues/963
				logger(`[${o.type}] Updating failed, trying wipe and reclone: ${err}`);
				try {
					removeSync(o.gitDir);
					return await gitUpdate({
						gitDir: o.gitDir,
						gitURL: o.gitURL,
						type: o.type,
						localDirs: o.localDirs,
						logger: null
					});
				} catch(err) {
					//Clone also failed, error might be elsewhere
					throw 'git Error even after a clone';
				}
			} finally {
				logger(`[${o.type}] Finished updating`);
				return null;
			}
		}
	} catch(err) {
		throw Error(err);
	}
}

gitUpdate(workerData.options)
	.then(localDirs => {
		parentPort.postMessage({
			type: 'status-success',
			data: localDirs
		});
	})
	.catch(err => {
		parentPort.postMessage({
			type: 'status-failed',
			data: err
		});
	});