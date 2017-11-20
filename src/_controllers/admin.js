import passport from 'passport';
import {getConfig} from '../_common/utils/config';
import {run} from '../_admin/generate_karasdb';

module.exports = function adminController(router) {

	const requireAuth = passport.authenticate('jwt', { session: false });

	router.get('/config', requireAuth, (req, res) => {
		res.json(getConfig());
	});

	router.post('/db/regenerate', requireAuth, (req, res) => {
		run()
			.then(() => res.status(200).send('DB successfully regenerated'))
			.catch(err => res.status(500).send('Error while regenerating DB: ' + err));
	});

	router.post('/kara/generate-all', requireAuth, (req, res) => {
		run()
			.then(() => res.status(200).send('Karas successfully generated'))
			.catch(err => res.status(500).send('Error while regenerating karas: ' + err));
	});
};