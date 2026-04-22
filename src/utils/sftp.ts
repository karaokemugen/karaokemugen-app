import sftp from 'ssh2-sftp-client';
import { promises as fs } from 'fs';
import { basename } from 'path';
import prettyBytes from 'pretty-bytes';

import { Repository } from '../lib/types/repo.js';
import logger from '../lib/utils/logger.js';
import Task from '../lib/utils/taskManager.js';
import { getRepo } from '../services/repo.js';

const service = 'SFTP';

interface SFTPOptions {
    repoName: string;
    baseDir: string;
}

export default class SFTP {
    client: sftp;
    opts: SFTPOptions;

    constructor(opts: SFTPOptions) {
        this.opts = opts;
    }

    async connect() {
        const repo = getRepo(this.opts.repoName);
        if (!repo) throw 'Unknown repository';
        if (this.validateSFTPSettings(repo)) {
            this.client = new sftp();
            logger.info(`Connecting to SFTP for ${repo.Name}`, { service });
            try {
                await this.client.connect({
                    host: repo.SFTP.Host,
                    username: repo.SFTP.Username,
                    password: repo.SFTP.Password,
                    port: repo.SFTP.Port || 22,
                    // FIXME: Not sure if this is needed
                    //tryKeyboard: true,
                    debug: msg => {
                        if (msg.startsWith('CLIENT')) {
                            logger.debug(msg, { service });
                        }
                    }
                });
            } catch (err) {
                logger.error(`Failed to connect to SFTP for repository ${repo.Name}: ${err}`, {
                    service,
                    obj: err,
                });
                throw err;
            }                        
        }
    }

    async rename(origFile: string, newFile: string) {
        logger.info(`Renaming file "${origFile}" to "${newFile}"`, { service });
        return this.client.rename(
            `${this.opts.baseDir || '.'}/${origFile}`, 
            `${this.opts.baseDir || '.'}/${newFile}`
        );
    }

    async delete(file: string) {
        logger.info(`Deleting file ${file}`, { service });
        return this.client.delete(`${this.opts.baseDir || '.'}/${basename(file)}`);
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
        try {
            await this.client.fastPut(file, `${this.opts.baseDir || '.'}/${basename(file)}`, {
                step: step => {
                    task.update({
                        subtext: `${this.opts.repoName}: ${basename(file)} - ${prettyBytes(step)} / ${prettyBytes(stat.size)}`,
                        total: stat.size,
                        value: step,
                    });
                }
            });
            logger.info(`File "${file}" uploaded!`, { service });
        } catch (err) {
            logger.error(`Failed to send file ${basename(file)}: ${err}`, { service, obj: err });
            throw err;
        } finally {
            task.end();
        }
    }

    async disconnect() {
        return this.client.end();
    }

    private validateSFTPSettings(repo: Repository) {
        if ('SFTP' in repo) {
            const sftp = repo.SFTP;
            if (!sftp.Host || !sftp.Password || !sftp.Username) throw 'Invalid settings in SFTP configuration';
            else return true;
        } else {
            throw 'FTP not configured';
        }
    }
}
