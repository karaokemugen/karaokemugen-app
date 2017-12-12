import passport from 'passport';
import {encode, decode} from 'jwt-simple';
import {getConfig} from '../_common/utils/config';
import {isAdmin} from '../_common/utils/user';

module.exports = function authController(router) {

	const requireLogin = passport.authenticate('local', { session: false });
	const requireAuth = passport.authenticate('jwt', { session: false });

	router.post('/login', requireLogin, (req, res) => {
		const config = getConfig();

		getRole(req.body.username)
			.then(role =>
				res.send({
					token: createJwtToken(req.body.username, config),
					username: req.body.username,
					role: role
				})
			).catch(err => res.status(500).send('Error while login: ' + err));
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
	return await isAdmin(username) ? 'admin' : 'user';
}
