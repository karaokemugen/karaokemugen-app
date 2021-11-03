import {Client} from 'basic-ftp';
import { basename } from 'path';
import prettyBytes from 'pretty-bytes';

import { Repository } from '../lib/types/repo';
import { asyncExists } from '../lib/utils/files';
import logger from '../lib/utils/logger';
import Task from '../lib/utils/taskManager';
import { getRepo } from '../services/repo';

interface FTPOptions {
	repoName: string
}

export default class FTP {
	client: Client
	opts: FTPOptions

	constructor(opts: FTPOptions) {
		this.opts = opts;
	}

	async connect() {
		const repo = getRepo(this.opts.repoName);
		if (!repo) throw 'Unknown repository';
		this._validateFTPSettings(repo);
		this.client = new Client();
		logger.info(`Connecting to FTP for ${repo.Name}`, {obj: repo.FTP, service: 'FTP'});
		try {
			await this.client.access({
				host: repo.FTP.Host,
				user: repo.FTP.Username,
				password: repo.FTP.Password,
				secure: false, // for now, shut up please.
				port: repo.FTP.Port
			});
		} catch(err) {
			logger.error(`Failed to connect to FTP for repository ${repo.Name}: ${err}`, {service: 'FTP', obj: err});
			throw err;
		}
		if (repo.FTP.BaseDir) try {
			await this.client.cd(repo.FTP.BaseDir);
		} catch(err) {
			logger.error(`Failed to switch to directory ${repo.FTP.BaseDir}: ${err}`, {service: 'FTP', obj: err});
			throw err;
		}
		this.client.ftp.log = logger.debug;
	}

	async rename(origFile: string, newFile: string) {
		if (!await asyncExists(newFile)) throw 'File unknown';
		logger.info(`renaming file "${origFile}" to "${newFile}"`, {service: 'FTP'});
		return this.client.rename(origFile, newFile);
	}

	async delete(file: string) {
		logger.info(`Deleting file ${file}`, {service: 'FTP'});
		return this.client.remove(basename(file));
	}

	async upload(file: string) {
		if (!await asyncExists(file)) throw 'File unknown';
		logger.info(`Sending file ${file}`, {service: 'FTP'});
		const task = new Task({
			text: 'UPLOADING_FTP',
			value: 0,
			total: 100 // Initial value, will be updated later
		});
		this.client.trackProgress(info => {
			task.update({
				subtext: `${this.opts.repoName}: ${info.name} - ${prettyBytes(info.bytes)} / ${prettyBytes(info.bytesOverall)}}`,
				total: info.bytesOverall,
				value: info.bytes
			});
		});
		try {
			await this.client.uploadFrom(file, basename(file));
		} catch(err) {
			logger.error(`Failed to send file ${basename(file)}: ${err}`, {service: 'FTP', obj: err});
		} finally {
			// Stop tracking progress
			this.client.trackProgress();
			task.end();
		}
	}

	async disconnect() {
		return this.client.close();
	}

	_validateFTPSettings(repo: Repository) {
		const ftp = repo.FTP;
		if (!ftp) throw 'FTP not configured';
		if (!ftp.Port || !ftp.Host || !ftp.Password || !ftp.Username) throw 'Invalid settings in FTP configuration';
	}
}
