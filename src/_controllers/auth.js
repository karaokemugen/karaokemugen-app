import passport from 'passport';
import {encode} from 'jwt-simple';
import {getConfig} from '../_common/utils/config';

module.exports = function authController(router) {

	const requireLogin = passport.authenticate('local', { session: false });

	router.post('/login', requireLogin, (req, res) => {
		res.send({ token: createJwtToken(req.body.username, 'admin') });
	});
};

function createJwtToken(username, role, config) {
	const conf = config || getConfig();
	const timestamp = new Date().getTime();
	return encode(
		{ username: username, iat: timestamp, role: role },
		conf.JwtSecret
	);
}
