import {requireAuth, requireValidUser, requireAdmin} from '../middlewares/auth';
import {run as generateDatabase} from '../../services/generation';
import { Router } from 'express';
import { dumpPG } from '../../utils/postgresql';
import { resetViewcounts } from '../../dao/kara';
import { runBaseUpdate } from '../../updater/karabase_updater';
import { requireNotDemo } from '../middlewares/demo';

export default function systemDBController(router: Router) {

	router.post('/system/karas/update', requireNotDemo, requireAuth, requireValidUser, requireAdmin, async (_req: any, res: any) => {
		res.status(200).send('Karas are being updated, check Karaoke Mugen\'s console to follow its progression');
		await runBaseUpdate();
		await generateDatabase();
	});

	router.post('/system/db/regenerate', requireAuth, requireValidUser, requireAdmin, async (_req: any, res: any) => {
		try {
			await generateDatabase();
			res.status(200).send('DB successfully regenerated');
		} catch(err) {
			res.status(500).send(`Error while regenerating DB: ${err}`);
		}
	});

	router.post('/system/db/dump', requireAuth, requireValidUser, requireAdmin, async (_req: any, res: any) => {
		try {
			await dumpPG();
			res.status(200).send('Database dumped to karaokemugen.pgdump');
		} catch(err) {
			res.status(500).send(`Error dumping database : ${err}`);
		}
	});

	router.post('/system/db/resetviewcounts', requireAuth, requireValidUser, requireAdmin, async (_req: any, res: any) => {
		try {
			await resetViewcounts();
			res.status(200).send('Viewcounts successfully reset');
		} catch(err) {
			res.status(500).send(`Error resetting viewcounts: ${err}`)
		}
	});

}