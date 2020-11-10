
import { Socket } from 'socket.io';

import { APIData } from '../../lib/types/api';
import { isUUID } from '../../lib/utils/validators';
import { SocketIOApp } from '../../lib/utils/ws';
import { getYears } from '../../services/kara';
import { addTag, copyTagToRepo, deleteTag, editTag, getDuplicateTags, getTag, getTags, mergeTags } from '../../services/tag';
import { APIMessage,errMessage } from '../common';
import { runChecklist } from '../middlewares';

export default function tagsController(router: SocketIOApp) {

	router.route('getTags', async (socket: Socket, req: APIData) => {
		/**
		* @api {get} Get tag list
		* @apiName getTags
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
		await runChecklist(socket, req, 'guest', 'limited');
		try {
			return await getTags({
				filter: req.body?.filter,
				type: req.body?.type,
				from: req.body?.from,
				size: req.body?.size
			});
		} catch(err) {
			const code = 'TAGS_LIST_ERROR';
			errMessage(code, err);
			throw {code: err?.code || 500, message: APIMessage(code)};
		}
	});
	router.route('addTag', async (socket: Socket, req: APIData) => {
	/**
	* @api {post} Add tag
	* @apiName addTag
	* @apiVersion 5.0.0
	* @apiGroup Tags
	* @apiPermission admin
	* @apiHeader authorization Auth token received from logging in
	* @apiParam {number[]} types Types of tag
	* @apiParam {string} name Tag name
	* @apiParam {string} [short] Short name of tag
	* @apiParam {string} [repository] Repository this tag belongs too
	* @apiParam {boolean} [problematic] Is the tag problematic (R18/Spoiler/Epilepsy) ?
	* @apiParam {boolean} [noLiveDownload] noLiveDownload If `true` the song won't be displayed on KM Live or offer media download links on KM Explorer
	* @apiParam {Object} i18n i18n object, where properties are ISO639-2B codes and values the name of tag in that language
	* @apiSuccessExample Success-Response:
	* HTTP/1.1 201 OK
	* {code: "TAG_CREATED"}
	* @apiErrorExample Error-Response:
	* HTTP/1.1 500 Internal Server Error
	* {code: "TAG_ADD_ERROR"}
	*/
		await runChecklist(socket, req, 'admin', 'open', {allowInDemo: false, optionalAuth: false});
		try {
			const tag = await addTag(req.body);
			return APIMessage('TAG_CREATED', tag);
		} catch(err) {
			const code = 'TAG_CREATE_ERROR';
			errMessage(code, err);
			throw {code: err?.code || 500, message: APIMessage(code)};
		}
	});

	router.route('getYears', async (socket: Socket, req: APIData) => {

		/**
	* @api {get} Get year list
	* @apiName getYears
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
		await runChecklist(socket, req, 'guest', 'limited');
		try {
			return await getYears();
		} catch(err) {
			const code = 'YEARS_LIST_ERROR';
			errMessage(code, err);
			throw {code: err?.code || 500, message: APIMessage(code)};
		}
	});

	router.route('getDuplicateTags', async (socket: Socket, req: APIData) => {
	/**
	* @api {get} List tags with same names
	* @apiName getDuplicateTags
	* @apiVersion 5.0.0
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
		await runChecklist(socket, req, 'admin', 'open', {allowInDemo: false, optionalAuth: false});
		try {
			return await getDuplicateTags();
		} catch(err) {
			const code = 'TAG_DUPLICATE_LIST_ERROR';
			errMessage(code, err);
			throw {code: err?.code || 500, message: APIMessage(code)};
		}
	});

	router.route('mergeTags', async (socket: Socket, req: APIData) => {
	/**
	* @api {post} Merge tags
	* @apiName mergeTags
	* @apiVersion 5.0.0
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
		if (!isUUID(req.body.tid1) || !isUUID(req.body.tid2)) throw {code: 400};
		await runChecklist(socket, req, 'admin', 'open', {allowInDemo: false, optionalAuth: false});
		try {
			const tag = await mergeTags(req.body.tid1, req.body.tid2);
			return APIMessage('TAGS_MERGED', tag);
		} catch(err) {
			const code = 'TAGS_MERGED_ERROR';
			errMessage(code, err);
			throw {code: err?.code || 500, message: APIMessage(code)};
		}
	});

	router.route('deleteTag', async (socket: Socket, req: APIData) => {
	/**
	* @api {delete} Delete tag
	* @apiName deleteTag
	* @apiVersion 5.0.0
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
		if (!isUUID(req.body.tid)) throw {code: 400};
		await runChecklist(socket, req, 'admin', 'open', {allowInDemo: false, optionalAuth: false});
		try {
			await deleteTag(req.body.tid);
			return APIMessage('TAG_DELETED');
		} catch(err) {
			const code = 'TAG_DELETE_ERROR';
			errMessage(code, err);
			throw {code: err?.code || 500, message: APIMessage(code)};
		}
	});

	router.route('getTag', async (socket: Socket, req: APIData) => {
	/**
	* @api {get} Get single tag
	* @apiName getTag
	* @apiVersion 5.0.0
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
		if (!isUUID(req.body.tid)) throw {code: 400};
		await runChecklist(socket, req, 'guest', 'limited');
		try {
			const tag = await getTag(req.body.tid);
			if (!tag) throw {code: 404};
			return tag;
		} catch(err) {
			const code = 'TAG_GET_ERROR';
			errMessage(code, err);
			throw {code: err?.code || 500, message: APIMessage(code)};
		}
	});

	router.route('editTag', async (socket: Socket, req: APIData) => {
		/**
	* @api {put} Edit tag
	* @apiName editTag
	* @apiVersion 5.0.0
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
		if (!isUUID(req.body.tid)) throw {code: 400};
		await runChecklist(socket, req, 'admin', 'open', {allowInDemo: false, optionalAuth: false});
		try {
			await editTag(req.body.tid, req.body);
			return APIMessage('TAG_EDITED');
		} catch(err) {
			const code = 'TAG_EDIT_ERROR';
			errMessage(code, err);
			throw {code: err?.code || 500, message: APIMessage(code)};
		}
	});

	router.route('copyTagToRepo', async (socket: Socket, req: APIData) => {
		/**
	 * @api {post} Move song to another repository
	 * @apiName copyTagToRepo
	 * @apiVersion 5.0.0
	 * @apiGroup Repositories
	 * @apiPermission public
	 * @apiHeader authorization Auth token received from logging in
	 * @apiParam {uuid} tid Tag ID to copy
	 * @apiParam {string} repo Repo to copy song to
	 * @apiSuccessExample Success-Response:
	 * HTTP/1.1 200 OK
	 * {code: "TAG_COPIED"}
	 * @apiErrorExample Error-Response:
	 * HTTP/1.1 500 Internal Server Error
	 * {code: "TAG_COPIED_ERROR"}
	 */
		if (!isUUID(req.body.tid1) || !isUUID(req.body.tid2)) throw {code: 400};
		await runChecklist(socket, req, 'admin', 'open', {allowInDemo: false, optionalAuth: false});
		try {
			await copyTagToRepo(req.body.tid, req.body.repo);
			return APIMessage('TAG_COPIED');
		} catch(err) {
			const code = 'TAG_COPIED_ERROR';
			errMessage(code, err);
			throw {code: err?.code || 500, message: APIMessage(code)};
		}
	});
}