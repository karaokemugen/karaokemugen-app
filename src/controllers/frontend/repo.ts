import z from 'zod';
import { WS_CMD } from '../../../kmfrontend/src/utils/ws.mjs';
import { APIMessage } from '../../lib/services/frontend.js';
import { getRepoManifest } from '../../lib/services/repo.js';
import { check } from '../../lib/utils/validators.js';
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
	repoConstraints,
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
import { karaConstraintsV4 } from '../../lib/dao/karafile.js';

export default function repoController(router: SocketIOApp) {
	router.route(WS_CMD.GET_SSHPUB_KEY, async (socket, req) => {
		await runChecklist(socket, req, 'admin', 'closed');
		try {
			check(req.body, z.object({
				repoName: z.string(),
			}));
			return getSSHPubKey(req.body.repoName, req.token.username);
		} catch (err) {
			throw { code: err.code || 500, message: APIMessage(err.message) };
		}
	});
	router.route(WS_CMD.GENERATE_SSHKEY, async (socket, req) => {
		await runChecklist(socket, req, 'admin', 'closed');
		try {
			check(req.body, z.object({
				repoName: z.string(),
			}));
			return generateSSHKey(req.body.repoName, req.token.username);
		} catch (err) {
			throw { code: err.code || 500, message: APIMessage(err.message) };
		}
	});
	router.route(WS_CMD.REMOVE_SSHKEY, async (socket, req) => {
		await runChecklist(socket, req, 'admin', 'closed');
		try {
			check(req.body, z.object({
				repoName: z.string(),
			}));
			return removeSSHKey(req.body.repoName, req.token.username);
		} catch (err) {
			throw { code: err.code || 500, message: APIMessage(err.message) };
		}
	});
	router.route(WS_CMD.CONVERT_REPO_TO_UUID, async (socket, req) => {
		await runChecklist(socket, req, 'admin', 'closed');
		try {
			check(req.body, z.object({
				repoName: z.string(),
			}));
			return convertToUUIDFormat(req.body.repoName);
		} catch (err) {
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
			check(req.body, repoConstraints);
			await addRepo(req.body);
			return { code: 200, message: APIMessage('REPO_CREATED') };
		} catch (err) {
			throw { code: err.code || 500, message: APIMessage(err.message) };
		}
	});
	router.route(WS_CMD.GET_REPO, async (socket, req) => {
		await runChecklist(socket, req, 'admin', 'open');
		try {
			check(req.body, z.object({
				name: z.string(),
			}));			
			const repo = getRepo(req.body.name);
			return repo;
		} catch (err) {
			throw { code: err.code || 500, message: APIMessage(err.message) };
		}
	});
	router.route(WS_CMD.GET_REPO_MANIFEST, async (socket, req) => {
		await runChecklist(socket, req, 'admin', 'open');
		try {
			check(req.body, z.object({
				name: z.string(),
			}));			
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
			check(req.body, z.object({
				name: z.string(),
			}));
			await removeRepo(req.body.name);
			return { code: 200, message: APIMessage('REPO_DELETED') };
		} catch (err) {
			throw { code: err.code || 500, message: APIMessage(err.message) };
		}
	});
	router.route(WS_CMD.EDIT_REPO, async (socket, req) => {
		await runChecklist(socket, req, 'admin', 'open');
		try {
			check(req.body, z.object({
				name: z.string(),
				newRepo: repoConstraints,
			}));
			await editRepo(req.body.name, req.body.newRepo);
			return { code: 200, message: APIMessage('REPO_EDITED') };
		} catch (err) {
			throw { code: err.code || 500, message: APIMessage(err.message) };
		}
	});
	router.route(WS_CMD.GET_UNUSED_TAGS, async (socket, req) => {
		await runChecklist(socket, req, 'admin', 'open');
		try {
			check(req.body, z.object({
				name: z.string(),
			}));
			return await findUnusedTags(req.body.name);
		} catch (err) {
			throw { code: err.code || 500, message: APIMessage(err.message) };
		}
	});
	router.route(WS_CMD.GET_UNUSED_MEDIAS, async (socket, req) => {
		await runChecklist(socket, req, 'admin', 'open');
		try {
			check(req.body, z.object({
				name: z.string(),
			}));
			return await findUnusedMedias(req.body.name);
		} catch (err) {
			throw { code: err.code || 500, message: APIMessage(err.message) };
		}
	});

	router.route(WS_CMD.MOVING_MEDIA_REPO, async (socket, req) => {
		await runChecklist(socket, req, 'admin', 'open');
		try {
			check(req.body, z.object({
				name: z.string(),
				path: z.string(),
			}));
			movingMediaRepo(req.body.name, req.body.path).catch(() => {});
			return { code: 200, message: APIMessage('REPO_MOVING_MEDIA_IN_PROGRESS') };
		} catch (err) {
			throw { code: err.code || 500, message: APIMessage(err.message) };
		}
	});
	router.route(WS_CMD.COMPARE_LYRICS_BETWEEN_REPOS, async (socket, req) => {
		await runChecklist(socket, req, 'admin', 'open');
		try {
			check(req.body, z.object({
				repo1: z.string(),
				repo2: z.string(),
			}));
			return await compareLyricsChecksums(req.body.repo1, req.body.repo2);
		} catch (err) {
			throw { code: err.code || 500, message: APIMessage(err.message) };
		}
	});
	router.route(WS_CMD.SYNC_TAGS_BETWEEN_REPOS, async (socket, req) => {
		await runChecklist(socket, req, 'admin', 'open');
		try {
			check(req.body, z.object({
				repoSourceName: z.string(),
				repoDestName: z.string(),
			}));
			return await syncTagsFromRepo(req.body.repoSourceName, req.body.repoDestName);
		} catch (err) {
			throw { code: err.code || 500, message: APIMessage(err.message) };
		}
	});
	router.route(WS_CMD.COPY_LYRICS_BETWEEN_REPOS, async (socket, req) => {
		await runChecklist(socket, req, 'admin', 'open');
		try {
			check(req.body, z.object({
				report: z.array(z.object({
					kara1: karaConstraintsV4,
					kara2: karaConstraintsV4,
				})),
			}));
			await copyLyricsRepo(req.body.report);
			return { code: 200, message: APIMessage('REPO_LYRICS_COPIED') };
		} catch (err) {
			throw { code: err.code || 500, message: APIMessage(err.message) };
		}
	});
	router.route(WS_CMD.OPEN_MEDIA_FOLDER, async (socket, req) => {
		await runChecklist(socket, req, 'admin');
		try {
			check(req.body, z.object({
				name: z.string(),
			}));
			await openMediaFolder(req.body.name);
		} catch (err) {
			throw { code: err.code || 500, message: APIMessage(err.message) };
		}
	});
	router.route(WS_CMD.DELETE_ALL_REPO_MEDIAS, async (socket, req) => {
		await runChecklist(socket, req, 'admin', 'open');
		try {
			check(req.body, z.object({
				name: z.string(),
			}));
			await deleteMedias(null, req.body?.name);
			return { code: 200, message: APIMessage('REPO_ALL_MEDIAS_DELETED') };
		} catch (err) {
			throw { code: err.code || 500, message: APIMessage(err.message) };
		}
	});
	router.route(WS_CMD.DELETE_OLD_REPO_MEDIAS, async (socket, req) => {
		await runChecklist(socket, req, 'admin', 'open');
		try {
			check(req.body, z.object({
				name: z.string(),
			}));			
			await deleteMedias(null, req.body.name, true);
			return { code: 200, message: APIMessage('REPO_OLD_MEDIAS_DELETED') };
		} catch (err) {
			throw { code: err.code || 500, message: APIMessage(err.message) };
		}
	});
	router.route(WS_CMD.DELETE_MEDIAS, async (socket, req) => {
		await runChecklist(socket, req, 'admin', 'open');
		try {
			check(req.body, z.object({
				kids: z.array(z.uuidv4()),
			}));			
			await deleteMedias(req.body.kids);
			return { code: 200, message: APIMessage('REPO_MEDIA_DELETED') };
		} catch (err) {
			throw { code: err.code || 500, message: APIMessage(err.message) };
		}
	});
	router.route(WS_CMD.GET_REPO_FREE_SPACE, async (socket, req) => {
		await runChecklist(socket, req, 'admin', 'open');
		try {
			check(req.body, z.object({
				repoName: z.string(),
			}));
			return await getRepoFreeSpace(req.body.repoName);
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
			check(req.body, z.object({
				repoName: z.string(),
			}));
			await updateGitRepo(req.body.repoName);
		} catch (err) {
			throw { code: err.code || 500, message: APIMessage(err.message) };
		}
	});

	router.route(WS_CMD.STASH_REPO, async (socket, req) => {
		await runChecklist(socket, req, 'admin', 'open');
		try {
			check(req.body, z.object({
				repoName: z.string(),
			}));
			await stashGitRepo(req.body.repoName);
		} catch (err) {
			throw { code: err.code || 500, message: APIMessage(err.message) };
		}
	});

	router.route(WS_CMD.CHECK_REPO, async (socket, req) => {
		await runChecklist(socket, req, 'admin', 'open');
		try {
			check(req.body, z.object({
				repoName: z.string(),
			}));
			return await checkGitRepoStatus(req.body.repoName);
		} catch (err) {
			throw { code: err.code || 500, message: APIMessage(err.message) };
		}
	});

	router.route(WS_CMD.LIST_REPO_STASHES, async (socket, req) => {
		await runChecklist(socket, req, 'admin', 'open');
		try {
			check(req.body, z.object({
				repoName: z.string(),
			}));
			return await listRepoStashes(req.body.repoName);
		} catch (err) {
			throw { code: err.code || 500, message: APIMessage(err.message) };
		}
	});

	router.route(WS_CMD.GET_FILE_DIFF, async (socket, req) => {
		await runChecklist(socket, req, 'admin', 'closed');
		try {
			check(req.body, z.object({
				file: z.string(),
				repoName: z.string(),
			}));
			return await getFileDiff(req.body.file, req.body.repoName);
		} catch (err) {
			throw { code: err.code || 500, message: APIMessage(err.message) };
		}
	});

	router.route(WS_CMD.POP_STASH, async (socket, req) => {
		await runChecklist(socket, req, 'admin', 'open');
		try {
			check(req.body, z.object({
				repoName: z.string(),
				stashId: z.string(),
			}));
			return await unstashInRepo(req.body.repoName, req.body.stashId);
		} catch (err) {
			throw { code: err.code || 500, message: APIMessage(err.message) };
		}
	});

	router.route(WS_CMD.DROP_STASH, async (socket, req) => {
		await runChecklist(socket, req, 'admin', 'open');
		try {
			check(req.body, z.object({
				repoName: z.string(),
				stashId: z.string(),
			}));			
			return await dropStashInRepo(req.body.repoName, req.body.stashId);
		} catch (err) {
			throw { code: err.code || 500, message: APIMessage(err.message) };
		}
	});

	router.route(WS_CMD.RESET_REPO, async (socket, req) => {
		await runChecklist(socket, req, 'admin', 'open');
		try {
			check(req.body, z.object({
				repoName: z.string(),
			}));			
			await resetRepo(req.body.repoName);
		} catch (err) {
			throw { code: err.code || 500, message: APIMessage(err.message) };
		}
	});
	router.route(WS_CMD.GET_COMMITS, async (socket, req) => {
		await runChecklist(socket, req, 'admin', 'open');
		try {
			check(req.body, z.object({
				repoName: z.string(),
			}));
			return await generateCommits(req.body.repoName);
		} catch (err) {
			throw { code: err.code || 500, message: APIMessage(err.message) };
		}
	});
	router.route(WS_CMD.UPLOAD_MEDIA, async (socket, req) => {
		await runChecklist(socket, req, 'admin', 'open');
		try {
			check(req.body, z.object({
				kid: z.uuidv4(),
			}));
			await uploadMedia(req.body.kid);
		} catch (err) {
			throw { code: err.code || 500, message: APIMessage(err.message) };
		}
	});
	router.route(WS_CMD.PUSH_COMMITS, async (socket, req) => {
		await runChecklist(socket, req, 'admin', 'open');
		try {
			check(req.body, z.object({
				repoName: z.string(),
				ignoreFTP: z.boolean().optional(),
				commits: z.object({
					commits: z.array(z.object({
						addedFiles: z.array(z.string()).optional(),
						removedFiles: z.array(z.string()).optional(),
						check: z.boolean().optional(),
						message: z.string(),
					})),
					modifiedMedias: z.array(z.object({
						new: z.string(),
						old: z.string().nullish(),
						sizeDifference: z.boolean().nullish(),
						commit: z.string(),
					})),
					squash: z.string().optional(),
				}),
			}));
			pushCommits(req.body.repoName, req.body.commits, req.body.ignoreFTP);
		} catch (err) {
			throw { code: err.code || 500, message: APIMessage(err.message) };
		}
	});
}
