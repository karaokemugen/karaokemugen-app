/* eslint-env browser */

import extract = require('extract-zip');
const { ipcRenderer } = require('electron');

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
				ipcRenderer.send('unzipProgress', message);
			}
		});
	} catch(err) {
		error = err;
	} finally {
		console.log('Sending message', firstDir);
		if (error) console.error(error);
		ipcRenderer.send('unzipEnd', {
			error,
			outDir: firstDir
		});
	}
}

ipcRenderer.on('unzip', async (_event, { path, outDir }) => {
	await unzip(path, outDir);
});
