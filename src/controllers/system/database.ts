import {requireAuth, requireValidUser, requireAdmin} from '../middlewares/auth';
import {generateDB} from '../../dao/database';
import { Router } from 'express';
import { dumpPG, restorePG } from '../../utils/postgresql';
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
			res.status(200).send('Database dumped to karaokemugen.sql');
		} catch(err) {
			res.status(500).send(`Error dumping database : ${err}`);
		}
	});
	router.post('/system/db/restore', requireAuth, requireValidUser, requireAdmin, async (_req: any, res: any) => {
		try {
			await restorePG();
			res.status(200).send('Database restored from karaokemugen.sql');
		} catch(err) {
			res.status(500).send(`Error restoring database : ${err}`);
		}
	});
}