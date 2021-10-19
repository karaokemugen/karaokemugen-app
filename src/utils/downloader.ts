// Node modules
import agent from 'agentkeepalive';
import Queue from 'better-queue';
import {createWriteStream} from 'fs';
import {basename} from 'path';
import prettyBytes from 'pretty-bytes';

import HTTP from '../lib/utils/http';
// KM Imports
import logger from '../lib/utils/logger';
import Task from '../lib/utils/taskManager';
// Types
import { DownloadItem, DownloadOpts } from '../types/downloader';

/** Downloader class, to download one or more files, complete with a progress bar and crepes. */

export default class Downloader {

	list: DownloadItem[];
	pos = 0;
	opts: DownloadOpts;
	fileErrors: string[] = [];
	task: Task;
	onEnd: (this: void, errors: string[]) => void;
	q: Queue<DownloadItem, never>;

	constructor(opts: DownloadOpts) {
		this.opts = opts;
		this.onEnd = null;
		this.task = this.opts.task;
		this.q = new Queue(this._queueDownload, {
			id: 'id',
			cancelIfRunning: true
		});
	}

	_queueDownload = (input: DownloadItem, done: (error?: any) => void) => {
		this._download(input)
			.then(() => done())
			.catch((err: Error) => done(err));
	}

	download = (list: DownloadItem[]): Promise<string[]> => {
		// Launches download queue
		this.list = list;
		list.forEach(item => {
			this.q.push(item);
		});
		return new Promise(resolve => {
			this.q.on('drain', () => {
				resolve(this.fileErrors);
			});
		});
	}

	/** Do the download dance now */
	_download = async (dl: DownloadItem) => {
		this.pos++;
		const options = {
			// for downloads we need keepalive or else connections can timeout and get stuck. Such is life.
			agent: {
				http: new agent(),
				https: new agent.HttpsAgent()
			}
		};
		let size: string;
		try {
			const response = await HTTP.head(dl.url, options);
			size = response.headers['content-length'];
		} catch(err) {
			logger.error(`Error during download of ${basename(dl.filename)} (HEAD)`, {service: 'Download', obj: err});
			this.fileErrors.push(basename(dl.filename));
			return;
		}
		let prettySize = prettyBytes(+size);
		if (!prettySize) prettySize = 'size unknown';
		logger.info(`(${this.pos}/${this.list.length}) Downloading ${basename(dl.filename)} (${prettySize})`, {service: 'Download'});
		if (this.task) this.task.update({
			subtext: `${basename(dl.filename)} (${prettySize})`,
			value: 0,
			total: +size
		});
		// Insert auth in the url string
		if (this.opts.auth) {
			const arr = dl.url.split('://');
			dl.url = `${arr[0]}://${this.opts.auth.user}:${this.opts.auth.pass}@${arr[1]}`;
		}
		try {
			await this._fetchFile(dl, options);
		} catch(err) {
			logger.error(`Error during download of ${basename(dl.filename)} (GET)`, {service: 'Download', obj: err});
			this.fileErrors.push(basename(dl.filename));
			return;
		}
	}

	_fetchFile = (dl: DownloadItem, options: any) => {
		return new Promise<void>((resolve, reject) => {
			let size = 0;
			HTTP.stream.get(dl.url, options)
				.on('response', (res: Response) => {
					size = +res.headers['content-length'];
				})
				.on('downloadProgress', state => {
					if (this.task) this.task.update({
						value: state.transferred
					});
				})
				.on('error', (err: any) => {
					reject(err);
				})
				.on('end', () => {
					if (this.task) this.task.update({
						value: size
					});
					resolve();
				})
				.pipe(createWriteStream(dl.filename));
		});
	}
}

// The crepes are a lie.

// The progress bar as well. It was removed when we switched to Electron and didn't need the console anymore.
