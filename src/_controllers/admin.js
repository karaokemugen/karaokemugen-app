import {backupConfig, getConfig} from '../_common/utils/config';
import {run as generateDatabase} from '../_admin/generate_karasdb';
import {editKara, createKara, karaGenerationBatch} from '../_admin/generate_karasfiles';
import {requireAuth, requireValidUser, requireAdmin} from './passport_manager';
import {requireNotDemo} from './demo';
import {getLang} from './lang';
import {editUser, createUser, findUserByID, listUsers, deleteUserById} from '../_services/user';
import {getKaras, getKaraInfo, getTop50, getKaraViewcounts, getKaraHistory} from '../_services/kara';
import {getTags} from '../_services/tag';
import {runBaseUpdate} from '../_updater/karabase_updater';
import {resetViewcounts} from '../_dao/kara';
import {resolve} from 'path';
import multer from 'multer';
import {addSerie, deleteSerie, editSerie, getSeries, getSerie} from '../_services/series';

module.exports = function adminController(router) {
	const conf = getConfig();
	let upload = multer({ dest: resolve(conf.appPath,conf.PathTemp)});

	router.get('/config', requireAuth, requireValidUser, requireAdmin, (req, res) => {
		res.json(getConfig());
	});

	router.post('/config/backup', requireAuth, requireValidUser, requireAdmin, (req, res) => {
		backupConfig()
			.then(() => res.status(200).send('Configuration file backuped to config.ini.backup'))
			.catch(err => res.status(500).send(`Error backuping config file: ${err}`));
	});

	router.post('/db/regenerate', requireAuth, requireValidUser, requireAdmin, (req, res) => {
		generateDatabase()
			.then(() => res.status(200).send('DB successfully regenerated'))
			.catch(err => res.status(500).send(`Error while regenerating DB: ${err}`));
	});
	router.get('/karas/:kara_id([0-9]+)', getLang, requireAuth, requireValidUser, requireAdmin, (req, res) => {
		getKaraInfo(req.params.kara_id,req.lang,req.authToken)
			.then(kara => res.json(kara))
			.catch(err => res.status(500).send('Error while loading kara: ' + err));
	});
	router.put('/karas/:kara_id([0-9]+)', getLang, requireAuth, requireValidUser, requireAdmin, (req, res) => {
		editKara(req.params.kara_id,req.body)
			.then(() => res.status(200).send('Karas successfully edited'))
			.catch(err => res.status(500).send(`Error while editing kara: ${err}`));
	});
	router.post('/karas/generate-all', requireAuth, requireValidUser, requireAdmin, (req, res) => {
		karaGenerationBatch()
			.then(() => res.status(200).send('Karas successfully generated'))
			.catch(err => res.status(500).send(`Error while generating karas: ${err}`));
	});

	router.post('/karas/importfile', upload.single('file'), (req, res) => {
		res.status(200).send(JSON.stringify(req.file));
	});

	router.post('/karas', requireAuth, requireValidUser, requireAdmin, (req, res) => {
		createKara(req.body)
			.then(() => res.status(200).send('Kara successfully generated'))
			.catch(err => {
				console.log(err);
				res.status(500).send(`Error while generating kara : ${err}`);
			});
	});

	router.get('/karas', getLang, requireNotDemo, requireAuth, requireValidUser, requireAdmin, (req, res) => {
		getKaras(req.query.filter, req.lang, 0, 99999999999999999, req.authToken)
			.then(karas => res.json(karas))
			.catch(err => {
				res.status(500).send(`Error while fetching karas: ${err}`);
			});
	});

	router.get('/tags', getLang, requireAuth, requireValidUser, requireAdmin, (req, res) => {
		getTags(req.lang, req.query.filter, req.query.type)
			.then(tags => res.json(tags))
			.catch(err => res.status(500).send(`Error while fetching tags: ${err}`));
	});

	router.get('/series', getLang, requireAuth, requireValidUser, requireAdmin, (req, res) => {
		getSeries(req.lang, req.query.filter)
			.then(series => res.json(series))
			.catch(err => res.status(500).send(`Error while fetching series: ${err}`));
	});

	router.delete('/series/:serieId([0-9]+)', requireAuth, requireValidUser, requireAdmin, (req, res) => {
		deleteSerie(req.params.serieId)
			.then(() => res.status(200).send('Series deleted'))
			.catch(err => res.status(500).send(`Error deleting series: ${err}`));
	});

	router.get('/series/:serieId([0-9]+)', requireAuth, requireValidUser, requireAdmin, (req, res) => {
		getSerie(req.params.serieId)
			.then((series) => res.json(series))
			.catch(err => res.status(500).send(`Error deleting series: ${err}`));
	});

	router.put('/series/:serieId([0-9]+)', requireAuth, requireValidUser, requireAdmin, (req, res) => {
		editSerie(req.params.serieId,req.body)
			.then((series) => res.json(series))
			.catch(err => res.status(500).send(`Error editing series: ${err}`));
	});

	router.post('/series', requireAuth, requireValidUser, requireAdmin, (req, res) => {
		console.log(req.body);
		addSerie(req.body)
			.then(() => res.status(200).send('Series added'))
			.catch(err => res.status(500).send(`Error adding series: ${err}`));
	});

	router.get('/users', requireNotDemo, requireAuth, requireValidUser, requireAdmin, (req, res) => {
		listUsers()
			.then(users => res.json(users))
			.catch(err => res.status(500).send(`Error while fetching users: ${err}`));
	});

	router.get('/karas/history', requireAuth, requireValidUser, requireAdmin, (req, res) =>{
		getKaraHistory()
			.then(karas => res.json(karas))
			.catch(err => res.status(500).send(`Error while fetching karas: ${err}`));
	});

	router.get('/karas/ranking', getLang, requireAuth, requireValidUser, requireAdmin, (req, res) =>{
		getTop50(req.authToken, req.lang)
			.then(karas => res.json(karas))
			.catch(err => res.status(500).send(`Error while fetching karas: ${err}`));
	});

	router.get('/karas/viewcounts', requireAuth, requireValidUser, requireAdmin, (req, res) =>{
		getKaraViewcounts()
			.then(karas => res.json(karas))
			.catch(err => res.status(500).send(`Error while fetching karas: ${err}`));
	});

	router.get('/users/:userId([0-9]+)', requireNotDemo, requireAuth, requireValidUser, requireAdmin, (req, res) => {
		findUserByID(req.params.userId)
			.then(user => res.json(user))
			.catch(err => res.status(500).send(`Error while fetching user: ${err}`));

	});

	router.post('/users', requireNotDemo, requireAuth, requireValidUser, requireAdmin, (req, res) => {
		createUser(req.body)
			.then(res.send('OK'))
			.catch(err => res.status(500).send(`Error while creating user: ${err}`));
	});

	router.put('/users/:userId([0-9]+)', requireNotDemo, requireAuth, requireValidUser, requireAdmin, (req, res) => {
		editUser(req.body.login,req.body,req.body.avatar,req.authToken.role)
			.then(() => res.status(200).send('User edited'))
			.catch(err => res.status(500).send(`Error editing user: ${err}`));
	});

	router.delete('/users/:userId([0-9]+)', requireNotDemo, requireAuth, requireValidUser, requireAdmin, (req, res) => {
		deleteUserById(req.params.userId)
			.then(() => res.status(200).send('User deleted'))
			.catch(err => res.status(500).send(`Error deleting user: ${err}`));
	});

	router.post('/db/resetviewcounts', requireAuth, requireValidUser, requireAdmin, (req, res) => {
		resetViewcounts()
			.then(() => res.status(200).send('Viewcounts successfully reset'))
			.catch(err => res.status(500).send(`Error resetting viewcounts: ${err}`));

	});

	router.post('/karas/update', requireNotDemo, requireAuth, requireValidUser, requireAdmin, (req, res) => {
		runBaseUpdate()
			.then(() => res.status(200).send('Karas successfully updated'))
			.catch(err => res.status(500).send(`Error while updating karas: ${err}`));
	});
};
