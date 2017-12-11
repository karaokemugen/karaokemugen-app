import passport from 'passport';
import {getConfig} from '../_common/utils/config';
import {run} from '../_admin/generate_karasdb';
import {decode} from 'jwt-simple';
import {addUser, listUsers} from '../_dao/user';

module.exports = function adminController(router) {

	const requireAuth = passport.authenticate('jwt', { session: false });
	const requireAdmin = (req, res, next) => {
		const token = decode(req.get('authorization'), getConfig().JwtSecret);
		if (token.role === 'admin') {
			next();
		} else {
			res.status(403).send('Only admin can use this function');
		}
	};

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
};
