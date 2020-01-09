import { Router } from "express";
import {requireAuth, requireValidUser, requireAdmin} from '../middlewares/auth';
import {resolve} from 'path';
import multer from 'multer';
import {getRemoteKaras} from '../../services/download';
import { getState } from "../../utils/state";
import { getConfig } from "../../lib/utils/config";
import { getLang } from "../middlewares/lang";
import {deleteKara, getKaras, getKara, getTop50, getKaraPlayed, getKaraHistory} from '../../services/kara';
import {editKara, createKara} from '../../services/kara_creation';
import { KaraList } from '../../lib/types/kara';
import {requireNotDemo} from '../middlewares/demo';

export default function systemKaraController(router: Router) {
	let upload = multer({ dest: resolve(getState().appPath, getConfig().System.Path.Temp)});


	router.get('/system/karas/:kid([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})', getLang, requireAuth, requireValidUser, requireAdmin, async (req: any, res: any) => {
		try {
			const kara = await getKara(req.params.kid,req.authToken,req.lang);
			res.json(kara);
		} catch(err) {
			res.status(500).send('Error while loading kara: ' + err);
		}
	});
	router.delete('/system/karas/:kid([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})', getLang, requireAuth, requireValidUser, requireAdmin, async (req: any, res: any) => {
		try {
			const kara = await deleteKara(req.params.kid);
			res.json(kara);
		} catch(err) {
			res.status(500).send('Error while deleting kara: ' + err);
		}
	});
	router.put('/system/karas/:kid([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})', getLang, requireAuth, requireValidUser, requireAdmin, async (req: any, res: any) => {
		try {
			await editKara(req.body);
			res.status(200).send('Karas successfully edited');
		} catch(err) {
			res.status(500).send(`Error while editing kara: ${err}`);
		}
	});

	router.post('/system/karas/importfile', upload.single('file'), (req: any, res: any) => {
		res.status(200).send(JSON.stringify(req.file));
	});

	router.post('/system/karas', requireAuth, requireValidUser, requireAdmin, async (req: any, res: any) => {
		try {
			await createKara(req.body);
			res.status(200).send('Kara successfully generated');
		} catch(err) {
			res.status(500).send(`Error while generating kara : ${err}`);
		}
	});

	router.get('/system/karas', getLang, requireNotDemo, requireAuth, requireValidUser, requireAdmin, async (req: any, res: any) => {
		try {
			let karas: KaraList;
			if (req.query.instance) {
				karas = await getRemoteKaras(req.query.instance, {
					filter: req.query.filter,
					q: req.query.q ? req.query.q : '',
					from: +req.query.from,
					size: +req.query.size
				});
			} else {
				karas = await getKaras({
					filter: req.query.filter,
					lang: req.lang,
					from: +req.query.from || 0,
					size: +req.query.size || 999999999,
					token: req.authToken
				});
			}
			res.status(200).json(karas);
		} catch(err) {
			res.status(500).send(`Error while fetching karas: ${err}`);
		}
	});

	router.get('/system/karas/history', requireAuth, requireValidUser, requireAdmin, async (_req: any, res: any) =>{
		try {
			const karas = await getKaraHistory();
			res.status(200).json(karas);
		} catch(err) {
			res.status(500).send(`Error while fetching karas history: ${err}`);
		}
	});

	router.get('/system/karas/ranking', getLang, requireAuth, requireValidUser, requireAdmin, async (req: any, res: any) =>{
		try {
			const karas = await getTop50(req.authToken, req.lang);
			res.status(200).json(karas);
		} catch(err) {
			res.status(500).send(`Error while fetching karas most requested: ${err}`);
		}
	});

	router.get('/system/karas/viewcounts', requireAuth, requireValidUser, requireAdmin, async (req: any, res: any) => {
		try {
			const karas = await getKaraPlayed(req.authToken, req.lang, +req.query.from || 0, +req.query.size || 9999999)
			res.status(200).json(karas);
		} catch(err) {
			res.status(500).send(`Error while fetching karas most played: ${err}`);
		}
	});



}