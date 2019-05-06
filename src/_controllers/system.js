import {editSetting, backupConfig, getConfig} from '../_utils/config';
import {emitWS} from '../_webapp/frontend';
import {getState} from '../_utils/state';
import {run as generateDatabase} from '../_services/generation';
import {renameAllKaras, editKara, createKara, karaGenerationBatch} from '../_services/kara_creation';
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
import {updateBase, getRemoteKaras, getDownloadBLC, addDownloadBLC, editDownloadBLC, removeDownloadBLC, emptyDownloadBLC, getDownloads, removeDownload, retryDownload, pauseQueue, startDownloads, addDownloads, wipeDownloads} from '../_services/download';
import {getRepos} from '../_services/repo';
import {dumpPG} from '../_utils/postgresql';
import logger from 'winston';

export default function systemController(router) {
	let upload = multer({ dest: resolve(getState().appPath, getConfig().System.Path.Temp)});

	router.get('/system/config', requireAuth, requireValidUser, requireAdmin, (req, res) => {
		res.json(getConfig());
	});

	router.put('/system/config', requireAuth, requireValidUser, requireAdmin, async (req, res) => {
		try {
			const publicSettings = editSetting(req.body.setting);
			emitWS('settingsUpdated',publicSettings);
			res.status(200).send('Config updated');
		} catch(err) {
			res.status(500).send(`Error saving config : ${err}`);
		}
	});

	router.post('/system/config/backup', requireAuth, requireValidUser, requireAdmin, (req, res) => {
		backupConfig()
			.then(() => res.status(200).send('Configuration file backuped to config.ini.backup'))
			.catch(err => res.status(500).send(`Error backuping config file: ${err}`));
	});

	router.post('/system/db/regenerate', requireAuth, requireValidUser, requireAdmin, (req, res) => {
		generateDatabase()
			.then(() => res.status(200).send('DB successfully regenerated'))
			.catch(err => res.status(500).send(`Error while regenerating DB: ${err}`));
	});
	router.get('/system/karas/:kid([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})', getLang, requireAuth, requireValidUser, requireAdmin, (req, res) => {
		getKara(req.params.kid,req.authToken,req.lang)
			.then(kara => res.json(kara))
			.catch(err => res.status(500).send('Error while loading kara: ' + err));
	});
	router.delete('/system/karas/:kid([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})', getLang, requireAuth, requireValidUser, requireAdmin, (req, res) => {
		deleteKara(req.params.kid)
			.then(kara => res.json(kara))
			.catch(err => res.status(500).send('Error while deleting kara: ' + err));
	});
	router.put('/system/karas/:kid([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})', getLang, requireAuth, requireValidUser, requireAdmin, (req, res) => {
		editKara(req.body)
			.then(() => res.status(200).send('Karas successfully edited'))
			.catch(err => res.status(500).send(`Error while editing kara: ${err}`));
	});
	router.post('/system/karas/generate-all', requireAuth, requireValidUser, requireAdmin, (req, res) => {
		karaGenerationBatch()
			.then(() => res.status(200).send('Karas successfully generated'))
			.catch(err => res.status(500).send(`Error while generating karas: ${err}`));
	});

	router.post('/system/karas/importfile', upload.single('file'), (req, res) => {
		res.status(200).send(JSON.stringify(req.file));
	});

	router.post('/system/karas', requireAuth, requireValidUser, requireAdmin, (req, res) => {
		createKara(req.body)
			.then(() => res.status(200).send('Kara successfully generated'))
			.catch(err => {
				res.status(500).send(`Error while generating kara : ${err}`);
			});
	});

	router.get('/system/karas', getLang, requireNotDemo, requireAuth, requireValidUser, requireAdmin, async (req, res) => {
		try {
			let karas;
			if (req.query.instance) {
				karas = await getRemoteKaras(req.query.instance, req.query.filter, req.query.from, req.query.size);
			} else {
				karas = await getKaras(req.query.filter, req.lang, req.query.from, req.query.size, null, null, req.authToken);
			}
			res.json(karas);
		} catch(err) {
			res.status(500).send(`Error while fetching karas: ${err}`);
		}
	});

	router.get('/system/tags', requireAuth, requireValidUser, requireAdmin, (req, res) => {
		getTags(req.query.filter, req.query.type, 0, 999999999)
			.then(tags => res.json(tags))
			.catch(err => res.status(500).send(`Error while fetching tags: ${err}`));
	});

	router.get('/system/series', getLang, requireAuth, requireValidUser, requireAdmin, (req, res) => {
		getSeries(req.query.filter, req.lang, 0, 999999999999)
			.then(series => res.json(series))
			.catch(err => res.status(500).send(`Error while fetching series: ${err}`));
	});

	router.delete('/system/series/:sid([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})', requireAuth, requireValidUser, requireAdmin, (req, res) => {
		deleteSerie(req.params.sid)
			.then(() => res.status(200).send('Series deleted'))
			.catch(err => res.status(500).send(`Error deleting series: ${err}`));
	});

	router.get('/system/series/:sid([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})', requireAuth, requireValidUser, requireAdmin, (req, res) => {
		getSerie(req.params.sid)
			.then((series) => res.json(series))
			.catch(err => res.status(500).send(`Error deleting series: ${err}`));
	});

	router.put('/system/series/:sid([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})', requireAuth, requireValidUser, requireAdmin, (req, res) => {
		editSerie(req.params.sid,req.body)
			.then((series) => res.json(series))
			.catch(err => res.status(500).send(`Error editing series: ${err}`));
	});

	router.post('/system/series', requireAuth, requireValidUser, requireAdmin, (req, res) => {
		addSerie(req.body)
			.then(() => res.status(200).send('Series added'))
			.catch(err => res.status(500).send(`Error adding series: ${err}`));
	});

	router.get('/system/users', requireNotDemo, requireAuth, requireValidUser, requireAdmin, (req, res) => {
		listUsers()
			.then(users => res.json(users))
			.catch(err => res.status(500).send(`Error while fetching users: ${err}`));
	});

	router.get('/system/karas/history', requireAuth, requireValidUser, requireAdmin, (req, res) =>{
		getKaraHistory(req.authToken, req.lang, +req.query.from || 0, +req.query.size || 9999999)
			.then(karas => res.json(karas))
			.catch(err => res.status(500).send(`Error while fetching karas history: ${err}`));
	});

	router.get('/system/karas/ranking', getLang, requireAuth, requireValidUser, requireAdmin, (req, res) =>{
		getTop50(req.authToken, req.lang, +req.query.from || 0, +req.query.size || 9999999)
			.then(karas => res.json(karas))
			.catch(err => res.status(500).send(`Error while fetching karas most requested: ${err}`));
	});

	router.get('/system/karas/viewcounts', requireAuth, requireValidUser, requireAdmin, (req, res) =>{
		getKaraPlayed(req.authToken, req.lang, +req.query.from || 0, +req.query.size || 9999999)
			.then(karas => res.json(karas))
			.catch(err => res.status(500).send(`Error while fetching karas most played: ${err}`));
	});

	router.get('/system/users/:userLogin', requireNotDemo, requireAuth, requireValidUser, requireAdmin, (req, res) => {
		findUserByName(req.params.userLogin)
			.then(user => res.json(user))
			.catch(err => res.status(500).send(`Error while fetching user: ${err}`));
	});
	router.post('/system/users', requireNotDemo, requireAuth, requireValidUser, requireAdmin, (req, res) => {
		createUser(req.body)
			.then(res.send('OK'))
			.catch(err => res.status(500).send(`Error while creating user: ${err}`));
	});

	router.put('/system/users/:userLogin', requireNotDemo, requireAuth, requireValidUser, requireAdmin, (req, res) => {
		editUser(req.body.login,req.body,req.body.avatar,req.authToken.role)
			.then(() => res.status(200).send('User edited'))
			.catch(err => res.status(500).send(`Error editing user: ${err}`));
	});

	router.delete('/system/users/:userLogin', requireNotDemo, requireAuth, requireValidUser, requireAdmin, (req, res) => {
		deleteUser(req.params.userLogin)
			.then(() => res.status(200).send('User deleted'))
			.catch(err => res.status(500).send(`Error deleting user: ${err}`));
	});

	router.post('/system/db/dump', requireAuth, requireValidUser, requireAdmin, async (req, res) => {
		try {
			await dumpPG();
			res.status(200).send('Database dumped to karaokemugen.pgdump');
		} catch(err) {
			res.status(500).send(`Error dumping database : ${err}`);
		}
	});

	router.post('/system/db/resetviewcounts', requireAuth, requireValidUser, requireAdmin, (req, res) => {
		resetViewcounts()
			.then(() => res.status(200).send('Viewcounts successfully reset'))
			.catch(err => res.status(500).send(`Error resetting viewcounts: ${err}`));
	});
	router.post('/db/resetviewcounts', requireAuth, requireValidUser, requireAdmin, async (req, res) => {
		try {
			await resetViewcounts();
			res.status(200).send('Viewcounts successfully reset');
		} catch(err) {
			res.status(500).send(`Error resetting viewcounts: ${err}`);
		}
	});
	router.get('/system/repos', requireNotDemo, requireAuth, requireValidUser, requireAdmin, async (req, res) => {
		try {
			const repos = await getRepos();
			res.json(repos);
		} catch(err) {
			res.status(500).send(`Error getting repositories: ${err}`);
		}
	});
	router.post('/system/downloads', requireNotDemo, requireAuth, requireValidUser, requireAdmin, async (req, res) => {
		try {
			const msg = await addDownloads(req.body.repository,req.body.downloads);
			res.status(200).send(msg);
		} catch(err) {
			res.status(500).send(`Error while adding download: ${err}`);
		}
	});
	router.get('/system/downloads', requireNotDemo, requireAuth, requireValidUser, requireAdmin, async (req, res) => {
		try {
			const downloads = await getDownloads();
			res.json(downloads);
		} catch(err) {
			res.status(500).send(`Error getting downloads: ${err}`);
		}
	});
	router.delete('/system/downloads', requireNotDemo, requireAuth, requireValidUser, requireAdmin, async (req, res) => {
		try {
			await wipeDownloads();
			res.status(200).send('Download queue emptied completely');
		} catch(err) {
			res.status(500).send(`Error wiping downloads: ${err}`);
		}
	});
	router.delete('/system/downloads/:uuid', requireNotDemo, requireAuth, requireValidUser, requireAdmin, async (req, res) => {
		try {
			await removeDownload(req.params.uuid);
			res.status(200).send('Download removed');
		} catch(err) {
			res.status(500).send(`Error removing download: ${err}`);
		}
	});
	router.put('/system/downloads/:uuid/retry', requireNotDemo, requireAuth, requireValidUser, requireAdmin, async (req, res) => {
		try {
			await retryDownload(req.params.uuid);
			res.status(200).send('Download back into queue');
		} catch(err) {
			res.status(500).send(`Error retrying download: ${err}`);
		}
	});
	router.put('/system/downloads/pause', requireNotDemo, requireAuth, requireValidUser, requireAdmin, async (req, res) => {
		try {
			await pauseQueue();
			res.status(200).send('Downloads paused');
		} catch(err) {
			res.status(500).send(`Error pausing downloads: ${err}`);
		}
	});
	router.put('/system/downloads/start', requireNotDemo, requireAuth, requireValidUser, requireAdmin, async (req, res) => {
		try {
			await startDownloads();
			res.status(200).send('Downloads starting');
		} catch(err) {
			res.status(500).send(`Error starting downloads: ${err}`);
		}
	});
	router.get('/system/downloads/blacklist/criterias', requireNotDemo, requireAuth, requireValidUser, requireAdmin, async (req, res) => {
		try {
			const blc = await getDownloadBLC();
			res.status(200).json(blc);
		} catch(err) {
			res.status(500).send(`Error getting download BLCs : ${err}`);
		}
	});
	router.post('/system/downloads/blacklist/criterias', requireNotDemo, requireAuth, requireValidUser, requireAdmin, async (req, res) => {
		try {
			await addDownloadBLC(req.body.type, req.body.value);
			res.status(200).send('Download blacklist criteria added');
		} catch(err) {
			res.status(500).send(`Error adding download BLC : ${err}`);
		}
	});
	router.put('/system/downloads/blacklist/criterias/:id', requireNotDemo, requireAuth, requireValidUser, requireAdmin, async (req, res) => {
		try {
			await editDownloadBLC(req.params.id, req.body.type, req.body.value);
			res.status(200).send('Download blacklist criteria edited');
		} catch(err) {
			res.status(500).send(`Error editing download BLC : ${err}`);
		}
	});
	router.delete('/system/downloads/blacklist/criterias/:id', requireNotDemo, requireAuth, requireValidUser, requireAdmin, async (req, res) => {
		try {
			await removeDownloadBLC(req.params.id);
			res.status(200).send('Download blacklist criteria removed');
		} catch(err) {
			res.status(500).send(`Error removing download BLC : ${err}`);
		}
	});
	router.delete('/system/downloads/blacklist/criterias', requireNotDemo, requireAuth, requireValidUser, requireAdmin, async (req, res) => {
		try {
			await emptyDownloadBLC();
			res.status(200).send('Download blacklist criterias emptied');
		} catch(err) {
			res.status(500).send(`Error emptying download BLC : ${err}`);
		}
	});
	router.post('/system/db/renamekaras', requireAuth, requireValidUser, requireAdmin, async (req, res) => {
		try {
			await renameAllKaras();
			res.status(200).send('Karas successfully renamed');
		} catch(err) {
			res.status(500).send(`Error renaming karas: ${err}`);
		}
	});


	router.post('/system/karas/update', requireNotDemo, requireAuth, requireValidUser, requireAdmin, (req, res) => {
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
	router.post('/system/downloads/update', requireNotDemo, requireAuth, requireValidUser, requireAdmin, async (req, res) => {
		try {
			await updateBase(req.body.instance);
			res.status(200).send('Update in progress');
		} catch(err) {
			res.status(500).send(`Error computing update: ${err}`);
		}
	});

}