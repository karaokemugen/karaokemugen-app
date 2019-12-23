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
	* @apiVersion 2.5.0
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
		.post(requireAuth, requireValidUser, requireAdmin, async (req: any, res: any) => {
			try {
				await addSerie(req.body);
				res.status(200).send('Series added');
			} catch(err) {
				res.status(500).send(`Error adding series: ${err}`);
			}
		});
	router.delete('/series/:sid([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})', requireAuth, requireValidUser, requireAdmin, async (req: any, res: any) => {
		try {
			await deleteSerie(req.params.sid);
			res.status(200).send('Series deleted');
		} catch(err) {
			res.status(500).send(`Error deleting series: ${err}`);
		}
	});

	router.get('/series/:sid([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})', requireAuth, requireValidUser, requireAdmin, async (req: any, res: any) => {
		try {
			const series = await getSerie(req.params.sid);
			res.json(series);
		} catch(err) {
			res.status(500).send(`Error getting series: ${err}`)
		}
	});

	router.put('/series/:sid([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})', requireAuth, requireValidUser, requireAdmin, async (req: any, res: any) => {
		try {
			const series = editSerie(req.params.sid, req.body);
			res.json(series);
		} catch(err) {
			res.status(500).send(`Error editing series: ${err}`);
		}
	});
}