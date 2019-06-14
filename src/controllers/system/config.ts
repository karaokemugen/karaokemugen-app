import {editSetting, backupConfig} from '../../utils/config';
import {getConfig} from '../../lib/utils/config';
import {requireAuth, requireValidUser, requireAdmin} from '../middlewares/auth';
import { Router } from 'express';
import { readLog } from '../../lib/utils/logger';

export default function systemConfigCTL(router: Router) {
	router.get('/system/config', requireAuth, requireValidUser, requireAdmin, (_req: any, res: any) => {
		res.json(getConfig());
	});

	router.get('/system/log', requireAuth, requireValidUser, requireAdmin, async (_req: any, res: any) => {
		res.send(await readLog());
	});

	router.put('/system/config', requireAuth, requireValidUser, requireAdmin, async (req: any, res: any) => {
		try {
			editSetting(req.body.setting);
			res.status(200).send('Config updated');
		} catch(err) {
			res.status(500).send(`Error saving config : ${err}`);
		}
	});

	router.post('/system/config/backup', requireAuth, requireValidUser, requireAdmin, async (_req: any, res: any) => {
		try {
			await backupConfig();
			res.status(200).send('Configuration file backuped to config.ini.backup');
		} catch(err) {
			res.status(500).send(`Error backuping config file: ${err}`);
		}
	});
}