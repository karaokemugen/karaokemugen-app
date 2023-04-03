import { Socket } from 'socket.io';

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
	getRepo,
	getRepoFreeSpace,
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
import { APIMessage, errMessage } from '../common.js';
import { runChecklist } from '../middlewares.js';

export default function repoController(router: SocketIOApp) {
	router.route('getRepos', async (socket: Socket, req: APIData) => {
		await runChecklist(socket, req, 'guest', 'closed', { optionalAuth: true });
		try {
			return getRepos(req.token?.role !== 'admin');
		} catch (err) {
			const code = 'REPO_LIST_ERROR';
			errMessage(code, err);
			throw { code: err?.code || 500, message: APIMessage(code) };
		}
	});
	router.route('addRepo', async (socket: Socket, req: APIData) => {
		await runChecklist(socket, req, 'admin', 'open');
		try {
			await addRepo(req.body);
			return { code: 200, message: APIMessage('REPO_CREATED') };
		} catch (err) {
			const code = 'REPO_CREATE_ERROR';
			errMessage(err?.msg || code, err);
			throw { code: err?.code || 500, message: APIMessage(err?.msg || code) };
		}
	});
	router.route('getRepo', async (socket: Socket, req: APIData) => {
		await runChecklist(socket, req, 'admin', 'open');
		try {
			const repo = getRepo(req.body.name);
			if (!repo) throw { code: 404 };
			return repo;
		} catch (err) {
			const code = 'REPO_GET_ERROR';
			errMessage(code, err);
			throw { code: err?.code || 500, message: APIMessage(code) };
		}
	});
	router.route('deleteRepo', async (socket: Socket, req: APIData) => {
		await runChecklist(socket, req, 'admin', 'open');
		try {
			await removeRepo(req.body.name);
			return { code: 200, message: APIMessage('REPO_DELETED') };
		} catch (err) {
			const code = 'REPO_DELETE_ERROR';
			errMessage(code, err);
			throw { code: err?.code || 500, message: APIMessage(code) };
		}
	});
	router.route('editRepo', async (socket: Socket, req: APIData) => {
		await runChecklist(socket, req, 'admin', 'open');
		try {
			await editRepo(req.body.name, req.body.newRepo);
			return APIMessage('REPO_EDITED');
		} catch (err) {
			const code = 'REPO_EDIT_ERROR';
			errMessage(err?.msg || code, err);
			throw { code: err?.code || 500, message: APIMessage(err?.msg || code) };
		}
	});
	router.route('getUnusedTags', async (socket: Socket, req: APIData) => {
		await runChecklist(socket, req, 'admin', 'open');
		try {
			return await findUnusedTags(req.body.name);
		} catch (err) {
			const code = 'REPO_GET_UNUSEDTAGS_ERROR';
			errMessage(code, err);
			throw { code: err?.code || 500, message: APIMessage(code) };
		}
	});
	router.route('getUnusedMedias', async (socket: Socket, req: APIData) => {
		await runChecklist(socket, req, 'admin', 'open');
		try {
			return await findUnusedMedias(req.body.name);
		} catch (err) {
			const code = 'REPO_GET_UNUSEDMEDIA_ERROR';
			errMessage(code, err);
			throw { code: err?.code || 500, message: APIMessage(code) };
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
			const code = 'REPO_COMPARE_LYRICS_ERROR';
			errMessage(code, err);
			throw { code: err?.code || 500, message: APIMessage(code) };
		}
	});
	router.route('syncTagsBetweenRepos', async (socket: Socket, req: APIData) => {
		await runChecklist(socket, req, 'admin', 'open');
		try {
			return await syncTagsFromRepo(req.body.repoSourceName, req.body.repoDestName);
		} catch (err) {
			const code = 'REPO_SYNC_TAGS_ERROR';
			errMessage(code, err);
			throw { code: err?.code || 500, message: APIMessage(code) };
		}
	});
	router.route('copyLyricsBetweenRepos', async (socket: Socket, req: APIData) => {
		await runChecklist(socket, req, 'admin', 'open');
		try {
			await copyLyricsRepo(req.body.report);
			return { code: 200, message: APIMessage('REPO_LYRICS_COPIED') };
		} catch (err) {
			const code = 'REPO_COPY_LYRICS_ERROR';
			errMessage(code, err);
			throw { code: err?.code || 500, message: APIMessage(code) };
		}
	});
	router.route('openMediaFolder', async (socket: Socket, req: APIData) => {
		await runChecklist(socket, req, 'admin');
		try {
			await openMediaFolder(req.body.name);
		} catch (err) {
			throw { code: 500, msg: err };
		}
	});
	router.route('deleteAllRepoMedias', async (socket: Socket, req: APIData) => {
		await runChecklist(socket, req, 'admin', 'open');
		try {
			await deleteMedias(null, req.body?.name);
			return { code: 200, message: APIMessage('REPO_ALL_MEDIAS_DELETED') };
		} catch (err) {
			const code = 'REPO_DELETE_ALL_MEDIAS_ERROR';
			errMessage(code, err);
			throw { code: err?.code || 500, message: APIMessage(code) };
		}
	});
	router.route('deleteOldRepoMedias', async (socket: Socket, req: APIData) => {
		await runChecklist(socket, req, 'admin', 'open');
		try {
			await deleteMedias(null, req.body?.name, true);
			return { code: 200, message: APIMessage('REPO_OLD_MEDIAS_DELETED') };
		} catch (err) {
			const code = 'REPO_DELETE_OLD_MEDIAS_ERROR';
			errMessage(code, err);
			throw { code: err?.code || 500, message: APIMessage(code) };
		}
	});
	router.route('deleteMedias', async (socket: Socket, req: APIData) => {
		await runChecklist(socket, req, 'admin', 'open');
		try {
			await deleteMedias(req.body?.kids);
			return { code: 200, message: APIMessage('REPO_MEDIA_DELETED') };
		} catch (err) {
			const code = 'REPO_DELETE_MEDIA_ERROR';
			errMessage(code, err);
			throw { code: err?.code || 500, message: APIMessage(code) };
		}
	});
	router.route('getRepoFreeSpace', async (socket: Socket, req: APIData) => {
		await runChecklist(socket, req, 'admin', 'open');
		try {
			return await getRepoFreeSpace(req.body?.repoName);
		} catch (err) {
			const code = 'REPO_GET_FREE_SPACE_ERROR';
			errMessage(code, err);
			throw { code: err?.code || 500, message: APIMessage(code) };
		}
	});
	router.route('updateAllRepos', async (socket: Socket, req: APIData) => {
		await runChecklist(socket, req, 'admin', 'open');
		try {
			updateAllRepos();
		} catch (err) {
			errMessage(err);
		}
	});

	router.route('updateRepo', async (socket: Socket, req: APIData) => {
		await runChecklist(socket, req, 'admin', 'open');
		try {
			await updateGitRepo(req.body.repoName);
		} catch (err) {
			const code = 'REPO_GIT_UPDATE_ERROR';
			errMessage(code, err);
			throw { code: err?.code || 500, message: APIMessage(code) };
		}
	});

	router.route('stashRepo', async (socket: Socket, req: APIData) => {
		await runChecklist(socket, req, 'admin', 'open');
		try {
			await stashGitRepo(req.body.repoName);
		} catch (err) {
			const code = 'REPO_GIT_STASH_ERROR';
			errMessage(code, err);
			throw { code: err?.code || 500, message: APIMessage(code) };
		}
	});

	router.route('checkRepo', async (socket: Socket, req: APIData) => {
		await runChecklist(socket, req, 'admin', 'open');
		try {
			return await checkGitRepoStatus(req.body.repoName);
		} catch (err) {
			const code = 'REPO_GIT_CHECK_ERROR';
			errMessage(code, err);
			throw { code: err?.code || 500, message: APIMessage(code) };
		}
	});

	router.route('listRepoStashes', async (socket: Socket, req: APIData) => {
		await runChecklist(socket, req, 'admin', 'open');
		try {
			return await listRepoStashes(req.body.repoName);
		} catch (err) {
			const code = 'REPO_GIT_CHECK_ERROR';
			errMessage(code, err);
			throw { code: err?.code || 500, message: APIMessage(code) };
		}
	});

	router.route('popStash', async (socket: Socket, req: APIData) => {
		await runChecklist(socket, req, 'admin', 'open');
		try {
			return await unstashInRepo(req.body.repoName, req.body.stashId);
		} catch (err) {
			const code = 'REPO_GIT_UNSTASH_ERROR';
			errMessage(code, err);
			throw { code: err?.code || 500, message: APIMessage(code) };
		}
	});

	router.route('dropStash', async (socket: Socket, req: APIData) => {
		await runChecklist(socket, req, 'admin', 'open');
		try {
			return await dropStashInRepo(req.body.repoName, req.body.stashId);
		} catch (err) {
			const code = 'REPO_GIT_UNSTASH_ERROR';
			errMessage(code, err);
			throw { code: err?.code || 500, message: APIMessage(code) };
		}
	});

	router.route('resetRepo', async (socket: Socket, req: APIData) => {
		await runChecklist(socket, req, 'admin', 'open');
		try {
			await resetRepo(req.body.repoName);
		} catch (err) {
			const code = 'REPO_GIT_RESET_ERROR';
			errMessage(code, err);
			throw { code: err?.code || 500, message: APIMessage(code) };
		}
	});
	router.route('getCommits', async (socket: Socket, req: APIData) => {
		await runChecklist(socket, req, 'admin', 'open');
		try {
			return await generateCommits(req.body.repoName);
		} catch (err) {
			const code = 'REPO_GIT_GET_COMMITS_ERROR';
			errMessage(code, err);
			throw { code: err?.code || 500, message: APIMessage(code) };
		}
	});
	router.route('uploadMedia', async (socket: Socket, req: APIData) => {
		await runChecklist(socket, req, 'admin', 'open');
		try {
			await uploadMedia(req.body.kid);
		} catch (err) {
			const code = 'REPO_UPLOAD_MEDIA_ERROR';
			errMessage(code, err);
			throw { code: err?.code || 500, message: APIMessage(code) };
		}
	});
	router.route('pushCommits', async (socket: Socket, req: APIData) => {
		await runChecklist(socket, req, 'admin', 'open');
		try {
			pushCommits(req.body.repoName, req.body.commits, req.body.ignoreFTP);
		} catch (err) {
			const code = 'REPO_GIT_PUSH_ERROR';
			errMessage(code, err);
			throw { code: err?.code || 500, message: APIMessage(code) };
		}
	});
}
