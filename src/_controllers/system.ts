import {editSetting, backupConfig, getConfig} from '../_utils/config';
import {emitWS} from '../_webapp/frontend';
import {getState} from '../_utils/state';
import {run as generateDatabase} from '../_services/generation';
import {editKara, createKara} from '../_services/kara_creation';
import {requireAuth, requireValidUser, requireAdmin} from './middlewares/auth';
import {requireNotDemo} from './middlewares/demo';
import {getLang} from './middlewares/lang';
import {editUser, createUser, findUserByName, listUsers, deleteUser} from '../_services/user';
import {deleteKara, getKaras, getKara, getTop50, getKaraPlayed, getKaraHistory} from '../_services/kara';
import {getTags} from '../_services/tag';
import {runBaseUpdate} from '../_updater/karabase_updater';
import {resetViewcounts} from '../_dao/kara';
import {resolve} from 'path';
import multer from 'multer';
import {addSerie, deleteSerie, editSerie, getSeries, getSerie} from '../_services/series';
import {getRemoteKaras, getDownloadBLC, addDownloadBLC, editDownloadBLC, removeDownloadBLC, emptyDownloadBLC, getDownloads, removeDownload, retryDownload, pauseQueue, startDownloads, addDownloads, wipeDownloads} from '../_services/download';
import {getRepos} from '../_services/repo';
import {dumpPG} from '../_utils/postgresql';
import logger from 'winston';
import { KaraList } from '../_types/kara';

