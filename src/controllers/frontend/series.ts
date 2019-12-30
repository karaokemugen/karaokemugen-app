import { Router } from "express";
import { getLang } from "../middlewares/lang";
import { requireAuth, requireValidUser, updateUserLoginTime, requireAdmin } from "../middlewares/auth";
import { requireWebappLimited } from "../middlewares/webapp_mode";
import { getSeries, deleteSerie, getSerie, editSerie, addSerie } from "../../services/series";
import { errMessage } from "../common";

export default function seriesController(router: Router) {
	router.route('/series')
	/**
	* @api {get} /series Get series list
	* @apiName GetSeries
	* @apiVersion 3.1.0
	* @apiGroup Karaokes
	* @apiPermission public
	* @apiHeader authorization Auth token received from logging in
	* @apiParam {String} [filter] Text filter to search series for
	* @apiParam {Number} [from] Where to start listing from
	* @apiParam {Number} [size] How many records to get.
	* @apiSuccess {Array} data Array of series
	* @apiSuccess {Number} data/serie_id Serie ID in the database
	* @apiSuccess {String} data/name Serie's original name
	* @apiSuccess {String} data/i18n_name Serie's name in the provided language (fallback to English)
	* @apiSuccess {Number} data/karacount Number of karaokes for that series
	* @apiSuccess {String} data/sid UUID of series
	* @apiSuccess {String} data/seriefile Name of `series.json` file
	* @apiSuccess {Object[]} data/i18n Array of i18n objects
	* @apiSuccess {String} data/i18n/lang ISO639-2B Language code for the series' name
	* @apiSuccess {String} data/i18n/name name Series' name in that language
	* @apiSuccess {String[]} data/aliases Array of aliases
	* @apiSuccess {Object} data/i18n JSON object for the series translations
	* @apiSuccessExample Success-Response:
	* HTTP/1.1 200 OK
	* {
	*   "contents": [
	*        {
	*        "aliases": [
	*            "Tenshi no Nichou Kenjuu: Angelos Armas"
	*        ],
	*        "i18n": [
	*            {
	*                "lang": "eng",
	*                "name": "Angelos Armas"
	*            },
	*            {
	*                "lang": "jpn",
	*                "name": "??????? -Angelos Armas-"
	*            }
	*        ],
	*        "i18n_name": "Angelos Armas",
	*        "karacount": 3,
	*        "name": "Tenshi no Nichô Kenjû: Angelos Armas",
	*        "seriefile": "Tenshi no Nichou Kenjuu Angelos Armas.series.json",
	*		 "sid": "c87a7f7b-20cf-4d7d-98fb-722910f4eec6"
	*		},
	*		...
	*		],
	*       "infos": {
	*           "count": 1000,
	* 			"from": 0,
	* 			"to": 120
	*       }
	* }
	* @apiError SERIES_LIST_ERROR Unable to get series list
	* @apiError WEBAPPMODE_CLOSED_API_MESSAGE API is disabled at the moment.
	* @apiErrorExample Error-Response:
	* HTTP/1.1 500 Internal Server Error
	* @apiErrorExample Error-Response:
	* HTTP/1.1 403 Forbidden
	*/
		.get(getLang, requireAuth, requireWebappLimited, requireValidUser, updateUserLoginTime, async (req: any, res: any) => {
			try {
				const series = await getSeries({
					filter: req.query.filter,
					lang: req.lang,
					from: +req.query.from || 0,
					size: +req.query.size || 9999999
				});
				res.json(series);
			} catch(err) {
				errMessage('SERIES_LIST_ERROR', err);
				res.status(500).send('SERIES_LIST_ERROR');
			}
		})
	/**
 * @api {post} /series Add new series
 * @apiName PostSeries
 * @apiVersion 3.1.0
 * @apiGroup Series
 * @apiPermission admin
 * @apiHeader authorization Auth token received from logging in
 * @apiParam {string} name Series name
 * @apiParam {string[]} aliases Series aliases
 * @apiParam {Object} i18n Object where each property is a ISO839-3 code and its value the name of the series in that language
 * @apiSuccessExample Success-Response:
 * HTTP/1.1 200 OK
 * @apiErrorExample Error-Response:
 * HTTP/1.1 500 Internal Server Error
 * "Error adding series: ..."
 */
		.post(requireAuth, requireValidUser, requireAdmin, async (req: any, res: any) => {
			try {
				await addSerie(req.body);
				res.status(200).send('Series added');
			} catch(err) {
				res.status(500).send(`Error adding series: ${err}`);
			}
		});
	router.route('/series/:sid([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})')
	/**
 * @api {delete} /series/:sid Delete series
 * @apiName DeleteSeries
 * @apiVersion 3.1.0
 * @apiGroup Series
 * @apiPermission admin
 * @apiHeader authorization Auth token received from logging in
 * @apiParam {uuid} sid Series ID to delete
 * @apiSuccessExample Success-Response:
 * HTTP/1.1 200 OK
 * @apiErrorExample Error-Response:
 * HTTP/1.1 500 Internal Server Error
 * "Error deleting series: ..."
 */
		.delete(requireAuth, requireValidUser, requireAdmin, async (req: any, res: any) => {
		try {
			await deleteSerie(req.params.sid);
			res.status(200).send('Series deleted');
		} catch(err) {
			res.status(500).send(`Error deleting series: ${err}`);
		}
	})
	/**
 * @api {get} /series/:sid Get series info
 * @apiName GetSeries
 * @apiVersion 3.1.0
 * @apiGroup Series
 * @apiPermission admin
 * @apiHeader authorization Auth token received from logging in
 * @apiParam {uuid} sid Series ID to get
 * @apiSuccess {string} name Series name
 * @apiSuccess {string[]} aliases Series aliases
 * @apiSuccess {Object} i18n Object where each property is a ISO839-3 code and its value the name of the series in that language.
 * @apiSuccess {string} seriesfile Series metadata filename
 * @apiSuccessExample Success-Response:
 * HTTP/1.1 200 OK
 * {
 * 		name: "Eternity",
 * 		sid: "72cdce0a-656c-4076-99a7-9e2a0cea8e2a"
 * 		aliases: [],
 * 		i18n: {
 * 			fre: "Eternité"
 * 			eng: "Eternity"
 * 			jpn: "Eteruniti"
 * 		},
 * 		seriesfile: "Eternity.series.json"
 * }
 * @apiErrorExample Error-Response:
 * HTTP/1.1 500 Internal Server Error
 * "Error getting series: ..."
 */
		.get(requireAuth, requireValidUser, requireAdmin, async (req: any, res: any) => {
		try {
			const series = await getSerie(req.params.sid);
			res.json(series);
		} catch(err) {
			res.status(500).send(`Error getting series: ${err}`)
		}
	})
	/**
 * @api {put} /series/:sid Edit series
 * @apiName PutSeries
 * @apiVersion 3.1.0
 * @apiGroup Series
 * @apiPermission admin
 * @apiHeader authorization Auth token received from logging in
 * @apiParam {string} sid Series ID to edit
 * @apiParam {string} name Series name
 * @apiParam {string[]} aliases Series aliases
 * @apiParam {Object} i18n Object where each property is a ISO839-3 code and its value the name of the series in that language
 * @apiSuccessExample Success-Response:
 * HTTP/1.1 200 OK
 * @apiErrorExample Error-Response:
 * HTTP/1.1 500 Internal Server Error
 * "Error editing series: ..."
 */
		.put(requireAuth, requireValidUser, requireAdmin, async (req: any, res: any) => {
		try {
			const series = editSerie(req.params.sid, req.body);
			res.json(series);
		} catch(err) {
			res.status(500).send(`Error editing series: ${err}`);
		}
	});
}