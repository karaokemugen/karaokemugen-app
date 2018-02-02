import passport from 'passport';
import {encode, decode} from 'jwt-simple';
import {getConfig} from '../_common/utils/config';
import {checkPassword, isAdmin, updateLastLoginName, checkUserNameExists} from '../_common/utils/user';
const logger = require('winston');

module.exports = function authController(router) {

	const requireAuth = passport.authenticate('jwt', { session: false });

	router.post('/login', (req, res) => {
		/**
 * @api {post} /auth/login Login / Sign in
 * @apiName AuthLogin
 * @apiVersion 2.1.0
 * @apiGroup Auth
 * @apiPermission public
 * @apiHeader {String} Content-type Must be `application/x-www-form-urlencoded`
 * @apiHeader {String} charset Must be `UTF-8`
 * @apiParam {String} username Login name for the user
 * @apiParam {String} password Password for the user. Can be empty if user is a guest.
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
		if (!req.body.password) req.body.password = '';
		checkUserName(req.body.username)
			.then((exists) => {
				if (exists) {
					checkPassword(req.body.username,req.body.password)
						.then((valid) => {
							if (valid) {
								getRole(req.body.username)							
									.then(role =>
										res.send({
											token: createJwtToken(req.body.username, role, config),
											username: req.body.username,
											role: role
										})
									).catch( err => {
										logger.error('getRole : ' + err);
										err = {
											code: 'LOG_ERROR',
											message: err,
											data: {
											}
										};
										res.status(500).send(err);
									});
								updateLastLoginName(req.body.username);
							} else {
								const err = {
									code: 'LOG_ERROR',
									message: 'Incorrect credentials',
									data: {
									}
								};
								res.status(401).send(err);
							}
						});
				} else {
					const err = {
						code: 'LOG_ERROR',
						message: 'Incorrect credentials',
						data: {
						
						}
					};	
					res.status(401).send(err);
				}
			});			
	});

	router.get('/checkauth', requireAuth, (req, res) => {
		res.send(decodeJwtToken(req.get('authorization')));
	});
};

function createJwtToken(username, role, config) {
	const conf = config || getConfig();
	const timestamp = new Date().getTime();
	return encode(
		{ username, iat: timestamp, role },
		conf.JwtSecret
	);
}

function decodeJwtToken(token, config) {
	const conf = config || getConfig();
	return decode(token, conf.JwtSecret);
}

async function checkUserName(username) {
	return await checkUserNameExists(username);
}

async function getRole(username) {
	return await isAdmin(username) ? 'admin' : 'user';
}
