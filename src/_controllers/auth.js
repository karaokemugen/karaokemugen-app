import passport from 'passport';
import {encode, decode} from 'jwt-simple';
import {getConfig} from '../_common/utils/config';
import {findUserByName, updateUserFingerprint, findFingerprint, checkPassword, updateLastLoginName} from '../_services/user';
import got from 'got';
import { getRemoteUser, remoteLogin, createUser, editUser } from '../_services/user';
import { writeStreamToFile } from '../_common/utils/files';
import {resolve} from 'path';
import { importFavorites } from '../_services/favorites';
import { now } from 'unix-timestamp';
import { upsertRemoteToken } from '../_dao/user';
import logger from 'winston';


const loginErr = {
	code: 'LOG_ERROR',
	message: 'Incorrect credentials',
	data: {
	}
};

async function checkLogin(username, password) {
	const conf = getConfig();
	let user;
	if (username.includes('@')) {
		// If username has a @, check its instance for existence
		const login = username.split('@')[0];
		const instance = username.split('@')[1];
		const remoteUserID = await remoteLogin(username, password);
		const remoteUser = await getRemoteUser(username, remoteUserID.token);
		const fullUsername = `${login}@${instance}`;
		// Check if user exists. If it does not, create it.
		user = await findUserByName(fullUsername);
		if (!user) {
			await createUser({
				login: fullUsername,
				password: password
			}, {
				createRemote: false
			});
		}
		// Update user with new data
		let avatar_file = null;
		if (remoteUser.avatar_file !== 'blank.png') {
			const res = await got(`http://${instance}/avatars/${remoteUser.avatar_file}`, {
				stream: true
			});
			const avatarFullPath = resolve(conf.appPath, conf.PathTemp, remoteUser.avatar_file);
			await writeStreamToFile(res, avatarFullPath);
			avatar_file = {
				path: avatarFullPath
			};
		}
		await editUser(fullUsername,{
			bio: remoteUser.bio,
			url: remoteUser.url,
			email: remoteUser.email,
			nickname: remoteUser.nickname,
			password: password
		},
		avatar_file,
		'user',
		{
			editRemote: false
		});
		upsertRemoteToken(fullUsername, remoteUserID.token);
		// Download and add all favorites
		try {
			const res = await got(`http://${instance}/api/favorites`, {
				headers: {
					authorization: remoteUserID.token
				},
				json: true
			});
			const favorites = res.body;
			const favoritesPlaylist = {
				Header: {
					version: 3,
					description: 'Karaoke Mugen Playlist File'
				},
				PlaylistInformation: {
					name: `Faves : ${fullUsername}`,
					time_left: 0,
					created_at: now(),
					modified_at: now(),
					flag_visible: 1
				},
				PlaylistContents: []
			};
			let index = 1;
			for (const favorite of favorites) {
				favoritesPlaylist.PlaylistContents.push({
					kid: favorite.kid,
					pseudo_add: remoteUser.nickname,
					created_at: now(),
					pos: index,
					username: fullUsername
				});
				index++;
			}
			await importFavorites(favoritesPlaylist, {username: fullUsername});
		} catch(err) {
			logger.error(`[RemoteAuth] Failed to authenticate ${username} : ${err}`);
			throw false;
		}
	} else {
		// User is a local user
		const user = await findUserByName(username);
		if (!user) throw false;
		if (!await checkPassword(user, password)) throw false;
	}
	const role = getRole(user);
	updateLastLoginName(username);
	return {
		token: createJwtToken(username, role, conf),
		username: username,
		role: role
	};
}


export default function authController(router) {

	const requireAuth = passport.authenticate('jwt', { session: false });

	router.post('/login', async (req, res) => {
		/**
 * @api {post} /auth/login Login / Sign in
 * @apiName AuthLogin
 * @apiVersion 2.1.0
 * @apiGroup Auth
 * @apiPermission NoAuth
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
		if (!req.body.password) req.body.password = '';
		try {
			const token = await checkLogin(req.body.username, req.body.password);
			res.send(token);
		} catch(err) {
			res.status(401).send(loginErr);
		}
	});

	router.post('/login/guest', async (req, res) => {
		/**
 * @api {post} /auth/login/guest Login / Sign in (as guest)
 * @apiName AuthLoginGuest
 * @apiVersion 2.1.0
 * @apiGroup Auth
 * @apiPermission NoAuth
 * @apiDescription
 * Logins as guest. Uses the fingerprint provided to tell if the user already has a reserved guest account or not. If not, logs in as a random guest account.
 * @apiHeader {String} Content-type Must be `application/x-www-form-urlencoded`
 * @apiHeader {String} charset Must be `UTF-8`
 * @apiParam {String} fingerprint Fingerprint hash. Uses client-side fingerprinting.
 * @apiSuccess {String} token Identification token for this session
 * @apiSuccess {String} username Username logged in
 * @apiSuccess {String} role Role of this user (`user` or `admin`)
 *
 * @apiSuccessExample Success-Response:
 * HTTP/1.1 200 OK
 * {
 *   "token": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJ1c2VybmFtZSI6InRlc3QiLCJpYXQiOjE1MTMxNjAxMTEzMjMsInJvbGUiOiJ1c2VyIn0.UWgsc5XEfFtk34IpUAQid_IEWCj2ffNjQ--FJ9eAYd0",
 *   "username": "Axel",
 *   "role": "user"
 * }
 * @apiError 500 Internal Server Error
 *
 * @apiErrorExample Error-Response:
 * HTTP/1.1 500 Internal Server Error
 * {
 *   "code": "NO_MORE_GUESTS_AVAILABLE",
 *   "message": null
 * }
 */
		if (!req.body.fingerprint || req.body.fingerprint === '') {
			res.status(401).send(loginErr);
		} else {
			try {
				const guest = await findFingerprint(req.body.fingerprint);
				if (guest) {
					const token = await checkLogin(guest, req.body.fingerprint);
					updateUserFingerprint(guest, req.body.fingerprint);
					res.send(token);
				} else {
					res.status(500).send({
						code: 'NO_MORE_GUESTS_AVAILABLE',
						message: null,
						data: {
						}
					});
				}
			} catch (err) {
				res.status(401).send(loginErr);
			}
		}
	});

	router.get('/checkauth', requireAuth, (req, res) => {
		res.send(decodeJwtToken(req.get('authorization')));
	});
}

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

function getRole(user) {
	if (+user.type === 2) return 'guest';
	if (+user.flag_admin === 1) return 'admin';
	return 'user';
}
