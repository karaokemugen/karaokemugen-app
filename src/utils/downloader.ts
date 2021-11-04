// Node modules
import { promise as fastq } from 'fastq';
import {createWriteStream} from 'fs';
import {basename} from 'path';
import prettyBytes from 'pretty-bytes';
import { Readable } from 'stream';

import HTTP from '../lib/utils/http';
// KM Imports
import logger from '../lib/utils/logger';
import Task from '../lib/utils/taskManager';
// Types
import { DownloadItem } from '../types/downloader';

/** Downloader utilities, to download one or more files, complete with ~~a progress bar~~ and crepes. */

async function fetchFile(dl: DownloadItem, task?: Task) {
	if (task) task.update({
		total: dl.size
	});
	const writer = createWriteStream(dl.filename);
	const streamResponse = await HTTP.get<Readable>(dl.url, {
		responseType: 'stream'
	});
	streamResponse.data.pipe(writer, {end: true});
	const interval = setInterval(() => {
		task.update({
			value: writer.bytesWritten
		});
	}, 500);

	return new Promise<void>((resolve, reject) => {
		writer.on('finish', () => {
			if (task) task.update({
				value: dl.size
			});
			clearInterval(interval);
			resolve();
		});
		writer.on('error', err => {
			clearInterval(interval);
			reject(err);
		});
	});
}

export async function downloadFile(dl: DownloadItem, task?: Task, log_prepend?: string) {
	try {
		const response = await HTTP.head(dl.url);
		dl.size = +response.headers['content-length'];
	} catch(err) {
		logger.error(`Error during download of ${basename(dl.filename)} (HEAD)`, {service: 'Download', obj: err});
		task.end();
		throw err;
	}
	let prettySize = prettyBytes(dl.size);
	if (!prettySize) prettySize = 'size unknown';
	logger.info(`${log_prepend ? `${log_prepend} `:''}Downloading ${basename(dl.filename)} (${prettySize})`, {service: 'Download'});
	if (task) task.update({
		subtext: `${basename(dl.filename)} (${prettySize})`,
		value: 0,
		total: dl.size
	});
	try {
		await fetchFile(dl, task);
	} catch(err) {
		logger.error(`Error during download of ${basename(dl.filename)} (GET)`, {service: 'Download', obj: err});
		task.end();
		throw err;
	}
}

// the 2 last numbers are index (+ 1) of the task in queue and the length of queue
const wrappedDownloadFile = (payload: [DownloadItem, Task, number, number]) =>
	downloadFile(payload[0], payload[1], `(${payload[2]}/${payload[3]})`).catch(err => {
		// All errors should be captured correctly by handlers in downloadFile but this is like the ultimate safetynet
		logger.debug(`DL Queue entry ${payload[2]}/${payload[3]} failed`, {service: 'Downloader', obj: err});
		throw new Error(payload[0].filename);
	});

export async function downloadFiles(files: DownloadItem[], task?: Task) {
	const queue = fastq<never, [DownloadItem, Task, number, number], void>(wrappedDownloadFile, 1);
	const errors: string[] = [];
	queue.error((err: Error) => {
		if (err) errors.push(err.message);
	});
	files.forEach((dl, i) => queue.push([dl, task, i+1, files.length]));
	await queue.drained();
	return errors;
}

// The crepes are a lie.

// The progress bar as well. It was removed when we switched to Electron and didn't need the console anymore.
