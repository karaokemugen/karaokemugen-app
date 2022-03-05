import { promises as fs } from 'fs';
import { resolve } from 'path';
import { setTimeout as sleep } from 'timers/promises';

import { baseChecksum } from '../dao/dataStore';
import { saveSetting } from '../lib/dao/database';
import { Inbox } from '../lib/types/inbox';
import { resolvedPath, resolvedPathRepos } from '../lib/utils/config';
import { downloadFile } from '../lib/utils/downloader';
import { smartMove } from '../lib/utils/files';
import HTTP from '../lib/utils/http';
import logger from '../lib/utils/logger';
import Task from '../lib/utils/taskManager';
import { assignIssue, closeIssue } from '../utils/gitlab';
import { integrateKaraFile } from './karaManagement';
import { checkDownloadStatus, getRepo } from './repo';
import { updateAllSmartPlaylists } from './smartPlaylist';
import { integrateTagFile } from './tag';

export async function getInbox(repoName: string, token: string): Promise<Inbox[]> {
	const repo = getRepo(repoName);
	if (!repo) throw { code: 404 };
	try {
		const res = await HTTP.get(`https://${repoName}/api/inbox`, {
			headers: {
				authorization: token,
			},
		});
		return res.data;
	} catch (err) {
		if (err.response.statusCode === 403) {
			throw { code: 403 };
		} else {
			logger.error(`Unable to get inbox contents : ${err}`, { service: 'Inbox', obj: err });
			throw err;
		}
	}
}

export async function downloadKaraFromInbox(inid: string, repoName: string, token: string) {
	const repo = getRepo(repoName);
	if (!repo) throw { code: 404 };
	let kara: Inbox;
	logger.info(`Downloading song ${inid} from inbox at ${repoName}`, { service: 'Inbox' });
	try {
		const res = await HTTP.get(`https://${repoName}/api/inbox/${inid}`, {
			headers: {
				authorization: token,
			},
		});
		kara = res.data;
	} catch (err) {
		if (err.response.statusCode === 403) {
			throw { code: 403 };
		} else {
			logger.error(`Unable to get kara from inbox : ${err}`, { service: 'Inbox', obj: err });
			throw err;
		}
	}
	const promises = [downloadMediaFromInbox(kara, repoName)];
	// Code to integrate kara and download medias
	if (kara.lyrics) {
		const lyricsFile = resolve(resolvedPathRepos('Lyrics', repoName)[0], kara.lyrics.file);
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
	await integrateKaraFile(karaFile, kara.kara.data, true, true);
	updateAllSmartPlaylists();
	await Promise.all(promises);
	checkDownloadStatus([kara.kara.data.data.kid]);
	markKaraAsDownloadedInInbox(inid, repoName, token);
	logger.info(`Song ${kara.kara.data.data.titles.eng} from inbox at ${repoName} downloaded`, { service: 'Inbox' });
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
				url: `https://${repoName}/inbox/${encodeURIComponent(kara.name)}/${encodeURIComponent(kara.mediafile)}`,
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
		logger.error(`Could not download media from inbox: ${err}`, { service: 'Inbox', obj: err });
		throw err;
	} finally {
		downloadTask.end();
	}
}

export async function deleteKaraInInbox(inid: string, repoName: string, token: string) {
	const repo = getRepo(repoName);
	if (!repo) throw { code: 404 };
	const inbox = await getInbox(repoName, token);
	const inboxItem = inbox.find(i => i.inid === inid);
	try {
		await HTTP.delete(`https://${repoName}/api/inbox/${inid}`, {
			headers: {
				authorization: token,
			},
		});
	} catch (err) {
		if (err.response.statusCode === 403) {
			throw { code: 403 };
		} else {
			logger.error(`Unable to delete kara in inbox : ${err}`, { service: 'Inbox', obj: err });
			throw err;
		}
	}
	await closeIssue(+inboxItem.gitlab_issue, repoName).catch(err => {
		logger.warn(`Unable to close issue : ${err}`, { service: 'Inbox', obj: err });
	});
}

export async function markKaraAsDownloadedInInbox(inid: string, repoName: string, token: string) {
	const repo = getRepo(repoName);
	if (!repo) throw { code: 404 };
	const inbox = await getInbox(repoName, token);
	const inboxItem = inbox.find(i => i.inid === inid);
	try {
		await HTTP.post(`https://${repoName}/api/inbox/${inid}/downloaded`, null, {
			headers: {
				authorization: token,
			},
		});
	} catch (err) {
		if (err.response.statusCode === 403) {
			throw { code: 403 };
		} else {
			logger.error(`Unable to mark kara in inbox as downloaded : ${err}`, { service: 'Inbox', obj: err });
			throw err;
		}
	}
	const issueArr = inboxItem.gitlab_issue.split('/');
	await assignIssue(+issueArr[issueArr.length - 1], repoName).catch(err => {
		logger.warn(`Unable to assign issue : ${err}`, { service: 'Inbox', obj: err });
	});
}
