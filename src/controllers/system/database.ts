import {requireAuth, requireValidUser, requireAdmin} from '../middlewares/auth';
import {generateDB} from '../../dao/database';
import { Router } from 'express';
import { dumpPG } from '../../utils/postgresql';
import { resetViewcounts } from '../../dao/kara';
import { requireNotDemo } from '../middlewares/demo';
import { updateMedias } from '../../services/download';
import { getConfig } from '../../lib/utils/config';

export default function systemDBController(router: Router) {

	router.post('/system/karas/update', requireNotDemo, requireAuth, requireValidUser, requireAdmin, async (_req: any, res: any) => {
		updateMedias(getConfig().Online.Host);
		res.status(200).send('Medias are being updated, check Karaoke Mugen\'s console to follow its progression');
	});

	router.post('/system/db/regenerate', requireAuth, requireValidUser, requireAdmin, async (_req: any, res: any) => {
		try {
			await generateDB();
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