import { Router } from "express";
import { requireAuth, requireValidUser, updateUserLoginTime, requireAdmin } from "../middlewares/auth";
import { requireWebappLimited } from "../middlewares/webapp_mode";
import { getTags, getDuplicateTags, mergeTags, deleteTag, getTag, editTag, addTag } from "../../services/tag";
import { errMessage } from "../common";
import { getLang } from "../middlewares/lang";
import { getYears } from "../../services/kara";

export default function tagsController(router: Router) {

	router.route('/tags')
		/**
		* @api {get} /tags Get tag list
		* @apiName GetTags
		* @apiVersion 3.0.0
		* @apiGroup Tags
		* @apiPermission public
		* @apiHeader authorization Auth token received from logging in
		* @apiParam {Number} [type] Type of tag to filter
		* @apiParam {String} [filter] Tag name to filter results
		* @apiParam {Number} [from] Where to start listing from
		* @apiParam {Number} [size] How many records to get.
		* @apiSuccess {String} name Name of tag
		* @apiSuccess {Number} tid Tag ID (UUID)
		* @apiSuccess {Number} types Tag types numbers in an array
		* @apiSuccess {String} short Short version of the tag, max 3 chracters. Used to display next to a song item
		* @apiSuccess {Object} data/i18n Translations in case of misc, languages and song type tags
		*
		* @apiSuccessExample Success-Response:
		* HTTP/1.1 200 OK
		* {
		*		content: [
		*        {
		*            "i18n": {
		* 				"eng": "TV Show",
		*				"fre": "Série TV"
		*			 },
		*            "name": "TV Show",
		*            "short": "TV"
		*            "tid": "13cb4509-6cb4-43e4-a1ad-417d6ffb75d0",
		*            "types": [2]
		*        },
		*		 ...
		*   	],
		*       "infos": {
		*           "count": 1000,
		* 			"from": 0,
		* 			"to": 120
		*       }
		* }
		* @apiError TAGS_LIST_ERROR Unable to get list of tags
		* @apiError WEBAPPMODE_CLOSED_API_MESSAGE API is disabled at the moment.
		* @apiErrorExample Error-Response:
		* HTTP/1.1 500 Internal Server Error
		* @apiErrorExample Error-Response:
		* HTTP/1.1 403 Forbidden
		*/
			.get(requireAuth, requireWebappLimited, requireValidUser, updateUserLoginTime, async (req: any, res: any) => {
				try {
					const tags = await getTags({
						filter: req.query.filter,
						type: req.query.type,
						from: +req.query.from,
						size: +req.query.size
					});
					res.json(tags);
				} catch(err) {
					errMessage('TAGS_LIST_ERROR', err);
					res.status(500).send('TAGS_LIST_ERROR');
				}
			});
	router.route('/years')
	/**
	* @api {get} /years Get year list
	* @apiName GetYears
	* @apiVersion 2.3.0
	* @apiGroup Karaokes
	* @apiPermission public
	* @apiHeader authorization Auth token received from logging in
	* @apiSuccess {String[]} data Array of years
	* @apiSuccessExample Success-Response:
	* HTTP/1.1 200 OK
	* {
	*     "years": [
	*       {
	*			"year": "1969"
	*		},
	*		 ...
	*   ]
	* }
	* @apiError YEARS_LIST_ERROR Unable to get list of years
	* @apiError WEBAPPMODE_CLOSED_API_MESSAGE API is disabled at the moment.
	* @apiErrorExample Error-Response:
	* HTTP/1.1 500 Internal Server Error
	* @apiErrorExample Error-Response:
	* HTTP/1.1 403 Forbidden
	*/
		.get(getLang, requireAuth, requireWebappLimited, requireValidUser, updateUserLoginTime, async (_req: any, res: any) => {
				try {
					const years = await getYears();
					res.json(years);
				} catch(err) {
					errMessage('YEARS_LIST_ERROR', err);
					res.status(500).send('YEARS_LIST_ERROR');
				}
			});
		router.get('/tags/dupes', requireAuth, requireValidUser, requireAdmin, async (_req: any, res: any) => {
			try {
				const tags = await getDuplicateTags();
				res.json(tags);
			} catch(err) {
				res.status(500).send(`Error while fetching tags: ${err}`);
			}
		});
		router.get('/tags/merge/:tid1/:tid2', requireAuth, requireValidUser, requireAdmin, async (req: any, res: any) => {
			try {
				const tag = await mergeTags(req.params.tid1, req.params.tid2);
				res.json(tag);
			} catch(err) {
				res.status(500).send(`Error while merging tags: ${err}`);
			}
		});
		router.delete('/tags/:tid([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})', requireAuth, requireValidUser, requireAdmin, async (req: any, res: any) => {
			try {
				await deleteTag(req.params.tid);
				res.status(200).send('Tag deleted');
			} catch(err) {
				res.status(500).send(`Error deleting tag: ${err}`);
			}
		});
		router.get('/tags/:tid([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})', requireAuth, requireValidUser, requireAdmin, async (req: any, res: any) => {
			try {
				const tag = await getTag(req.params.tid);
				res.json(tag);
			} catch(err) {
				res.status(500).send(`Error getting tag: ${err}`)
			}
		});
	
		router.put('/tags/:tid([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})', requireAuth, requireValidUser, requireAdmin, async (req: any, res: any) => {
			try {
				const tag = editTag(req.params.tid, req.body);
				res.json(tag);
			} catch(err) {
				res.status(500).send(`Error editing tag: ${err}`);
			}
		});
	
		router.post('/tags', requireAuth, requireValidUser, requireAdmin, async (req: any, res: any) => {
			try {
				await addTag(req.body);
				res.status(200).send('Tag added');
			} catch(err) {
				res.status(500).send(`Error adding tag: ${err}`);
			}
		});
}