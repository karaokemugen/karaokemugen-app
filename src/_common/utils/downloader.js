import _cliProgress from 'cli-progress';
import logger from 'winston';
import {basename} from 'path';
import execa from 'execa';
import prettyBytes from 'pretty-bytes';
import {stat} from 'fs';
import {getConfig} from './config';

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
			const nextSize = this.list[this.pos].size;
			let prettySize = 'size unknown';
			if (nextSize) prettySize = prettyBytes(nextSize);
			logger.info(`[Download] (${this.pos+1}/${this.list.length}) Downloading ${basename(nextFilename)} (${prettySize})`);
			this.pos = this.pos + 1;
			this.DoDownload(nextUrl, nextFilename, nextSize, this.download , err => {
				logger.error(`[Download] Error downloading ${basename(nextFilename)} : ${err}`);
				this.fileErrors.push(basename(nextFilename));
				this.download();
			});
	  }
	}

	fetchSize = (url, auth) => {

	}
	DoDownload = (url, filename, size, onSuccess, onError) => {
		if (this.opts.bar && size) this.bar.start(Math.floor(size / 1000) / 1000, 0);
		let options = [url, '-o', `"${filename.replace(/\\\\/g,'\\')}"`, '--retry','999','--retry-max-time','0','-C','-'];
		let timer;
		if (this.opts.auth) options.push(`-u ${this.opts.auth.user}:${this.opts.auth.pass}`);
		logger.debug(`[Download] Running : curl ${options.join(' ')}`);
		execa(getConfig().BincurlPath, options, {windowsVerbatimArguments: true, encoding: 'utf8'})
			.then(() => {
				if (this.opts.bar && size) {
					this.bar.update((Math.floor(size / 1000)) / 1000);
					this.bar.stop();
				}
				onSuccess();
				clearInterval(timer);
			})
			.catch((err) => {
				if (this.opts.bar) {
					this.bar.stop();
				}
				onError(err);
				clearInterval(timer);
			});
		timer = setInterval(() => {
			if (this.opts.bar && size) {
				stat(filename, (err, data) => {
					if (!err) this.bar.update(Math.floor(data.size / 1000) / 1000);
				});
			}
		}, 100);
	}
}