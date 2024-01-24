import { Socket } from 'socket.io';

import { APIMessage } from '../../lib/services/frontend.js';
import { APIData } from '../../lib/types/api.js';
import { SocketIOApp } from '../../lib/utils/ws.js';
import {
	addRepo,
	checkGitRepoStatus,
	compareLyricsChecksums,
	copyLyricsRepo,
	deleteMedias,
	dropStashInRepo,
	editRepo,
	findUnusedMedias,
	findUnusedTags,
	generateCommits,
	getFileDiff,
	getRepo,
	getRepoFreeSpace,
	getRepoManifest,
	getRepos,
	listRepoStashes,
	movingMediaRepo,
	openMediaFolder,
	pushCommits,
	removeRepo,
	resetRepo,
	stashGitRepo,
	unstashInRepo,
	updateAllRepos,
	updateGitRepo,
	uploadMedia,
} from '../../services/repo.js';
import { syncTagsFromRepo } from '../../services/tag.js';
import { runChecklist } from '../middlewares.js';

export default function repoController(router: SocketIOApp) {
	router.route('getRepos', async (socket: Socket, req: APIData) => {
		await runChecklist(socket, req, 'guest', 'closed', { optionalAuth: true });
		try {
			return getRepos(req.token?.role !== 'admin');
		} catch (err) {
			throw { code: err.code || 500, message: APIMessage(err.message) };
		}
	});
	router.route('addRepo', async (socket: Socket, req: APIData) => {
		await runChecklist(socket, req, 'admin', 'open');
		try {
			await addRepo(req.body);
			return { code: 200, message: APIMessage('REPO_CREATED') };
		} catch (err) {
			throw { code: err.code || 500, message: APIMessage(err.message) };
		}
	});
	router.route('getRepo', async (socket: Socket, req: APIData) => {
		await runChecklist(socket, req, 'admin', 'open');
		try {
			const repo = getRepo(req.body.name);
			return repo;
		} catch (err) {
			throw { code: err.code || 500, message: APIMessage(err.message) };
		}
	});
	router.route('getRepoManifest', async (socket: Socket, req: APIData) => {
		await runChecklist(socket, req, 'admin', 'open');
		try {
			const manifest = getRepoManifest(req.body.name);
			if (!manifest) throw { code: 404 };
			return manifest;
		} catch (err) {
			const code = 'REPO_MANIFEST_GET_ERROR';
			throw { code: err?.code || 500, message: APIMessage(code) };
		}
	});
	router.route('deleteRepo', async (socket: Socket, req: APIData) => {
		await runChecklist(socket, req, 'admin', 'open');
		try {
			await removeRepo(req.body.name);
			return { code: 200, message: APIMessage('REPO_DELETED') };
		} catch (err) {
			throw { code: err.code || 500, message: APIMessage(err.message) };
		}
	});
	router.route('editRepo', async (socket: Socket, req: APIData) => {
		await runChecklist(socket, req, 'admin', 'open');
		try {
			await editRepo(req.body.name, req.body.newRepo);
			return { code: 200, message: APIMessage('REPO_EDITED') };
		} catch (err) {
			throw { code: err.code || 500, message: APIMessage(err.message) };
		}
	});
	router.route('getUnusedTags', async (socket: Socket, req: APIData) => {
		await runChecklist(socket, req, 'admin', 'open');
		try {
			return await findUnusedTags(req.body.name);
		} catch (err) {
			throw { code: err.code || 500, message: APIMessage(err.message) };
		}
	});
	router.route('getUnusedMedias', async (socket: Socket, req: APIData) => {
		await runChecklist(socket, req, 'admin', 'open');
		try {
			return await findUnusedMedias(req.body.name);
		} catch (err) {
			throw { code: err.code || 500, message: APIMessage(err.message) };
		}
	});

	router.route('movingMediaRepo', async (socket: Socket, req: APIData) => {
		await runChecklist(socket, req, 'admin', 'open');
		try {
			movingMediaRepo(req.body.name, req.body.path).catch(() => {});
			return { code: 200, message: APIMessage('REPO_MOVING_MEDIA_IN_PROGRESS') };
		} catch (err) {
			// This is async, check function to know which WS event you get
		}
	});
	router.route('compareLyricsBetweenRepos', async (socket: Socket, req: APIData) => {
		await runChecklist(socket, req, 'admin', 'open');
		try {
			return await compareLyricsChecksums(req.body.repo1, req.body.repo2);
		} catch (err) {
			throw { code: err.code || 500, message: APIMessage(err.message) };
		}
	});
	router.route('syncTagsBetweenRepos', async (socket: Socket, req: APIData) => {
		await runChecklist(socket, req, 'admin', 'open');
		try {
			return await syncTagsFromRepo(req.body.repoSourceName, req.body.repoDestName);
		} catch (err) {
			throw { code: err.code || 500, message: APIMessage(err.message) };
		}
	});
	router.route('copyLyricsBetweenRepos', async (socket: Socket, req: APIData) => {
		await runChecklist(socket, req, 'admin', 'open');
		try {
			await copyLyricsRepo(req.body.report);
			return { code: 200, message: APIMessage('REPO_LYRICS_COPIED') };
		} catch (err) {
			throw { code: err.code || 500, message: APIMessage(err.message) };
		}
	});
	router.route('openMediaFolder', async (socket: Socket, req: APIData) => {
		await runChecklist(socket, req, 'admin');
		try {
			await openMediaFolder(req.body.name);
		} catch (err) {
			throw { code: err.code || 500, message: APIMessage(err.message) };
		}
	});
	router.route('deleteAllRepoMedias', async (socket: Socket, req: APIData) => {
		await runChecklist(socket, req, 'admin', 'open');
		try {
			await deleteMedias(null, req.body?.name);
			return { code: 200, message: APIMessage('REPO_ALL_MEDIAS_DELETED') };
		} catch (err) {
			throw { code: err.code || 500, message: APIMessage(err.message) };
		}
	});
	router.route('deleteOldRepoMedias', async (socket: Socket, req: APIData) => {
		await runChecklist(socket, req, 'admin', 'open');
		try {
			await deleteMedias(null, req.body?.name, true);
			return { code: 200, message: APIMessage('REPO_OLD_MEDIAS_DELETED') };
		} catch (err) {
			throw { code: err.code || 500, message: APIMessage(err.message) };
		}
	});
	router.route('deleteMedias', async (socket: Socket, req: APIData) => {
		await runChecklist(socket, req, 'admin', 'open');
		try {
			await deleteMedias(req.body?.kids);
			return { code: 200, message: APIMessage('REPO_MEDIA_DELETED') };
		} catch (err) {
			throw { code: err.code || 500, message: APIMessage(err.message) };
		}
	});
	router.route('getRepoFreeSpace', async (socket: Socket, req: APIData) => {
		await runChecklist(socket, req, 'admin', 'open');
		try {
			return await getRepoFreeSpace(req.body?.repoName);
		} catch (err) {
			throw { code: err.code || 500, message: APIMessage(err.message) };
		}
	});
	router.route('updateAllRepos', async (socket: Socket, req: APIData) => {
		await runChecklist(socket, req, 'admin', 'open');
		try {
			updateAllRepos();
		} catch (err) {
			// This is Async.
		}
	});

	router.route('updateRepo', async (socket: Socket, req: APIData) => {
		await runChecklist(socket, req, 'admin', 'open');
		try {
			await updateGitRepo(req.body.repoName);
		} catch (err) {
			throw { code: err.code || 500, message: APIMessage(err.message) };
		}
	});

	router.route('stashRepo', async (socket: Socket, req: APIData) => {
		await runChecklist(socket, req, 'admin', 'open');
		try {
			await stashGitRepo(req.body.repoName);
		} catch (err) {
			throw { code: err.code || 500, message: APIMessage(err.message) };
		}
	});

	router.route('checkRepo', async (socket: Socket, req: APIData) => {
		await runChecklist(socket, req, 'admin', 'open');
		try {
			return await checkGitRepoStatus(req.body.repoName);
		} catch (err) {
			throw { code: err.code || 500, message: APIMessage(err.message) };
		}
	});

	router.route('listRepoStashes', async (socket: Socket, req: APIData) => {
		await runChecklist(socket, req, 'admin', 'open');
		try {
			return await listRepoStashes(req.body.repoName);
		} catch (err) {
			throw { code: err.code || 500, message: APIMessage(err.message) };
		}
	});

	router.route('getFileDiff', async (socket: Socket, req: APIData) => {
		await runChecklist(socket, req, 'admin', 'closed');
		try {
			return await getFileDiff(req.body.file, req.body.repoName);
		} catch (err) {
			throw { code: err.code || 500, message: APIMessage(err.message) };
		}
	});

	router.route('popStash', async (socket: Socket, req: APIData) => {
		await runChecklist(socket, req, 'admin', 'open');
		try {
			return await unstashInRepo(req.body.repoName, req.body.stashId);
		} catch (err) {
			throw { code: err.code || 500, message: APIMessage(err.message) };
		}
	});

	router.route('dropStash', async (socket: Socket, req: APIData) => {
		await runChecklist(socket, req, 'admin', 'open');
		try {
			return await dropStashInRepo(req.body.repoName, req.body.stashId);
		} catch (err) {
			throw { code: err.code || 500, message: APIMessage(err.message) };
		}
	});

	router.route('resetRepo', async (socket: Socket, req: APIData) => {
		await runChecklist(socket, req, 'admin', 'open');
		try {
			await resetRepo(req.body.repoName);
		} catch (err) {
			throw { code: err.code || 500, message: APIMessage(err.message) };
		}
	});
	router.route('getCommits', async (socket: Socket, req: APIData) => {
		await runChecklist(socket, req, 'admin', 'open');
		try {
			return await generateCommits(req.body.repoName);
		} catch (err) {
			throw { code: err.code || 500, message: APIMessage(err.message) };
		}
	});
	router.route('uploadMedia', async (socket: Socket, req: APIData) => {
		await runChecklist(socket, req, 'admin', 'open');
		try {
			await uploadMedia(req.body.kid);
		} catch (err) {
			throw { code: err.code || 500, message: APIMessage(err.message) };
		}
	});
	router.route('pushCommits', async (socket: Socket, req: APIData) => {
		await runChecklist(socket, req, 'admin', 'open');
		try {
			pushCommits(req.body.repoName, req.body.commits, req.body.ignoreFTP);
		} catch (err) {
			// Async
		}
	});
}
