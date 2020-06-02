import { Router } from 'express';
import { requireNotDemo } from '../middlewares/demo';
import { requireAuth, requireValidUser, requireAdmin } from '../middlewares/auth';
import { getRepos, getRepo, removeRepo, addRepo, editRepo, findUnusedTags, findUnusedMedias, consolidateRepo, compareLyricsChecksums } from '../../services/repo';
import { errMessage, APIMessage } from '../common';

export default function repoController(router: Router) {
	router.route('/repos')
	/**
 * @api {get} /repos Get repository list
 * @apiName GetRepos
 * @apiVersion 3.2.0
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
		.get(requireNotDemo, async (_req: any, res: any) => {
			try {
				const repos = getRepos();
				res.json(repos);
			} catch(err) {
				const code = 'REPO_LIST_ERROR';
				errMessage(code, err)
				res.status(500).json(APIMessage(code));
			}
		})
	/**
 * @api {post} /repos Add a repository
 * @apiName PostRepos
 * @apiVersion 3.2.0
 * @apiGroup Repositories
 * @apiPermission admin
 * @apiHeader authorization Auth token received from logging in
 * @apiParam {string} Name Repository name
 * @apiParam {boolean} Online Is the repository an online or local one ?
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
 * HTTP/1.1 500 Internal Server Error
 * {code: "REPO_CREATE_ERROR"}
 */
		.post(requireNotDemo, requireAuth, requireValidUser, requireAdmin, async (req: any, res: any) => {
			try {
				await addRepo(req.body);
				res.status(200).json(APIMessage('REPO_CREATED'));
			} catch(err) {
				const code = 'REPO_CREATE_ERROR';
				errMessage(code, err)
				res.status(500).json(APIMessage(code));
			}
		});
	router.route('/repos/:name')
	/**
 * @api {get} /repos/:name Get single repository
 * @apiName GetRepo
 * @apiVersion 3.2.0
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
 * HTTP/1.1 500 Internal Server Error
 * {code: "REPO_GET_ERROR"}
 */
		.get(requireNotDemo, requireAuth, requireValidUser, requireAdmin, async (req: any, res: any) => {
			try {
				const repo = getRepo(req.params.name);
				res.json(repo);
			} catch(err) {
				const code = 'REPO_GET_ERROR';
				errMessage(code, err)
				res.status(500).json(APIMessage(code));
			}
		})
	/**
 * @api {delete} /repos/:name Remove repository
 * @apiName DeleteRepos
 * @apiVersion 3.2.0
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
		.delete(requireNotDemo, requireAuth, requireValidUser, requireAdmin, async (req: any, res: any) => {
			try {
				removeRepo(req.params.name);
				res.json(APIMessage('REPO_DELETED'));
			} catch(err) {
				const code = 'REPO_DELETE_ERROR';
				errMessage(code, err)
				res.status(500).json(APIMessage(code));
			}
		})
	/**
 * @api {put} /repos/:name Edit a repository
 * @apiName PutRepo
 * @apiVersion 3.2.0
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
 * HTTP/1.1 500 Internal Server Error
 * {code: "REPO_EDIT_ERROR"}
 */
		.put(requireNotDemo, requireAuth, requireValidUser, requireAdmin, async (req: any, res: any) => {
			try {
				await editRepo(req.params.name, req.body);
				res.json(APIMessage('REPO_EDITED'));
			} catch(err) {
				const code = 'REPO_EDIT_ERROR';
				errMessage(code, err)
				res.status(500).json(APIMessage(code));
			}
		})
	router.route('/repos/:name/unusedTags')
	/**
 * @api {get} /repos/:name/unusedTags Get all unused tags from a repo
 * @apiName GetRepoUnusedTags
 * @apiVersion 3.2.0
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
 * HTTP/1.1 500 Internal Server Error
 * {code: 'REPO_GET_UNUSEDTAGS_ERROR}
 */
		.get(requireNotDemo, requireAuth, requireValidUser, requireAdmin, async (req: any, res: any) => {
			try {
				const tags = await findUnusedTags(req.params.name);
				res.json(tags);
			} catch(err) {
				const code = 'REPO_GET_UNUSEDTAGS_ERROR';
				errMessage(code, err)
				res.status(500).json(APIMessage(code));
			}
		});
	router.route('/repos/:name/unusedMedias')
	/**
 * @api {get} /repos/:name/unusedMedias Get all unused medias from a repo
 * @apiName GetRepoUnusedMedias
 * @apiVersion 3.2.0
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
 * HTTP/1.1 500 Internal Server Error
 * {code: 'REPO_GET_UNUSEDMEDIA_ERROR'}
 */
		.get(requireNotDemo, requireAuth, requireValidUser, requireAdmin, async (req: any, res: any) => {
			try {
				const files = await findUnusedMedias(req.params.name);
				res.json(files);
			} catch(err) {
				const code = 'REPO_GET_UNUSEDMEDIA_ERROR';
				errMessage(code, err)
				res.status(500).json(APIMessage(code));
			}
		});
	router.route('/repos/:name/consolidate')
		/**
	 * @api {post} /repos/:name/consolidate Consolidate (move) all data from a repo
	 * @apiName PostRepoConsolidate
	 * @apiVersion 3.2.0
	 * @apiGroup Repositories
	 * @apiPermission admin
	 * @apiHeader authorization Auth token received from logging in
	 * @apiParam {string} name Repository name to consolidate
	 * @apiParam {string} path New path to move all files to
	 * @apiSuccessExample Success-Response:
	 * HTTP/1.1 200 OK
	 * {code: "REPO_CONSOLIDATING_IN_PROGRESS"}
	 */
			.post(requireNotDemo, requireAuth, requireValidUser, requireAdmin, async (req: any, res: any) => {
				try {
					consolidateRepo(req.params.name, req.body.path);
					res.status(200).json(APIMessage('REPO_CONSOLIDATING_IN_PROGRESS'));
				} catch(err) {
					// This is async, check function to know which WS event you get
				}
			});
	router.route('/repos/:name/compareLyrics')
			/**
		 * @api {get} /repos/compareLyrics Compare lyrics between two repositories
		 * @apiName GetCompareLyrics
		 * @apiVersion 3.3.0
		 * @apiGroup Repositories
		 * @apiPermission admin
		 * @apiHeader authorization Auth token received from logging in
		 * @apiParam {string} name Master Repository to check from
		 * @apiParam {string} repo Slave Repository to check against
		 * @apiSuccessExample Success-Response:
		 * HTTP/1.1 200 OK
		 * @apiErrorExample Error-Response:
		 * HTTP/1.1 500 Internal Server Error
 		 * {code: 'REPO_COMPARE_LYRICS_ERROR'}
		 */
		.get(requireNotDemo, requireAuth, requireValidUser, requireAdmin, async (req: any, res: any) => {
			try {
				const report = await compareLyricsChecksums(req.params.name, req.query.repo);
				res.status(200).json(report);
			} catch(err) {
				const code = 'REPO_COMPARE_LYRICS_ERROR';
				errMessage(code, err);
				res.status(500).json(APIMessage(code));
			}
		});
}