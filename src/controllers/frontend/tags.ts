import { Router } from 'express';

import { getYears } from '../../services/kara';
import { addTag,deleteTag, editTag, getDuplicateTags, getTag, getTags, mergeTags } from '../../services/tag';
import { APIMessage,errMessage } from '../common';
import { requireAdmin,requireAuth, requireValidUser, updateUserLoginTime } from '../middlewares/auth';
import { getLang } from '../middlewares/lang';
import { requireWebappLimited } from '../middlewares/webapp_mode';

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
				const code = 'TAGS_LIST_ERROR';
				errMessage(code, err);
				res.status(500).json(APIMessage(code));
			}
		})
	/**
	* @api {post} /tags Add tag
	* @apiName addTag
	* @apiVersion 3.1.0
	* @apiGroup Tags
	* @apiPermission admin
	* @apiHeader authorization Auth token received from logging in
	* @apiParam {number[]} types Types of tag
	* @apiParam {string} name Tag name
	* @apiParam {string} short Short name of tag (max 3 letters)
	* @apiParam {Object} i18n i18n object, where properties are ISO639-2B codes and values the name of tag in that language
	* @apiSuccessExample Success-Response:
	* HTTP/1.1 200 OK
	* {code: "TAG_CREATED"}
	* @apiErrorExample Error-Response:
	* HTTP/1.1 500 Internal Server Error
	* {code: "TAG_ADD_ERROR"}
	*/
		.post(requireAuth, requireValidUser, requireAdmin, async (req: any, res: any) => {
			try {
				await addTag(req.body);
				res.status(200).json(APIMessage('TAG_CREATED'));
			} catch(err) {
				const code = 'TAG_CREATE_ERROR';
				errMessage(code, err);
				res.status(500).json(APIMessage(code));
			}
		});
	router.route('/years')
	/**
	* @api {get} /years Get year list
	* @apiName GetYears
	* @apiVersion 2.3.0
	* @apiGroup Tags
	* @apiPermission public
	* @apiHeader authorization Auth token received from logging in
	* @apiSuccess {String[]} data Array of years
	* @apiSuccessExample Success-Response:
	* HTTP/1.1 200 OK
	* {
	*     "content": [
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
				const code = 'YEARS_LIST_ERROR';
				errMessage(code, err);
				res.status(500).json(APIMessage(code));
			}
		});
	router.route('/tags/duplicate')
	/**
	* @api {get} /tags/duplicate List tags with same names
	* @apiName GetDupeTags
	* @apiVersion 3.1.0
	* @apiGroup Tags
	* @apiPermission admin
	* @apiHeader authorization Auth token received from logging in
	* @apiSuccess {Taglist} data Array of years
	* @apiSuccessExample Success-Response:
	* HTTP/1.1 200 OK
	* {
	*     "content": [
	*      	<See Tag object>
	*	   ]
	* }
	* @apiErrorExample Error-Response:
	* HTTP/1.1 500 Internal Server Error
	* {code: "TAG_DUPLICATE_LIST_ERROR"}
	*/
		.get(requireAuth, requireValidUser, requireAdmin, async (_req: any, res: any) => {
			try {
				const tags = await getDuplicateTags();
				res.json(tags);
			} catch(err) {
				const code = 'TAG_DUPLICATE_LIST_ERROR';
				errMessage(code, err);
				res.status(500).json(APIMessage(code));
			}
		});
	router.route('/tags/merge/:tid1/:tid2')
	/**
	* @api {post} /tags/merge/:tid1/:tid2 Merge tags
	* @apiName MergeTags
	* @apiVersion 3.1.0
	* @apiGroup Tags
	* @apiPermission admin
	* @apiHeader authorization Auth token received from logging in
	* @apiParam {uuid} tid1 First tag to merge (will be kept)
	* @apiParam {uuid} tid2 Second tag to merge (will be removed)
	* @apiSuccess {Object} Tag Tag object
	* @apiSuccessExample Success-Response:
	* HTTP/1.1 200 OK
	* {
		code: "TAGS_MERGED"
	*   data: <See Tag object>
	* }
	* @apiErrorExample Error-Response:
	* HTTP/1.1 404 Not found
	* @apiErrorExample Error-Response:
	* HTTP/1.1 500 Internal Server Error
	* {code: "TAGS_MERGE_ERROR"}
	*/
		.post(requireAuth, requireValidUser, requireAdmin, async (req: any, res: any) => {
			try {
				const tag = await mergeTags(req.params.tid1, req.params.tid2);
				res.json(APIMessage('TAGS_MERGED', tag));
			} catch(err) {
				const code = 'TAGS_MERGED_ERROR';
				errMessage(code, err);
				res.status(err?.code || 500).json(APIMessage(code));
			}
		});
	router.route('/tags/:tid([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})')
	/**
	* @api {delete} /tags/:tid Delete tag
	* @apiName DeleteTag
	* @apiVersion 3.1.0
	* @apiGroup Tags
	* @apiPermission admin
	* @apiHeader authorization Auth token received from logging in
	* @apiParam {uuid} tid Tag to delete
	* @apiSuccessExample Success-Response:
	* HTTP/1.1 200 OK
	* {code: 'TAG_DELETED'}
	* @apiErrorExample Error-Response:
	* HTTP/1.1 500 Internal Server Error
	* {code: 'TAG_DELETE_ERROR}
	*/
		.delete(requireAuth, requireValidUser, requireAdmin, async (req: any, res: any) => {
			try {
				await deleteTag(req.params.tid);
				res.status(200).json(APIMessage('TAG_DELETED'));
			} catch(err) {
				const code = 'TAG_DELETE_ERROR';
				errMessage(code, err);
				res.status(err?.code || 500).json(APIMessage(code));
			}
		})
	/**
	* @api {get} /tags/:tid Get single tag
	* @apiName GetTagSingle
	* @apiVersion 3.1.0
	* @apiGroup Tags
	* @apiPermission admin
	* @apiHeader authorization Auth token received from logging in
	* @apiParam {uuid} tid
	* @apiSuccess {Object} Tag Tag object
	* @apiSuccessExample Success-Response:
	* HTTP/1.1 200 OK
	* {
	*    <See Tag object>
	* }
	* @apiErrorExample Error-Response:
	* HTTP/1.1 404 Not found
	* @apiErrorExample Error-Response:
	* HTTP/1.1 500 Internal Server Error
	* {code: "TAG_GET_ERROR"}
	*/
		.get(requireAuth, requireValidUser, requireAdmin, async (req: any, res: any) => {
			try {
				const tag = await getTag(req.params.tid);
				if (!tag) res.status(404);
				res.json(tag);
			} catch(err) {
				const code = 'TAG_GET_ERROR';
				errMessage(code, err);
				res.status(500).json(APIMessage(code));
			}
		})
		/**
	* @api {put} /tags/:tid Edit tag
	* @apiName editTag
	* @apiVersion 3.1.0
	* @apiGroup Tags
	* @apiPermission admin
	* @apiHeader authorization Auth token received from logging in
	* @apiParam {uuid} tid tag to edit
	* @apiParam {number[]} types Types of tag
	* @apiParam {string} name Tag name
	* @apiParam {string} short Short name of tag (max 3 letters)
	* @apiParam {Object} i18n i18n object, where properties are ISO639-2B codes and values the name of tag in that language
	* @apiSuccessExample Success-Response:
	* HTTP/1.1 200 OK
	* {code: "TAG_EDITED"}
	* @apiErrorExample Error-Response:
	* HTTP/1.1 404 Not found
	* @apiErrorExample Error-Response:
	* HTTP/1.1 500 Internal Server Error
	* {code: "TAG_EDIT_ERROR"}
	*/
		.put(requireAuth, requireValidUser, requireAdmin, async (req: any, res: any) => {
			try {
				await editTag(req.params.tid, req.body);
				res.json(APIMessage('TAG_EDITED'));
			} catch(err) {
				const code = 'TAG_EDIT_ERROR';
				errMessage(code, err);
				res.status(err?.code || 500).json(APIMessage(code));
			}
		});
}