import {backupConfig, getConfig} from '../_common/utils/config';
import {run as generateDatabase} from '../_admin/generate_karasdb';
import {editKara, createKara, karaGenerationBatch} from '../_admin/generate_karasfiles';
import {requireAuth, requireValidUser, requireAdmin} from './passport_manager';
import {requireNotDemo} from './demo';
import {getLang} from './lang';
import {editUser, createUser, findUserByID, listUsers, deleteUserById} from '../_services/user';
import {getKaras, getKara, getTop50, getKaraViewcounts, getKaraHistory} from '../_services/kara';
import {getTags} from '../_services/tag';
import {runBaseUpdate} from '../_updater/karabase_updater';
import {resetViewcounts} from '../_dao/kara';
import {resolve} from 'path';
import multer from 'multer';
import {addSerie, deleteSerie, editSerie, getSeries, getSerie} from '../_services/series';
import {getDownloads, removeDownload, retryDownload, pauseQueue, startDownloads, addDownloads, wipeDownloads} from '../_services/download';
import logger from 'winston';

export default function adminController(router) {
	const conf = getConfig();
	let upload = multer({ dest: resolve(conf.appPath,conf.PathTemp)});

	router.get('/config', requireAuth, requireValidUser, requireAdmin, (req, res) => {
		res.json(getConfig());
	});

	router.post('/config/backup', requireAuth, requireValidUser, requireAdmin, async (req, res) => {
		try {
			await backupConfig();
			res.status(200).send('Configuration file backuped to config.ini.backup');
		} catch (err) {
			res.status(500).send(`Error backuping config file: ${err}`);
		}
	});

	router.post('/db/regenerate', requireAuth, requireValidUser, requireAdmin, async (req, res) => {
		try {
			await generateDatabase();
			res.status(200).send('DB successfully regenerated');
		} catch(err) {
			res.status(500).send(`Error while regenerating DB: ${err}`);
		}
	});

	router.get('/karas/:kara_id([0-9]+)', getLang, requireAuth, requireValidUser, requireAdmin, async (req, res) => {
		try {
			const kara = await getKara(req.params.kara_id,req.authToken,req.lang);
			res.status(200).json(kara);
		} catch(err) {
			res.status(500).send('Error while loading kara: ' + err);
		}
	});

	router.put('/karas/:kara_id([0-9]+)', getLang, requireAuth, requireValidUser, requireAdmin, async (req, res) => {
		try {
			await editKara(req.params.kara_id,req.body);
			res.status(200).send('Karas successfully edited');
		} catch(err) {
			res.status(500).send(`Error while editing kara: ${err}`);
		}
	});
	router.post('/karas/generate-all', requireAuth, requireValidUser, requireAdmin, async (req, res) => {
		try {
			await karaGenerationBatch();
			res.status(200).send('Karas successfully generated');
		} catch(err) {
			res.status(500).send(`Error while generating karas: ${err}`);
		}
	});
	router.get('/karas', getLang, requireNotDemo, requireAuth, requireValidUser, requireAdmin, async (req, res) => {
		try {
			const karas = await getKaras(req.query.filter, req.lang, 0, 99999999999999999, null, null, req.authToken);
			res.json(karas);
		} catch(err) {
			res.status(500).send(`Error while fetching karas: ${err}`);
		}
	});

	router.get('/tags', getLang, requireAuth, requireValidUser, requireAdmin, async (req, res) => {
		try {
			const tags = await getTags(req.lang, req.query.filter, req.query.type, 0, 999999999);
			res.json(tags);
		} catch(err) {
			res.status(500).send(`Error while fetching tags: ${err}`);
		}
	});

	router.get('/series', getLang, requireAuth, requireValidUser, requireAdmin, async (req, res) => {
		try {
			const series = await getSeries(req.query.filter, req.lang, 0, 999999999999);
			res.json(series);
		} catch(err) {
			res.status(500).send(`Error while fetching series: ${err}`);
		}
	});

	router.post('/karas/importfile', upload.single('file'), (req, res) => {
		res.status(200).send(JSON.stringify(req.file));
	});

	router.post('/karas', requireAuth, requireValidUser, requireAdmin, async (req, res) => {
		try {
			await createKara(req.body);
			res.status(200).send('Kara successfully generated');
		} catch(err) {
			res.status(500).send(`Error while generating kara : ${err}`);
		}
	});

	router.delete('/series/:serieId([0-9]+)', requireAuth, requireValidUser, requireAdmin,async (req, res) => {
		try {
			await deleteSerie(req.params.serieId);
			res.status(200).send('Series deleted');
		} catch(err) {
			res.status(500).send(`Error deleting series: ${err}`);
		}
	});

	router.get('/series/:serieId([0-9]+)', requireAuth, requireValidUser, requireAdmin, async (req, res) => {
		try {
			const serie = await getSerie(req.params.serieId);
			res.status(200).json(serie);
		} catch(err) {
			res.status(500).send(`Error deleting series: ${err}`);
		}
	});

	router.put('/series/:serieId([0-9]+)', requireAuth, requireValidUser, requireAdmin, async (req, res) => {
		try {
			const serie = await editSerie(req.params.serieId,req.body);
			res.status(200).json(serie);
		} catch(err) {
			res.status(500).send(`Error editing series: ${err}`);
		}

	});

	router.post('/series', requireAuth, requireValidUser, requireAdmin, async (req, res) => {
		try {
			await addSerie(req.body);
			res.status(200).send('Series added');
		} catch(err) {
			res.status(500).send(`Error adding series: ${err}`);
		}
	});

	router.get('/users', requireNotDemo, requireAuth, requireValidUser, requireAdmin, async (req, res) => {
		try {
			const users = await listUsers();
			res.status(200).json(users);
		} catch(err) {
			res.status(500).send(`Error while fetching users: ${err}`);
		}
	});

	router.get('/karas/history', requireAuth, requireValidUser, requireAdmin, async (req, res) => {
		try {
			const karas = await getKaraHistory();
			res.status(200).json(karas);
		} catch(err) {
			res.status(500).send(`Error while fetching karas: ${err}`);
		}
	});

	router.get('/karas/ranking', getLang, requireAuth, requireValidUser, requireAdmin, async (req, res) => {
		try {
			const karas = await getTop50(req.authToken, req.lang);
			res.status(200).json(karas);
		} catch(err) {
			res.status(500).send(`Error while fetching karas: ${err}`);
		}
	});

	router.get('/karas/viewcounts', requireAuth, requireValidUser, requireAdmin, async (req, res) => {
		try {
			const karas = await getKaraViewcounts();
			res.status(200).json(karas);
		} catch(err) {
			res.status(500).send(`Error while fetching karas: ${err}`);
		}
	});

	router.get('/users/:userId([0-9]+)', requireNotDemo, requireAuth, requireValidUser, requireAdmin, async (req, res) => {
		try {
			const user = await findUserByID(req.params.userId);
			res.status(200).json(user);
		} catch(err) {
			res.status(500).send(`Error while fetching user: ${err}`);
		}
	});

	router.post('/users', requireNotDemo, requireAuth, requireValidUser, requireAdmin, async (req, res) => {
		try {
			await createUser(req.body);
			res.status(200).send('User created');
		} catch(err) {
			res.status(500).send(`Error while creating user: ${err}`);
		}
	});

	router.put('/users/:userId([0-9]+)', requireNotDemo, requireAuth, requireValidUser, requireAdmin, async (req, res) => {
		try {
			await editUser(req.body.login,req.body,req.body.avatar,req.authToken.role);
			res.status(200).send('User edited');
		} catch(err) {
			res.status(500).send(`Error editing user: ${err}`);
		}
	});

	router.delete('/users/:userId([0-9]+)', requireNotDemo, requireAuth, requireValidUser, requireAdmin, async (req, res) => {
		try {
			await deleteUserById(req.params.userId);
			res.status(200).send('User deleted');
		} catch(err) {
			res.status(500).send(`Error deleting user: ${err}`);
		}
	});

	router.post('/db/resetviewcounts', requireAuth, requireValidUser, requireAdmin, async (req, res) => {
		try {
			await resetViewcounts();
			res.status(200).send('Viewcounts successfully reset');
		} catch(err) {
			res.status(500).send(`Error resetting viewcounts: ${err}`);
		}
	});

	router.post('/karas/update', requireNotDemo, requireAuth, requireValidUser, requireAdmin, async (req, res) => {
		try {
			await runBaseUpdate();
			await generateDatabase();
			res.status(200).send('Karas successfully updated');
		} catch(err) {
			res.status(500).send(`Error while updating/generating karas: ${err}`);
		}
	});

	router.post('/downloads', requireNotDemo, requireAuth, requireValidUser, requireAdmin, async (req, res) => {
		try {
			const msg = await addDownloads(req.body.repository,req.body.downloads);
			res.status(200).send(msg);
		} catch(err) {
			res.status(500).send(`Error while adding download: ${err}`);
		}
	});
	router.get('/downloads', requireNotDemo, requireAuth, requireValidUser, requireAdmin, async (req, res) => {
		try {
			const downloads = await getDownloads();
			res.json(downloads);
		} catch(err) {
			res.status(500).send(`Error getting downloads: ${err}`);
		}
	});
	router.delete('/downloads', requireNotDemo, requireAuth, requireValidUser, requireAdmin, async (req, res) => {
		try {
			await wipeDownloads();
			res.status(200).send('Download queue emptied completely');
		} catch(err) {
			res.status(500).send(`Error wiping downloads: ${err}`);
		}
	});
	router.delete('/downloads/:uuid', requireNotDemo, requireAuth, requireValidUser, requireAdmin, async (req, res) => {
		try {
			await removeDownload(req.params.uuid);
			res.status(200).send('Download removed');
		} catch(err) {
			res.status(500).send(`Error removing download: ${err}`);
		}
	});
	router.put('/downloads/:uuid/retry', requireNotDemo, requireAuth, requireValidUser, requireAdmin, async (req, res) => {
		try {
			await retryDownload(req.params.uuid);
			res.status(200).send('Download back into queue');
		} catch(err) {
			res.status(500).send(`Error retrying download: ${err}`);
		}
	});
	router.put('/downloads/pause', requireNotDemo, requireAuth, requireValidUser, requireAdmin, async (req, res) => {
		try {
			await pauseQueue();
			res.status(200).send('Downloads paused');
		} catch(err) {
			res.status(500).send(`Error pausing downloads: ${err}`);
		}
	});
	router.put('/downloads/start', requireNotDemo, requireAuth, requireValidUser, requireAdmin, async (req, res) => {
		try {
			await startDownloads();
			res.status(200).send('Downloads starting');
		} catch(err) {
			res.status(500).send(`Error starting downloads: ${err}`);
		}
	});
	router.post('/karas/update', requireNotDemo, requireAuth, requireValidUser, requireAdmin, async (req, res) => {
		try {
			res.status(200).send('Karas are being updated, check Karaoke Mugen\'s console to follow its progression');
			await runBaseUpdate();
			logger.info('[Updater] User-triggered update successful');
			await generateDatabase();
			logger.info('[Gen] User-triggered generation successful');
		} catch(err) {
			logger.error(`[Updater] Generation/update failed : ${err}`);
		}
	});
}