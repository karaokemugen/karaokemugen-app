import {getConfig} from '../_common/utils/config';
import {run} from '../_admin/generate_karasdb';
import {requireAuth, requireAdmin} from './passport_manager.js';
import {listUsers} from '../_dao/user';
import {runBaseUpdate} from '../_updater/karabase_updater';


module.exports = function adminController(router) {

	router.get('/config', requireAuth, requireAdmin, (req, res) => {
		res.json(getConfig());
	});

	router.post('/db/regenerate', requireAuth, requireAdmin, (req, res) => {
		run()
			.then(() => res.status(200).send('DB successfully regenerated'))
			.catch(err => res.status(500).send('Error while regenerating DB: ' + err));
	});

	router.post('/kara/generate-all', requireAuth, requireAdmin, (req, res) => {
		run()
			.then(() => res.status(200).send('Karas successfully generated'))
			.catch(err => res.status(500).send('Error while regenerating karas: ' + err));
	});

	router.get('/users', requireAuth, requireAdmin, (req, res) => {
		listUsers()
			.then(users => res.json(users))
			.catch(err => res.status(500).send('Error while fetching users: ' + err));

	});

	router.post('/karas/update', requireAuth, requireAdmin, (req, res) => {
		runBaseUpdate()
			.then(() => res.status(200).send('Karas successfully updated'))
			.catch(err => res.status(500).send('Error while updating karas: ' + err));

	});
};
