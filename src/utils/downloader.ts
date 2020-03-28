// Node modules
import _cliProgress from 'cli-progress';
import {basename} from 'path';
import got from 'got';
import prettyBytes from 'pretty-bytes';
import {createWriteStream} from 'fs';
import Queue from 'better-queue';

// KM Imports
import logger from '../lib/utils/logger';
import { getState } from './state';

// Types
import { DownloadItem, DownloadOpts } from '../types/downloader';
import Task from '../lib/utils/taskManager';

// for downloads we need keepalive or else connections can timeout and get stuck. Such is life.
const HttpAgent = require('agentkeepalive');
const {HttpsAgent} = HttpAgent;

/** Downloader class, to download one or more files, complete with a progress bar and crepes. */

export default class Downloader {

	list: DownloadItem[];
	pos: number = 0;
	opts: DownloadOpts;
	fileErrors: string[] = [];
	bar: _cliProgress.Bar;
	task: Task;
	onEnd: (this: void, errors: string[]) => void;
	queueOptions = {
		id: 'uuid',
		cancelIfRunning: true
	};
	q: any;

	constructor(opts: DownloadOpts) {
		this.opts = opts;
		this.onEnd = null;
		this.task = this.opts.task;
		this.q = new Queue(this._queueDownload, this.queueOptions);
		if (opts.bar) this.bar = new _cliProgress.Bar({
				format:  'Downloading {bar} {percentage}% {value}/{total} Mb',
				stopOnComplete: true
		}, _cliProgress.Presets.shades_classic);
	}

	_queueDownload = (input: DownloadItem, done: any) => {
		this._download(input)
			.then(() => done())
			.catch((err: Error) => done(err));
	}

	download = async (list: DownloadItem[]): Promise<string[]> => {
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
		let options = {
			agent: {
				http: new HttpAgent(),
				https: new HttpsAgent()
			},
			headers: {
				'user-agent': `KaraokeMugen/${getState().version.number}`
			}
		};
		let size: string;
		try {
			const response = await got.head(dl.url, options)
			size = response.headers['content-length'];
		} catch(err) {
			logger.error(`[Download] Error during download of ${basename(dl.filename)} (HEAD) : ${err}`);
			this.fileErrors.push(basename(dl.filename));
			return;
		}
		let prettySize = 'size unknown';
		prettySize = prettyBytes(+size);
		logger.info(`[Download] (${this.pos}/${this.list.length}) Downloading ${basename(dl.filename)} (${prettySize})`);
		this.task.update({
			subtext: `${basename(dl.filename)} (${prettySize})`,
			value: 0,
			total: +size
		})
		if (this.opts.bar && size) this.bar.start(Math.floor(+size / 1000) / 1000, 0);
		// Insert auth in the url string
		if (this.opts.auth) {
			const arr = dl.url.split('://');
			dl.url = `${arr[0]}://${this.opts.auth.user}:${this.opts.auth.pass}@${arr[1]}`;
		}
		try {
			await this._fetchFile(dl, options);
		} catch(err) {
			logger.error(`[Download] Error during download of ${basename(dl.filename)} (GET) : ${err}`);
			this.fileErrors.push(basename(dl.filename));
			return;
		}
	}

	_fetchFile = async (dl: DownloadItem, options: any) => {
		return new Promise((resolve, reject) => {
			let size: number = 0;
			got.stream.get(dl.url, options)
				.on('response', (res: Response) => {
					size = +res.headers['content-length'];
					if (this.opts.bar) {
						this.bar.start(Math.floor(size / 1000) / 1000, 0);
					}
				})
				.on('downloadProgress', state => {
					const value = Math.floor(state.transferred / 1000) / 1000;
					if (this.opts.bar) {
						this.bar.update(value);
					}
					this.task.update({
						value: value
					});
				})
				.on('error', (err: any) => {
					if (this.opts.bar) {
						this.bar.stop();
					}
					reject(err);
				})
				.on('end', () => {
					if (this.opts.bar) {
						this.bar.update((Math.floor(size / 1000)) / 1000);
						this.bar.stop();
					}
					this.task.update({
						value: (Math.floor(size / 1000)) / 1000
					});
					resolve();
				})
				.pipe(createWriteStream(dl.filename));
		});
	}
}

// The crepes are a lie.