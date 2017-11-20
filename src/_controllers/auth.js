import passport from 'passport';
import {encode, decode} from 'jwt-simple';
import {getConfig} from '../_common/utils/config';

module.exports = function authController(router) {

	const requireLogin = passport.authenticate('local', { session: false });
	const requireAuth = passport.authenticate('jwt', { session: false });

	router.post('/login', requireLogin, (req, res) => {
		res.send({ token: createJwtToken(req.body.username, 'admin') });
	});

	router.get('/checkauth', requireAuth, (req, res) => {
		res.send(decodeJwtToken(req.get('authorization')));
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

function decodeJwtToken(token, config) {
	const conf = config || getConfig();
	return decode(token, conf.JwtSecret);
}

