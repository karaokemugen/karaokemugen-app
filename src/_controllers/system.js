import {editSetting, backupConfig, getConfig} from '../_utils/config';
import {emitWS} from '../_webapp/frontend';
import {run as generateDatabase} from '../_services/generation';
import {renameAllKaras, editKara, createKara, karaGenerationBatch} from '../_services/kara_creation';
import {requireAuth, requireValidUser, requireAdmin} from './middlewares/auth';
import {requireNotDemo} from './middlewares/demo';
import {getLang} from './middlewares/lang';
import {editUser, createUser, findUserByID, listUsers, deleteUserById} from '../_services/user';
import {getKaras, getKara, getTop50, getKaraPlayed, getKaraHistory} from '../_services/kara';
import {getTags} from '../_services/tag';
import {runBaseUpdate} from '../_updater/karabase_updater';
import {resetViewcounts} from '../_dao/kara';
import {resolve} from 'path';
import multer from 'multer';
import {addSerie, deleteSerie, editSerie, getSeries, getSerie} from '../_services/series';
import {dumpPG} from '../_utils/postgresql';
import logger from 'winston';

export default function systemController(router) {
	const conf = getConfig();
	let upload = multer({ dest: resolve(conf.appPath,conf.PathTemp)});

	router.get('/system/config', requireAuth, requireValidUser, requireAdmin, (req, res) => {
		res.json(getConfig());
	});

	router.put('/system/config', requireAuth, requireValidUser, requireAdmin, async (req, res) => {
		try {
			const publicSettings = editSetting(req.body.setting, req.body.value);
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
	router.get('/system/karas/:kara_id([0-9]+)', getLang, requireAuth, requireValidUser, requireAdmin, (req, res) => {
		getKara(req.params.kara_id,req.authToken,req.lang)
			.then(kara => res.json(kara))
			.catch(err => res.status(500).send('Error while loading kara: ' + err));
	});
	router.put('/system/karas/:kara_id([0-9]+)', getLang, requireAuth, requireValidUser, requireAdmin, (req, res) => {
		editKara(req.params.kara_id,req.body)
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

	router.get('/system/karas', getLang, requireNotDemo, requireAuth, requireValidUser, requireAdmin, (req, res) => {
		getKaras(req.query.filter, req.lang, 0, 99999999999999, null, null, req.authToken)
			.then(karas => res.json(karas))
			.catch(err => {
				res.status(500).send(`Error while fetching karas: ${err}`);
			});
	});

	router.get('/system/tags', getLang, requireAuth, requireValidUser, requireAdmin, (req, res) => {
		getTags(req.lang, req.query.filter, req.query.type, 0, 999999999)
			.then(tags => res.json(tags))
			.catch(err => res.status(500).send(`Error while fetching tags: ${err}`));
	});

	router.get('/system/series', getLang, requireAuth, requireValidUser, requireAdmin, (req, res) => {
		getSeries(req.query.filter, req.lang, 0, 999999999999)
			.then(series => res.json(series))
			.catch(err => res.status(500).send(`Error while fetching series: ${err}`));
	});

	router.delete('/system/series/:serieId([0-9]+)', requireAuth, requireValidUser, requireAdmin, (req, res) => {
		deleteSerie(req.params.serieId)
			.then(() => res.status(200).send('Series deleted'))
			.catch(err => res.status(500).send(`Error deleting series: ${err}`));
	});

	router.get('/system/series/:serieId([0-9]+)', requireAuth, requireValidUser, requireAdmin, (req, res) => {
		getSerie(req.params.serieId)
			.then((series) => res.json(series))
			.catch(err => res.status(500).send(`Error deleting series: ${err}`));
	});

	router.put('/system/series/:serieId([0-9]+)', requireAuth, requireValidUser, requireAdmin, (req, res) => {
		editSerie(req.params.serieId,req.body)
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
			.catch(err => res.status(500).send(`Error while fetching karas: ${err}`));
	});

	router.get('/system/karas/ranking', getLang, requireAuth, requireValidUser, requireAdmin, (req, res) =>{
		getTop50(req.authToken, req.lang, +req.query.from || 0, +req.query.size || 9999999)
			.then(karas => res.json(karas))
			.catch(err => res.status(500).send(`Error while fetching karas: ${err}`));
	});

	router.get('/system/karas/viewcounts', requireAuth, requireValidUser, requireAdmin, (req, res) =>{
		getKaraPlayed(req.authToken, req.lang, +req.query.from || 0, +req.query.size || 9999999)
			.then(karas => res.json(karas))
			.catch(err => res.status(500).send(`Error while fetching karas: ${err}`));
	});

	router.get('/system/users/:userId([0-9]+)', requireNotDemo, requireAuth, requireValidUser, requireAdmin, (req, res) => {
		findUserByID(req.params.userId)
			.then(user => res.json(user))
			.catch(err => res.status(500).send(`Error while fetching user: ${err}`));

	});

	router.post('/system/users', requireNotDemo, requireAuth, requireValidUser, requireAdmin, (req, res) => {
		createUser(req.body)
			.then(res.send('OK'))
			.catch(err => res.status(500).send(`Error while creating user: ${err}`));
	});

	router.put('/system/users/:userId([0-9]+)', requireNotDemo, requireAuth, requireValidUser, requireAdmin, (req, res) => {
		editUser(req.body.login,req.body,req.body.avatar,req.authToken.role, { editRemote: false })
			.then(() => res.status(200).send('User edited'))
			.catch(err => res.status(500).send(`Error editing user: ${err}`));
	});

	router.delete('/system/users/:userId([0-9]+)', requireNotDemo, requireAuth, requireValidUser, requireAdmin, (req, res) => {
		deleteUserById(req.params.userId)
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
}
