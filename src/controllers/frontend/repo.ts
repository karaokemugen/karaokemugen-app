import { WS_CMD } from '../../../kmfrontend/src/utils/ws.js';
import { APIMessage } from '../../lib/services/frontend.js';
import { getRepoManifest } from '../../lib/services/repo.js';
import { SocketIOApp } from '../../lib/utils/ws.js';
import {
	addRepo,
	checkGitRepoStatus,
	compareLyricsChecksums,
	convertToUUIDFormat,
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
import { generateSSHKey, getSSHPubKey, removeSSHKey } from '../../utils/ssh.js';
import { runChecklist } from '../middlewares.js';

export default function repoController(router: SocketIOApp) {
	router.route(WS_CMD.GET_SSHPUB_KEY, async (socket, req) => {
		await runChecklist(socket, req, 'admin', 'closed');
		try {
			return getSSHPubKey(req.body.repoName, req.token.username);
		} catch (err) {
			throw { code: err.code || 500, message: APIMessage(err.message) };
		}
	});
	router.route(WS_CMD.GENERATE_SSHKEY, async (socket, req) => {
		await runChecklist(socket, req, 'admin', 'closed');
		try {
			return generateSSHKey(req.body.repoName, req.token.username);
		} catch (err) {
			throw { code: err.code || 500, message: APIMessage(err.message) };
		}
	});
	router.route(WS_CMD.REMOVE_SSHKEY, async (socket, req) => {
		await runChecklist(socket, req, 'admin', 'closed');
		try {
			return removeSSHKey(req.body.repoName, req.token.username);
		} catch (err) {
			throw { code: err.code || 500, message: APIMessage(err.message) };
		}
	});
	router.route(WS_CMD.CONVERT_REPO_TO_UUID, async (socket, req) => {
		await runChecklist(socket, req, 'admin', 'closed');
		try {
			return convertToUUIDFormat(req.body.repoName);
		} catch (err) {
			console.log(err);
			throw { code: err.code || 500, message: APIMessage(err.message) };
		}
	});
	router.route(WS_CMD.GET_REPOS, async (socket, req) => {
		await runChecklist(socket, req, 'guest', 'closed', { optionalAuth: true });
		try {
			return getRepos(null, req.token?.role !== 'admin');
		} catch (err) {
			throw { code: err.code || 500, message: APIMessage(err.message) };
		}
	});
	router.route(WS_CMD.ADD_REPO, async (socket, req) => {
		await runChecklist(socket, req, 'admin', 'open');
		try {
			await addRepo(req.body);
			return { code: 200, message: APIMessage('REPO_CREATED') };
		} catch (err) {
			throw { code: err.code || 500, message: APIMessage(err.message) };
		}
	});
	router.route(WS_CMD.GET_REPO, async (socket, req) => {
		await runChecklist(socket, req, 'admin', 'open');
		try {
			const repo = getRepo(req.body.name);
			return repo;
		} catch (err) {
			throw { code: err.code || 500, message: APIMessage(err.message) };
		}
	});
	router.route(WS_CMD.GET_REPO_MANIFEST, async (socket, req) => {
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
	router.route(WS_CMD.DELETE_REPO, async (socket, req) => {
		await runChecklist(socket, req, 'admin', 'open');
		try {
			await removeRepo(req.body.name);
			return { code: 200, message: APIMessage('REPO_DELETED') };
		} catch (err) {
			throw { code: err.code || 500, message: APIMessage(err.message) };
		}
	});
	router.route(WS_CMD.EDIT_REPO, async (socket, req) => {
		await runChecklist(socket, req, 'admin', 'open');
		try {
			await editRepo(req.body.name, req.body.newRepo);
			return { code: 200, message: APIMessage('REPO_EDITED') };
		} catch (err) {
			throw { code: err.code || 500, message: APIMessage(err.message) };
		}
	});
	router.route(WS_CMD.GET_UNUSED_TAGS, async (socket, req) => {
		await runChecklist(socket, req, 'admin', 'open');
		try {
			return await findUnusedTags(req.body.name);
		} catch (err) {
			throw { code: err.code || 500, message: APIMessage(err.message) };
		}
	});
	router.route(WS_CMD.GET_UNUSED_MEDIAS, async (socket, req) => {
		await runChecklist(socket, req, 'admin', 'open');
		try {
			return await findUnusedMedias(req.body.name);
		} catch (err) {
			throw { code: err.code || 500, message: APIMessage(err.message) };
		}
	});

	router.route(WS_CMD.MOVING_MEDIA_REPO, async (socket, req) => {
		await runChecklist(socket, req, 'admin', 'open');
		try {
			movingMediaRepo(req.body.name, req.body.path).catch(() => {});
			return { code: 200, message: APIMessage('REPO_MOVING_MEDIA_IN_PROGRESS') };
		} catch (err) {
			// This is async, check function to know which WS event you get
		}
	});
	router.route(WS_CMD.COMPARE_LYRICS_BETWEEN_REPOS, async (socket, req) => {
		await runChecklist(socket, req, 'admin', 'open');
		try {
			return await compareLyricsChecksums(req.body.repo1, req.body.repo2);
		} catch (err) {
			throw { code: err.code || 500, message: APIMessage(err.message) };
		}
	});
	router.route(WS_CMD.SYNC_TAGS_BETWEEN_REPOS, async (socket, req) => {
		await runChecklist(socket, req, 'admin', 'open');
		try {
			return await syncTagsFromRepo(req.body.repoSourceName, req.body.repoDestName);
		} catch (err) {
			throw { code: err.code || 500, message: APIMessage(err.message) };
		}
	});
	router.route(WS_CMD.COPY_LYRICS_BETWEEN_REPOS, async (socket, req) => {
		await runChecklist(socket, req, 'admin', 'open');
		try {
			await copyLyricsRepo(req.body.report);
			return { code: 200, message: APIMessage('REPO_LYRICS_COPIED') };
		} catch (err) {
			throw { code: err.code || 500, message: APIMessage(err.message) };
		}
	});
	router.route(WS_CMD.OPEN_MEDIA_FOLDER, async (socket, req) => {
		await runChecklist(socket, req, 'admin');
		try {
			await openMediaFolder(req.body.name);
		} catch (err) {
			throw { code: err.code || 500, message: APIMessage(err.message) };
		}
	});
	router.route(WS_CMD.DELETE_ALL_REPO_MEDIAS, async (socket, req) => {
		await runChecklist(socket, req, 'admin', 'open');
		try {
			await deleteMedias(null, req.body?.name);
			return { code: 200, message: APIMessage('REPO_ALL_MEDIAS_DELETED') };
		} catch (err) {
			throw { code: err.code || 500, message: APIMessage(err.message) };
		}
	});
	router.route(WS_CMD.DELETE_OLD_REPO_MEDIAS, async (socket, req) => {
		await runChecklist(socket, req, 'admin', 'open');
		try {
			await deleteMedias(null, req.body?.name, true);
			return { code: 200, message: APIMessage('REPO_OLD_MEDIAS_DELETED') };
		} catch (err) {
			throw { code: err.code || 500, message: APIMessage(err.message) };
		}
	});
	router.route(WS_CMD.DELETE_MEDIAS, async (socket, req) => {
		await runChecklist(socket, req, 'admin', 'open');
		try {
			await deleteMedias(req.body?.kids);
			return { code: 200, message: APIMessage('REPO_MEDIA_DELETED') };
		} catch (err) {
			throw { code: err.code || 500, message: APIMessage(err.message) };
		}
	});
	router.route(WS_CMD.GET_REPO_FREE_SPACE, async (socket, req) => {
		await runChecklist(socket, req, 'admin', 'open');
		try {
			return await getRepoFreeSpace(req.body?.repoName);
		} catch (err) {
			throw { code: err.code || 500, message: APIMessage(err.message) };
		}
	});
	router.route(WS_CMD.UPDATE_ALL_REPOS, async (socket, req) => {
		await runChecklist(socket, req, 'admin', 'open');
		try {
			updateAllRepos();
		} catch (err) {
			// This is Async.
		}
	});

	router.route(WS_CMD.UPDATE_REPO, async (socket, req) => {
		await runChecklist(socket, req, 'admin', 'open');
		try {
			await updateGitRepo(req.body.repoName);
		} catch (err) {
			throw { code: err.code || 500, message: APIMessage(err.message) };
		}
	});

	router.route(WS_CMD.STASH_REPO, async (socket, req) => {
		await runChecklist(socket, req, 'admin', 'open');
		try {
			await stashGitRepo(req.body.repoName);
		} catch (err) {
			throw { code: err.code || 500, message: APIMessage(err.message) };
		}
	});

	router.route(WS_CMD.CHECK_REPO, async (socket, req) => {
		await runChecklist(socket, req, 'admin', 'open');
		try {
			return await checkGitRepoStatus(req.body.repoName);
		} catch (err) {
			throw { code: err.code || 500, message: APIMessage(err.message) };
		}
	});

	router.route(WS_CMD.LIST_REPO_STASHES, async (socket, req) => {
		await runChecklist(socket, req, 'admin', 'open');
		try {
			return await listRepoStashes(req.body.repoName);
		} catch (err) {
			throw { code: err.code || 500, message: APIMessage(err.message) };
		}
	});

	router.route(WS_CMD.GET_FILE_DIFF, async (socket, req) => {
		await runChecklist(socket, req, 'admin', 'closed');
		try {
			return await getFileDiff(req.body.file, req.body.repoName);
		} catch (err) {
			throw { code: err.code || 500, message: APIMessage(err.message) };
		}
	});

	router.route(WS_CMD.POP_STASH, async (socket, req) => {
		await runChecklist(socket, req, 'admin', 'open');
		try {
			return await unstashInRepo(req.body.repoName, req.body.stashId);
		} catch (err) {
			throw { code: err.code || 500, message: APIMessage(err.message) };
		}
	});

	router.route(WS_CMD.DROP_STASH, async (socket, req) => {
		await runChecklist(socket, req, 'admin', 'open');
		try {
			return await dropStashInRepo(req.body.repoName, req.body.stashId);
		} catch (err) {
			throw { code: err.code || 500, message: APIMessage(err.message) };
		}
	});

	router.route(WS_CMD.RESET_REPO, async (socket, req) => {
		await runChecklist(socket, req, 'admin', 'open');
		try {
			await resetRepo(req.body.repoName);
		} catch (err) {
			throw { code: err.code || 500, message: APIMessage(err.message) };
		}
	});
	router.route(WS_CMD.GET_COMMITS, async (socket, req) => {
		await runChecklist(socket, req, 'admin', 'open');
		try {
			return await generateCommits(req.body.repoName);
		} catch (err) {
			throw { code: err.code || 500, message: APIMessage(err.message) };
		}
	});
	router.route(WS_CMD.UPLOAD_MEDIA, async (socket, req) => {
		await runChecklist(socket, req, 'admin', 'open');
		try {
			await uploadMedia(req.body.kid);
		} catch (err) {
			throw { code: err.code || 500, message: APIMessage(err.message) };
		}
	});
	router.route(WS_CMD.PUSH_COMMITS, async (socket, req) => {
		await runChecklist(socket, req, 'admin', 'open');
		try {
			pushCommits(req.body.repoName, req.body.commits, req.body.ignoreFTP);
		} catch (err) {
			// Async
		}
	});
}
