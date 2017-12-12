import passport from 'passport';
import {encode, decode} from 'jwt-simple';
import {getConfig} from '../_common/utils/config';
import {isAdmin} from '../_common/utils/user';

module.exports = function authController(router) {

	const requireLogin = passport.authenticate('local', { session: false });
	const requireAuth = passport.authenticate('jwt', { session: false });

	router.post('/login', requireLogin, (req, res) => {
		const config = getConfig();

		res.send({
			token: createJwtToken(req.body.username, config),
			username: req.body.username,
			role: getRole(req.body.username)
		});
	});

	router.get('/checkauth', requireAuth, (req, res) => {
		res.send(decodeJwtToken(req.get('authorization')));
	});
};

function createJwtToken(username, config) {
	const conf = config || getConfig();
	const timestamp = new Date().getTime();
	return encode(
		{ username: username, iat: timestamp, role: getRole(username, conf) },
		conf.JwtSecret
	);
}

function decodeJwtToken(token, config) {
	const conf = config || getConfig();
	return decode(token, conf.JwtSecret);
}

async function getRole(username) {
	if (await isAdmin(username)) return 'admin';
	return 'user';	
}
