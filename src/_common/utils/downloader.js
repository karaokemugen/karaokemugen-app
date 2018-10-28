import _cliProgress from 'cli-progress';
import logger from 'winston';
import {basename} from 'path';
import got from 'got';
import prettyBytes from 'pretty-bytes';
import {createWriteStream} from 'fs';
import { getConfig } from './config';
import { emitWS } from '../../_webapp/frontend';


export default class Downloader {

	constructor(list, opts) {
	  this.list = list;
	  this.pos = 0;
	  this.opts = opts;
	  this.onEnd = null;
	  this.fileErrors = [];
	  if (opts.bar) {
	  	const barFormat = 'Downloading {bar} {percentage}% {value}/{total} Mb - ETA {eta_formatted}';
	  	this.bar = new _cliProgress.Bar({
				format: barFormat,
				stopOnComplete: true
	  }, _cliProgress.Presets.shades_classic);
		}
	}

	// Triggers the download chain
	download = onEnd => {
	  if (onEnd) this.onEnd = onEnd;
	  if (this.pos >= this.list.length) {
			this.onEnd(this.fileErrors);
	  } else {
			const nextUrl = this.list[this.pos].url;
			const nextFilename = this.list[this.pos].filename;
			let nextSize = 'size unknown';
			const tryURL = new Promise((resolve, reject) => {
				// Try to run a HEAD to get the size
				let options = {
					method: 'HEAD'
				};
				if (this.opts.auth) options.auth = {
					username: this.opts.auth.user,
					password: this.opts.auth.pass
				};
				got(nextUrl, options)
					.then(response => {
						if (!nextSize) nextSize = response.headers['content-length'];
						resolve(response);
					})
					.catch(err => {
						reject(err);
					});
			});
			let prettySize = 'size unknown';
			tryURL.then(() => {
				if (nextSize) prettySize = prettyBytes(+nextSize);
				logger.info(`[Download] (${this.pos+1}/${this.list.length}) Downloading ${basename(nextFilename)} (${prettySize})`);
				emitWS('downloadBatchProgress', {
					text: `Downloading file ${this.pos} of ${this.list.length}`,
					value: this.pos,
					total: this.list.length
				});
				this.pos = this.pos + 1;
				this.DoDownload(nextUrl, nextFilename, nextSize, this.download , err => {
					logger.error(`[Download] Error during download of ${basename(nextFilename)} : ${err}`);
					this.fileErrors.push(basename(nextFilename));
					this.download();
				});
			})
				.catch((err) => {
					logger.error(`[Download] (${this.pos+1}/${this.list.length}) Unable to start download of ${basename(nextFilename)} (${prettySize}) : ${err}`);
					this.pos = this.pos + 1;
					this.fileErrors.push(basename(nextFilename));
					this.download();
				});
	  }
	}

	DoDownload = (url, filename, size, onSuccess, onError) => {

		if (this.opts.bar && size) this.bar.start(Math.floor(size / 1000) / 1000, 0);
		const HttpAgent = require('agentkeepalive');
		const {HttpsAgent} = HttpAgent;
		const options = {
			method: 'GET',
			retry: 20,
			agent: {
				http: new HttpAgent(),
				https: new HttpsAgent()
			},
			headers: {
				'user-agent': `KaraokeMugen/${getConfig().VersionNo}`
			}
		};
		let stream = createWriteStream(filename);
		if (this.opts.auth) options.auth = `${this.opts.auth.user}:${this.opts.auth.pass}`;
		got.stream(url, options)
			.on('response', res => {
				size = res.headers['content-length'];
				if (this.opts.bar) {
					this.bar.start(Math.floor(size / 1000) / 1000, 0);
				}
			})
			.on('downloadProgress', state => {
				if (this.opts.bar) {
					this.bar.update(Math.floor(state.transferred / 1000) / 1000);
				}
				emitWS('downloadProgress', {
					text: `Downloading : ${basename(filename)}`,
					value: state.transferred,
					total: size
				});
			})
			.on('error', err => {
				if (this.opts.bar) {
					this.bar.stop();
				}
				onError(err);
			})
			.on('end', () => {
				if (this.opts.bar) {
					this.bar.update((Math.floor(size / 1000)) / 1000);
					this.bar.stop();
				}
				onSuccess();
			})
			.pipe(stream);
	}
}