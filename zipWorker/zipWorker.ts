/* eslint-env browser */

import extract = require('extract-zip');
const { ipcRenderer } = require('electron');
const { parentPort } = require('worker_threads');

async function unzip(path: string, outDir: string) {
	console.log('Request to unzip', path, outDir);
	let error: any;
	let firstDir: string;
	try {
		await extract(path, {
			dir: outDir,
			onEntry: (entry, zipFile) => {
				if (entry.crc32 === 0 && !firstDir) {
					firstDir = entry.fileName.slice(0, entry.fileName.length - 1);
				}
				const message = {
					zip: path,
					filename: entry.fileName,
					current: zipFile.entriesRead,
					total: zipFile.entryCount
				};
				if (ipcRenderer) {
					ipcRenderer.send('unzipProgress', message);
				} else {
					parentPort.postMessage({
						type: 'unzipProgress',
						message: message
					});
				}
			}
		});
	} catch(err) {
		error = err;
	} finally {
		if (ipcRenderer) {
			console.log('Sending message', firstDir);
			if (error) console.error(error);
			ipcRenderer.send('unzipEnd', {
				error: !!error,
				outDir: firstDir
			});
		} else {
			if (error) {
				parentPort.postMessage({
					type: 'unzipError',
					message: error
				});
			} else {
				parentPort.postMessage({
					type: 'unzipEnd',
					message: firstDir
				});
			}
			process.exit();
		}
	}
}

if (ipcRenderer) {
	ipcRenderer.on('unzip', async (_event, { path, outDir }) => {
		await unzip(path, outDir);
	});
} else {
	parentPort.on('message', async ({ type, data }) => {
		if (type === 'unzip') {
			await unzip(data.path, data.outDir);
		} else {
			process.exit();
		}
	});
}
