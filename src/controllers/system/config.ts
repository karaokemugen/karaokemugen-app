import {editSetting, backupConfig, getConfig} from '../../utils/config';
import {emitWS} from '../../webapp/frontend';
import {requireAuth, requireValidUser, requireAdmin} from '../middlewares/auth';
import { Router } from 'express';

export default function systemConfigCTL(router: Router) {
	router.get('/system/config', requireAuth, requireValidUser, requireAdmin, (_req: any, res: any) => {
		res.json(getConfig());
	});

	router.put('/system/config', requireAuth, requireValidUser, requireAdmin, async (req: any, res: any) => {
		try {
			const publicSettings = editSetting(req.body.setting);
			emitWS('settingsUpdated',publicSettings);
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