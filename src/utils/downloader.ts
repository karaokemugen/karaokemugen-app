import _cliProgress from 'cli-progress';
import logger from '../lib/utils/logger';
import {basename} from 'path';
import got from 'got';
import prettyBytes from 'pretty-bytes';
import {createWriteStream} from 'fs';
import { getState } from './state';
import { emitWS } from '../lib/utils/ws';
import { DownloadItem, DownloadOpts } from '../types/downloader';
import Queue from 'better-queue';

const HttpAgent = require('agentkeepalive');
const {HttpsAgent} = HttpAgent;

/** Downloader class, to download one or more files, complete with a progress bar and crepes. */

export default class Downloader {

	list: DownloadItem[];
	pos: number = 0;
	opts: DownloadOpts;
	fileErrors: string[] = [];
	bar: _cliProgress.Bar;
	onEnd: (this: void, errors: string[]) => void;
	queueOptions = {
		id: 'uuid',
		cancelIfRunning: true
	};
	q: any;

	constructor(opts: DownloadOpts) {
		this.opts = opts;
		this.onEnd = null;
		this.q = new Queue(this.queueDownload, this.queueOptions);
		if (opts.bar)	this.bar = new _cliProgress.Bar({
				format:  'Downloading {bar} {percentage}% {value}/{total} Mb',
				stopOnComplete: true
		}, _cliProgress.Presets.shades_classic);
	}

	queueDownload = (input: DownloadItem, done: any) => {
		this.doDownload(input)
			.then(() => done())
			.catch((err: Error) => done(err));
	}

	download = async (list: DownloadItem[]): Promise<string[]> => {
		// Launches download queue
		this.list = list;
		list.forEach(item => {
			this.q.push(item);
		});
		return new Promise((resolve) => {
			this.q.on('drain', () => {
				resolve(this.fileErrors);
			});
		});
	}

	/** Do the download dance now */
	doDownload = async (dl: DownloadItem) => {
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
			logger.error(`[Download] Error during download of ${basename(dl.filename)} : ${err}`);
			this.fileErrors.push(basename(dl.filename));
			return;
		}
		let prettySize = 'size unknown';
		prettySize = prettyBytes(+size);
		logger.info(`[Download] (${this.pos}/${this.list.length}) Downloading ${basename(dl.filename)} (${prettySize})`);
		emitWS('downloadBatchProgress', {
			text: `Downloading file ${this.pos} of ${this.list.length}`,
			value: this.pos,
			total: this.list.length,
			id: dl.id
		});
		if (this.opts.bar && size) this.bar.start(Math.floor(+size / 1000) / 1000, 0);
		// Insert auth in the url string
		if (this.opts.auth) {
			const arr = dl.url.split('://');
			dl.url = `${arr[0]}://${this.opts.auth.user}:${this.opts.auth.pass}@${arr[1]}`;
		}
		try {
			await this.fetchFile(dl, options);
		} catch(err) {
			logger.error(`[Download] Error during download of ${basename(dl.filename)} : ${err}`);
			this.fileErrors.push(basename(dl.filename));
			return;
		}
	}

	fetchFile = async (dl: DownloadItem, options: any) => {
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
					if (this.opts.bar) {
						this.bar.update(Math.floor(state.transferred / 1000) / 1000);
					}
					emitWS('downloadProgress', {
						text: `Downloading : ${basename(dl.filename)}`,
						value: state.transferred,
						total: size,
						id: dl.id
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
					resolve();
				})
				.pipe(createWriteStream(dl.filename));
		});
	}
}

// The crepes are a lie.