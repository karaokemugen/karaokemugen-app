import { promises as fs } from 'fs';
import { basename, resolve } from 'path';
import { setTimeout as sleep } from 'timers/promises';

import { baseChecksum } from '../dao/dataStore.js';
import { saveSetting } from '../lib/dao/database.js';
import { Inbox } from '../lib/types/inbox.js';
import { ASSFileCleanup } from '../lib/utils/ass.js';
import { getConfig, resolvedPath, resolvedPathRepos } from '../lib/utils/config.js';
import { downloadFile } from '../lib/utils/downloader.js';
import { ErrorKM } from '../lib/utils/error.js';
import { smartMove } from '../lib/utils/files.js';
import { closeIssue } from '../lib/utils/gitlab.js';
import HTTP, { fixedEncodeURIComponent } from '../lib/utils/http.js';
import logger from '../lib/utils/logger.js';
import Task from '../lib/utils/taskManager.js';
import { emitWS } from '../lib/utils/ws.js';
import { adminToken } from '../utils/constants.js';
import { assignIssue } from '../utils/gitlab.js';
import Sentry from '../utils/sentry.js';
import { getKara } from './kara.js';
import { integrateKaraFile } from './karaManagement.js';
import { checkDownloadStatus, getRepo } from './repo.js';
import { updateAllSmartPlaylists } from './smartPlaylist.js';
import { integrateTagFile } from './tag.js';

const service = 'Inbox';

export async function getInbox(repoName: string, token: string): Promise<Inbox[]> {
	const repo = getRepo(repoName);
	if (!repo) throw new ErrorKM('UNKNOWN_REPOSITORY', 404, false);
	try {
		const res = await HTTP.get(`https://${repoName}/api/inbox`, {
			headers: {
				authorization: token,
			},
		});
		return res.data;
	} catch (err) {
		if (err.response?.statusCode === 403) {
			throw new ErrorKM('INBOX_VIEW_FORBIDDEN_ERROR', 403, false);
		} else {
			logger.error(`Unable to get inbox contents : ${err}`, { service, obj: err });
			Sentry.error(err);
			throw new ErrorKM('INBOX_VIEW_ERROR');
		}
	}
}

export async function downloadKaraFromInbox(inid: string, repoName: string, token: string) {
	try {
		const repo = getRepo(repoName);
		if (!repo) throw new ErrorKM('UNKNOWN_REPOSITORY', 404, false);
		let kara: Inbox;
		logger.info(`Downloading song ${inid} from inbox at ${repoName}`, { service });
		try {
			const res = await HTTP.get(`https://${repoName}/api/inbox/${inid}`, {
				headers: {
					authorization: token,
				},
			});
			kara = res.data;
		} catch (err) {
			if (err.response?.statusCode === 403) {
				throw new ErrorKM('INBOX_VIEW_FORBIDDEN_ERROR', 403, false);
			} else {
				logger.error(`Unable to get inbox contents for INID ${inid} on ${repoName}: ${err}`, {
					service,
					obj: err,
				});
				throw new ErrorKM('INBOX_VIEW_ERROR');
			}
		}
		// If song has a parent in the inbox and we don't have it yet, download it first.
		const unknownKaras: string[] = [];
		if (kara.kara.data.data.parents) {
			for (const parent of kara.kara.data.data.parents) {
				const karaInDB = await getKara(parent, adminToken);
				if (!karaInDB) unknownKaras.push(parent);
			}
		}
		let inbox: Inbox[] = [];
		if (unknownKaras.length > 0) {
			inbox = await getInbox(repoName, token);
		}
		for (const unknownKara of unknownKaras) {
			const parentFromInbox = inbox.find(i => i.kid === unknownKara);
			if (!parentFromInbox) throw new ErrorKM('UNKNOWN_PARENT_FROM_INBOX', 404, false);
			await downloadKaraFromInbox(parentFromInbox.inid, repoName, token);
		}
		if (!kara.edited_kid) kara.kara.data.data.created_at = new Date().toISOString();
		kara.kara.data.data.modified_at = new Date().toISOString();
		const promises = [downloadMediaFromInbox(kara, repoName)];
		// Code to integrate kara and download medias
		let lyricsFile = '';
		if (kara.lyrics?.file) {
			lyricsFile = resolve(resolvedPathRepos('Lyrics', repoName)[0], kara.lyrics.file);
			await fs.writeFile(lyricsFile, kara.lyrics.data, 'utf-8');
		}
		for (const tag of kara.extra_tags) {
			const tagFile = resolve(resolvedPathRepos('Tags', repoName)[0], tag.file);
			await fs.writeFile(tagFile, JSON.stringify(tag.data, null, 2), 'utf-8');
			// Let's refresh the database when there are new tags.
			await integrateTagFile(tagFile);
		}
		const karaFile = resolve(resolvedPathRepos('Karaokes', repoName)[0], kara.kara.file);
		// Yes, we're actually reordering this in order for karas to be in the right order when written. For some reason Axios sorts JSON responses? Or is it KM Server? Who knows? Where is Carmen San Diego?
		await fs.writeFile(
			karaFile,
			JSON.stringify(
				{
					header: kara.kara.data.header,
					medias: kara.kara.data.medias,
					data: kara.kara.data.data,
				},
				null,
				2
			),
			'utf-8'
		);
		saveSetting('baseChecksum', await baseChecksum());
		const newKaraKid = await integrateKaraFile(karaFile, kara.kara.data, true, true, false);
		updateAllSmartPlaylists();
		await Promise.all(promises);

		const newDbKara = await getKara(newKaraKid, adminToken);
		// ASS file post processing
		if (lyricsFile && getConfig().Maintainer.ApplyLyricsCleanupOnKaraSave === true) {
			await ASSFileCleanup(lyricsFile, newDbKara);
		}

		checkDownloadStatus([kara.kara.data.data.kid]);
		markKaraAsDownloadedInInbox(inid, repoName, token);
		logger.info(`Song ${basename(kara.kara.file, '.kara.json')} from inbox at ${repoName} downloaded`, {
			service: 'Inbox',
		});
		emitWS('songDownloadedFromInbox', kara);
	} catch (err) {
		logger.error(`Inbox item ${inid} failed to download`, { service, obj: err });
		Sentry.error(err);
		emitWS('songDownloadedFromInboxFailed');
		throw err instanceof ErrorKM ? err : new ErrorKM('INBOX_DOWNLOAD_ERROR');
	}
}