export default function systemController(router) {
	let upload = multer({ dest: resolve(getState().appPath, getConfig().System.Path.Temp)});

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

	router.post('/system/config/backup', requireAuth, requireValidUser, requireAdmin, (_req: any, res: any) => {
		backupConfig()
			.then(() => res.status(200).send('Configuration file backuped to config.ini.backup'))
			.catch(err => res.status(500).send(`Error backuping config file: ${err}`));
	});

	router.post('/system/db/regenerate', requireAuth, requireValidUser, requireAdmin, (_req: any, res: any) => {
		generateDatabase()
			.then(() => res.status(200).send('DB successfully regenerated'))
			.catch(err => res.status(500).send(`Error while regenerating DB: ${err}`));
	});
	router.get('/system/karas/:kid([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})', getLang, requireAuth, requireValidUser, requireAdmin, (req: any, res: any) => {
		getKara(req.params.kid,req.authToken,req.lang)
			.then(kara => res.json(kara))
			.catch(err => res.status(500).send('Error while loading kara: ' + err));
	});
	router.delete('/system/karas/:kid([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})', getLang, requireAuth, requireValidUser, requireAdmin, (req: any, res: any) => {
		deleteKara(req.params.kid)
			.then(kara => res.json(kara))
			.catch(err => res.status(500).send('Error while deleting kara: ' + err));
	});
	router.put('/system/karas/:kid([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})', getLang, requireAuth, requireValidUser, requireAdmin, (req:any , res: any) => {
		editKara(req.body)
			.then(() => res.status(200).send('Karas successfully edited'))
			.catch(err => res.status(500).send(`Error while editing kara: ${err}`));
	});

	router.post('/system/karas/importfile', upload.single('file'), (req: any, res: any) => {
		res.status(200).send(JSON.stringify(req.file));
	});

	router.post('/system/karas', requireAuth, requireValidUser, requireAdmin, (req: any, res: any) => {
		createKara(req.body)
			.then(() => res.status(200).send('Kara successfully generated'))
			.catch(err => {
				res.status(500).send(`Error while generating kara : ${err}`);
			});
	});

	router.get('/system/karas', getLang, requireNotDemo, requireAuth, requireValidUser, requireAdmin, async (req: any, res: any) => {
		try {
			let karas: KaraList;
			if (req.query.instance) {
				karas = await getRemoteKaras(req.query.instance, {
					filter: req.query.filter,
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
			res.json(karas);
		} catch(err) {
			res.status(500).send(`Error while fetching karas: ${err}`);
		}
	});

	router.get('/system/tags', requireAuth, requireValidUser, requireAdmin, (req: any, res: any) => {
		getTags({
			filter: req.query.filter,
			type: req.query.type,
			from: 0,
			size: 999999999
		})
			.then(tags => res.json(tags))
			.catch(err => res.status(500).send(`Error while fetching tags: ${err}`));
	});

	router.get('/system/series', getLang, requireAuth, requireValidUser, requireAdmin, (req: any, res: any) => {
		getSeries({
			filter: req.query.filter,
			lang: req.lang,
			from: 0,
			size: 999999999999
		})
			.then(series => res.json(series))
			.catch(err => res.status(500).send(`Error while fetching series: ${err}`));
	});

	router.delete('/system/series/:sid([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})', requireAuth, requireValidUser, requireAdmin, (req: any, res: any) => {
		deleteSerie(req.params.sid)
			.then(() => res.status(200).send('Series deleted'))
			.catch(err => res.status(500).send(`Error deleting series: ${err}`));
	});

	router.get('/system/series/:sid([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})', requireAuth, requireValidUser, requireAdmin, (req: any, res: any) => {
		getSerie(req.params.sid)
			.then((series) => res.json(series))
			.catch(err => res.status(500).send(`Error deleting series: ${err}`));
	});

	router.put('/system/series/:sid([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})', requireAuth, requireValidUser, requireAdmin, (req: any, res: any) => {
		editSerie(req.params.sid,req.body)
			.then((series) => res.json(series))
			.catch(err => res.status(500).send(`Error editing series: ${err}`));
	});

	router.post('/system/series', requireAuth, requireValidUser, requireAdmin, (req: any, res: any) => {
		addSerie(req.body)
			.then(() => res.status(200).send('Series added'))
			.catch(err => res.status(500).send(`Error adding series: ${err}`));
	});

	router.get('/system/users', requireNotDemo, requireAuth, requireValidUser, requireAdmin, (_req: any, res: any) => {
		listUsers()
			.then(users => res.json(users))
			.catch(err => res.status(500).send(`Error while fetching users: ${err}`));
	});

	router.get('/system/karas/history', requireAuth, requireValidUser, requireAdmin, (_req: any, res: any) =>{
		getKaraHistory()
			.then(karas => res.json(karas))
			.catch(err => res.status(500).send(`Error while fetching karas history: ${err}`));
	});

	router.get('/system/karas/ranking', getLang, requireAuth, requireValidUser, requireAdmin, (req: any, res: any) =>{
		getTop50(req.authToken, req.lang)
			.then(karas => res.json(karas))
			.catch(err => res.status(500).send(`Error while fetching karas most requested: ${err}`));
	});

	router.get('/system/karas/viewcounts', requireAuth, requireValidUser, requireAdmin, (req: any, res: any) =>{
		getKaraPlayed(req.authToken, req.lang, +req.query.from || 0, +req.query.size || 9999999)
			.then(karas => res.json(karas))
			.catch(err => res.status(500).send(`Error while fetching karas most played: ${err}`));
	});

	router.get('/system/users/:userLogin', requireNotDemo, requireAuth, requireValidUser, requireAdmin, (req: any, res: any) => {
		findUserByName(req.params.userLogin)
			.then(user => res.json(user))
			.catch(err => res.status(500).send(`Error while fetching user: ${err}`));
	});

	router.post('/system/users', requireNotDemo, requireAuth, requireValidUser, requireAdmin, (req: any, res: any) => {
		createUser(req.body)
			.then(res.send('OK'))
			.catch(err => res.status(500).send(`Error while creating user: ${err}`));
	});

	router.put('/system/users/:userLogin', requireNotDemo, requireAuth, requireValidUser, requireAdmin, (req: any, res: any) => {
		editUser(req.body.login,req.body,req.body.avatar,req.authToken.role, { editRemote: false })
			.then(() => res.status(200).send('User edited'))
			.catch(err => res.status(500).send(`Error editing user: ${err}`));
	});

	router.delete('/system/users/:userLogin', requireNotDemo, requireAuth, requireValidUser, requireAdmin, (req: any, res: any) => {
		deleteUser(req.params.userLogin)
			.then(() => res.status(200).send('User deleted'))
			.catch(err => res.status(500).send(`Error deleting user: ${err}`));
	});

	router.post('/system/db/dump', requireAuth, requireValidUser, requireAdmin, async (_req: any, res: any) => {
		try {
			await dumpPG();
			res.status(200).send('Database dumped to karaokemugen.pgdump');
		} catch(err) {
			res.status(500).send(`Error dumping database : ${err}`);
		}
	});

	router.post('/system/db/resetviewcounts', requireAuth, requireValidUser, requireAdmin, (_req: any, res: any) => {
		resetViewcounts()
			.then(() => res.status(200).send('Viewcounts successfully reset'))
			.catch(err => res.status(500).send(`Error resetting viewcounts: ${err}`));
	});
	router.post('/db/resetviewcounts', requireAuth, requireValidUser, requireAdmin, async (_req: any, res: any) => {
		try {
			await resetViewcounts();
			res.status(200).send('Viewcounts successfully reset');
		} catch(err) {
			res.status(500).send(`Error resetting viewcounts: ${err}`);
		}
	});
	router.get('/system/repos', requireNotDemo, requireAuth, requireValidUser, requireAdmin, async (_req: any, res: any) => {
		try {
			const repos = await getRepos();
			res.json(repos);
		} catch(err) {
			res.status(500).send(`Error getting repositories: ${err}`);
		}
	});
	router.post('/system/downloads', requireNotDemo, requireAuth, requireValidUser, requireAdmin, async (req: any, res: any) => {
		try {
			const msg = await addDownloads(req.body.repository,req.body.downloads);
			res.status(200).send(msg);
		} catch(err) {
			res.status(500).send(`Error while adding download: ${err}`);
		}
	});
	router.get('/system/downloads', requireNotDemo, requireAuth, requireValidUser, requireAdmin, async (_req: any, res: any) => {
		try {
			const downloads = await getDownloads();
			res.json(downloads);
		} catch(err) {
			res.status(500).send(`Error getting downloads: ${err}`);
		}
	});
	router.delete('/system/downloads', requireNotDemo, requireAuth, requireValidUser, requireAdmin, async (_req: any, res: any) => {
		try {
			await wipeDownloads();
			res.status(200).send('Download queue emptied completely');
		} catch(err) {
			res.status(500).send(`Error wiping downloads: ${err}`);
		}
	});
	router.delete('/system/downloads/:uuid', requireNotDemo, requireAuth, requireValidUser, requireAdmin, async (req: any, res: any) => {
		try {
			await removeDownload(req.params.uuid);
			res.status(200).send('Download removed');
		} catch(err) {
			res.status(500).send(`Error removing download: ${err}`);
		}
	});
	router.put('/system/downloads/:uuid/retry', requireNotDemo, requireAuth, requireValidUser, requireAdmin, async (req: any, res: any) => {
		try {
			await retryDownload(req.params.uuid);
			res.status(200).send('Download back into queue');
		} catch(err) {
			res.status(500).send(`Error retrying download: ${err}`);
		}
	});
	router.put('/system/downloads/pause', requireNotDemo, requireAuth, requireValidUser, requireAdmin, async (_req: any, res: any) => {
		try {
			await pauseQueue();
			res.status(200).send('Downloads paused');
		} catch(err) {
			res.status(500).send(`Error pausing downloads: ${err}`);
		}
	});
	router.put('/system/downloads/start', requireNotDemo, requireAuth, requireValidUser, requireAdmin, async (_req: any, res: any) => {
		try {
			await startDownloads();
			res.status(200).send('Downloads starting');
		} catch(err) {
			res.status(500).send(`Error starting downloads: ${err}`);
		}
	});
	router.get('/system/downloads/blacklist/criterias', requireNotDemo, requireAuth, requireValidUser, requireAdmin, async (_req: any, res: any) => {
		try {
			const blc = await getDownloadBLC();
			res.status(200).json(blc);
		} catch(err) {
			res.status(500).send(`Error getting download BLCs : ${err}`);
		}
	});
	router.post('/system/downloads/blacklist/criterias', requireNotDemo, requireAuth, requireValidUser, requireAdmin, async (req: any, res: any) => {
		try {
			await addDownloadBLC({ type: req.body.type, value: req.body.value});
			res.status(200).send('Download blacklist criteria added');
		} catch(err) {
			res.status(500).send(`Error adding download BLC : ${err}`);
		}
	});
	router.put('/system/downloads/blacklist/criterias/:id', requireNotDemo, requireAuth, requireValidUser, requireAdmin, async (req: any, res: any) => {
		try {
			await editDownloadBLC({ id: +req.params.id, type: +req.body.type, value: req.body.value});
			res.status(200).send('Download blacklist criteria edited');
		} catch(err) {
			res.status(500).send(`Error editing download BLC : ${err}`);
		}
	});
	router.delete('/system/downloads/blacklist/criterias/:id', requireNotDemo, requireAuth, requireValidUser, requireAdmin, async (req: any, res: any) => {
		try {
			await removeDownloadBLC(req.params.id);
			res.status(200).send('Download blacklist criteria removed');
		} catch(err) {
			res.status(500).send(`Error removing download BLC : ${err}`);
		}
	});
	router.delete('/system/downloads/blacklist/criterias', requireNotDemo, requireAuth, requireValidUser, requireAdmin, async (_req: any, res: any) => {
		try {
			await emptyDownloadBLC();
			res.status(200).send('Download blacklist criterias emptied');
		} catch(err) {
			res.status(500).send(`Error emptying download BLC : ${err}`);
		}
	});


	router.post('/system/karas/update', requireNotDemo, requireAuth, requireValidUser, requireAdmin, (_req: any, res: any) => {
		runBaseUpdate()
			.then(() => {
				logger.info('[Updater] User-triggered update successful');
				generateDatabase().then(() => {
					logger.info('[Gen] User-triggered generation successful');
				}).catch(err => {
					logger.error(`[Gen] Generation failed : ${err}`);
				});
			}).catch(err => {
				logger.error(`[Updater] Update failed : ${err}`);
			});
		res.status(200).send('Karas are being updated, check Karaoke Mugen\'s console to follow its progression');
	});
}