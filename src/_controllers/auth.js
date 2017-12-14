import passport from 'passport';
import {encode, decode} from 'jwt-simple';
import {getConfig} from '../_common/utils/config';
import {isAdmin, updateLastLoginName} from '../_common/utils/user';

module.exports = function authController(router) {

	const requireLogin = passport.authenticate('local', { session: false });
	const requireAuth = passport.authenticate('jwt', { session: false });

	router.post('/login', requireLogin, (req, res) => {
			/**
 * @api {post} /auth/login Login / Sign in
 * @apiName AuthLogin
 * @apiVersion 2.1.0
 * @apiGroup Auth
 * @apiPermission public
 * @apiHeader {String} Content-type Must be `application/x-www-form-urlencoded`
 * @apiHeader {String} charset Must be `UTF-8`
 * @apiParam {String} login Login name for the user
 * @apiParam {String} password Password for the user
 * @apiSuccess {String} token Identification token for this session
 * @apiSuccess {String} username Username logged in
 * @apiSuccess {String} role Role of this user (`user` or `admin`)
 *
 * @apiSuccessExample Success-Response:
 * HTTP/1.1 200 OK
 * {
 *   "token": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJ1c2VybmFtZSI6InRlc3QiLCJpYXQiOjE1MTMxNjAxMTEzMjMsInJvbGUiOiJ1c2VyIn0.UWgsc5XEfFtk34IpUAQid_IEWCj2ffNjQ--FJ9eAYd0",
 *   "username": "Axel",
 *   "role": "admin"
 * }
 * @apiError 401 Unauthorized
 *
 * @apiErrorExample Error-Response:
 * HTTP/1.1 401 Unauthorized
 */
		const config = getConfig();

		getRole(req.body.username)
			.then(role =>
				res.send({
					token: createJwtToken(req.body.username, config),
					username: req.body.username,
					role: role
				})
			).catch(err => res.status(500).send('Error while login: ' + err));
		updateLastLoginName(req.body.username);
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
