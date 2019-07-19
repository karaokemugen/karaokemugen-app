import { Router } from "express";
import { getLang } from "../middlewares/lang";
import { requireAuth, requireValidUser, requireAdmin } from "../middlewares/auth";
import {addSerie, deleteSerie, editSerie, getSeries, getSerie} from '../../services/series';

export default function systemSeriesController(router: Router) {
	router.get('/system/series', getLang, requireAuth, requireValidUser, requireAdmin, async (req: any, res: any) => {
		try {
			const series = await getSeries({
				filter: req.query.filter,
				lang: req.lang,
				from: 0,
				size: 999999999999
			});
			res.json(series);
		} catch(err) {
			res.status(500).send(`Error while fetching series: ${err}`);
		}
	});

	router.delete('/system/series/:sid([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})', requireAuth, requireValidUser, requireAdmin, async (req: any, res: any) => {
		try {
			await deleteSerie(req.params.sid);
			res.status(200).send('Series deleted');
		} catch(err) {
			res.status(500).send(`Error deleting series: ${err}`);
		}
	});

	router.get('/system/series/:sid([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})', requireAuth, requireValidUser, requireAdmin, async (req: any, res: any) => {
		try {
			const series = await getSerie(req.params.sid);
			res.json(series);
		} catch(err) {
			res.status(500).send(`Error getting series: ${err}`)
		}
	});

	router.put('/system/series/:sid([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})', requireAuth, requireValidUser, requireAdmin, async (req: any, res: any) => {
		try {
			const series = editSerie(req.params.sid, req.body);
			res.json(series);
		} catch(err) {
			res.status(500).send(`Error editing series: ${err}`);
		}
	});

	router.post('/system/series', requireAuth, requireValidUser, requireAdmin, async (req: any, res: any) => {
		try {
			await addSerie(req.body);
			res.status(200).send('Series added');
		} catch(err) {
			res.status(500).send(`Error adding series: ${err}`);
		}
	});
}