import {createWriteStream} from 'fs';
import _cliProgress from 'cli-progress';
import got from 'got';
import logger from 'winston';
import {basename} from 'path';
import execa from 'execa';

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
			logger.info(`[Download] (${this.pos+1}/${this.list.length}) Downloading ${basename(nextFilename)}`);
			this.pos = this.pos + 1;
			this.DoDownload(nextUrl, nextFilename, this.download , err => {
				logger.error(`[Download] Error downloading ${basename(nextFilename)} : ${err}`);
				this.fileErrors.push(basename(nextFilename));
				this.download();
			});
	  }
	}

	DoDownload = (url, filename, onSuccess, onError) => {
		let options = ['-q', '--show-progress', url, '-O', filename];
		if (this.opts.auth) {
			options.push(`--http-user=${this.opts.auth.user}`);
			options.push(`--http-password=${this.opts.auth.pass}`);
		}
		execa('wget', options, {encoding: 'utf8'})
			.then(() => {
				onSuccess();
			})
			.catch((err) => {
				onError(err);
			});
		/*const options = {
			url: url,
			method: 'GET',
			timeout: 20000,
			retry: 20
		};
		if (this.opts.auth) options.auth = `${this.opts.auth.user}:${this.opts.auth.pass}`;
		let stream = createWriteStream(filename);
		let size = 0;
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
		*/
	}
}