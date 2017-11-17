import passport from 'passport';
import {getConfig} from '../_common/utils/config';

module.exports = function adminController(router) {

	const requireAuth = passport.authenticate('jwt', { session: false });

	router.get('/config', requireAuth, (req, res) => {
		res.json(getConfig());
	});
};