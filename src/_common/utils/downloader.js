import {createWriteStream} from 'fs';
import _cliProgress from 'cli-progress';
import req from 'request';
import progress from 'request-progress';
import logger from 'winston';
import {basename} from 'path';

class Downloader {

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

	// Fonction qui déclenche la chaîne de téléchargements.
	download = onEnd => {
	  if (onEnd) this.onEnd = onEnd;
	  if (this.pos >= this.list.length) {
			this.onEnd(this.fileErrors);
	  } else {
			const nextUrl = this.list[this.pos].url;
			const nextFilename = this.list[this.pos].filename;
			logger.info(`[Download] (${this.pos+1}/${this.list.length}) Downloading ${basename(nextFilename)}`);
			this.pos = this.pos + 1;
			this.DoDownload(nextUrl, nextFilename, this.download , err => console.log(err));
	  }
	}

	DoDownload = (url, filename, onSuccess, onError) => {
		const options = {
			url: url,
			method: 'GET'
		};
		if (this.opts.auth) options.auth = {
			user: this.opts.auth.user,
			pass: this.opts.auth.password
		};
		let stream = createWriteStream(filename);
		let size = 0;
		progress(req(options))
			.on('response', res => {
				size = res.headers['content-length'];
				if (this.opts.bar) this.bar.start(Math.floor(size / 1000) / 1000, 0);
			})
			.on('progress', state => {
				if (this.opts.bar) this.bar.update(Math.floor(state.size.transferred / 1000) / 1000);
			})
			.on('error', err => {
				if (this.opts.bar) this.bar.stop();
				this.fileErrors.push(filename);
				logger.error(`[Download] Error downloading ${filename} : ${err}`);
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

module.exports = Downloader;