async function downloadMediaFromInbox(kara: Inbox, repoName: string) {
	const downloadTask = new Task({
		text: 'DOWNLOADING',
		subtext: kara.name,
		value: 0,
		total: 100,
	});
	try {
		if (kara.mediafile) {
			const localMedia = resolve(resolvedPathRepos('Medias', repoName)[0], kara.mediafile);
			const tempMedia = resolve(resolvedPath('Temp'), kara.mediafile);
			const downloadItem = {
				filename: tempMedia,
				url: `https://${repoName}/inbox/${fixedEncodeURIComponent(kara.name)}/${fixedEncodeURIComponent(
					kara.mediafile
				)}`,
				id: kara.name,
			};
			try {
				await downloadFile(downloadItem, downloadTask);
			} catch (err) {
				throw err;
			}
			await smartMove(tempMedia, localMedia, { overwrite: true });
		} else {
			downloadTask.update({
				value: 100,
			});
			await sleep(1000);
		}
	} catch (err) {
		logger.error(`Could not download media from inbox: ${err}`, { service, obj: err });
		throw err;
	} finally {
		downloadTask.end();
	}
}

export async function deleteKaraInInbox(inid: string, repoName: string, token: string) {
	try {
		const repo = getRepo(repoName);
		if (!repo) throw new ErrorKM('UNKNOWN_REPOSITORY', 404, false);
		const inbox = await getInbox(repoName, token);
		const inboxItem = inbox.find(i => i.inid === inid);
		try {
			await HTTP.delete(`https://${repoName}/api/inbox/${inid}`, {
				headers: {
					authorization: token,
				},
			});
		} catch (err) {
			if (err.response?.statusCode === 403) {
				throw new ErrorKM('INBOX_DELETE_FORBIDDEN_ERROR', 403, false);
			} else {
				logger.error(`Unable to get inbox contents for INID ${inid} on ${repoName}: ${err}`, {
					service,
					obj: err,
				});
				throw err;
			}
		}
		if (inboxItem.gitlab_issue) {
			const numberIssue = +inboxItem.gitlab_issue.split('/')[inboxItem.gitlab_issue.split('/').length - 1];
			closeIssue(numberIssue, repoName).catch(err => {
				logger.warn(`Unable to close issue : ${err}`, { service, obj: err });
				Sentry.error(err);
			});
		}
	} catch (err) {
		logger.warn(`Unable to delete inbox item ${inid} on ${repoName} : ${err}`, { service, obj: err });
		Sentry.error(err);
		throw err instanceof ErrorKM ? err : new ErrorKM('INBOX_DELETE_ERROR');
	}
}

export async function markKaraAsDownloadedInInbox(inid: string, repoName: string, token: string) {
	const inbox = await getInbox(repoName, token);
	const inboxItem = inbox.find(i => i.inid === inid);
	try {
		await HTTP.post(`https://${repoName}/api/inbox/${inid}/downloaded`, null, {
			headers: {
				authorization: token,
			},
		});
	} catch (err) {
		logger.error(`Unable to mark kara in inbox as downloaded : ${err}`, { service, obj: err });
		Sentry.error(err);
		return;
	}
	if (inboxItem.gitlab_issue) {
		const issueArr = inboxItem.gitlab_issue.split('/');
		await assignIssue(+issueArr[issueArr.length - 1], repoName).catch(err => {
			logger.warn(`Unable to assign issue : ${err}`, { service, obj: err });
			Sentry.error(err);
		});
	}
}
