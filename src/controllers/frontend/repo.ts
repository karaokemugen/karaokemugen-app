import { Router } from 'express';
import { requireNotDemo } from '../middlewares/demo';
import { requireAuth, requireValidUser, requireAdmin } from '../middlewares/auth';
import { getRepos, getRepo, removeRepo, addRepo, editRepo, findUnusedTags, findUnusedSeries, findUnusedMedias } from '../../services/repo';

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
 */
		.get(requireNotDemo, requireAuth, requireValidUser, requireAdmin, async (_req: any, res: any) => {
			try {
				const repos = getRepos();
				res.json(repos);
			} catch(err) {
				res.status(500).send(`Error getting repositories: ${err}`);
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
 * @apiErrorExample Error-Response:
 * HTTP/1.1 500 Internal Server Error
 */
		.post(requireNotDemo, requireAuth, requireValidUser, requireAdmin, async (req: any, res: any) => {
			try {
				await addRepo(req.body);
				res.status(200).json();
			} catch(err) {
				res.status(500).send(`Error getting repositories: ${err}`);
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
 */
		.get(requireNotDemo, requireAuth, requireValidUser, requireAdmin, async (req: any, res: any) => {
			try {
				const repo = getRepo(req.params.name);
				res.json(repo);
			} catch(err) {
				res.status(500).send(`Error getting repository: ${err}`);
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
 * @apiErrorExample Error-Response:
 * HTTP/1.1 500 Internal Server Error
 */
		.delete(requireNotDemo, requireAuth, requireValidUser, requireAdmin, async (req: any, res: any) => {
			try {
				removeRepo(req.params.name);
				res.json();
			} catch(err) {
				res.status(500).send(`Error deleting repository: ${err}`);
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
 * @apiErrorExample Error-Response:
 * HTTP/1.1 500 Internal Server Error
 */
		.put(requireNotDemo, requireAuth, requireValidUser, requireAdmin, async (req: any, res: any) => {
			try {
				await editRepo(req.params.name, req.body);
				res.json();
			} catch(err) {
				res.status(500).send(`Error editing repository: ${err}`);
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
 * @apiErrorExample Error-Response:
 * HTTP/1.1 500 Internal Server Error
 */
		.put(requireNotDemo, requireAuth, requireValidUser, requireAdmin, async (req: any, res: any) => {
			try {
				await editRepo(req.params.name, req.body);
				res.json();
			} catch(err) {
				res.status(500).send(`Error editing repository: ${err}`);
			}
		});
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
 */
		.get(requireNotDemo, requireAuth, requireValidUser, requireAdmin, async (req: any, res: any) => {
			try {
				const tags = await findUnusedTags(req.params.name);
				res.json(tags);
			} catch(err) {
				res.status(500).send(`Error getting tags: ${err}`);
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
 */
		.get(requireNotDemo, requireAuth, requireValidUser, requireAdmin, async (req: any, res: any) => {
			try {
				const files = await findUnusedMedias(req.params.name);
				res.json(files);
			} catch(err) {
				res.status(500).send(`Error getting tags: ${err}`);
			}
		});
	router.route('/repos/:name/unusedSeries')
	/**
 * @api {get} /repos/:name/unusedSeries Get all unused series from a repo
 * @apiName GetRepoUnusedSeries
 * @apiVersion 3.2.0
 * @apiGroup Repositories
 * @apiPermission admin
 * @apiHeader authorization Auth token received from logging in
 * @apiParam {string} name Repository name to get unused series from
 * @apiSuccess {Object[]} Series objects
 *
 * @apiSuccessExample Success-Response:
 * HTTP/1.1 200 OK
 * 	{
 * 		<See GET /series but without from/to and stuff>
 * 	}
 * @apiErrorExample Error-Response:
 * HTTP/1.1 500 Internal Server Error
 */
		.get(requireNotDemo, requireAuth, requireValidUser, requireAdmin, async (req: any, res: any) => {
			try {
				const series = await findUnusedSeries(req.params.name);
				res.json(series);
			} catch(err) {
				res.status(500).send(`Error getting tags: ${err}`);
			}
		});
}