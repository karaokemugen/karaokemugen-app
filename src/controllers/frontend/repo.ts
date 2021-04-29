
import { Socket } from 'socket.io';

import { APIData } from '../../lib/types/api';
import { SocketIOApp } from '../../lib/utils/ws';
import { addRepo, compareLyricsChecksums, consolidateRepo, copyLyricsRepo,editRepo, findUnusedMedias, findUnusedTags, getRepo, getRepos, removeRepo } from '../../services/repo';
import { APIMessage,errMessage } from '../common';
import { runChecklist } from '../middlewares';

export default function repoController(router: SocketIOApp) {
	router.route('getRepos', async (socket: Socket, req: APIData) => {
		await runChecklist(socket, req, 'guest', 'closed', {allowInDemo: false, optionalAuth: true});
		try {
			return getRepos();
		} catch(err) {
			const code = 'REPO_LIST_ERROR';
			errMessage(code, err);
			throw {code: err?.code || 500, message: APIMessage(code)};
		}
	});
	router.route('addRepo', async (socket: Socket, req: APIData) => {
		await runChecklist(socket, req, 'admin', 'open', {allowInDemo: false, optionalAuth: false});
		try {
			await addRepo(req.body);
			return {code: 200, message: APIMessage('REPO_CREATED')};
		} catch(err) {
			const code = 'REPO_CREATE_ERROR';
			errMessage(code, err);
			throw {code: err?.code || 500, message: APIMessage(code)};
		}
	});
	router.route('getRepo', async (socket: Socket, req: APIData) => {
		await runChecklist(socket, req, 'admin', 'open', {allowInDemo: false, optionalAuth: false});
		try {
			const repo = getRepo(req.body.name);
			if (!repo) throw {code: 404};
			return repo;
		} catch(err) {
			const code = 'REPO_GET_ERROR';
			errMessage(code, err);
			throw {code: err?.code || 500, message: APIMessage(code)};
		}
	});
	router.route('deleteRepo', async (socket: Socket, req: APIData) => {
		await runChecklist(socket, req, 'admin', 'open', {allowInDemo: false, optionalAuth: false});
		try {
			removeRepo(req.body.name);
			return {code: 200, message: APIMessage('REPO_DELETED')};
		} catch(err) {
			const code = 'REPO_DELETE_ERROR';
			errMessage(code, err);
			throw {code: err?.code || 500, message: APIMessage(code)};
		}
	});
	router.route('editRepo', async (socket: Socket, req: APIData) => {
		await runChecklist(socket, req, 'admin', 'open', {allowInDemo: false, optionalAuth: false});
		try {
			await editRepo(req.body.name, req.body.newRepo);
			return APIMessage('REPO_EDITED');
		} catch(err) {
			const code = 'REPO_EDIT_ERROR';
			errMessage(code, err);
			throw {code: err?.code || 500, message: APIMessage(code)};
		}
	});
	router.route('getUnusedTags', async (socket: Socket, req: APIData) => {
		await runChecklist(socket, req, 'admin', 'open', {allowInDemo: false, optionalAuth: false});
		try {
			return await findUnusedTags(req.body.name);
		} catch(err) {
			const code = 'REPO_GET_UNUSEDTAGS_ERROR';
			errMessage(code, err);
			throw {code: err?.code || 500, message: APIMessage(code)};
		}
	});
	router.route('getUnusedMedias', async (socket: Socket, req: APIData) => {
		await runChecklist(socket, req, 'admin', 'open', {allowInDemo: false, optionalAuth: false});
		try {
			return await findUnusedMedias(req.body.name);
		} catch(err) {
			const code = 'REPO_GET_UNUSEDMEDIA_ERROR';
			errMessage(code, err);
			throw {code: err?.code || 500, message: APIMessage(code)};
		}
	});

	router.route('consolidateRepo', async (socket: Socket, req: APIData) => {
		await runChecklist(socket, req, 'admin', 'open', {allowInDemo: false, optionalAuth: false});
		try {
			consolidateRepo(req.body.name, req.body.path);
			return {code: 200, message: APIMessage('REPO_CONSOLIDATING_IN_PROGRESS')};
		} catch(err) {
			// This is async, check function to know which WS event you get
		}
	});
	router.route('compareLyricsBetweenRepos', async (socket: Socket, req: APIData) => {
		await runChecklist(socket, req, 'admin', 'open', {allowInDemo: false, optionalAuth: false});
		try {
			return await compareLyricsChecksums(req.body.repo1, req.body.repo2);
		} catch(err) {
			const code = 'REPO_COMPARE_LYRICS_ERROR';
			errMessage(code, err);
			throw {code: err?.code || 500, message: APIMessage(code)};
		}
	});
	router.route('copyLyricsBetweenRepos', async (socket: Socket, req: APIData) => {
		await runChecklist(socket, req, 'admin', 'open', {allowInDemo: false, optionalAuth: false});
		try {
			await copyLyricsRepo(req.body.report);
			return {code: 200, message: APIMessage('REPO_LYRICS_COPIED')};
		} catch(err) {
			const code = 'REPO_COPY_LYRICS_ERROR';
			errMessage(code, err);
			throw {code: err?.code || 500, message: APIMessage(code)};
		}
	});
}