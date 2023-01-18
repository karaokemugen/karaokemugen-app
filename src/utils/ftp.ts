import { Client } from 'basic-ftp';
import { promises as fs } from 'fs';
import { basename } from 'path';
import prettyBytes from 'pretty-bytes';

import { Repository } from '../lib/types/repo';
import logger from '../lib/utils/logger';
import Task from '../lib/utils/taskManager';
import { getRepo } from '../services/repo';

const service = 'FTP';

interface FTPOptions {
	repoName: string;
}

export default class FTP {
	client: Client;

	opts: FTPOptions;

	constructor(opts: FTPOptions) {
		this.opts = opts;
	}

	async connect() {
		const repo = getRepo(this.opts.repoName);
		if (!repo) throw 'Unknown repository';
		if (this.validateFTPSettings(repo)) {
			this.client = new Client();
			logger.info(`Connecting to FTP for ${repo.Name}`, { service });
			try {
				await this.client.access({
					host: repo.FTP.Host,
					user: repo.FTP.Username,
					password: repo.FTP.Password,
					secure: false, // for now, shut up please.
					port: repo.FTP.Port || 21,
				});
			} catch (err) {
				logger.error(`Failed to connect to FTP for repository ${repo.Name}: ${err}`, {
					service,
					obj: err,
				});
				throw err;
			}
			if (repo.FTP.BaseDir) {
				try {
					logger.info(`Switching to directory ${repo.FTP.BaseDir}`, { service });
					await this.client.cd(repo.FTP.BaseDir);
				} catch (err) {
					logger.error(`Failed to switch to directory ${repo.FTP.BaseDir}: ${err}`, {
						service,
						obj: err,
					});
					throw err;
				}
			}
			this.client.ftp.log = logger.debug;
		}
	}

	async rename(origFile: string, newFile: string) {
		logger.info(`Renaming file "${origFile}" to "${newFile}"`, { service });
		return this.client.rename(origFile, newFile);
	}

	async delete(file: string) {
		logger.info(`Deleting file ${file}`, { service });
		return this.client.remove(basename(file));
	}

	async upload(file: string) {
		logger.info(`Sending file ${file}`, { service });
		const stat = await fs.stat(file).catch(_err => {
			throw `File "${file}" unknown on local folder`;
		});
		const task = new Task({
			text: 'UPLOADING_FTP',
			value: 0,
			total: stat.size,
		});
		this.client.trackProgress(info => {
			task.update({
				subtext: `${this.opts.repoName}: ${info.name} - ${prettyBytes(info.bytes)} / ${prettyBytes(stat.size)}`,
				total: stat.size,
				value: info.bytes,
			});
		});
		try {
			await this.client.uploadFrom(file, basename(file));
			logger.info(`File "${file}" uploaded!`, { service });
		} catch (err) {
			logger.error(`Failed to send file ${basename(file)}: ${err}`, { service, obj: err });
			throw err;
		} finally {
			// Stop tracking progress
			this.client.trackProgress();
			task.end();
		}
	}

	async disconnect() {
		return this.client.close();
	}

	private validateFTPSettings(repo: Repository) {
		if ('FTP' in repo) {
			const ftp = repo.FTP;
			if (!ftp.Host || !ftp.Password || !ftp.Username) throw 'Invalid settings in FTP configuration';
			else return true;
		} else {
			throw 'FTP not configured';
		}
	}
}
