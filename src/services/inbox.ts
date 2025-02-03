import { promises as fs } from 'fs';
import { basename, resolve } from 'path';
import { setTimeout as sleep } from 'timers/promises';

import { baseChecksum } from '../dao/dataStore.js';
import { saveSetting } from '../lib/dao/database.js';
import { writeKara } from '../lib/dao/karafile.js';
import { writeTagFile } from '../lib/dao/tagfile.js';
import { Inbox } from '../lib/types/inbox.js';
import { ASSFileCleanup } from '../lib/utils/ass.js';
import { resolvedPath, resolvedPathRepos } from '../lib/utils/config.js';
import { downloadFile } from '../lib/utils/downloader.js';
import { ErrorKM } from '../lib/utils/error.js';
import { smartMove } from '../lib/utils/files.js';
import HTTP, { fixedEncodeURIComponent } from '../lib/utils/http.js';
import logger from '../lib/utils/logger.js';
import Task from '../lib/utils/taskManager.js';
import { emitWS } from '../lib/utils/ws.js';
import { adminToken } from '../utils/constants.js';
import Sentry from '../utils/sentry.js';
import { getKara, getKarasMicro } from './kara.js';
import { integrateKaraFile } from './karaManagement.js';
import { checkDownloadStatus, getRepo } from './repo.js';
import { updateAllSmartPlaylists } from './smartPlaylist.js';
import { integrateTagFile } from './tag.js';
import { getUser } from './user.js';

const service = 'Inbox';

export async function getInbox(repoName: string, token: string): Promise<Inbox[]> {
	const repo = getRepo(repoName);
	if (!repo) throw new ErrorKM('UNKNOWN_REPOSITORY', 404, false);
	try {
		const res = await HTTP.get<Inbox[]>(`${repo.Secure ? 'https' : 'http'}://${repoName}/api/inbox`, {
			headers: {
				authorization: token,
			},
		});
		const availableKaras = await getKarasMicro(
			res.data.flatMap(d => [d.kid, d.edited_kid]),
			true
		);
		return res.data.map(resdata => ({
			...resdata,
			available_locally: availableKaras.some(kara => kara.kid === resdata.kid || kara.kid === resdata.edited_kid),
		}));
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

export async function downloadKaraFromInbox(inid: string, repoName: string, token: string, username: string) {
	try {
		const repo = getRepo(repoName);
		if (!repo) throw new ErrorKM('UNKNOWN_REPOSITORY', 404, false);
		let kara: Inbox;
		const user = await getUser(username, true);
		logger.info(`Downloading song ${inid} from inbox at ${repoName}`, { service });
		try {
			const res = await HTTP.get(`${repo.Secure ? 'https' : 'http'}://${repoName}/api/inbox/${inid}`, {
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
				throw new ErrorKM('INBOX_VIEW_ERROR', 500, false);
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
			await downloadKaraFromInbox(parentFromInbox.inid, repoName, token, username);
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
			await writeTagFile(tag.data.tag, tagFile);
			// Let's refresh the database when there are new tags.
			await integrateTagFile(tagFile);
		}
		const karaFile = resolve(resolvedPathRepos('Karaokes', repoName)[0], kara.kara.file);
		// Yes, we're actually reordering this in order for karas to be in the right order when written. For some reason Axios sorts JSON responses? Or is it KM Server? Who knows? Where is Carmen San Diego?
		await writeKara(karaFile, kara.kara.data);
		saveSetting('baseChecksum', await baseChecksum());
		const newKaraKid = await integrateKaraFile(karaFile, true, true, false);
		updateAllSmartPlaylists();
		await Promise.all(promises);

		const newDbKara = await getKara(newKaraKid, adminToken);
		// ASS file post processing
		if (lyricsFile) {
			await ASSFileCleanup(lyricsFile, newDbKara);
		}

		checkDownloadStatus([kara.kara.data.data.kid]);
		markKaraAsDownloadedInInbox(inid, repoName, token, user.social_networks.gitlab);
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
			const repo = getRepo(repoName);
			const downloadItem = {
				filename: tempMedia,
				url: `${repo.Secure ? 'https' : 'http'}://${repoName}/inbox/${fixedEncodeURIComponent(kara.name)}/${fixedEncodeURIComponent(
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
		try {
			await HTTP.delete(`${repo.Secure ? 'https' : 'http'}://${repoName}/api/inbox/${inid}`, {
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
	} catch (err) {
		logger.warn(`Unable to delete inbox item ${inid} on ${repoName} : ${err}`, { service, obj: err });
		Sentry.error(err);
		throw err instanceof ErrorKM ? err : new ErrorKM('INBOX_DELETE_ERROR');
	}
}

export async function markKaraAsDownloadedInInbox(
	inid: string,
	repoName: string,
	token: string,
	gitlabUsername: string
) {
	const inbox = await getInbox(repoName, token);
	const inboxItem = inbox.find(i => i.inid === inid);
	const repo = getRepo(repoName);
	try {
		await HTTP.post(`${repo.Secure ? 'https' : 'http'}://${repoName}/api/inbox/${inid}/downloaded`, null, {
			headers: {
				authorization: token,
			},
		});
	} catch (err) {
		logger.error(`Unable to mark kara in inbox as downloaded : ${err}`, { service, obj: err });
		Sentry.error(err);
		return;
	}
	if (inboxItem.gitlab_issue && gitlabUsername) {
		const issueArr = inboxItem.gitlab_issue.split('/');
		await HTTP.post(
			`${repo.Secure ? 'https' : 'http'}://${repoName}/api/inbox/${inid}/assignToUser`,
			{
				gitlabUsername,
				repoName,
				issue: +issueArr[issueArr.length - 1],
			},
			{
				headers: {
					authorization: token,
				},
			}
		).catch(err => {
			logger.warn(`Unable to assign issue : ${err}`, { service, obj: err });
			Sentry.error(err);
		});
	}
}
