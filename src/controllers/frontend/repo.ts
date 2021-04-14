
import { Socket } from 'socket.io';

import { APIData } from '../../lib/types/api';
import { SocketIOApp } from '../../lib/utils/ws';
import { addRepo, compareLyricsChecksums, consolidateRepo, copyLyricsRepo,editRepo, findUnusedMedias, findUnusedTags, getRepo, getRepos, removeRepo } from '../../services/repo';
import { APIMessage,errMessage } from '../common';
import { runChecklist } from '../middlewares';

export default function repoController(router: SocketIOApp) {
	router.route('getRepos', async (socket: Socket, req: APIData) => {
	/**
 * @api {get} Get repository list
 * @apiName getRepos
 * @apiVersion 5.0.0
 * @apiGroup Repositories
 * @apiPermission admin
 * @apiHeader authorization Auth token received from logging in
 * @apiSuccess {Object[]} repo Repository object
 *
 * @apiSuccessExample Success-Response:
 * HTTP/1.1 200 OK
 * [
 * 	{
 * 		"Name": "kara.moe",
 *      "Online": true
 * 		"Path": {
 * 			"Karas": ["app/data/karaokes"]
 * 			...
 * 		}
 * 	}
 * ]
 * @apiErrorExample Error-Response:
 * HTTP/1.1 500 Internal Server Error
 * {code: "REPO_LIST_ERROR"}
 */
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
	/**
 * @api {post} Add a repository
 * @apiName addRepo
 * @apiVersion 5.0.0
 * @apiGroup Repositories
 * @apiPermission admin
 * @apiHeader authorization Auth token received from logging in
 * @apiParam {string} Name Repository name
 * @apiParam {boolean} Online Is the repository an online or local one ?
 * @apiParam {boolean} Enabled Is the repository enabled
 * @apiParam {boolean} SendStats Do we send stats over to that repository ?
 * @apiParam {string[]} Path.Karas Directories where to store files
 * @apiParam {string[]} Path.Lyrics Directories where to store files
 * @apiParam {string[]} Path.Medias Directories where to store files
 * @apiParam {string[]} Path.Series Directories where to store files
 * @apiParam {string[]} Path.Tags Directories where to store files
 *
 * @apiSuccessExample Success-Response:
 * HTTP/1.1 200 OK
 * {code: "REPO_CREATED"}
 * @apiErrorExample Error-Response:
 * HTTP/1.1 404 Not found
 * @apiErrorExample Error-Response:
 * HTTP/1.1 500 Internal Server Error
 * {code: "REPO_CREATE_ERROR"}
 */
		await runChecklist(socket, req, 'admin', 'open', {allowInDemo: false, optionalAuth: false});
		try {
			await addRepo(req.body);
			return APIMessage('REPO_CREATED');
		} catch(err) {
			const code = 'REPO_CREATE_ERROR';
			errMessage(code, err);
			throw {code: err?.code || 500, message: APIMessage(code)};
		}
	});
	router.route('getRepo', async (socket: Socket, req: APIData) => {
	/**
 * @api {get} Get single repository
 * @apiName getRepo
 * @apiVersion 5.0.0
 * @apiGroup Repositories
 * @apiPermission admin
 * @apiHeader authorization Auth token received from logging in
 * @apiParam {string} name Repository name to get
 * @apiSuccess {Object} repo Repository object
 *
 * @apiSuccessExample Success-Response:
 * HTTP/1.1 200 OK
 * 	{
 * 		<See GET /repos>
 * 	}
 * @apiErrorExample Error-Response:
 * HTTP/1.1 404 Not found
 * @apiErrorExample Error-Response:
 * HTTP/1.1 500 Internal Server Error
 * {code: "REPO_GET_ERROR"}
 */
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
	/**
 * @api {delete} Remove repository
 * @apiName deleteRepo
 * @apiVersion 5.0.0
 * @apiGroup Repositories
 * @apiPermission admin
 * @apiHeader authorization Auth token received from logging in
 * @apiParam {string} name Repository name to delete
 * @apiSuccess {Object[]} repo Repository object
 *
 * @apiSuccessExample Success-Response:
 * HTTP/1.1 200 OK
 * {code: "REPO_DELETED"}
 * @apiErrorExample Error-Response:
 * HTTP/1.1 500 Internal Server Error
 * {code: "REPO_DELETE_ERROR"}
 */
		await runChecklist(socket, req, 'admin', 'open', {allowInDemo: false, optionalAuth: false});
		try {
			removeRepo(req.body.name);
			return APIMessage('REPO_DELETED');
		} catch(err) {
			const code = 'REPO_DELETE_ERROR';
			errMessage(code, err);
			throw {code: err?.code || 500, message: APIMessage(code)};
		}
	});
	router.route('editRepo', async (socket: Socket, req: APIData) => {
	/**
 * @api {put} Edit a repository
 * @apiName editRepo
 * @apiVersion 5.0.0
 * @apiGroup Repositories
 * @apiPermission admin
 * @apiHeader authorization Auth token received from logging in
 * @apiParam {string} name Old Repository name
 * @apiParam {string} Name New Repository name
 * @apiParam {boolean} Online Is the repository an online or local one ?
 * @apiParam {string[]} Path.Karas Directories where to store files
 * @apiParam {string[]} Path.Lyrics Directories where to store files
 * @apiParam {string[]} Path.Medias Directories where to store files
 * @apiParam {string[]} Path.Series Directories where to store files
 * @apiParam {string[]} Path.Tags Directories where to store files
 *
 * @apiSuccessExample Success-Response:
 * HTTP/1.1 200 OK
 * {code: "REPO_EDITED"}
 * @apiErrorExample Error-Response:
 * HTTP/1.1 404 Not Found
 * @apiErrorExample Error-Response:
 * HTTP/1.1 500 Internal Server Error
 * {code: "REPO_EDIT_ERROR"}
 */
		await runChecklist(socket, req, 'admin', 'open', {allowInDemo: false, optionalAuth: false});
		try {
			await editRepo(req.body.Name, req.body);
			return APIMessage('REPO_EDITED');
		} catch(err) {
			const code = 'REPO_EDIT_ERROR';
			errMessage(code, err);
			throw {code: err?.code || 500, message: APIMessage(code)};
		}
	});
	router.route('getUnusedTags', async (socket: Socket, req: APIData) => {
	/**
 * @api {get} Get all unused tags from a repo
 * @apiName getUnusedTags
 * @apiVersion 5.0.0
 * @apiGroup Repositories
 * @apiPermission admin
 * @apiHeader authorization Auth token received from logging in
 * @apiParam {string} name Repository name to get
 * @apiSuccess {Object[]} Tag objects
 *
 * @apiSuccessExample Success-Response:
 * HTTP/1.1 200 OK
 * 	{
 * 		<See GET /tags but without from/to and stuff>
 * 	}
 * @apiErrorExample Error-Response:
 * HTTP/1.1 404 Not found
 * @apiErrorExample Error-Response:
 * HTTP/1.1 500 Internal Server Error
 * {code: 'REPO_GET_UNUSEDTAGS_ERROR}
 */
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
	/**
 * @api {get} Get all unused medias from a repo
 * @apiName getUnusedMedias
 * @apiVersion 5.0.0
 * @apiGroup Repositories
 * @apiPermission admin
 * @apiHeader authorization Auth token received from logging in
 * @apiParam {string} name Repository name to get
 * @apiSuccess {string[]} files File list of unused media
 *
 * @apiSuccessExample Success-Response:
 * HTTP/1.1 200 OK
 *  [
 *    	"Abc.mp4",
 * 		"Def.avi",
 * 	...
 *  ]
 * @apiErrorExample Error-Response:
 * HTTP/1.1 404 Not found
 * @apiErrorExample Error-Response:
 * HTTP/1.1 500 Internal Server Error
 * {code: 'REPO_GET_UNUSEDMEDIA_ERROR'}
 */
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
		/**
	 * @api {post} Consolidate (move) all data from a repo
	 * @apiName consolidateRepo
	 * @apiVersion 5.0.0
	 * @apiGroup Repositories
	 * @apiPermission admin
	 * @apiHeader authorization Auth token received from logging in
	 * @apiParam {string} name Repository name to consolidate
	 * @apiParam {string} path New path to move all files to
	 * @apiSuccessExample Success-Response:
	 * HTTP/1.1 200 OK
	 * {code: "REPO_CONSOLIDATING_IN_PROGRESS"}
	 */
		await runChecklist(socket, req, 'admin', 'open', {allowInDemo: false, optionalAuth: false});
		try {
			consolidateRepo(req.body.name, req.body.path);
			return APIMessage('REPO_CONSOLIDATING_IN_PROGRESS');
		} catch(err) {
			// This is async, check function to know which WS event you get
		}
	});
	router.route('compareLyricsBetweenRepos', async (socket: Socket, req: APIData) => {
	/**
		 * @api {get} Compare lyrics between two repositories (get report)
		 * @apiName compareLyricsBetweenRepos
		 * @apiVersion 5.0.0
		 * @apiGroup Repositories
		 * @apiPermission admin
		 * @apiHeader authorization Auth token received from logging in
		 * @apiParam {string} name Master Repository to check from
		 * @apiParam {string} repo Slave Repository to check against
		 * @apiSuccessExample Success-Response:
		 * HTTP/1.1 200 OK
		 * @apiErrorExample Error-Response:
		 * HTTP/1.1 404 Not found
		 * @apiErrorExample Error-Response:
		 * HTTP/1.1 500 Internal Server Error
 		 * {code: 'REPO_COMPARE_LYRICS_ERROR'}
		 */
		await runChecklist(socket, req, 'admin', 'open', {allowInDemo: false, optionalAuth: false});
		try {
			return await compareLyricsChecksums(req.body.name, req.body.repo);
		} catch(err) {
			const code = 'REPO_COMPARE_LYRICS_ERROR';
			errMessage(code, err);
			throw {code: err?.code || 500, message: APIMessage(code)};
		}
	});
	router.route('copyLyricsBetweenRepos', async (socket: Socket, req: APIData) => {
	/**
		 * @api {post} Compare lyrics between two repositories (confirm)
		 * @apiName copyLyricsBetweenRepos
		 * @apiVersion 5.0.0
		 * @apiGroup Repositories
		 * @apiPermission admin
		 * @apiDescription Updates lyrics from one repo to the other. Send back the report you got from GET.
		 * @apiHeader authorization Auth token received from logging in
		 * @apiParam {object} report Report object you get frop compareLyricsBetweenRepos
		 * @apiSuccessExample Success-Response:
		 * HTTP/1.1 200 OK
		 * @apiErrorExample Error-Response:
		 * HTTP/1.1 500 Internal Server Error
 		 * {code: 'REPO_COMPARE_LYRICS_ERROR'}
		 */
		await runChecklist(socket, req, 'admin', 'open', {allowInDemo: false, optionalAuth: false});
		try {
			await copyLyricsRepo(req.body.report);
			return APIMessage('REPO_LYRICS_COPIED');
		} catch(err) {
			const code = 'REPO_COPY_LYRICS_ERROR';
			errMessage(code, err);
			throw {code: err?.code || 500, message: APIMessage(code)};
		}
	});
}