import logger from 'winston';
import {sanitizeConfig, verifyConfig, getConfig} from '../_common/utils/config';
import {check, unescape} from '../_common/utils/validators';
import {resolve} from 'path';
import multer from 'multer';
import {emitWS} from '../_webapp/frontend';
import {requireWebappLimitedNoAuth, requireWebappLimited, requireWebappOpen} from '../_controllers/webapp_mode';
import {requireAuth, requireValidUser, updateUserLoginTime, requireAdmin} from '../_controllers/passport_manager';
import {updateSongsLeft} from '../_services/playlist';
import {getLang} from '../_controllers/lang';

const engine = require ('../_services/engine');
const favorites = require('../_services/favorites');
const upvote = require('../_services/upvote');
const user = require('../_services/user');
const poll = require('../_services/poll');

function errMessage(code,message,args) {
	return {
		code: code,
		args: args,
		message: message
	};
}

function OKMessage(data,code,args) {
	return {
		code: code,
		args: args,
		data: data,
	};
}


/**
 * @apiDefine admin Admin access only
 * Requires authorization token from admin user to use this API
 */
/**
 * @apiDefine own Own user only
 * Requires authorization token from the user the data belongs to to use this API
 */
/**
 * @apiDefine public Public access
 * This API does not require any authorization method and can be accessed from anyone.
 */

export function APIControllerAdmin(router) {
	// Admin routes
	
	/**
 * @api {post} /admin/shutdown Shutdown the entire application
 * @apiDescription
 * Shutdowns application completely. Kind of a self-destruct button.
 * @apiName PostShutdown
 * @apiGroup Main
 * @apiVersion 2.0.0
 *
 * @apiPermission admin
 * @apiSuccess {String} Shutdown in progress.
 *
 * @apiSuccessExample Success-Response:
 * HTTP/1.1 200 OK
 * "Shutdown in progress."
 *
 */
	router.route('/shutdown')
		.post(getLang, requireAuth, requireValidUser, requireAdmin, async (req, res) => {
			// Sends command to shutdown the app.
			try {
				await engine.shutdown();
				res.json('Shutdown in progress'); 
			} catch(err) {
				logger.error(err);
				res.statusCode = 500;
				res.json(err);				
			}
		});
	router.route('/automix')
	/**
 * @api {post} /admin/automix Generate a automix playlist
 * @apiName PostMix
 * @apiGroup Favorites
 * @apiVersion 2.1.0
 * @apiPermission admin
 *
 * @apiParam {String} users Comma-separated list of usernames to pick favorites from
 * @apiParam {Number} duration Duration wished for the generatedplaylist in minutes
 * @apiSuccess {String} code Message to display
 * @apiSuccess {String} data/playlist_id ID of playlist created
 * @apiSuccess {String} data/playlist_name Name of playlist created
 *
 * @apiSuccessExample Success-Response:
 *     HTTP/1.1 200 OK
 * {
 *   "code": "AUTOMIX_CREATED",
 *   "data": {
 *           "playlist_id": 12,
 *           "playlist_name": 'Soirée Kara 07/10/2018'
 *   }
 * }
 * @apiError AUTOMIX_ERROR Unable to create the automix playlist
 *
 * @apiErrorExample Error-Response:
 * HTTP/1.1 500 Internal Server Error
 * {
 *   "code": "AUTOMIX_ERROR",
 *   "message": "User axel does not exist."
 * }
 */

		.post(getLang, requireAuth, requireValidUser, updateUserLoginTime, requireAdmin, async (req, res) => {
			const validationErrors = check(req.body, {
				users: {presence: {allowEmpty: false}},
				duration: {numericality: {onlyInteger: true, greaterThanOrEqualTo: 0}}
			});
			if (!validationErrors) {
				// No errors detected
				try {
					req.sanitize('duration').toInt();
					const new_playlist = await favorites.createAutoMix(req.body, req.authToken.username);
					emitWS('playlistsUpdated');
					res.statusCode = 201;
					res.json(OKMessage(new_playlist,'AUTOMIX_CREATED',null));
				
				} catch(err) {
					logger.error(err);
					res.statusCode = 500;
					res.json(errMessage('AUTOMIX_ERROR',err));
				}
			} else {
				// Errors detected
				// Sending BAD REQUEST HTTP code and error object.
				res.statusCode = 400;								
				res.json(validationErrors);
			}
		});
		
	router.route('/playlists')
	/**
 * @api {get} /admin/playlists/ Get list of playlists
 * @apiName GetPlaylists
 * @apiGroup Playlists
 * @apiVersion 2.1.0
 * @apiPermission admin
 *
 * @apiSuccess {Object[]} playlists Playlists information
 *
 * @apiSuccessExample Success-Response:
 *     HTTP/1.1 200 OK
 * {
 *   "data": [
 *       {
 *           "created_at": 1508313440,
 *           "flag_current": 1,
 *           "flag_public": 0,
 *           "flag_visible": 1,
 * 			 "flag_favorites": 1,
 *           "length": 0,
 *           "modified_at": 1508408078,
 *           "name": "Liste de lecture courante",
 *           "num_karas": 6,
 *           "playlist_id": 1,
 *           "time_left": 0,
 * 			 "username": 'admin'
 *       }
 *   ]
 * }
 * @apiError PL_LIST_ERROR Unable to fetch a list of playlists
 *
 * @apiErrorExample Error-Response:
 * HTTP/1.1 500 Internal Server Error
 */

		.get(getLang, requireAuth, requireValidUser, updateUserLoginTime, requireAdmin, async (req, res) => {
			// Get list of playlists
			try {
				const playlists = await engine.getAllPLs(req.authToken);
				res.json(OKMessage(playlists));
			} catch(err) {
				logger.error(err);
				res.statusCode = 500;							
				res.json(errMessage('PL_LIST_ERROR',err));
			}
		})
	/**
 * @api {post} /admin/playlists/ Create a playlist
 * @apiName PostPlaylist
 * @apiVersion 2.0.0
 * @apiGroup Playlists
 * @apiPermission admin
 *
 * @apiParam {String} name Name of playlist to create
 * @apiParam {Boolean} flag_public Is the playlist to create public? This unsets `flag_public` on the previous playlist which had it.
 * @apiParam {Boolean} flag_current Is the playlist to create current? This unsets `flag_current` on the previous playlist which had it.
 * @apiParam {Boolean} flag_visible Is the playlist to create visible to all users? If `false`, only admins can see it.
 *
 * @apiSuccess {String} args Name of playlist created
 * @apiSuccess {String} code Message to display
 * @apiSuccess {Number} data ID of newly created playlist
 *
 * @apiSuccessExample Success-Response:
 * HTTP/1.1 201 Created
 * {
 *   "args": "lol",
 *   "code": "PL_CREATED",
 *   "data": 4
 * }
 * @apiError PL_CREATE_ERROR Unable to create a playlist
 *
 * @apiErrorExample Error-Response:
 * HTTP/1.1 500 Internal Server Error
 */
		.post(getLang, requireAuth, requireValidUser, updateUserLoginTime, requireAdmin, async (req, res) => {
			// Add playlist			
			const validationErrors = check(req.body, {
				name: {presence: {allowEmpty: false}},
				flag_visible: {boolIntValidator: true},
				flag_public: {boolIntValidator: true},
				flag_current: {boolIntValidator: true}
			});
			if (!validationErrors) {
				// No errors detected
				req.body.name = unescape(req.body.name.trim());
						
				//Now we add playlist
				try {												
					const new_playlist = await engine.createPL(req.body, req.authToken.username);
					emitWS('playlistsUpdated');
					res.statusCode = 201;
					res.json(OKMessage(new_playlist,'PL_CREATED',req.body.name));
				} catch(err) {
					logger.error(err);
					res.statusCode = 500;
					res.json(errMessage('PL_CREATE_ERROR',err,req.body.name));
				}
			} else {
				// Errors detected
				// Sending BAD REQUEST HTTP code and error object.
				res.statusCode = 400;								
				res.json(validationErrors);
			}
				
		});

	router.route('/playlists/:pl_id([0-9]+)')
	/**
 * @api {get} /admin/playlists/:pl_id Get playlist information
 * @apiName GetPlaylist
 * @apiGroup Playlists
 * @apiPermission admin
 * @apiVersion 2.0.0
 *
 * @apiParam {Number} pl_id Target playlist ID.
 * @apiSuccess {Number} data/created_at Playlist creation date in UNIX timestamp
 * @apiSuccess {Number} data/flag_current Is playlist the current one? Mutually exclusive with `flag_public`
 * @apiSuccess {Number} data/flag_public Is playlist the public one? Mutually exclusive with `flag_current`
 * @apiSuccess {Number} data/flag_visible Is playlist visible to normal users?
 * @apiSuccess {Number} data/length Duration of playlist in seconds
 * @apiSuccess {Number} data/modified_at Playlist last edit date in UNIX timestamp
 * @apiSuccess {String} data/name Name of playlist
 * @apiSuccess {Number} data/num_karas Number of karaoke songs in the playlist
 * @apiSuccess {Number} data/playlist_id Database's playlist ID
 * @apiSuccess {Number} data/time_left Time left in seconds before playlist ends, relative to the currently playing song's position.
 *
 * @apiSuccessExample Success-Response:
 * HTTP/1.1 200 OK
 * {
 *   "data": {
 *       "created_at": 1508313440,
 *       "flag_current": 1,
 *       "flag_public": 0,
 *       "flag_visible": 1,
 *       "length": 0,
 *       "modified_at": 1508408078,
 *       "name": "Liste de lecture courante",
 *       "num_karas": 6,
 *       "playlist_id": 1,
 *       "time_left": 0
 *   }
 *}
 * @apiError PL_VIEW_ERROR Unable to fetch info from a playlist
 *
 * @apiErrorExample Error-Response:
 * HTTP/1.1 500 Internal Server Error
 */
		.get(getLang, requireAuth, requireValidUser, updateUserLoginTime, requireAdmin, async (req, res) => {
			//Access :pl_id by req.params.pl_id
			// This get route gets infos from a playlist
			try {
				const playlist_id = req.params.pl_id;
				const playlist = await engine.getPLInfo(playlist_id, req.authToken);
				res.json(OKMessage(playlist));
			} catch (err) {
				
				res.statusCode = 500;
				res.json(errMessage('PL_VIEW_ERROR',err.message,err.data));
				
			}			
		})
	/**
 * @api {put} /admin/playlists/:pl_id Update a playlist's information
 * @apiName PutPlaylist
 * @apiVersion 2.0.0
 * @apiGroup Playlists
 * @apiPermission admin
 *
 * @apiParam {Number} pl_id Target playlist ID.
 * @apiParam {String} name Name of playlist to create
 * @apiParam {Boolean} flag_visible Is the playlist to create visible to all users? If `false`, only admins can see it.
 *
 * @apiSuccess {String} args ID of playlist updated
 * @apiSuccess {String} code Message to display
 * @apiSuccess {Number} data ID of playlist updated
 *
 * @apiSuccessExample Success-Response:
 * HTTP/1.1 200 OK
 * {
 *   "args": 1,
 *   "code": "PL_UPDATED",
 *   "data": 1
 * }
 * @apiError PL_UPDATE_ERROR Unable to update a playlist
 *
 * @apiErrorExample Error-Response:
 * HTTP/1.1 500 Internal Server Error
 */
		.put(getLang, requireAuth, requireValidUser, updateUserLoginTime, requireAdmin, async (req, res) => {
			// Update playlist info
			const validationErrors = check(req.body, {
				name: {presence: {allowEmpty: false}},
				flag_visible: {boolIntValidator: true},				
			});
			if (!validationErrors) {
				// No errors detected
				req.body.name = unescape(req.body.name.trim());
				
				//Now we add playlist
				try {
					await engine.editPL(req.params.pl_id,req.body);
					emitWS('playlistInfoUpdated',req.params.pl_id);
					res.json(OKMessage(req.params.pl_id,'PL_UPDATED',req.params.pl_id));	
				} catch(err) {
					
					res.statusCode = 500;
					res.json(errMessage('PL_UPDATE_ERROR',err.message,err.data));
				}
			} else {
				// Errors detected
				// Sending BAD REQUEST HTTP code and error object.
				res.statusCode = 400;
				res.json(validationErrors);
			}
		})

	/**
 * @api {delete} /admin/playlists/:pl_id Delete a playlist
 * @apiName DeletePlaylist
 * @apiVersion 2.0.0
 * @apiGroup Playlists
 * @apiPermission admin
 *
 * @apiParam {Number} pl_id Target playlist ID.
 * @apiSuccess {String} args ID of playlist deleted
 * @apiSuccess {String} code Message to display
 * @apiSuccess {Number} data ID of playlist deleted
 *
 * @apiSuccessExample Success-Response:
 * HTTP/1.1 200 OK
 * {
 *   "args": 3,
 *   "code": "PL_DELETED",
 *   "data": 3
 * }
 * @apiError PL_DELETE_ERROR Unable to delete a playlist
 *
 * @apiErrorExample Error-Response:
 * HTTP/1.1 500 Internal Server Error
 */
		.delete(getLang, requireAuth, requireValidUser, updateUserLoginTime, requireAdmin, async (req, res) => {
			try {
				await engine.deletePL(req.params.pl_id,req.authToken);
				emitWS('playlistsUpdated');
				res.json(OKMessage(req.params.pl_id,'PL_DELETED',req.params.pl_id));
			} catch(err) {
				
				res.statusCode = 500;
				res.json(errMessage('PL_DELETE_ERROR',err.message,err.data));
			}
		});
	router.route('/users')
		/**
 * @api {post} /admin/users Create new user (as admin)
 * @apiName PostUserAdmin
 * @apiVersion 2.1.0
 * @apiGroup Users
 * @apiPermission admin
 *
 * @apiParam {String} login Login name for the user
 * @apiParam {String} password Password for the user
 * @apiParam {String} role `admin` or `user`
 * @apiSuccess {String} code Message to display
 * @apiSuccess {Boolean} data Returns `true` if success
 *
 * @apiSuccessExample Success-Response:
 * HTTP/1.1 200 OK
 * {
 *   "code": "USER_CREATED",
 *   "data": true
 * }
 * @apiError USER_CREATE_ERROR Unable to create user
 * @apiError USER_ALREADY_EXISTS This username already exists 
 * @apiError WEBAPPMODE_CLOSED_API_MESSAGE API is disabled at the moment.
 * @apiErrorExample Error-Response:
 * HTTP/1.1 500 Internal Server Error
 * {
 *   "args": "Axel",
 *   "code": "USER_ALREADY_EXISTS",
 *   "message": null
 * }
 * @apiErrorExample Error-Response:
 * HTTP/1.1 403 Forbidden
 */

		.post(getLang, requireAuth, requireValidUser, updateUserLoginTime, requireAdmin, async (req,res) => {
			//Validate form data
			const validationErrors = check(req.body, {
				login: {presence: {allowEmpty: false}},
				password: {presence: {allowEmpty: false}},
				role: {inclusion: ['user', 'admin']}				
			});
			if (!validationErrors) {
				// No errors detected
				req.body.login = unescape(req.body.login.trim());
				req.body.role = unescape(req.body.role);
				req.body.password = unescape(req.body.password);
				if (req.body.role === 'admin') req.body.flag_admin = 1;
				try {
					await user.createUser(req.body);
					res.json(OKMessage(true,'USER_CREATED'));
				} catch(err) {
					res.statusCode = 500;
					res.json(errMessage(err.code,err.message));
				}						
			} else {
				// Errors detected
				// Sending BAD REQUEST HTTP code and error object.
				res.statusCode = 400;								
				res.json(validationErrors);
			}
		});

	router.route('/users/:username')
	/**
 * @api {get} /admin/users/:username View user details (admin)
 * @apiName GetUserAdmin
 * @apiVersion 2.1.0
 * @apiGroup Users
 * @apiPermission Admin
 *
 * @apiparam {String} username Username to get data from
 * @apiSuccess {String} data/login User's login
 * @apiSuccess {String} data/nickname User's nickname
 * @apiSuccess {String} data/NORM_nickname User's normalized nickname (deburr'ed)
 * @apiSuccess {String} [data/avatar_file] Directory and name of avatar image file. Can be empty if no avatar has been selected.
 * @apiSuccess {Number} data/flag_admin Is the user Admin ?
 * @apiSuccess {Number} data/flag_online Is the user an online account ?
 * @apiSuccess {Number} data/type Type of account (1 = user, 2 = guest)
 * @apiSuccess {Number} data/last_login Last login time in UNIX timestamp.
 * @apiSuccess {Number} data/user_id User's ID in the database
 * @apiSuccess {String} data/url User's URL in its profile
 * @apiSuccess {String} data/fingerprint User's fingerprint
 * @apiSuccess {String} data/bio User's bio
 * @apiSuccess {String} data/email User's email
 *
 * @apiSuccessExample Success-Response:
 * HTTP/1.1 200 OK
 * {
 *   "data": [
 *       {
 *           "NORM_nickname": "Administrator",
 *           "avatar_file": "",
 *           "flag_admin": 1,
 *           "flag_online": 0,
 *           "type": 1,
 *           "last_login": 0,
 *           "login": "admin",
 *           "nickname": "Administrator",
 *           "user_id": 1,
 * 			 "url": null,
 * 			 "email": null,
 * 			 "bio": null,
 * 			 "fingerprint": null
 *       },
 *   ]
 * }
 * @apiError USER_VIEW_ERROR Unable to view user details
 *
 * @apiErrorExample Error-Response:
 * HTTP/1.1 500 Internal Server Error
 * {
 *   "code": "USER_VIEW_ERROR",
 *   "message": null
 * }
 */
		.get(getLang, requireAuth, requireValidUser, updateUserLoginTime, requireAdmin, async (req,res) => {
			try {

				const userdata = await user.findUserByName(req.params.username, {public:false});
				res.json(OKMessage(userdata));

			} catch(err) {
				logger.error(err);
				res.statusCode = 500;
				res.json(errMessage('USER_VIEW_ERROR',err));
			}
		})
	/**
 * @api {delete} /admin/users/:username Delete an user
 * @apiName DeleteUser
 * @apiVersion 2.1.0
 * @apiGroup Users
 * @apiPermission admin
 *
 * @apiParam {Number} username User name to delete
 * @apiSuccess {String} args ID of user deleted
 * @apiSuccess {String} code Message to display
 * @apiSuccess {Number} data ID of user deleted
 *
 * @apiSuccessExample Success-Response:
 * HTTP/1.1 200 OK
 * {
 *   "args": 3,
 *   "code": "USER_DELETED",
 *   "data": 3
 * }
 * @apiError USER_DELETE_ERROR Unable to delete a user
 *
 * @apiErrorExample Error-Response:
 * HTTP/1.1 500 Internal Server Error
 */
		.delete(getLang, requireAuth, requireValidUser, updateUserLoginTime, requireAdmin, async (req, res) => {					
			try {
				await user.deleteUser(req.params.username);
				emitWS('usersUpdated');
				res.json(OKMessage(req.params.user_id,'USER_DELETED',req.params.username));
			} catch(err) {
				res.statusCode = 500;
				res.json(errMessage('USER_DELETE_ERROR',err.message,err.data));
			}
		});

	router.route('/playlists/:pl_id([0-9]+)/empty')
	/**
 * @api {put} /admin/playlists/:pl_id/empty Empty a playlist
 * @apiName PutEmptyPlaylist
 * @apiVersion 2.0.0
 * @apiGroup Playlists
 * @apiPermission admin
 *
 * @apiParam {Number} pl_id Target playlist ID.
 * @apiSuccess {String} args ID of playlist emptied
 * @apiSuccess {String} code Message to display
 * @apiSuccess {Number} data ID of playlist emptied
 *
 * @apiSuccessExample Success-Response:
 * HTTP/1.1 200 OK
 * {
 *   "args": 1,
 *   "code": "PL_EMPTIED",
 *   "data": 1
 * }
 * @apiError PL_EMPTY_ERROR Unable to empty a playlist
 *
 * @apiErrorExample Error-Response:
 * HTTP/1.1 500 Internal Server Error
 */
		.put(getLang, requireAuth, requireValidUser, updateUserLoginTime, requireAdmin, async (req, res) => {
		// Empty playlist
			try {
				await engine.emptyPL(req.params.pl_id);
				emitWS('playlistContentsUpdated',req.params.pl_id);
				res.json(OKMessage(req.params.pl_id,'PL_EMPTIED',req.params.pl_id));
			} catch(err) {
				
				res.statusCode = 500;
				res.json(errMessage('PL_EMPTY_ERROR',err.message,err.data));
				res.json(err);
			}
		});
	router.route('/whitelist/empty')
	/**
 * @api {put} /admin/whitelist/empty Empty whitelist
 * @apiName PutEmptyWhitelist
 * @apiVersion 2.0.0
 * @apiGroup Whitelist
 * @apiPermission admin
 *
 * @apiSuccess {String} code Message to display
 *
 * @apiSuccessExample Success-Response:
 * HTTP/1.1 200 OK
 * {
 *   "code": "WL_EMPTIED"
 * }
 * @apiError WL_EMPTY_ERROR Unable to empty the whitelist
 *
 * @apiErrorExample Error-Response:
 * HTTP/1.1 500 Internal Server Error
 */
		.put(getLang, requireAuth, requireValidUser, updateUserLoginTime, requireAdmin, async (req, res) => {
		// Empty whitelist
			try {
				await engine.emptyWL();
				emitWS('blacklistUpdated');
				emitWS('whitelistUpdated');
				res.json(OKMessage(null,'WL_EMPTIED'));							
			
			} catch(err) {
				logger.error(err);
				res.statusCode = 500;
				res.json(errMessage('WL_EMPTY_ERROR',err));						
			}
		});
	router.route('/blacklist/criterias/empty')
	/**
 * @api {put} /admin/blacklist/criterias/empty Empty list of blacklist criterias
 * @apiName PutEmptyBlacklist
 * @apiVersion 2.0.0
 * @apiGroup Blacklist
 * @apiPermission admin
 *
 * @apiSuccess {String} code Message to display
 * @apiSuccess {Number} data `null`
 *
 * @apiSuccessExample Success-Response:
 * HTTP/1.1 200 OK
 * {
 *   "code": "BLC_EMPTIED",
 *   "data": null
 * }
 * @apiError BLC_EMPTY_ERROR Unable to empty list of blacklist criterias
 *
 * @apiErrorExample Error-Response:
 * HTTP/1.1 500 Internal Server Error
 */
		.put(getLang, requireAuth, requireValidUser, updateUserLoginTime, requireAdmin, async (req, res) => {
		// Empty blacklist criterias
			try {
				await engine.emptyBLC();
				emitWS('blacklistUpdated');
				res.json(OKMessage(null,'BLC_EMPTIED'));							
			} catch(err) {
				logger.error(err);
				res.statusCode = 500;							
				res.json(errMessage('BLC_EMPTY_ERROR',err));
			}
		});
	router.route('/playlists/:pl_id([0-9]+)/setCurrent')
	/**
 * @api {put} /admin/playlists/:pl_id/setCurrent Set playlist to current
 * @apiName PutSetCurrentPlaylist
 * @apiVersion 2.0.0
 * @apiGroup Playlists
 * @apiPermission admin
 *
 * @apiParam {Number} pl_id Target playlist ID.
 * @apiSuccess {String} args ID of playlist updated
 * @apiSuccess {String} code Message to display
 * @apiSuccess {Number} data `null`
 *
 * @apiSuccessExample Success-Response:
 * HTTP/1.1 200 OK
 * {
 *   "args": 1,
 *   "code": "PL_SET_CURRENT",
 *   "data": null
 * }
 * @apiError PL_SET_CURRENT_ERROR Unable to set this playlist to current. The playlist is a public one and can't be set to current at the same time. First set another playlist as public so this playlist has no flags anymore and can be set current.
 *
 * @apiErrorExample Error-Response:
 * HTTP/1.1 500 Internal Server Error
 */
		.put(getLang, requireAuth, requireValidUser, updateUserLoginTime, requireAdmin, async (req, res) => {
			// set playlist to current
			try {
				await engine.setCurrentPL(req.params.pl_id);
				emitWS('playlistInfoUpdated',req.params.pl_id);
				res.json(OKMessage(null,'PL_SET_CURRENT',req.params.pl_id));
				
			} catch(err) {
				
				res.statusCode = 500;
				res.json(errMessage('PL_SET_CURRENT_ERROR',err.message,err.data));
			}
		});
	router.route('/playlists/:pl_id([0-9]+)/setPublic')
	/**
 * @api {put} /admin/playlists/:pl_id/setPublic Set playlist to public
 * @apiName PutSetPublicPlaylist
 * @apiVersion 2.0.0
 * @apiGroup Playlists
 * @apiPermission admin
 *
 * @apiParam {Number} pl_id Target playlist ID.
 * @apiSuccess {String} args ID of playlist updated
 * @apiSuccess {String} code Message to display
 * @apiSuccess {Number} data `null`
 *
 * @apiSuccessExample Success-Response:
 * HTTP/1.1 200 OK
 * {
 *   "args": 1,
 *   "code": "PL_SET_PUBLIC",
 *   "data": null
 * }
 * @apiError PL_SET_PUBLIC_ERROR Unable to set this playlist to public. The playlist is a current one and can't be set to public at the same time. First set another playlist as current so this playlist has no flags anymore and can be set public.
 *
 * @apiErrorExample Error-Response:
 * HTTP/1.1 500 Internal Server Error
 */
		.put(getLang, requireAuth, requireValidUser, updateUserLoginTime, requireAdmin, async (req, res) => {
			// Empty playlist
			try {
				await engine.setPublicPL(req.params.pl_id);
				emitWS('playlistInfoUpdated',req.params.pl_id);
				res.json(OKMessage(null,'PL_SET_PUBLIC',req.params.pl_id));
			} catch(err) {
				
				res.statusCode = 500;
				res.json(errMessage('PL_SET_PUBLIC_ERROR',err.message,err.data));
			}
		});
	router.route('/playlists/:pl_id([0-9]+)/karas')
	/**
 * @api {get} /admin/playlists/:pl_id/karas Get list of karaokes in a playlist
 * @apiName GetPlaylistKaras
 * @apiVersion 2.2.0
 * @apiGroup Playlists
 * @apiPermission admin
 *
 * @apiParam {Number} pl_id Target playlist ID.
 * @apiParam {String} [filter] Filter list by this string.
 * @apiParam {Number} [from=0] Return only the results starting from this position. Useful for continuous scrolling. 0 if unspecified
 * @apiParam {Number} [size=999999] Return only x number of results. Useful for continuous scrolling. 999999 if unspecified.
 *
 * @apiSuccess {Object[]} data/content/karas Array of `kara` objects
 * @apiSuccess {Number} data/infos/count Number of karaokes in playlist
 * @apiSuccess {Number} data/infos/from Starting position of listing
 * @apiSuccess {Number} data/infos/to End position of listing
 *
 * @apiSuccessExample Success-Response:
 * HTTP/1.1 200 OK
 * {
 *   "data": {
 *       "content": [
 *           {
 *               "NORM_author": null,
 *               "NORM_creator": null,
 *               "NORM_pseudo_add": "Administrateur",
 *               "NORM_serie": "Dynasty Warriors 3",
 *               "NORM_serie_altname": "DW3/DW 3",
 *               "NORM_singer": null,
 *               "NORM_songwriter": null,
 *               "NORM_title": "Circuit",
 *               "author": null,
 *               "created_at": 1508423806,
 *               "creator": null,
 *               "duration": 0,
 *               "flag_blacklisted": 0,
 *               "flag_playing": 1,
 *               "flag_whitelisted": 0,
 *               "flag_dejavu": 0,
 *               "gain": 0,
 *               "kara_id": 176,
 *               "kid": "b0de301c-5756-49fb-b019-85a99a66586b",
 *               "language": "chi",
 *               "language_i18n": "Chinois",
 * 				 "lastplayed_at": null,
 *               "mediafile": "CHI - Dynasty Warriors 3 - GAME ED - Circuit.avi"
 *               "misc": "TAG_VIDEOGAME",
 *               "misc_i18n": "Jeu vidéo",
 *               "playlistcontent_id": 4946,
 *               "pos": 1,
 *               "pseudo_add": "Administrateur",
 * 				 "requested": 20,
 *               "serie": "Dynasty Warriors 3",
 * 				 "serie_i18n": {
 * 								"fre":"Guerriers de la Dynastie"
 * 								}
 *               "serie_altname": "DW3/DW 3",
 *               "singer": null,
 *               "songorder": 0,
 *               "songtype": "TYPE_ED",
 *               "songtype_i18n": "Ending",
 *               "songtype_i18n_short": "ED",
 *               "songwriter": null,
 *               "title": "Circuit",
 * 				 "username": "admin",
 *               "viewcount": 0,
 *               "year": ""
 *           },
 *           ...
 *       ],
 *       "infos": {
 *           "count": 3,
 * 			 "from": 0,
 * 			 "to": 120
 *       }
 *   }
 * }
 * @apiError PL_VIEW_SONGS_ERROR Unable to fetch list of karaokes in a playlist
 *
 * @apiErrorExample Error-Response:
 * HTTP/1.1 500 Internal Server Error
 */
		.get(getLang, requireAuth, requireValidUser, updateUserLoginTime, requireAdmin, async (req, res) => {
			//Access :pl_id by req.params.pl_id
			// This get route gets infos from a playlist
			let size = req.query.size || 999999;
			size = parseInt(size, 10);
			let from = req.query.from || 0;
			from = parseInt(from, 10);
			try {

				const playlist = await engine.getPLContents(req.params.pl_id,req.query.filter,req.lang,req.authToken,from,size);
				res.json(OKMessage(playlist));
			} catch(err) {
				
				res.statusCode = 500;
				res.json(errMessage('PL_VIEW_SONGS_ERROR',err.message,err.data));
			}
		})
	/**
 * @api {post} /admin/playlists/:pl_id/karas Add karaokes to playlist
 * @apiName PatchPlaylistKaras
 * @apiVersion 2.1.0
 * @apiGroup Playlists
 * @apiPermission admin
 *
 * @apiParam {Number} pl_id Target playlist ID.
 * @apiParam {Number[]} kara_id List of `kara_id` separated by commas (`,`). Example : `1021,2209,44,872`
 * @apiParam {Number} [pos] Position in target playlist where to copy the karaoke to. If not specified, will place karaokes at the end of target playlist. `-1` adds karaokes after the currently playing song in target playlist.
 * @apiSuccess {String[]} args/plc_ids IDs of playlist contents copied
 * @apiSuccess {String} args/playlist_id ID of destinaton playlist
 * @apiSuccess {String} code Message to display
 *
 * @apiSuccessExample Success-Response:
 * HTTP/1.1 200 OK
 * {
 *   "args": {
 *       "playlist": 2,
 *       "plc_ids": [
 * 			"4946",
 * 			"639"
 * 		 ]
 *   },
 *   "code": "PL_SONG_MOVED",
 *   "data": null
 * }
 * @apiError PL_ADD_SONG_ERROR Unable to add songs to the playlist
 *
 * @apiErrorExample Error-Response:
 * HTTP/1.1 500 Internal Server Error
 * {
 *   "args": "Liste de lecture publique",
 *   "code": "PL_ADD_SONG_ERROR",
 *   "message": "No karaoke could be added, all are in destination playlist already (PLID : 2)"
 * }
 */
		.post(getLang, requireAuth, requireValidUser, updateUserLoginTime, requireAdmin, async (req, res) => {
			//add a kara to a playlist						
			const validationErrors = check(req.body, {
				kara_id: {presence: true, numbersArrayValidator: true},
				pos: {integerValidator: true}
			});
			if (!validationErrors) {				
				if (req.body.pos) req.body.pos = parseInt(req.body.pos, 10);
				try {
					const result = await engine.addKaraToPL(req.params.pl_id, req.body.kara_id, req.authToken.username, req.body.pos);
					emitWS('playlistInfoUpdated',req.params.pl_id);
					emitWS('playlistContentsUpdated',req.params.pl_id);
					res.statusCode = 201;		
					const args = {
						playlist: result.playlist
					};
					res.json(OKMessage(null,'PL_SONG_ADDED',args));
				} catch(err) {
					
					res.statusCode = 500;
					res.json(errMessage('PL_ADD_SONG_ERROR',err.message,err.data));
				}
			} else {
				// Errors detected
				// Sending BAD REQUEST HTTP code and error object.
				res.statusCode = 400;
				res.json(validationErrors);
			}
		})
	/**
 * @api {patch} /admin/playlists/:pl_id/karas Copy karaokes to another playlist
 * @apiName PatchPlaylistKaras
 * @apiVersion 2.0.0
 * @apiGroup Playlists
 * @apiPermission admin
 *
 * @apiParam {Number} pl_id Target playlist ID.
 * @apiParam {Number[]} plc_id List of `playlistcontent_id` separated by commas (`,`). Example : `1021,2209,44,872`
 * @apiParam {Number} [pos] Position in target playlist where to copy the karaoke to. If not specified, will place karaokes at the end of target playlist
 * @apiSuccess {String[]} args/plc_ids IDs of playlist contents copied
 * @apiSuccess {String} args/playlist_id ID of destinaton playlist
 * @apiSuccess {String} code Message to display
 *
 * @apiSuccessExample Success-Response:
 * HTTP/1.1 200 OK
 * {
 *   "args": {
 *       "playlist": 2,
 *       "plc_ids": [
 * 			"4946",
 * 			"639"
 * 		 ]
 *   },
 *   "code": "PL_SONG_MOVED",
 *   "data": null
 * }
 * @apiError PL_MOVE_SONG_ERROR Unable to copy karaoke song to the destination playlist
 *
 * @apiErrorExample Error-Response:
 * HTTP/1.1 500 Internal Server Error
 * {
 *   "args": "Liste de lecture publique",
 *   "code": "PL_MOVE_SONG_ERROR",
 *   "message": "Karaoke song 176 is already in playlist 2"
 * }
 */
		.patch(getLang, requireAuth, requireValidUser, updateUserLoginTime, requireAdmin, async (req, res) => {
			//add karas from a playlist to another
			const validationErrors = check(req.body, {
				plc_id: {presence: true, numbersArrayValidator: true},
				pos: {integerValidator: true}
			});
			if (!validationErrors) {
				if (req.body.pos) req.body.pos = parseInt(req.body.pos, 10);
				try {
					const pl_id = await	engine.copyKaraToPL(req.body.plc_id,req.params.pl_id,req.body.pos);
					emitWS('playlistContentsUpdated',pl_id);
					res.statusCode = 201;
					const args = {
						plc_ids: req.body.plc_id.split(','),
						playlist_id: parseInt(req.params.pl_id, 10)
					};
					res.json(OKMessage(null,'PL_SONG_MOVED',args));
				} catch(err) {
					
					res.statusCode = 500;
					res.json(errMessage('PL_MOVE_SONG_ERROR',err.message,err.data));
				}
			} else {
				// Errors detected
				// Sending BAD REQUEST HTTP code and error object.
				res.statusCode = 400;
				res.json(validationErrors);
			}

		})

	/**
 * @api {delete} /admin/playlists/:pl_id/karas Delete karaokes from playlist
 * @apiName DeletePlaylistKaras
 * @apiVersion 2.0.0
 * @apiGroup Playlists
 * @apiPermission admin
 *
 * @apiParam {Number} pl_id Target playlist ID.
 * @apiParam {Number[]} plc_id List of `plc_id` separated by commas (`,`). Example : `1021,2209,44,872`
 * @apiSuccess {String} args Name of playlist the song was deleted from
 * @apiSuccess {String} code Message to display
 *
 * @apiSuccessExample Success-Response:
 * HTTP/1.1 200 OK
 * {
 *   "args": "Liste de lecture publique",
 *   "code": "PL_SONG_DELETED",
 *   "data": null
 * }
 * @apiError PL_DELETE_SONG_ERROR Unable to delete the song from the selected playlist
 *
 * @apiErrorExample Error-Response:
 * HTTP/1.1 500 Internal Server Error
 * {
 *   "args": "Liste de lecture publique",
 *   "code": "PL_DELETE_SONG_ERROR",
 *   "message": "[PLC] GetPLContentInfo : PLCID 4960 unknown"
 * }
 */
		.delete(getLang, requireAuth, requireValidUser, updateUserLoginTime, requireAdmin, async (req, res) => {
			// Delete kara from playlist
			// Deletion is through playlist content's ID.
			// There is actually no need for a playlist number to be used at this moment.
			const validationErrors = check(req.body, {
				plc_id: {presence: true, numbersArrayValidator: true}				
			});
			if (!validationErrors) {
				try {
					const data = await engine.deleteKara(req.body.plc_id,req.params.pl_id);
					emitWS('playlistContentsUpdated',data.pl_id);
					emitWS('playlistInfoUpdated',data.pl_id);
					res.statusCode = 200;
					res.json(OKMessage(null,'PL_SONG_DELETED',data.pl_name));
				} catch(err) {
					
					res.statusCode = 500;
					res.json(errMessage('PL_DELETE_SONG_ERROR',err.message,err.data));
				}
			} else {
				// Errors detected
				// Sending BAD REQUEST HTTP code and error object.
				res.statusCode = 400;
				res.json(validationErrors);
			}
				
		});

	router.route('/playlists/:pl_id([0-9]+)/karas/:plc_id([0-9]+)')
	/**
 * @api {get} /admin/playlists/:pl_id/karas/:plc_id Get song info from a playlist
 * @apiName GetPlaylistPLC
 * @apiVersion 2.2.0
 * @apiGroup Playlists
 * @apiPermission admin
 *
 * @apiParam {Number} pl_id Target playlist ID. **Note :** Irrelevant since PLCIDs are unique in the table.
 * @apiParam {Number} plc_id Playlist content ID.
 * @apiSuccess {String} data/NORM_author Normalized karaoke's author name
 * @apiSuccess {String} data/NORM_creator Normalized creator's name
 * @apiSuccess {String} data/NORM_pseudo_add Normalized name of person who added the karaoke to the playlist
 * @apiSuccess {String} data/NORM_serie Normalized name of series the karaoke is from
 * @apiSuccess {String} data/NORM_serie_altname Normalized names of alternative names to the series the karaoke is from. When there are more than one alternative name, they're separated by forward slashes (`/`)
 * @apiSuccess {String} data/NORM_singer Normalized name of singer.
 * @apiSuccess {String} data/NORM_songwriter Normalized name of songwriter.
 * @apiSuccess {String} data/NORM_title Normalized song title
 * @apiSuccess {String} data/author Karaoke author's name
 * @apiSuccess {Number} data/created_at UNIX timestamp of the karaoke's creation date in the base
 * @apiSuccess {String} data/creator Show's creator name
 * @apiSuccess {Number} data/duration Song duration in seconds
 * @apiSuccess {Number} data/flag_blacklisted Is the song in the blacklist ?
 * @apiSuccess {Number} data/flag_playing Is the song the one currently playing ?
 * @apiSuccess {Number} data/flag_whitelisted Is the song in the whitelist ?
 * @apiSuccess {Number} data/flag_dejavu Has the song been played in the last hour ? (`EngineMaxDejaVuTime` defaults to 60 minutes)
 * @apiSuccess {Number} data/flag_favorites 1 = the song is in your favorites, 0 = not.
 * @apiSuccess {Number} data/gain Calculated audio gain for the karaoke's video, in decibels (can be negative)
 * @apiSuccess {Number} data/kara_id Karaoke's ID in the main database
 * @apiSuccess {String} data/kid Karaoke's unique ID (survives accross database generations)
 * @apiSuccess {String} data/language Song's language in ISO639-2B format, separated by commas when a song has several languages
 * @apiSuccess {String} data/language_i18n Song's language translated in the client's native language
 * @apiSuccess {Number} data/lastplayed_at When the song has been played last, in unix timestamp
 * @apiSuccess {String} data/misc Internal tag list (`TAG_VIDEOGAME`, etc.)
 * @apiSuccess {String} data/misc_i18n Translated tag list
 * @apiSuccess {Number} data/playlist_id ID of playlist this song belongs to
 * @apiSuccess {Number} data/playlistcontent_ID PLC ID of this song.
 * @apiSuccess {Number} data/pos Position in the playlist. First song has a position of `1`
 * @apiSuccess {String} data/previewfile Filename of the preview file associated with the karaoke. Can be undefined if the preview hasn't been generated yet by the server.
 * @apiSuccess {String} data/pseudo_add Nickname of user who added/requested the song. this nickname can be changed (`username` cannot) hence why it is displayed here.
 * @apiSuccess {String} data/requested Number of times the song has been requested.
 * @apiSuccess {String} data/serie Name of series/show the song belongs to
 * @apiSuccess {Object} data/serie_i18n JSON object with series' names depending on their language.
 * @apiSuccess {String} data/serie_altname Alternative name(s) of series/show this song belongs to. Names are separated by forward slashes (`/`)
 * @apiSuccess {String} data/singer Singer's name, if known.
 * @apiSuccess {Number} data/songorder Song's order, relative to it's type. Opening 1, Opening 2, Ending 1, Ending 2, etc.
 * @apiSuccess {String} data/songtype Song's type internal tag (`TYPE_OP`, `TYPE_ED`, `TYPE_IN` ...)
 * @apiSuccess {String} data/songtype_i18n Translated song's type (`Opening`, `Ending`, `Insert Song`...)
 * @apiSuccess {String} data/songtype_i18n_short Short translated version of the song's type (`OP`, `ED`, `IN`, ...)
 * @apiSuccess {Number} data/time_before_play Estimated time remaining before the song is going to play (in seconds). `0` if the song is currently playing or if there is no song selected as currently playing in the playlist (thus making this estimate impossible)
 * @apiSuccess {String} data/title Song's title
 * @apiSuccess {String} data/username Username who submitted this karaoke. Can be different from `pseudo_add`.
 * @apiSuccess {String} data/mediafile Media's filename
 * @apiSuccess {Number} data/viewcount Counts how many times the song has been played
 * @apiSuccess {String} data/year Song's creation year. Empty string is returned if no year is known.
 * @apiSuccessExample Success-Response:
 * HTTP/1.1 200 OK
 * {
 *   "data": [
 *       {
 *           "NORM_author": null,
 *           "NORM_creator": null,
 *           "NORM_pseudo_add": "Axel",
 *           "NORM_serie": "C3 ~ Cube X Cursed X Curious",
 *           "NORM_serie_altname": "C-Cube/CxCxC",
 *           "NORM_singer": null,
 *           "NORM_songwriter": null,
 *           "NORM_title": "Hana",
 *           "author": null,
 *           "created_at": 1508427958,
 *           "creator": null,
 *           "duration": 0,
 *           "flag_blacklisted": 0,
 *           "flag_playing": 0,
 *           "flag_whitelisted": 0,
 *           "flag_dejavu": 0,
 * 			 "flag_favorites": 0,
 *           "gain": 0,
 *           "kara_id": 1007,
 *           "kid": "c05e24eb-206b-4ff5-88d4-74e8d5ad6f75",
 *           "language": "jpn",
 *           "language_i18n": "Japonais",
 * 			 "lastplayed_at": null,
 *           "mediafile": "JAP - C3 ~ Cube X Cursed X Curious - ED1 - Hana.avi",
 *           "misc": null,
 *           "misc_i18n": null,
 *           "playlist_id": 2,
 *           "playlistcontent_id": 4961,
 *           "pos": 12,
 *           "previewfile": "JAP - C3 ~ Cube X Cursed X Curious.1201230.mp4"
 *           "pseudo_add": "Axel",
 * 			 "requested": 20,
 *           "serie": "C3 ~ Cube X Cursed X Curious",
 *  		 "serie_i18n": {
 * 				"fre":"Guerriers de la Dynastie"
 *  			},
 *           "serie_altname": "C-Cube/CxCxC",
 *           "singer": null,
 *           "songorder": 1,
 *           "songtype": "TYPE_ED",
 *           "songtype_i18n": "Ending",
 *           "songtype_i18n_short": "ED",
 *           "songwriter": null,
 *           "time_before_play": 0,
 *           "title": "Hana",
 * 			 "username": "axelterizaki",
 *           "viewcount": 0,
 *           "year": ""
 *       }
 *   ]
 * }
 * @apiError PL_VIEW_CONTENT_ERROR Unable to fetch playlist's content information
 *
 * @apiErrorExample Error-Response:
 * HTTP/1.1 500 Internal Server Error
 * {
 *   "code": "PL_VIEW_CONTENT_ERROR",
 *   "message": "PLCID unknown!"
 * }
 */
		.get(getLang, requireAuth, requireValidUser, updateUserLoginTime, requireAdmin, async (req, res) => {
			try {
				const kara = await engine.getPLCInfo(req.params.plc_id,req.lang,req.authToken);
				res.json(OKMessage(kara));
				
			} catch(err) {
				logger.error(err);
				res.statusCode = 500;
				res.json(errMessage('PL_VIEW_CONTENT_ERROR',err));
			}
		})
	/**
 * @api {put} /admin/playlists/:pl_id/karas/:plc_id Update song in a playlist
 * @apiName PutPlaylistKara
 * @apiVersion 2.0.0
 * @apiGroup Playlists
 * @apiPermission admin
 *
 * @apiParam {Number} pl_id Playlist ID. **Note :** Irrelevant since `plc_id` is unique already.
 * @apiParam {Number} plc_id `playlistcontent_id` of the song to update
 * @apiParam {Number} [pos] Position in target playlist where to move the song to.
 * @apiParam {Number} [flag_playing] If set to 1, the select song will become the currently playing song.
 * @apiSuccess {String} code Message to display
 * @apiSuccess {String} data PLCID modified
 *
 * @apiSuccessExample Success-Response:
 * HTTP/1.1 200 OK
 * {
 *   "code": "PL_CONTENT_MODIFIED",
 *   "data": "4962"
 * }
 * @apiError PL_MODIFY_CONTENT_ERROR Unable to modify content's position or playing status
 *
 * @apiErrorExample Error-Response:
 * HTTP/1.1 500 Internal Server Error
 * {
 *   "code": "PL_MODIFY_CONTENT_ERROR",
 *   "message": "PLCID unknown!"
 * }
 */
		.put(getLang, requireAuth, requireValidUser, updateUserLoginTime, requireAdmin, async (req, res) => {
			//Update playlist's karaoke song
			//Params: position
			
			const validationErrors = check(req.body, {
				flag_playing: {boolIntValidator: true},
				pos: {integerValidator: true}
			});
			if (!validationErrors) {
				if (req.body.pos) req.body.pos = parseInt(req.body.pos, 10);
				if (req.body.flag_playing) req.body.flag_playing = parseInt(req.body.flag_playing, 10);
				try {
					await engine.editPLC(req.params.plc_id,req.body.pos,req.body.flag_playing,req.authToken);
					res.json(OKMessage(req.params.plc_id,'PL_CONTENT_MODIFIED'));
				} catch(err) {
					logger.error(err);
					res.statusCode = 500;
					res.json(errMessage('PL_MODIFY_CONTENT_ERROR',err));
				}
			} else {
				// Errors detected
				// Sending BAD REQUEST HTTP code and error object.
				res.statusCode = 400;
				res.json(validationErrors);
			}
				
		});

	router.route('/settings')
	/**
 * @api {get} /admin/settings Get settings
 * @apiName GetSettings
 * @apiVersion 2.2.0
 * @apiGroup Main
 * @apiPermission admin
 *
 * @apiSuccess {Object} data Contains all configuration settings. See example or documentation for what each setting does.
 *
 * @apiSuccessExample Success-Response:
 * HTTP/1.1 200 OK
 * {
 *   "data": {
 *       "AdminPassword": "xxxx",
 *       "BinPlayerLinux": "/usr/bin/mpv",
 *       "BinPlayerOSX": "app/bin/mpv.app/Contents/MacOS/mpv",
 *       "BinPlayerWindows": "app/bin/mpv.exe",
 *       "BinffmpegLinux": "/usr/bin/ffmpeg",
 *       "BinffmpegOSX": "app/bin/ffmpeg",
 *       "BinffmpegPath": "D:\\perso\\toyundamugen-app\\app\\bin\\ffmpeg.exe",
 *       "BinffmpegWindows": "app/bin/ffmpeg.exe",
 *       "BinffprobeLinux": "/usr/bin/ffprobe",
 *       "BinffprobeOSX": "app/bin/ffprobe",
 *       "BinffprobePath": "D:\\perso\\toyundamugen-app\\app\\bin\\ffprobe.exe
 *       "BinffprobeWindows": "app/bin/ffprobe.exe",
 *       "BinmpvPath": "D:\\perso\\toyundamugen-app\\app\\bin\\mpv.exe",
 *       "EngineAllowViewBlacklist": "1",
 *       "EngineAllowViewBlacklistCriterias": "1",
 *       "EngineAllowViewWhitelist": "1",
 *       "EngineAutoPlay": "0",
 *       "EngineDefaultLocale": "fr",
 *       "EngineDisplayConnectionInfo": "1",
 *       "EngineDisplayConnectionInfoHost": "",
 *       "EngineDisplayConnectionInfoMessage": "",
 *       "EngineDisplayConnectionInfoQRCode": "1",
 *       "EngineDisplayNickname": "1",
 * 		 "EngineFreeUpvotes": "1",
 *       "EngineFreeUpvotesRequiredPercentage": "33",
 *       "EngineFreeUpvotesRequiredMin": "4",
 *       "EngineFreeAutoTime": "60",
 *       "EngineJinglesInterval": "1",
 *       "EnginePrivateMode": "1",
 * 		 "EngineRemovePublicOnPlay": "1",
 * 		 "EngineQuotaType": "1",
 *       "EngineRepeatPlaylist": "0",
 *       "EngineSmartInsert": "1",
 * 		 "EngineSongPoll": "0",
 * 		 "EngineSongPollChoices": "4",
 * 		 "EngineSongPollTimeout": "30",
 *       "EngineSongsPerUser": "10000",
 * 		 "EngineTimePerUser": "10000",
 *       "EngineCreatePreviews": "1",
 *       "PathAltname": "../times/series_altnames.csv",
 *       "PathBackgrounds": "app/backgrounds",
 *       "PathBin": "app/bin",
 *       "PathDB": "app/db",
 *       "PathDBKarasFile": "engine.sqlite3",
 *       "PathDBUserFile": "userdata.sqlite3",
 *       "PathJingles": "app/jingles",
 *       "PathKaras": "../times/karas",
 *       "PathSubs": "../times/lyrics",
 *       "PathTemp": "app/temp",
 *       "PathMedias": "app/data/medias",
 *       "PathMediasHTTP": "",
 *       "PlayerBackground": "",
 *       "PlayerFullscreen": "0",
 *       "PlayerNoBar": "1",
 *       "PlayerNoHud": "1",
 *       "PlayerPIP": "1",
 *       "PlayerPIPPositionX": "Left",
 *       "PlayerPIPPositionY": "Bottom",
 *       "PlayerPIPSize": "30",
 *       "PlayerScreen": "0",
 *       "PlayerStayOnTop": "1",
 *       "VersionName": "Finé Fiévreuse",
 *       "VersionNo": "v2.0 Release Candidate 1",
 *       "appPath": "F:\\karaokemugen-app\\",
 *       "isTest": false,
 *       "mpvVideoOutput": "direct3d",
 *       "os": "win32",
 *       "osHost": "10.202.40.43",
 * 		 "WebappMode": "2",
 * 		 "WebappSongLanguageMode": "1"
 *   }
 * }
 */
		.get(getLang, requireAuth, requireValidUser, updateUserLoginTime, requireAdmin, async (req, res) => {
			res.json(OKMessage(getConfig()));
		})
	/**
 * @api {put} /admin/settings Update settings
 * @apiName PutSettings
 * @apiVersion 2.2.0
 * @apiPermission admin
 * @apiGroup Main
 * @apiDescription **Note :** All settings must be sent at once in a single request.
 * @apiParam {Boolean} EngineAllowViewBlacklist Allow/disallow users to view blacklist contents from the guest interface
 * @apiParam {Boolean} EngineAllowViewWhitelist Allow/disallow users to view whitelist contents from the guest interface
 * @apiParam {Boolean} EngineAllowViewBlacklistCriterias Allow/disallow users to view blacklist criterias list from the guest interface
 * @apiParam {Boolean} EngineAllowAutoPlay Enable/disable AutoPlay feature (starts playing once a song is added to current playlist)
 * @apiParam {Boolean} EngineDisplayConnectionInfo Show/hide connection info during jingles or pauses (the "Go to http://" message)
 * @apiParam {String} EngineDisplayConnectionInfoHost Force IP/Hostname displayed during jingles or pauses in case autodetection returns the wrong IP
 * @apiParam {String} EngineDisplayConnectionInfoMessage Add a small message before the text showing the URL to connect to
 * @apiParam {Boolean} EngineDisplayConnectionInfoQRCode Enable/disable QR Code during pauses inbetween two songs.
 * @apiParam {Boolean} EngineDisplayNickname Enable/disable displaying the username who requested a song.
 * @apiParam {Number} EngineFreeAutoTime Time in minutes before a song is automatically freed.
 * @apiParam {Boolean} EngineFreeUpvotes Enable/disable Free Songs By Upvotes feature
 * @apiParam {Number} EngineFreeUpvotesRequiredMin Minimum number of upvotes required to free a song
 * @apiParam {Number} EngineFreeUpvotesRequiredPercent Minimum percent of upvotes / online users required to free a song
 * @apiParam {Number} EngineJinglesInterval Interval in number of songs between two jingles. 0 to disable entirely.
 * @apiParam {Boolean} EnginePrivateMode `false` = Public Karaoke mode, `true` = Private Karaoke Mode. See documentation.
 * @apiParam {Boolean} EngineRemovePublicOnPlay Enable/disable auto removal of songs in public playlist if they've just been played 
 * @apiParam {Number} EngineQuotaType Type of quota for users when adding songs. `0` = no quota, `1` = limited by number of songs, `2` = limited by total song duration.
 * @apiParam {Boolean} EngineRepeatPlaylist Enable/disable auto repeat playlist when at end.
 * @apiParam {Boolean} EngineSmartInsert Enable/disable smart insert of songs in the playlist.
 * @apiParam {Boolean} EngineSongPoll Enable/disable public song poll
 * @apiParam {Number} EngineSongPollChoices Number of songs the public can choose from during a public poll
 * @apiParam {Number} EngineSongPollTimeout Poll duration in seconds
 * @apiParam {Number} EngineSongsPerUser Number of songs allowed per person.
 * @apiParam {Number} EngineTimePerUser Song duration allowed per person.
 * @apiParam {Boolean} PlayerFullscreen Enable/disable full screen mode
 * @apiParam {Boolean} PlayerNoBar `true` = Hide progress bar / `false` = Show progress bar
 * @apiParam {Boolean} PlayerNoHud `true` = Hide HUD / `false` = Show HUD
 * @apiParam {Boolean} PlayerPIP Enable/disable Picture-in-picture mode
 * @apiParam {String=Left,Center,Right} PlayerPIPPositionX Horizontal position of PIP screen
 * @apiParam {String=Top,Center,Bottom} PlayerPIPPositionY Vertical position of PIP screen
 * @apiParam {Number} PlayerPIPSize Size in percentage of the PIP screen
 * @apiParam {Number} PlayerScreen Screen number to display the videos on. If screen number is not available, main screen is used. `9` means autodetection.
 * @apiParam {Boolean} PlayerStayOnTop Enable/disable stay on top of all windows.  
 * @apiParam {Number} WebappMode Webapp public mode : `0` = closed, no public action available, `1` = only show song information and playlists, no karaoke can be added by the user, `2` = default, open mode.
 * @apiParam {Number} WebappSongLanguageMode How to display series : `0` = according to the original name, `1` = according to song's language, or defaults to the `series=` metadata, `2` = according to admin's language or fallbacks to english then original, `3` = according to user language or fallbacks to english then original
 * @apiParam {Boolean} PlayerStayOnTop Enable/disable stay on top of all windows.
 * @apiSuccess {Object} data Contains all configuration settings. See example or documentation for what each setting does.
 *
 * @apiSuccessExample Success-Response:
 * HTTP/1.1 200 OK
 */
		.put(getLang, requireAuth, requireValidUser, updateUserLoginTime, requireAdmin, async (req,res) => {
			//Update settings
			// Convert body to strings			
			try {
				verifyConfig(req.body);
				try {
					req.body = sanitizeConfig(req.body);			
					const publicSettings = await engine.updateSettings(req.body);
					emitWS('settingsUpdated',publicSettings);
					res.json(OKMessage(req.body,'SETTINGS_UPDATED'));				
				} catch(err) {
					logger.error(err);
					res.statusCode = 500;
					res.json(errMessage('SETTINGS_UPDATE_ERROR',err));
				}
			} catch(err) {
				// Errors detected
				// Sending BAD REQUEST HTTP code and error object.
				res.statusCode = 400;
				res.json(err);
			}			
		});
			
	router.route('/player/message')
	/**
 * @api {post} /admin/player/message Send a message to screen or users' devices
 * @apiName PostPlayerMessage
 * @apiVersion 2.0.0
 * @apiGroup Player
 * @apiPermission admin
 *
 * @apiParam {String} message Message to display
 * @apiParam {Number} [duration=10000] Duration of message in miliseconds
 * @apiParam {String="users","screen"} [destination="screen"] `users` for user's devices, or `screen` for the screen on which the karaoke is running. Default is `screen`.
 * @apiSuccess {String} code Message to display
 * @apiSuccess {String} data Data sent to the API
 *
 * @apiSuccessExample Success-Response:
 * HTTP/1.1 200 OK
 * {
 *   "code": "MESSAGE_SENT",
 *   "data": {
 *       "destination": "screen",
 *       "duration": 10000,
 *       "message": "yolo"
 *   }
 * }
 * @apiError MESSAGE_SEND_ERROR Message couldn't be sent
 *
 * @apiErrorExample Error-Response:
 * HTTP/1.1 500 Internal Server Error
 * {
 *   "code": "MESSAGE_SEND_ERROR"
 * }
 */
		.post(getLang, requireAuth, requireValidUser, updateUserLoginTime, requireAdmin, async (req, res) => {			
			const validationErrors = check(req.body, {
				duration: {integerValidator: true},
				message: {presence: true},
				destination: {inclusion: ['screen', 'users', 'all']}
			});
			if (!validationErrors) {
				if (req.body.duration) req.body.duration = parseInt(req.body.duration, 10);
				if (req.body.destination === 'users' || 
				    req.body.destination === 'all') {
					emitWS('adminMessage', req.body );
					res.statusCode = 200;
					res.json(OKMessage(req.body,'MESSAGE_SENT',req.body));
				}
				if (req.body.destination === 'screen' || 
				    req.body.destination === 'all') {
					try {
						await engine.sendMessage(req.body.message,req.body.duration);
						res.statusCode = 200;
						res.json(OKMessage(req.body,'MESSAGE_SENT'));
					} catch(err) {
						logger.error(err);
						res.statusCode = 500;
						res.json(errMessage('MESSAGE_SEND_ERROR',err));
					}
				}
			} else {
				// Errors detected
				// Sending BAD REQUEST HTTP code and error object.
				res.statusCode = 400;
				res.json(validationErrors);
			}			
		});

	router.route('/whitelist')
	/**
 * @api {get} /admin/whitelist Get whitelist
 * @apiName GetWhitelist
 * @apiVersion 2.2.0
 * @apiGroup Whitelist
 * @apiPermission admin
 *
 * @apiParam {String} [filter] Filter list by this string.
 * @apiParam {Number} [from=0] Return only the results starting from this position. Useful for continuous scrolling. 0 if unspecified
 * @apiParam {Number} [size=999999] Return only x number of results. Useful for continuous scrolling. 999999 if unspecified.
 * @apiSuccess {String} code Message to display
 * @apiSuccess {Object[]} data/content List of karaoke objects
 * @apiSuccess {Number} data/infos/count Number of items in whitelist no matter which range was requested
 * @apiSuccess {Number} data/infos/from Items listed are from this position
 * @apiSuccess {Number} data/infos/size How many items listed.
 *
 * @apiSuccessExample Success-Response:
 * HTTP/1.1 200 OK
 * {
 *   "data": {
 *       "content": [
 *           {
 *               "NORM_author": null,
 *               "NORM_creator": "Eurovision",
 *               "NORM_serie": null,
 *               "NORM_serie_altname": null,
 *               "NORM_singer": "Dschinghis Khan",
 *               "NORM_songwriter": "Ralph Siegel",
 *               "NORM_title": "Moskau",
 *               "author": null,
 *               "created_at": 1508921852,
 *               "creator": "Eurovision",
 *               "duration": 0,
 *               "kara_id": 1,
 *               "kid": "d9bb6a76-2b7d-469e-ba44-6acfc463202e",
 *               "language": "ger",
 *               "language_i18n": "Allemand",
 *               "misc": "TAG_CONCERT,TAG_REAL",
 *               "misc_i18n": "Concert,Non-anime",
 * 				 "requested": 20,
 *               "serie": null,
 * 				 "serie_i18n": {
 * 								"fre":"Guerriers de la Dynastie"
 * 								} 
 *               "serie_altname": null,
 *               "singer": "Dschinghis Khan",
 *               "songorder": 0,
 *               "songtype": "TYPE_MUSIC",
 *               "songtype_i18n": "Music Video",
 *               "songtype_i18n_short": "MV",
 *               "songwriter": "Ralph Siegel",
 *               "title": "Moskau",
 *               "mediafile": "ALL - Dschinghis Khan - MV - Moskau.avi",
 *               "viewcount": 0,
 *               "whitelist_id": 1,
 *               "year": "1980"
 *           }
 *       ],
 *       "infos": {
 *           "count": 1,
 *           "from": 0,
 *           "to": 999999
 *       }
 *   }
 * }
 * @apiError WL_VIEW_ERROR Whitelist could not be viewed
 *
 * @apiErrorExample Error-Response:
 * HTTP/1.1 500 Internal Server Error
 * {
 *   "code": "WL_VIEW_ERROR"
 * }
 */
		.get(getLang, requireAuth, requireValidUser, updateUserLoginTime, requireAdmin, async (req, res) => {
			let size = req.query.size || 999999;
			size = parseInt(size, 10);
			let from = req.query.from || 0;
			from = parseInt(from, 10);
			try {
				const karas = await engine.getWL(req.body.filter,req.lang,from,size);
				res.json(OKMessage(karas));				
			} catch(err) {
				logger.error(err);
				res.statusCode = 500;
				res.json(errMessage('WL_VIEW_ERROR',err));
			}
		})
	/**
 * @api {post} /admin/whitelist Add song to whitelist
 * @apiName PostWhitelist
 * @apiVersion 2.0.0
 * @apiGroup Whitelist
 * @apiPermission admin
 *
 * @apiParam {Number[]} kara_id Karaoke song IDs, separated by commas
 * @apiSuccess {Number} args Arguments associated with message
 * @apiSuccess {Number} code Message to display
 * @apiSuccess {Number[]} data/kara_id List of karaoke IDs separated by commas
 *
 * @apiSuccessExample Success-Response:
 * HTTP/1.1 201 Created
 * {
 *   "args": "2",
 *   "code": "WL_SONG_ADDED",
 *   "data": {
 *       "kara_id": "2"
 *   }
 * }
 * @apiError WL_ADD_SONG_ERROR Karaoke couldn't be added to whitelist
 *
 * @apiErrorExample Error-Response:
 * HTTP/1.1 500 Internal Server Error
 * {
 *   "args": [
 *       "2"
 *   ],
 *   "code": "WL_ADD_SONG_ERROR",
 *   "message": "No karaoke could be added, all are in whitelist already"
 * }
 */
		.post(getLang, requireAuth, requireValidUser, updateUserLoginTime, requireAdmin, async (req, res) => {
			const validationErrors = check(req.body, {
				kara_id: {numbersArrayValidator: true}				
			});
			if (!validationErrors) {
				try {
					await engine.addKaraToWL(req.body.kara_id);
					emitWS('whitelistUpdated');
					emitWS('blacklistUpdated');
					res.statusCode = 201;
					res.json(OKMessage(req.body,'WL_SONG_ADDED',req.body.kara_id));															
				} catch(err) {
					
					res.statusCode = 500;
					res.json(errMessage('WL_ADD_SONG_ERROR',err.message,err.data));
				}
			} else {
				// Errors detected
				// Sending BAD REQUEST HTTP code and error object.
				res.statusCode = 400;
				res.json(validationErrors);
			}
			
		})
	/**
 * @api {delete} /admin/whitelist Delete whitelist item
 * @apiName DeleteWhitelist
 * @apiVersion 2.0.0
 * @apiGroup Whitelist
 * @apiPermission admin
 *
 * @apiParam {Number[]} wlc_id Whitelist content IDs to delete from whitelist, separated by commas
 * @apiSuccess {Number} args Arguments associated with message
 * @apiSuccess {Number} code Message to display
 * @apiSuccess {Number[]} data List of Whitelist content IDs separated by commas
 *
 * @apiSuccessExample Success-Response:
 * HTTP/1.1 200 OK
 * {
 *   "args": "1",
 *   "code": "WL_SONG_DELETED",
 *   "data": "1"
 * }
 * @apiError WL_DELETE_SONG_ERROR Whitelist item could not be deleted.
 *
 */
		.delete(getLang, requireAuth, requireValidUser, updateUserLoginTime, requireAdmin, async (req, res) => {
			//Delete kara from whitelist
			// Deletion is through whitelist ID.
			const validationErrors = check(req.body, {
				wlc_id: {numbersArrayValidator: true}				
			});
			if (!validationErrors) {
				try {
					await engine.deleteWLC(req.body.wlc_id);
					emitWS('whitelistUpdated');
					emitWS('blacklistUpdated');
					res.json(OKMessage(req.body.wlc_id,'WL_SONG_DELETED',req.body.wlc_id));							
				} catch(err) {
					logger.error(err);
					res.statusCode = 500;
					res.json(errMessage('WL_DELETE_SONG_ERROR',err));
				}
			} else {
				// Errors detected
				// Sending BAD REQUEST HTTP code and error object.
				res.statusCode = 400;
				res.json(validationErrors);
			}
			
		});

	router.route('/blacklist')
	/**
 * @api {get} /admin/blacklist Get blacklist
 * @apiName GetBlacklist
 * @apiVersion 2.2.0
 * @apiGroup Blacklist
 * @apiPermission admin
 *
 * @apiParam {String} [filter] Filter list by this string.
 * @apiParam {Number} [from=0] Return only the results starting from this position. Useful for continuous scrolling. 0 if unspecified
 * @apiParam {Number} [size=999999] Return only x number of results. Useful for continuous scrolling. 999999 if unspecified.* @apiSuccess {String} code Message to display
 * @apiSuccess {Object[]} data/content List of karaoke objects
 * @apiSuccess {Number} data/infos/count Number of items in whitelist no matter which range was requested
 * @apiSuccess {Number} data/infos/from Items listed are from this position
 * @apiSuccess {Number} data/infos/size How many items listed.
 *
 * @apiSuccessExample Success-Response:
 * HTTP/1.1 200 OK
 * {
 *   "data": {
 *       "content": [
 *           {
 *               "NORM_author": "Jean-Jacques Debout",
 *               "NORM_creator": null,
 *               "NORM_serie": "Capitaine Flam",
 *               "NORM_serie_altname": "Kyaputen Fyucha",
 *               "NORM_singer": "Richard Simon",
 *               "NORM_songwriter": "Roger Dumas",
 *               "NORM_title": "",
 *               "author": "Jean-Jacques Debout",
 *               "created_at": 1508924354,
 *               "creator": null,
 *               "duration": 0,
 *               "kara_id": 217,
 *               "kid": "1b8bca21-4d26-41bd-90b7-2afba74381ee",
 *               "language": "fre",
 *               "language_i18n": "Français",
 *               "misc": null,
 *               "misc_i18n": null,
 *               "reason_add": "Blacklisted Tag : Jean-Jacques Debout (type 6)",
 * 				 "requested": 20
 *               "serie": "Capitaine Flam",
 *               "serie_altname": "Kyaputen Fyucha",
 * 				 "serie_i18n": {
 * 					"fre":"Guerriers de la Dynastie"
 * 				 },
 *               "singer": "Richard Simon",
 *               "songorder": 0,
 *               "songtype": "TYPE_OP",
 *               "songtype_i18n": "Opening",
 *               "songtype_i18n_short": "OP",
 *               "songwriter": "Roger Dumas",
 *               "title": "",
 *               "mediafile": "FR - Capitaine Flam - OP.avi",
 *               "viewcount": 0,
 *               "year": "1981"
 *           }
 *       ],
 *       "infos": {
 *           "count": 1,
 *           "from": 0,
 *           "to": 999999
 *       }
 *   }
 * }
 * @apiError BL_VIEW_ERROR Blacklist could not be viewed
 *
 * @apiErrorExample Error-Response:
 * HTTP/1.1 500 Internal Server Error
 * {
 *   "code": "BL_VIEW_ERROR"
 * }
 */
		.get(getLang, requireAuth, requireValidUser, updateUserLoginTime, requireAdmin, async (req, res) => {
			let size = req.query.size || 999999;
			size = parseInt(size, 10);
			let from = req.query.from || 0;
			from = parseInt(from, 10);
			try {
				const karas = await engine.getBL(req.body.filter,req.lang,from,size);
				res.json(OKMessage(karas));
			} catch(err) {
				logger.error(err);
				res.statusCode = 500;
				res.json(errMessage('BL_VIEW_ERROR',err));
			}
		});				
	router.route('/blacklist/criterias')
	/**
 * @api {get} /admin/blacklist/criterias Get list of blacklist criterias
 * @apiName GetBlacklistCriterias
 * @apiVersion 2.0.0
 * @apiGroup Blacklist
 * @apiPermission admin
 *
 * @apiSuccess {Number} data/blcriteria_id Blacklist criteria's ID.
 * @apiSuccess {Number} data/type Blacklist criteria's type. Refer to dev documentation for more info on BLC types.
 * @apiSuccess {Number} data/value Value associated to balcklist criteria (what is being blacklisted)
 * @apiSuccess {String} data/value_i18n Translated value to display on screen.
 *
 * @apiSuccessExample Success-Response:
 * HTTP/1.1 200 OK
 * {
 *   "data": [
 *       {
 *           "blcriteria_id": 2,
 *           "type": 6,
 *           "value": "241",
 *           "value_i18n": "Jean-Jacques Debout"
 *       }
 *   ]
 * }

* @apiError BLC_VIEW_ERROR Blacklist criterias could not be listed
*
* @apiErrorExample Error-Response:
* HTTP/1.1 500 Internal Server Error
* {
*   "code": "BLC_VIEW_ERROR"
* }
*/		
		.get(getLang, requireAuth, requireValidUser, updateUserLoginTime, requireAdmin, async (req, res) => {
			//Get list of blacklist criterias
			try {
				const blc = await engine.getBLC();
				res.json(OKMessage(blc));
			} catch(err) {
				logger.error(err);
				res.statusCode = 500;
				res.json(errMessage('BLC_VIEW_ERROR',err));
			}
		})
	/**
 * @api {post} /admin/blacklist/criterias Add a blacklist criteria
 * @apiName PostBlacklistCriterias
 * @apiVersion 2.0.0
 * @apiGroup Blacklist
 * @apiPermission admin
 *
 * @apiParam {Number} blcriteria_type Blacklist criteria type (refer to docs)
 * @apiParam {String} blcriteria_value Blacklist criteria value. Depending on type, can be number or string.
 * @apiSuccess {String} code Message to display
 * @apiSuccess {String} args arguments for the message
 * @apiSuccess {String} data Data returned from API
 *
 * @apiSuccessExample Success-Response:
 * HTTP/1.1 201 Created
 * {
 *   "args": {
 *       "blcriteria_type": "1000",
 *       "blcriteria_value": "lol"
 *   },
 *   "code": "BLC_ADDED",
 *   "data": {
 *       "blcriteria_type": "1000",
 *       "blcriteria_value": "lol"
 *   }
 * }
 * @apiError BLC_ADD_ERROR Blacklist criteria could not be added
 *
 * @apiErrorExample Error-Response:
 * HTTP/1.1 500 Internal Server Error
 * {
 *   "code": "BLC_ADD_ERROR",
 *   "message": {
 *       "code": "SQLITE_ERROR",
 *       "errno": 1
 *   }
 * }
 */		
		.post(getLang, requireAuth, requireValidUser, updateUserLoginTime, requireAdmin, async (req, res) => {
			//Add blacklist criteria
			const validationErrors = check(req.body, {
				blcriteria_type: {numericality: {onlyInteger: true, greaterThanOrEqualTo: 0, lowerThanOrEqualTo: 1010}},
				blcriteria_value: {presence: true}
			});
			if (!validationErrors) {
				try {
					await engine.addBLC(req.body.blcriteria_type,req.body.blcriteria_value);
					
					emitWS('blacklistUpdated');
					res.statusCode = 201;
					res.json(OKMessage(req.body,'BLC_ADDED',req.body));
						
				} catch(err) {
					logger.error(err);
					res.statusCode = 500;
					res.json(errMessage('BLC_ADD_ERROR',err));
				}
			} else {
				// Errors detected
				// Sending BAD REQUEST HTTP code and error object.
				res.statusCode = 400;
				res.json(validationErrors);
			}
			
		});

	router.route('/blacklist/criterias/:blc_id([0-9]+)')
	/**
 * @api {delete} /admin/blacklist/criterias/:blc_id Delete a blacklist criteria
 * @apiName DeleteBlacklistCriterias
 * @apiVersion 2.0.0
 * @apiGroup Blacklist
 * @apiPermission admin
 *
 * @apiParam {Number} blc_id Blacklist criteria's ID to delete
 * @apiSuccess {String} code Message to display
 * @apiSuccess {String} args arguments for the message
 * @apiSuccess {String} data Data returned from API
 *
 * @apiSuccessExample Success-Response:
 * HTTP/1.1 200 OK
 * {
 *   "args": "5",
 *   "code": "BLC_DELETED",
 *   "data": "5"
 * }
 * @apiError BLC_DELETE_ERROR Unable to delete Blacklist criteria
 *
 * @apiErrorExample Error-Response:
 * HTTP/1.1 500 Internal Server Error
 * {
 *   "code": "BLC_DELETE_ERROR",
 *   "message": "BLCID 5 unknown"
 * }
 */		
		.delete(getLang, requireAuth, requireValidUser, updateUserLoginTime, requireAdmin, async (req, res) => {
			try {
				await engine.deleteBLC(req.params.blc_id);
				emitWS('blacklistUpdated');
				res.json(OKMessage(req.params.blc_id,'BLC_DELETED',req.params.blc_id));							
			} catch(err) {
				logger.error(err);
				res.statusCode = 500;
				res.json(errMessage('BLC_DELETE_ERROR',err));	
			}
		})
	/**
 * @api {put} /admin/blacklist/criterias/:blc_id Edit a blacklist criteria
 * @apiName PutBlacklistCriterias
 * @apiVersion 2.0.0
 * @apiGroup Blacklist
 * @apiPermission admin
 *
 * @apiParam {Number} blc_id Blacklist criteria's ID to delete
 * @apiParam {Number} blcriteria_type New blacklist criteria's type
 * @apiParam {String} blcriteria_value New blacklist criteria's value
 * @apiSuccess {String} code Message to display
 * @apiSuccess {String} args arguments for the message
 * @apiSuccess {String} data Data returned from API
 *
 * @apiSuccessExample Success-Response:
 * HTTP/1.1 200 OK
 * {
 *   "args": "6",
 *   "code": "BLC_UPDATED",
 *   "data": {
 *       "blcriteria_type": "8",
 *       "blcriteria_value": "750"
 *   }
 * }
 * @apiError BLC_UPDATE_ERROR Unable to update Blacklist criteria
 *
 * @apiErrorExample Error-Response:
 * HTTP/1.1 500 Internal Server Error
 * {
 *   "code": "BLC_UPDATE_ERROR",
 *   "message": "BLCID 12309 unknown"
 * }
 */		
		.put(getLang, requireAuth, requireValidUser, updateUserLoginTime, requireAdmin, async (req, res) => {
			//Update BLC
			const validationErrors = check(req.body, {
				blcriteria_type: {numericality: {onlyInteger: true, greaterThanOrEqualTo: 0, lowerThanOrEqualTo: 1010}},
				blcriteria_value: {presence: true}
			});
			if (!validationErrors) {
				try {
					await engine.editBLC(req.params.blc_id,req.body.blcriteria_type,req.body.blcriteria_value);
					emitWS('blacklistUpdated');
					res.json(OKMessage(req.body,'BLC_UPDATED',req.params.blc_id));
				} catch(err) {
					logger.error(err);
					res.statusCode = 500;
					res.json(errMessage('BLC_UPDATE_ERROR',err));
				}
			} else {
				// Errors detected
				// Sending BAD REQUEST HTTP code and error object.
				res.statusCode = 400;
				res.json(validationErrors);
			}
			
		});

	router.route('/player')
	/**
 * @api {put} /admin/player Send commands to player
 * @apiName PutPlayerCommando
 * @apiVersion 2.0.0
 * @apiGroup Player
 * @apiPermission admin
 *
 * @apiParam {String=play,pause,stopNow,stopAfter,skip,prev,toggleFullscreen,toggleAlwaysOnTop,seek,goTo,mute,unmute,setVolume,showSubs,hideSubs} command Command to send to player
 * @apiParam {String} [option] Parameter for the command being sent
 * @apiSuccess {String} code Message to display
 * @apiSuccess {String} args arguments for the message
 * @apiSuccess {String} data Data returned from API
 *
 * @apiSuccessExample Success-Response:
 * HTTP/1.1 200 OK
 * {
 *   "args": {
 *       "command": "stopNow"
 *   },
 *   "code": "COMMAND_SENT",
 *   "data": {
 *       "command": "stopNow"
 *   }
 * }
 */

		.put(getLang, requireAuth, requireValidUser, updateUserLoginTime, requireAdmin, async (req, res) => {
			const commands = [
				'play',
				'pause',
				'stopNow',
				'stopAfter',
				'skip',
				'prev',
				'toggleFullscreen',
				'toggleAlwaysOnTop',
				'seek',
				'goTo',
				'mute',
				'unmute',
				'setVolume',
				'showSubs',
				'hideSubs'
			];
			const validationErrors = check(req.body, {
				command: {inclusion: commands}				
			});
			if (!validationErrors) {
				try {
					await engine.sendCommand(req.body.command,req.body.options);
					res.json(OKMessage(req.body,'COMMAND_SENT',req.body));
				} catch(err) {
					logger.error(err);
					res.statusCode = 500;
					res.json(errMessage('COMMAND_SEND_ERROR',err));
				}
			} else {
				// Errors detected
				// Sending BAD REQUEST HTTP code and error object.
				res.statusCode = 400;
				res.json(validationErrors);
			}
		});
	router.route('/playlists/:pl_id([0-9]+)/export')
	/**
 * @api {get} /admin/playlists/:pl_id/export Export a playlist
 * @apiDescription Export format is in JSON. You'll usually want to save it to a file for later use.
 * @apiName getPlaylistExport
 * @apiVersion 2.0.0
 * @apiGroup Playlists
 * @apiPermission admin
 * @apiParam {Number} pl_id Playlist ID to export
 * @apiSuccess {String} data Playlist in an exported format. See docs for more info.
 *
 * @apiSuccessExample Success-Response:
 * HTTP/1.1 200 OK
 * {
 *   "data": {
 *       "Header": {
 *           "description": "Karaoke Mugen Playlist File",
 *           "version": 2
 *       },
 *       "PlaylistContents": [
 *           {
 *               "flag_playing": 1,
 *               "kid": "b0de301c-5756-49fb-b019-85a99a66586b"
 *           },
 *           {
 *               "kid": "6da96a7d-7159-4ea7-a5ee-1d78a6eb44dd"
 *           },
 *           {
 *               "kid": "5af7ba4c-2325-451d-a24f-e7fd7c2d3ba8"
 *           },
 *           {
 *               "kid": "e0206f48-0f51-44e3-bf9a-b651916d0c05"
 *           }
 *       ],
 *       "PlaylistInformation": {
 *           "created_at": 1508936812,
 *           "flag_visible": 0,
 *           "modified_at": 1508936821,
 *           "name": "Test",
 *           "time_left": 0
 *       }
 *   }
 * }
 * @apiError PL_EXPORT_ERROR Unable to export playlist
 *
 * @apiErrorExample Error-Response:
 * HTTP/1.1 500 Internal Server Error
 * {
 *   "args": "5",
 *   "code": "PL_EXPORT_ERROR",
 *   "message": "Playlist 5 unknown"
 * }
 */		
		.get(getLang, requireAuth, requireValidUser, updateUserLoginTime, requireAdmin, async (req, res) => {
			// Returns the playlist and its contents in an exportable format (to save on disk)
			try {
				const playlist = await engine.exportPL(req.params.pl_id);
				// Not sending JSON : we want to send a string containing our text, it's already in stringified JSON format.
				res.json(OKMessage(playlist));
			} catch(err) {
				
				res.statusCode = 500;
				res.json(errMessage('PL_EXPORT_ERROR',err.message,err.data));
			}
		});
	router.route('/playlists/import')
	/**
 * @api {post} /admin/playlists/import Import a playlist
 * @apiName postPlaylistImport
 * @apiVersion 2.0.0
 * @apiGroup Playlists
 * @apiPermission admin
 *
 * @apiSuccess {String} playlist Playlist in JSON form, following Karaoke Mugen's file format. See docs for more info.
 *
 * @apiSuccessExample Success-Response:
 * HTTP/1.1 200 OK
 * {
 *   "args": 4,
 *   "code": "PL_IMPORTED",
 *   "data": {
 *       "message": "Playlist imported",
 *       "playlist_id": 4,
 *       "unknownKaras": []
 *   }
 * }
 * @apiError PL_IMPORT_ERROR Unable to import playlist
 *
 * @apiErrorExample Error-Response:
 * HTTP/1.1 500 Internal Server Error
 * {
 *   "code": "PL_IMPORT_ERROR",
 *   "message": "No header section"
 * }
 */		
		.post(getLang, requireAuth, requireValidUser, updateUserLoginTime, requireAdmin, async (req, res) => {
			// Imports a playlist and its contents in an importable format (posted as JSON data)
			req.check({
				'playlist': {
					in: 'body',
					notEmpty: true,
					isJSON: true,
				}
			});
			const validationErrors = check(req.body, {
				playlist: {isJSON: true}				
			});
			if (!validationErrors) {			
				try {	
					const data = await engine.importPL(JSON.parse(req.body.playlist),req.authToken.username);
					const response = {
						message: 'Playlist imported',
						playlist_id: data.playlist_id
					};
					if (data.karasUnknown) response.unknownKaras = data.karasUnknown;							
					emitWS('playlistsUpdated');
					res.json(OKMessage(response,'PL_IMPORTED',data.playlist_id));
				} catch(err) {
					res.statusCode = 500;
					res.json(errMessage('PL_IMPORT_ERROR',err));
				}
			} else {
				// Errors detected
				// Sending BAD REQUEST HTTP code and error object.
				res.statusCode = 400;
				res.json(validationErrors);
			}
			
		});


	router.route('/playlists/:pl_id([0-9]+)/shuffle')
	/**
 * @api {put} /admin/playlists/:pl_id/shuffle Shuffle a playlist
 * @apiDescription Playlist is shuffled in database. The shuffling only begins after the currently playing song. Songs before that one are unaffected.
 * @apiName putPlaylistShuffle
 * @apiVersion 2.0.0
 * @apiGroup Playlists
 * @apiPermission admin
 * @apiParam {Number} pl_id Playlist ID to shuffle
 * @apiSuccess {String} args ID of playlist shuffled
 * @apiSuccess {String} code Message to display
 * @apiSuccess {Number} data ID of playlist shuffled
 * @apiSuccessExample Success-Response:
 * HTTP/1.1 200 OK
 * {
 *   "args": "5",
 *   "code": "PL_SHUFFLED",
 *   "data": "5"
 * }
 * @apiError PL_SHUFFLE_ERROR Unable to shuffle playlist
 *
 * @apiErrorExample Error-Response:
 * HTTP/1.1 500 Internal Server Error
 * {
 *   "args": "10",
 *   "code": "PL_SHUFFLE_ERROR",
 *   "message": "Playlist 10 unknown"
 * }
 */

		.put(getLang, requireAuth, requireValidUser, updateUserLoginTime, requireAdmin, async (req, res) => {
			try {
				
				await engine.shufflePL(req.params.pl_id);
				emitWS('playlistContentsUpdated',req.params.pl_id);
				res.json(OKMessage(req.params.pl_id,'PL_SHUFFLED',req.params.pl_id));							
			} catch(err) {
				
				res.statusCode = 500;
				res.json(errMessage('PL_SHUFFLE_ERROR',err.message,err.data));
			}
		});

}

export function APIControllerPublic(router) {
		
	/*
	router.use((req, res, next) => {
		// do logging
		//logger.info('API_LOG',req)
		// Logging is disabled. Enable it if you need to trace some info
		next(); // make sure we go to the next routes and don't stop here
	});			
	*/

	const conf = getConfig();	
	// Middleware for playlist and files import
	let upload = multer({ dest: resolve(conf.appPath,conf.PathTemp)});
	
	
	// Public routes


	router.route('/playlists')
	/**
 * @api {get} /public/playlists/ Get list of playlists (public)
 * @apiName GetPlaylistsPublic
 * @apiGroup Playlists
 * @apiVersion 2.1.0
 * @apiPermission public
 * @apiDescription Contrary to the `/admin/playlists/` path, this one will not return playlists which have the `flag_visible` set to `0`.
 * @apiSuccess {Object[]} playlists Playlists information
 *
 * @apiSuccessExample Success-Response:
 *     HTTP/1.1 200 OK
 * {
 *   "data": [
 *       {
 *           "created_at": 1508313440,
 *           "flag_current": 1,
 *           "flag_public": 0,
 *           "flag_visible": 1,
 * 			 "flag_favorites": 0,
 *           "length": 0,
 *           "modified_at": 1508408078,
 *           "name": "Liste de lecture courante",
 *           "num_karas": 6,
 *           "playlist_id": 1,
 *           "time_left": 0,
 * 			 "username": 'admin'
 *       }
 *   ]
 * }
 * @apiError PL_LIST_ERROR Unable to fetch a list of playlists
 * @apiError WEBAPPMODE_CLOSED_API_MESSAGE API is disabled at the moment.
 *
 * @apiErrorExample Error-Response:
 * HTTP/1.1 500 Internal Server Error
 * @apiErrorExample Error-Response:
 * HTTP/1.1 403 Forbidden
 */
		.get(getLang, requireAuth, requireWebappLimited, requireValidUser, updateUserLoginTime, async (req, res) => {			
			// Get list of playlists, only return the visible ones
			try {
				const playlists = await engine.getAllPLs(req.authToken);
				res.json(OKMessage(playlists));
			} catch(err) {
				res.statusCode = 500;
				res.json(errMessage('PL_LIST_ERROR',err));	
			}
		});
	router.route('/playlists/:pl_id([0-9]+)')
	/**
 * @api {get} /public/playlists/:pl_id Get playlist information (public)
 * @apiName GetPlaylistPublic
 * @apiGroup Playlists
 * @apiPermission public
 * @apiVersion 2.1.0
 * @apiDescription Contrary to the `/admin/playlists/` path, this one will not return playlists which have the `flag_visible` set to `0`.
 * @apiParam {Number} pl_id Target playlist ID.
 * @apiSuccess {Number} data/created_at Playlist creation date in UNIX timestamp
 * @apiSuccess {Number} data/flag_current Is playlist the current one? Mutually exclusive with `flag_public`
 * @apiSuccess {Number} data/flag_favorites Is playlist a favorites playlist? if displayed by a regular user, he'll only get to see his own favorites playlist.
 * @apiSuccess {Number} data/flag_public Is playlist the public one? Mutually exclusive with `flag_current`
 * @apiSuccess {Number} data/flag_visible Is playlist visible to normal users?
 * @apiSuccess {Number} data/length Duration of playlist in seconds
 * @apiSuccess {Number} data/modified_at Playlist last edit date in UNIX timestamp
 * @apiSuccess {String} data/name Name of playlist
 * @apiSuccess {Number} data/num_karas Number of karaoke songs in the playlist
 * @apiSuccess {Number} data/playlist_id Database's playlist ID
 * @apiSuccess {Number} data/time_left Time left in seconds before playlist ends, relative to the currently playing song's position.
 * @apiSuccess {Number} data/username User who created the playlist
 *
 * @apiSuccessExample Success-Response:
 * HTTP/1.1 200 OK
 * {
 *   "data": {
 *       "created_at": 1508313440,
 *       "flag_current": 1,
 * 		 "flag_favorites": 0,
 *       "flag_public": 0,
 *       "flag_visible": 1,
 *       "length": 0,
 *       "modified_at": 1508408078,
 *       "name": "Liste de lecture courante",
 *       "num_karas": 6,
 *       "playlist_id": 1,
 *       "time_left": 0,
 * 		 "username": admin
 *   }
 *}
 * @apiError PL_VIEW_ERROR Unable to fetch info from a playlist
 * @apiError WEBAPPMODE_CLOSED_API_MESSAGE API is disabled at the moment.
 * @apiErrorExample Error-Response:
 * HTTP/1.1 500 Internal Server Error
 * @apiErrorExample Error-Response:
 * HTTP/1.1 403 Forbidden
 */
		.get(getLang, requireAuth, requireWebappLimited, requireValidUser, updateUserLoginTime, async (req, res) => {
			// Get playlist, only if visible
			//Access :pl_id by req.params.pl_id
			// This get route gets infos from a playlist
			try {
				const playlist = await engine.getPLInfo(req.params.pl_id,req.authToken);
				res.json(OKMessage(playlist));
			} catch(err) {
				
				res.statusCode = 500;
				res.json(errMessage('PL_VIEW_ERROR',err.message,err.data));
			}
		});
	router.route('/playlists/:pl_id([0-9]+)/karas')
	/**
 * @api {get} /public/playlists/:pl_id/karas Get list of karaokes in a playlist (public)
 * @apiName GetPlaylistKarasPublic
 * @apiVersion 2.2.0
 * @apiGroup Playlists
 * @apiPermission public
 * @apiDescription Contrary to the `/admin/playlists/` path, this one will not return playlists which have the `flag_visible` set to `0`.
 * @apiParam {Number} pl_id Target playlist ID.
 * @apiParam {String} [filter] Filter list by this string.
 * @apiParam {Number} [from=0] Return only the results starting from this position. Useful for continuous scrolling. 0 if unspecified
 * @apiParam {Number} [size=999999] Return only x number of results. Useful for continuous scrolling. 999999 if unspecified.
 *
 * @apiSuccess {Object[]} data/content/karas Array of `kara` objects
 * @apiSuccess {Number} data/infos/count Number of karaokes in playlist
 * @apiSuccess {Number} data/infos/from Starting position of listing
 * @apiSuccess {Number} data/infos/to End position of listing
 *
 * @apiSuccessExample Success-Response:
 * HTTP/1.1 200 OK
 * {
 *   "data": {
 *       "content": [
 *           {
 *               "NORM_author": null,
 *               "NORM_creator": null,
 *               "NORM_pseudo_add": "Administrateur",
 *               "NORM_serie": "Dynasty Warriors 3",
 *               "NORM_serie_altname": "DW3/DW 3",
 *               "NORM_singer": null,
 *               "NORM_songwriter": null,
 *               "NORM_title": "Circuit",
 *               "author": null,
 *               "created_at": 1508423806,
 *               "creator": null,
 *               "duration": 0,
 *               "flag_blacklisted": 0,
 *               "flag_playing": 1,
 *               "flag_whitelisted": 0,
 * 	             "flag_dejavu": 0,
 *               "gain": 0,
 *               "kara_id": 176,
 *               "kid": "b0de301c-5756-49fb-b019-85a99a66586b",
 *               "language": "chi",
 *               "language_i18n": "Chinois",
 * 				 "lastplayed_at": null,
 *               "mediafile": "CHI - Dynasty Warriors 3 - GAME ED - Circuit.avi"
 *               "misc": "TAG_VIDEOGAME",
 *               "misc_i18n": "Jeu vidéo",
 *               "playlistcontent_id": 4946,
 *               "pos": 1,
 *               "pseudo_add": "Administrateur",
 * 				 "requested": 20,
 *               "serie": "Dynasty Warriors 3",
 * 				 "serie_i18n": {
 *					"fre":"Guerriers de la Dynastie"
 * 				}
 *               "serie_altname": "DW3/DW 3",
 *               "singer": null,
 *               "songorder": 0,
 *               "songtype": "TYPE_ED",
 *               "songtype_i18n": "Ending",
 *               "songtype_i18n_short": "ED",
 *               "songwriter": null,
 *               "title": "Circuit",
 * 				 "username": "admin",
 *               "viewcount": 0,
 *               "year": ""
 *           },
 *           ...
 *       ],
 *       "infos": {
 *           "count": 3,
 * 			 "from": 0,
 * 			 "to": 120
 *       }
 *   }
 * }
 * @apiError PL_VIEW_SONGS_ERROR Unable to fetch list of karaokes in a playlist
 * @apiError WEBAPPMODE_CLOSED_API_MESSAGE API is disabled at the moment.
 * @apiErrorExample Error-Response:
 * HTTP/1.1 500 Internal Server Error
 * @apiErrorExample Error-Response:
 * HTTP/1.1 403 Forbidden
 */
		.get(getLang, requireAuth, requireWebappLimited, requireValidUser, updateUserLoginTime, async (req, res) => {
			// Get playlist contents, only if visible
			//Access :pl_id by req.params.pl_id
			let size = req.query.size || 999999;
			size = parseInt(size, 10);
			let from = req.query.from || 0;
			from = parseInt(from, 10);
			try {
				const playlist = await engine.getPLContents(req.params.pl_id,req.query.filter,req.lang,req.authToken,from,size);
				if (playlist == null) res.statusCode = 404;
				res.json(OKMessage(playlist));
			} catch(err) {
				
				res.statusCode = 500;
				res.json(errMessage('PL_VIEW_SONGS_ERROR',err.message,err.data));
			}
		});

	router.route('/playlists/:pl_id([0-9]+)/karas/:plc_id([0-9]+)')
	/**
 * @api {get} /public/playlists/:pl_id/karas/:plc_id Get song info from a playlist (public)
 * @apiName GetPlaylistPLCPublic
 * @apiVersion 2.2.0
 * @apiGroup Playlists
 * @apiPermission public
 * @apiDescription Contrary to the `admin/playlists` path, this one won't return any karaoke info from a playlist the user has no access to.
 * @apiParam {Number} pl_id Target playlist ID. **Note :** Irrelevant since PLCIDs are unique in the table.
 * @apiParam {Number} plc_id Playlist content ID.
 * @apiSuccess {String} data/NORM_author Normalized karaoke's author name
 * @apiSuccess {String} data/NORM_creator Normalized creator's name
 * @apiSuccess {String} data/NORM_pseudo_add Normalized name of person who added the karaoke to the playlist
 * @apiSuccess {String} data/NORM_serie Normalized name of series the karaoke is from
 * @apiSuccess {String} data/NORM_serie_altname Normalized names of alternative names to the series the karaoke is from. When there are more than one alternative name, they're separated by forward slashes (`/`)
 * @apiSuccess {String} data/NORM_singer Normalized name of singer.
 * @apiSuccess {String} data/NORM_songwriter Normalized name of songwriter.
 * @apiSuccess {String} data/NORM_title Normalized song title
 * @apiSuccess {String} data/author Karaoke author's name
 * @apiSuccess {Number} data/created_at UNIX timestamp of the karaoke's creation date in the base
 * @apiSuccess {String} data/creator Show's creator name
 * @apiSuccess {Number} data/duration Song duration in seconds
 * @apiSuccess {Number} data/flag_blacklisted Is the song in the blacklist ?
 * @apiSuccess {Number} data/flag_favorites 1 = the song is in your favorites, 0 = not.
 * @apiSuccess {Number} data/flag_playing Is the song the one currently playing ?
 * @apiSuccess {Number} data/flag_whitelisted Is the song in the whitelist ?
 * @apiSuccess {Number} data/flag_dejavu Has the song been played in the last hour ? (by default, `EngineMaxDejaVuTime` is at 60 minutes)
 * @apiSuccess {Number} data/gain Calculated audio gain for the karaoke's video, in decibels (can be negative)
 * @apiSuccess {Number} data/kara_id Karaoke's ID in the main database
 * @apiSuccess {String} data/kid Karaoke's unique ID (survives accross database generations)
 * @apiSuccess {String} data/language Song's language in ISO639-2B format, separated by commas when a song has several languages
 * @apiSuccess {String} data/language_i18n Song's language translated in the client's native language
 * @apiSuccess {Number} data/lastplayed_at Time when the song was last played at in UNIX timestamp. `null` if never played before.
 * @apiSuccess {String} data/mediafile Video's filename
 * @apiSuccess {String} data/misc Internal tag list (`TAG_VIDEOGAME`, etc.)
 * @apiSuccess {String} data/misc_i18n Translated tag list
 * @apiSuccess {Number} data/playlist_id ID of playlist this song belongs to
 * @apiSuccess {Number} data/playlistcontent_ID PLC ID of this song.
 * @apiSuccess {Number} data/pos Position in the playlist. First song has a position of `1`
 * @apiSuccess {String} data/pseudo_add Nickname of user who added this song
 * @apiSuccess {String} data/requested Number of times the song has been requested.
 * @apiSuccess {String} data/serie Name of series/show the song belongs to
 * @apiSuccess {Object} data/serie_i18n JSON object with series' names depending on their language.
 * @apiSuccess {String} data/serie_altname Alternative name(s) of series/show this song belongs to. Names are separated by forward slashes (`/`)
 * @apiSuccess {String} data/singer Singer's name, if known.
 * @apiSuccess {Number} data/songorder Song's order, relative to it's type. Opening 1, Opening 2, Ending 1, Ending 2, etc.
 * @apiSuccess {String} data/songtype Song's type internal tag (`TYPE_OP`, `TYPE_ED`, `TYPE_IN` ...)
 * @apiSuccess {String} data/songtype_i18n Translated song's type (`Opening`, `Ending`, `Insert Song`...)
 * @apiSuccess {String} data/songtype_i18n_short Short translated version of the song's type (`OP`, `ED`, `IN`, ...)
 * @apiSuccess {Number} data/time_before_play Estimated time remaining before the song is going to play (in seconds). `0` if the song is currently playing or if there is no song selected as currently playing in the playlist (thus making this estimate impossible)
 * @apiSuccess {String} data/title Song's title
 * @apiSuccess {String} data/username Username who added that song
 * @apiSuccess {Number} data/viewcount Counts how many times the song has been played
 * @apiSuccess {String} data/year Song's creation year. Empty string is returned if no year is known.
 * @apiSuccessExample Success-Response:
 * HTTP/1.1 200 OK
 * {
 *   "data": [
 *       {
 *           "NORM_author": null,
 *           "NORM_creator": null,
 *           "NORM_pseudo_add": "Axel",
 *           "NORM_serie": "C3 ~ Cube X Cursed X Curious",
 *           "NORM_serie_altname": "C-Cube/CxCxC",
 *           "NORM_singer": null,
 *           "NORM_songwriter": null,
 *           "NORM_title": "Hana",
 *           "author": null,
 *           "created_at": 1508427958,
 *           "creator": null,
 *           "duration": 0,
 *           "flag_blacklisted": 0,
 *           "flag_playing": 0,
 * 			 "flag_favorites": 0,
 *           "flag_whitelisted": 0,
 * 	         "flag_dejavu": 0,
 *           "gain": 0,
 *           "kara_id": 1007,
 *           "kid": "c05e24eb-206b-4ff5-88d4-74e8d5ad6f75",
 *           "language": "jpn",
 *           "language_i18n": "Japonais",
 * 			 "lastplayed_at": null,
 *           "mediafile": "JAP - C3 ~ Cube X Cursed X Curious - ED1 - Hana.avi",
 *           "misc": null,
 *           "misc_i18n": null,
 *           "playlist_id": 2,
 *           "playlistcontent_id": 4961,
 *           "pos": 12,
 *           "pseudo_add": "Axel",
 * 			 "requested": 20,
 *           "serie": "C3 ~ Cube X Cursed X Curious",
 *           "serie_altname": "C-Cube/CxCxC",
 * 			 "serie_i18n": {
 * 				"fre":"Guerriers de la Dynastie"
 *  			}
 *           "singer": null,
 *           "songorder": 1,
 *           "songtype": "TYPE_ED",
 *           "songtype_i18n": "Ending",
 *           "songtype_i18n_short": "ED",
 *           "songwriter": null,
 *           "time_before_play": 0,
 *           "title": "Hana",
 * 			 "username": "axelterizaki",
 *           "viewcount": 0,
 *           "year": ""
 *       }
 *   ]
 * }
 * @apiError PL_VIEW_CONTENT_ERROR Unable to fetch playlist's content information 
 * @apiError WEBAPPMODE_CLOSED_API_MESSAGE API is disabled at the moment.
 * 
 * @apiErrorExample Error-Response:
 * HTTP/1.1 500 Internal Server Error
 * {
 *   "code": "PL_VIEW_CONTENT_ERROR",
 *   "message": "PLCID unknown!"
 * }
 * @apiErrorExample Error-Response:
 * HTTP/1.1 403 Forbidden
 */

		.get(getLang, requireAuth, requireWebappLimited, requireValidUser, updateUserLoginTime, async (req, res) => {
			try {

				const kara = await engine.getPLCInfo(req.params.plc_id,req.lang,req.authToken);
				res.json(OKMessage(kara));
			} catch(err) {
				
				res.statusCode = 500;
				res.json(errMessage('PL_VIEW_CONTENT_ERROR',err.message,err.data));
			}
		});
	router.route('/settings')
	/**
 * @api {get} /public/settings Get settings (public)
 * @apiName GetSettingsPublic
 * @apiVersion 2.2.0
 * @apiGroup Main
 * @apiPermission public
 * @apiDescription Contrary to `admin/settings` path, this one doesn't return things like paths, binaries and other internal settings.
 * @apiSuccess {Object} data Contains all configuration settings. See example or documentation for what each setting does.
 *
 * @apiSuccessExample Success-Response:
 * HTTP/1.1 200 OK
 * {
 *   "data": {
 *       "EngineAllowNicknameChange": "1",
 *       "EngineAllowViewBlacklist": "1",
 *       "EngineAllowViewBlacklistCriterias": "1",
 *       "EngineAllowViewWhitelist": "1",
 *       "EngineAutoPlay": "0",
 *       "EngineDefaultLocale": "fr",
 *       "EngineDisplayConnectionInfo": "1",
 *       "EngineDisplayConnectionInfoHost": "",
 *       "EngineDisplayConnectionInfoMessage": "",
 *       "EngineDisplayConnectionInfoQRCode": "1",
 *       "EngineDisplayNickname": "1",
 *       "EngineFreeAutoTime": "60",
 * 		 "EngineFreeUpvotes": "1",
 * 		 "EngineFreeUpvotesPercent": "33",
 * 		 "EngineFreeUpvotesMin": "4",
 *       "EngineJinglesInterval": "1",
 *       "EnginePrivateMode": "1",
 * 		 "EngineRemovePublicOnPlay": "1",
 *       "EngineQuotaType": "1",
 *       "EngineRepeatPlaylist": "0",
 *       "EngineSmartInsert": "1",
 * 		 "EngineSongPoll": "0",
 * 		 "EngineSongPollChoices": "4",
 * 		 "EngineSongPollTimeout": "30",
 *       "EngineSongsPerUser": "10000",
 *       "EngineTimePerUser": "10000",
 *       "PlayerBackground": "",
 *       "PlayerFullscreen": "0",
 *       "PlayerNoBar": "1",
 *       "PlayerNoHud": "1",
 *       "PlayerPIP": "1",
 *       "PlayerPIPPositionX": "Left",
 *       "PlayerPIPPositionY": "Bottom",
 *       "PlayerPIPSize": "30",
 *       "PlayerScreen": "0",
 *       "PlayerStayOnTop": "1",
 *       "VersionName": "Finé Fiévreuse",
 *       "VersionNo": "v2.0 Release Candidate 1",
 *       "mpvVideoOutput": "direct3d",
 * 		 "WebappMode": "2",
 *       "WebappSongLanguageMode": "1"
 *   }
 * }
 */
		.get(async (req, res) => {
			//We don't want to return all settings.
			let settings = {};
			const conf = getConfig();
			for (var key in conf) {
				if (conf.hasOwnProperty(key)) {
					if (!key.startsWith('Path') &&
						!key.startsWith('Bin') &&
						!key.startsWith('appPath') &&
						!key.startsWith('Jwt') &&
						!key.startsWith('is') &&
						!key.startsWith('mpv') &&
						!key.startsWith('os')
					) {
						settings[key] = conf[key];
					}
				}
			}
			res.json(OKMessage(settings));
		});				
	router.route('/stats')
	/**
 * @api {get} /public/stats Get statistics
 * @apiName GetStats
 * @apiVersion 2.0.0
 * @apiGroup Main
 * @apiPermission public
 * @apiDescription Returns various stats on the current Karaoke Mugen instance
 * @apiSuccess {Number} totalartists Total number of artists in database
 * @apiSuccess {Number} totalcount Total number of karaokes in database
 * @apiSuccess {Number} totalduration Sum of all karaoke durations in seconds.
 * @apiSuccess {Number} totallanguages Total number of different languages in database
 * @apiSuccess {Number} totalplaylists Total number of playlists in database
 * @apiSuccess {Number} totalseries Total number of series in database
 *
 * @apiSuccessExample Success-Response:
 * HTTP/1.1 200 OK
 * {
 *    "data": {
 *        "totalartists": 542,
 *        "totalcount": 4924,
 *        "totalduration": 0,
 *        "totallanguages": 16,
 *        "totalplaylists": 5,
 *        "totalseries": 2525
 *    }
 * }
 */
		.get(getLang, requireAuth, requireValidUser, updateUserLoginTime, async (req, res) => {
			try {
				const stats = await engine.getKMStats();
				const userData = await user.findUserByName(req.authToken.username);
				updateSongsLeft(userData.id);
				res.json(OKMessage(stats));
			} catch(err) {
				logger.error(err);
				res.statusCode = 500;
				res.json(errMessage('STATS_ERROR',err));
			}
		});

	router.route('/whitelist')
	/**
 * @api {get} /public/whitelist Get whitelist (public)
 * @apiName GetWhitelistPublic
 * @apiVersion 2.2.0
 * @apiGroup Whitelist
 * @apiPermission public
 * @apiDescription If `EngineAllowViewWhitelist` is set to `0` in configuration, then returns an error message (see below)
 * @apiParam {String} [filter] Filter list by this string.
 * @apiParam {Number} [from=0] Return only the results starting from this position. Useful for continuous scrolling. 0 if unspecified
 * @apiParam {Number} [size=999999] Return only x number of results. Useful for continuous scrolling. 999999 if unspecified.* @apiSuccess {String} code Message to display
 * @apiSuccess {Object[]} data/content List of karaoke objects
 * @apiSuccess {Number} data/infos/count Number of items in whitelist no matter which range was requested
 * @apiSuccess {Number} data/infos/from Items listed are from this position
 * @apiSuccess {Number} data/infos/to Items listed end at this position
 *
 * @apiSuccessExample Success-Response:
 * HTTP/1.1 200 OK
 * {
 *   "data": {
 *       "content": [
 *           {
 *               "NORM_author": null,
 *               "NORM_creator": "Eurovision",
 *               "NORM_serie": null,
 *               "NORM_serie_altname": null,
 *               "NORM_singer": "Dschinghis Khan",
 *               "NORM_songwriter": "Ralph Siegel",
 *               "NORM_title": "Moskau",
 *               "author": null,
 *               "created_at": 1508921852,
 *               "creator": "Eurovision",
 *               "duration": 0,
 *               "kara_id": 1,
 *               "kid": "d9bb6a76-2b7d-469e-ba44-6acfc463202e",
 *               "language": "ger",
 *               "language_i18n": "Allemand",
 *               "mediafile": "ALL - Dschinghis Khan - MV - Moskau.avi",
 *               "misc": "TAG_CONCERT,TAG_REAL",
 *               "misc_i18n": "Concert,Non-anime",
 * 				 "requested": 20,
 *               "serie": null,
 *               "serie_altname": null,
 *               "singer": "Dschinghis Khan",
 *               "songorder": 0,
 *               "songtype": "TYPE_MUSIC",
 *               "songtype_i18n": "Music Video",
 *               "songtype_i18n_short": "MV",
 *               "songwriter": "Ralph Siegel",
 *               "title": "Moskau",
 *               "viewcount": 0,
 *               "whitelist_id": 1,
 *               "year": "1980"
 *           }
 *       ],
 *       "infos": {
 *           "count": 1,
 *           "from": 0,
 *           "to": 999999
 *       }
 *   }
 * }
 * @apiError WL_VIEW_ERROR Whitelist could not be viewed
 * @apiError WL_VIEW_FORBIDDEN Whitelist view is not allowed for users
 * @apiError WEBAPPMODE_CLOSED_API_MESSAGE API is disabled at the moment.
 * @apiErrorExample Error-Response:
 * HTTP/1.1 500 Internal Server Error
 * {
 *   "code": "WL_VIEW_FORBIDDEN"
 * }
 * @apiErrorExample Error-Response:
 * HTTP/1.1 403 Forbidden
 */
		.get(getLang, requireAuth, requireWebappLimited, requireValidUser, updateUserLoginTime, async (req, res) => {
			//Returns whitelist IF the settings allow public to see it
			if (getConfig().EngineAllowViewWhitelist === 1) {
				let size = req.query.size || 999999;
				size = parseInt(size, 10);
				let from = req.query.from || 0;
				from = parseInt(from, 10);
				try {
					const karas = await	engine.getWL(req.query.filter,req.lang,from,size);
					res.json(OKMessage(karas));
				} catch(err) {
					logger.error(err);
					res.statusCode = 500;
					res.json(errMessage('WL_VIEW_ERROR',err));
				}
			} else {
				res.StatusCode = 403;
				res.json(errMessage('WL_VIEW_FORBIDDEN'));
			}			
		});

	router.route('/blacklist')
	/**
 * @api {get} /public/blacklist Get blacklist (public)
 * @apiName GetBlacklistPublic
 * @apiVersion 2.2.0
 * @apiGroup Blacklist
 * @apiPermission public
 * @apiDescription If `EngineAllowViewBlacklist` is set to `0` in configuration, then returns an error message (see below)
 * @apiParam {String} [filter] Filter list by this string.
 * @apiParam {Number} [from=0] Return only the results starting from this position. Useful for continuous scrolling. 0 if unspecified
 * @apiParam {Number} [size=999999] Return only x number of results. Useful for continuous scrolling. 999999 if unspecified.* @apiSuccess {String} code Message to display
 * @apiSuccess {Object[]} data/content List of karaoke objects
 * @apiSuccess {Number} data/infos/count Number of items in whitelist no matter which range was requested
 * @apiSuccess {Number} data/infos/from Items listed are from this position
 * @apiSuccess {Number} data/infos/size How many items listed.
 *
 * @apiSuccessExample Success-Response:
 * HTTP/1.1 200 OK
 * {
 *   "data": {
 *       "content": [
 *           {
 *               "NORM_author": null,
 *               "NORM_creator": "Eurovision",
 *               "NORM_serie": null,
 *               "NORM_serie_altname": null,
 *               "NORM_singer": "Dschinghis Khan",
 *               "NORM_songwriter": "Ralph Siegel",
 *               "NORM_title": "Moskau",
 *               "author": null,
 *               "created_at": 1508921852,
 *               "creator": "Eurovision",
 *               "duration": 0,
 *               "kara_id": 1,
 *               "kid": "d9bb6a76-2b7d-469e-ba44-6acfc463202e",
 *               "language": "ger",
 *               "language_i18n": "Allemand",
 *               "mediafile": "ALL - Dschinghis Khan - MV - Moskau.avi",
 *               "misc": "TAG_CONCERT,TAG_REAL",
 *               "misc_i18n": "Concert,Non-anime",
 * 				 "requested": 20,
 *               "serie": null,
 *               "serie_altname": null,
 *               "singer": "Dschinghis Khan",
 *               "songorder": 0,
 *               "songtype": "TYPE_MUSIC",
 *               "songtype_i18n": "Music Video",
 *               "songtype_i18n_short": "MV",
 *               "songwriter": "Ralph Siegel",
 *               "title": "Moskau",
 *               "viewcount": 0,
 *               "whitelist_id": 1,
 *               "year": "1980"
 *           }
 *       ],
 *       "infos": {
 *           "count": 1,
 *           "from": 0,
 *           "to": 999999
 *       }
 *   }
 * }
 * @apiError BL_VIEW_ERROR Blacklist could not be viewed
 * @apiError BL_VIEW_FORBIDDEN Blacklist view is not allowed for users
 * @apiError WEBAPPMODE_CLOSED_API_MESSAGE API is disabled at the moment.
 * @apiErrorExample Error-Response:
 * HTTP/1.1 500 Internal Server Error
 * {
 *   "code": "BL_VIEW_FORBIDDEN"
 * }
 * @apiErrorExample Error-Response:
 * HTTP/1.1 403 Forbidden
 */
		.get(getLang, requireAuth, requireWebappLimited, requireValidUser, updateUserLoginTime, async (req, res) => {
			//Get list of blacklisted karas IF the settings allow public to see it
			if (getConfig().EngineAllowViewBlacklist === 1) {
				let size = req.query.size || 999999;
				size = parseInt(size, 10);
				let from = req.query.from || 0;
				from = parseInt(from, 10);
				try {
					const karas = await engine.getBL(req.query.filter,req.lang,from,size);
					res.json(OKMessage(karas));
				} catch(err) {
					logger.error(err);
					res.statusCode = 500;
					res.json(errMessage('BL_VIEW_ERROR',err));
				}
			} else {
				res.StatusCode = 403;
				res.json(errMessage('BL_VIEW_FORBIDDEN'));
			}
		});

	router.route('/blacklist/criterias')
	/**
 * @api {get} /public/blacklist/criterias Get list of blacklist criterias (public)
 * @apiName GetBlacklistCriteriasPublic
 * @apiVersion 2.1.0
 * @apiGroup Blacklist
 * @apiPermission public
 *
 * @apiSuccess {Number} data/blcriteria_id Blacklist criteria's ID.
 * @apiSuccess {Number} data/type Blacklist criteria's type. Refer to dev documentation for more info on BLC types.
 * @apiSuccess {Number} data/value Value associated to balcklist criteria (what is being blacklisted)
 * @apiSuccess {String} data/value_i18n Translated value to display on screen.
 *
 * @apiSuccessExample Success-Response:
 * HTTP/1.1 200 OK
 * {
 *   "data": [
 *       {
 *           "blcriteria_id": 2,
 *           "type": 6,
 *           "value": "241",
 *           "value_i18n": "Jean-Jacques Debout"
 *       }
 *   ]
 * }
 * @apiError BLC_VIEW_ERROR Blacklist criterias could not be listed
 * @apiError BLC_VIEW_FORBIDDEN Blacklist criterias are not viewable by users.
 * @apiError WEBAPPMODE_CLOSED_API_MESSAGE API is disabled at the moment.
 * @apiErrorExample Error-Response:
 * HTTP/1.1 500 Internal Server Error
 * {
 *   "code": "BLC_VIEW_FORBIDDEN"
 * }
 * @apiErrorExample Error-Response:
 * HTTP/1.1 403 Forbidden
 */		
		.get(getLang, requireAuth, requireWebappLimited, requireValidUser, updateUserLoginTime, async (req, res) => {
			//Get list of blacklist criterias IF the settings allow public to see it
			if (getConfig().EngineAllowViewBlacklistCriterias === 1) {
				try {
					const blc = await engine.getBLC();
					res.json(OKMessage(blc));
				} catch(err) {
					logger.error(err);
					res.statusCode = 500;
					res.json(errMessage('BLC_VIEW_ERROR',err));
				}
			} else {
				res.StatusCode = 403;
				res.json(errMessage('BLC_VIEW_FORBIDDEN'));
			}
		});

	router.route('/player')
	/**
 * @api {get} /public/player Get player status
 * @apiName GetPlayer
 * @apiVersion 2.1.0
 * @apiGroup Player
 * @apiPermission public
 * @apiDescription Player info is updated very frequently. You can poll it to get precise information from player and engine altogether.
 * @apiSuccess {Number} data/currentlyPlaying Karaoke ID of song being played
 * @apiSuccess {Number} data/duration Current's song duration in seconds
 * @apiSuccess {Boolean} data/fullscreen Player's fullscreen status
 * @apiSuccess {Boolean} data/muteStatus Player's volume mute status
 * @apiSuccess {Boolean} data/onTop Player's Always-on-top status
 * @apiSuccess {String=pause,stop,play} data/playerStatus Player's status (not to mistake with engine's status, see below). Player status is `pause` if displaying a background.
 * @apiSuccess {Boolean} data/private Engine's public/private status
 * @apiSuccess {Boolean} data/showSubs Player's showing subtitles or not
 * @apiSuccess {String=pause,play,stop} data/status Engine's status
 * @apiSuccess {Boolean} data/onTop Player's Always-on-top status
 * @apiSuccess {String} data/subText Text/lyrics being displayed on screen
 * @apiSuccess {Number} data/timePosition Player's current position in the song.
 * @apiSuccess {Number} data/volume Volume (from `0` to `100`)
 * Example Success-Response:
 * HTTP/1.1 200 OK
 * {
 *   "data": {
 *       "currentlyPlaying": 1020,
 *       "duration": 0,
 *       "fullscreen": false,
 *       "muteStatus": false,
 *       "onTop": true,
 *       "playerStatus": "pause",
 *       "private": true,
 *       "showSubs": true,
 *       "status": "stop",
 *       "subText": null,
 *       "timePosition": 0,
 *       "volume": 100
 *   }
 * }
 * @apiError WEBAPPMODE_CLOSED_API_MESSAGE API is disabled at the moment.
 * @apiErrorExample Error-Response:
 * HTTP/1.1 500 Internal Server Error
 * {
 *   "code": "PLAYER_STATUS_ERROR"
 * }
 * @apiErrorExample Error-Response:
 * HTTP/1.1 403 Forbidden
 */		
		.get(getLang, requireAuth, requireWebappLimited, requireValidUser, updateUserLoginTime, async (req, res) => {
			// Get player status
			// What's playing, time in seconds, duration of song

			//return status of the player
			res.json(OKMessage(engine.getPlayerStatus()));			
		});
	router.route('/karas')
	/**
 * @api {get} /public/karas Get complete list of karaokes
 * @apiName GetKaras
 * @apiVersion 2.2.0
 * @apiGroup Karaokes
 * @apiPermission public
 *
 * @apiParam {String} [filter] Filter list by this string.
 * @apiParam {Number} [from=0] Return only the results starting from this position. Useful for continuous scrolling. 0 if unspecified
 * @apiParam {Number} [size=999999] Return only x number of results. Useful for continuous scrolling. 999999 if unspecified.
 *
 * @apiSuccess {Object[]} data/content/karas Array of `kara` objects
 * @apiSuccess {Number} data/infos/count Number of karaokes in playlist
 * @apiSuccess {Number} data/infos/from Starting position of listing
 * @apiSuccess {Number} data/infos/to End position of listing
 *
 * @apiSuccessExample Success-Response:
 * HTTP/1.1 200 OK
 * {
 *   "data": {
 *       "content": [
 *           {
 *               "NORM_author": null,
 *               "NORM_creator": null,
 *               "NORM_serie": "Dynasty Warriors 3",
 *               "NORM_serie_altname": "DW3/DW 3",
 *               "NORM_singer": null,
 *               "NORM_songwriter": null,
 *               "NORM_title": "Circuit",
 *               "author": null,
 *               "created_at": 1508423806,
 *               "creator": null,
 *               "duration": 0,
 * 	             "flag_dejavu": 0,
 * 				 "flag_favorites": 1,
 *               "gain": 0,
 *               "kara_id": 176,
 *               "kid": "b0de301c-5756-49fb-b019-85a99a66586b",
 *               "language": "chi",
 *               "language_i18n": "Chinois",
 * 				 "lastplayed_at": null,
 *               "mediafile": "CHI - Dynasty Warriors 3 - GAME ED - Circuit.avi"
 *               "misc": "TAG_VIDEOGAME",
 *               "misc_i18n": "Jeu vidéo",
 * 				 "requested": 20
 *               "serie": "Dynasty Warriors 3",
 * 				 "serie_i18n": {
 * 								"fre":"Guerriers de la Dynastie"
 * 								}
 *               "serie_altname": "DW3/DW 3",
 *               "singer": null,
 *               "songorder": 0,
 *               "songtype": "TYPE_ED",
 *               "songtype_i18n": "Ending",
 *               "songtype_i18n_short": "ED",
 *               "songwriter": null,
 *               "title": "Circuit",
 *               "viewcount": 0,
 *               "year": ""
 *           },
 *           ...
 *       ],
 *       "infos": {
 *           "count": 3,
 * 			 "from": 0,
 * 			 "to": 120
 *       }
 *   }
 * }
 * @apiError SONG_LIST_ERROR Unable to fetch list of karaokes
 * @apiError WEBAPPMODE_CLOSED_API_MESSAGE API is disabled at the moment.
 * @apiErrorExample Error-Response:
 * HTTP/1.1 500 Internal Server Error
 * @apiErrorExample Error-Response:
 * HTTP/1.1 403 Forbidden
 */
		.get(getLang, requireAuth, requireWebappOpen, requireValidUser, updateUserLoginTime, async (req, res) => {
			// if the query has a &filter=xxx
			// then the playlist returned gets filtered with the text.
			let size = req.query.size || 999999;
			size = parseInt(size, 10);
			let from = req.query.from || 0;
			from = parseInt(from, 10);
			if (from < 0) from = 0;
			try {
				const karas = await engine.getKaras(req.query.filter,req.lang,from,size,req.authToken);
				res.json(OKMessage(karas));
			} catch(err) {
				logger.error(err);
				res.statusCode = 500;
				res.json(errMessage('SONG_LIST_ERROR',err));
			}
		});

	router.route('/karas/random')
	/**
 * @api {get} /public/karas/random Get a random karaoke ID
 * @apiName GetKarasRandom
 * @apiVersion 2.1.0
 * @apiGroup Karaokes
 * @apiPermission public
 * @apiDescription This selects a random karaoke from the database. What you will do with it depends entirely on you.
 * @apiSuccess {Number} data Random Karaoke ID
 * @apiSuccessExample Success-Response:
 * HTTP/1.1 200 OK
 * {
 *   "data": 4550
 * }
 * @apiError GET_UNLUCKY Unable to find a random karaoke
 * @apiError WEBAPPMODE_CLOSED_API_MESSAGE API is disabled at the moment.
 * @apiErrorExample Error-Response:
 * HTTP/1.1 500 Internal Server Error
 * @apiErrorExample Error-Response:
 * HTTP/1.1 403 Forbidden
 */

		.get(getLang, requireAuth, requireWebappOpen, requireValidUser, updateUserLoginTime, async (req, res) => {
			try {
				const kara_id = await engine.getRandomKara(req.query.filter, req.authToken);
				if (!kara_id) {
					res.statusCode = 500;
					res.json(errMessage('GET_UNLUCKY'));
				} else {					
					res.json(OKMessage(kara_id));
				}
				
			} catch(err) {
				logger.error(err);
				res.statusCode = 500;
				res.json(errMessage('GET_LUCKY_ERROR',err));
			}
		});
	router.route('/karas/:kara_id([0-9]+)')
	/**
 * @api {get} /public/karas/:kara_id Get song info from database
 * @apiName GetKaraInfo
 * @apiVersion 2.2.0
 * @apiGroup Karaokes
 * @apiPermission public
 *
 * @apiParam {Number} kara_id Karaoke ID you want to fetch information from
 * @apiSuccess {String} data/NORM_author Normalized karaoke's author name
 * @apiSuccess {String} data/NORM_creator Normalized creator's name
 * @apiSuccess {String} data/NORM_serie Normalized name of series the karaoke is from
 * @apiSuccess {String} data/NORM_serie_altname Normalized names of alternative names to the series the karaoke is from. When there are more than one alternative name, they're separated by forward slashes (`/`)
 * @apiSuccess {String} data/NORM_singer Normalized name of singer.
 * @apiSuccess {String} data/NORM_songwriter Normalized name of songwriter.
 * @apiSuccess {String} data/NORM_title Normalized song title
 * @apiSuccess {String} data/author Karaoke author's name
 * @apiSuccess {Number} data/created_at UNIX timestamp of the karaoke's creation date in the base
 * @apiSuccess {String} data/creator Show's creator name
 * @apiSuccess {Number} data/duration Song duration in seconds
 * @apiSuccess {Number} data/flag_dejavu Has the song been played in the last hour ? (by default `EngineMaxDejaVuTime` is at 60 minutes)
 * @apiSuccess {Number} data/flag_favorites 1 = the song is in your favorites, 0 = not.
 * @apiSuccess {Number} data/gain Calculated audio gain for the karaoke's video, in decibels (can be negative)
 * @apiSuccess {String} data/kid Karaoke's unique ID (survives accross database generations)
 * @apiSuccess {String} data/language Song's language in ISO639-2B format, separated by commas when a song has several languages
 * @apiSuccess {String} data/language_i18n Song's language translated in the client's native language
 * @apiSuccess {Number} data/lastplayed_at Last time the song has been played in UNIX timestamp. `null` if never played before
 * @apiSuccess {String} data/mediafile Media's filename
 * @apiSuccess {String} data/misc Internal tag list (`TAG_VIDEOGAME`, etc.)
 * @apiSuccess {String} data/misc_i18n Translated tag list
 * @apiSuccess {String} data/requested Number of times the song has been requested.
 * @apiSuccess {String} data/serie Name of series/show the song belongs to
 * @apiSuccess {String} data/serie_altname Alternative name(s) of series/show this song belongs to. Names are separated by forward slashes (`/`)
 * @apiSuccess {String} data/singer Singer's name, if known.
 * @apiSuccess {Number} data/songorder Song's order, relative to it's type. Opening 1, Opening 2, Ending 1, Ending 2, etc.
 * @apiSuccess {String} data/songtype Song's type internal tag (`TYPE_OP`, `TYPE_ED`, `TYPE_IN` ...)
 * @apiSuccess {String} data/songtype_i18n Translated song's type (`Opening`, `Ending`, `Insert Song`...)
 * @apiSuccess {String} data/songtype_i18n_short Short translated version of the song's type (`OP`, `ED`, `IN`, ...)
 * @apiSuccess {Number} data/time_before_play Estimated time remaining before the song is going to play (in seconds). `0` if the song is currently playing or if there is no song selected as currently playing in the playlist (thus making this estimate impossible)
 * @apiSuccess {String} data/title Song's title
 * @apiSuccess {Number} data/viewcount Counts how many times the song has been played
 * @apiSuccess {String} data/year Song's creation year. Empty string is returned if no year is known.
 * @apiSuccessExample Success-Response:
 * HTTP/1.1 200 OK
 * {
 *   "data": [
 *       {
 *           "NORM_author": null,
 *           "NORM_creator": null,
 *           "NORM_serie": "C3 ~ Cube X Cursed X Curious",
 *           "NORM_serie_altname": "C-Cube/CxCxC",
 *           "NORM_singer": null,
 *           "NORM_songwriter": null,
 *           "NORM_title": "Hana",
 *           "author": null,
 *           "created_at": 1508427958,
 *           "creator": null,
 *           "duration": 0,
 * 	         "flag_dejavu": 0,
 * 		     "flag_favorites": 0,
 *           "gain": 0,
 *           "kid": "c05e24eb-206b-4ff5-88d4-74e8d5ad6f75",
 *           "language": "jpn",
 *           "language_i18n": "Japonais",
 * 			 "lastplayed_at": null,
 *           "mediafile": "JAP - C3 ~ Cube X Cursed X Curious - ED1 - Hana.avi",
 *           "misc": null,
 *           "misc_i18n": null,
 * 			 "requested": 20,
 *           "serie": "C3 ~ Cube X Cursed X Curious",
 *           "serie_altname": "C-Cube/CxCxC",
 *           "singer": null,
 *           "songorder": 1,
 *           "songtype": "TYPE_ED",
 *           "songtype_i18n": "Ending",
 *           "songtype_i18n_short": "ED",
 *           "songwriter": null,
 *           "time_before_play": 0,
 *           "title": "Hana",
 *           "viewcount": 0,
 *           "year": ""
 *       }
 *   ]
 * }
 * @apiError SONG_VIEW_ERROR Unable to list songs
 * @apiError WEBAPPMODE_CLOSED_API_MESSAGE API is disabled at the moment.
 * @apiErrorExample Error-Response:
 * HTTP/1.1 500 Internal Server Error
 * {
 *   "code": "SONG_VIEW_ERROR",
 *   "message": null
 * }
 * @apiErrorExample Error-Response:
 * HTTP/1.1 403 Forbidden
 */
		.get(getLang, requireAuth, requireWebappLimited, requireValidUser, updateUserLoginTime, async (req, res) => {
			try {
				const kara = await engine.getKaraInfo(req.params.kara_id,req.query.lang,req.authToken);
				res.json(OKMessage(kara));
			} catch(err) {
				logger.error(err);
				res.statusCode = 500;
				res.json(errMessage('SONG_VIEW_ERROR',err));
			}
		})
	/**
 * @api {post} /public/karas/:kara_id Add karaoke to current/public playlist
 * @apiName PostKaras
 * @apiVersion 2.1.2
 * @apiGroup Playlists
 * @apiPermission public
 * @apiDescription Contrary to the admin route, this adds a single karaoke song to either current or public playlist depending on private/public mode selected by admin in configuration.
 * @apiParam {Number} kara_id Karaoke ID to add to current/public playlist
 * @apiSuccess {String} args/kara Karaoke title added
 * @apiSuccess {Number} args/kara_id Karaoke ID added.
 * @apiSuccess {String} args/playlist Name of playlist the song was added to
 * @apiSuccess {Number} args/playlist_id Playlist ID the song was added to
 * @apiSuccess {String} code Message to display
 * @apiSuccess {String} data See `args` above.
 *
 * @apiSuccessExample Success-Response:
 * HTTP/1.1 200 OK
 * {
 *   "args": {
 *       "kara": "Dragon Screamer",
 *       "kara_id": "1029",
 *       "playlist": "Courante",
 *       "playlist_id": 1
 *   },
 *   "code": "PLAYLIST_MODE_SONG_ADDED",
 *   "data": {
 *       "kara": "Dragon Screamer",
 *       "kara_id": "1029",
 *       "playlist": "Courante",
 *       "playlist_id": 1
 *   }
 * }

* @apiError PLAYLIST_MODE_ADD_SONG_ERROR_QUOTA_REACHED User asked for too many karaokes already.
* @apiError PLAYLIST_MODE_ADD_SONG_ERROR_ALREADY_ADDED All songs are already present in playlist
* @apiError PLAYLIST_MODE_ADD_SONG_ERROR General error while adding song
* @apiError WEBAPPMODE_CLOSED_API_MESSAGE API is disabled at the moment.
* @apiErrorExample Error-Response:
* HTTP/1.1 500 Internal Server Error
* {
*   "args": {
*       "kara": "1033",
*       "playlist": 1,
*       "user": "Axel"
*   },
*   "code": "PLAYLIST_MODE_ADD_SONG_ERROR_QUOTA_REACHED",
*   "message": "User quota reached"
* }
* @apiErrorExample Error-Response:
* HTTP/1.1 403 Forbidden
*/
		.post(getLang, requireAuth, requireWebappOpen, requireValidUser, updateUserLoginTime, async (req, res) => {
			// Add Kara to the playlist currently used depending on mode
			try {
				const data = await engine.addKaraToPL(null, req.params.kara_id, req.authToken.username, null);
				emitWS('playlistContentsUpdated',data.playlist_id);
				emitWS('playlistInfoUpdated',data.playlist_id);
				res.statusCode = 201;
				res.json(OKMessage(data,'PLAYLIST_MODE_SONG_ADDED',data));
			} catch(err) {
				res.statusCode = 500;
				res.json(errMessage(err.code,err.message,err.data));
			}
			
		});

	router.route('/karas/:kara_id([0-9]+)/lyrics')
	/**
 * @api {post} /public/karas/:kara_id/lyrics Get song lyrics
 * @apiName GetKarasLyrics
 * @apiVersion 2.1.0
 * @apiGroup Karaokes
 * @apiPermission public
 * @apiParam {Number} kara_id Karaoke ID to get lyrics from
 * @apiSuccess {String[]} data Array of strings making the song's lyrics
 * @apiSuccessExample Success-Response:
 * HTTP/1.1 200 OK
 * {
 *   "data": "Lyrics for this song are not available"
 * }
 * @apiError LYRICS_VIEW_ERROR Unable to fetch lyrics data
 * @apiError WEBAPPMODE_CLOSED_API_MESSAGE API is disabled at the moment.
 * @apiErrorExample Error-Response:
 * HTTP/1.1 500 Internal Server Error
 * @apiErrorExample Error-Response:
 * HTTP/1.1 403 Forbidden
 * {
 *   "code": "PLAYLIST_MODE_ADD_SONG_ERROR_QUOTA_REACHED"
 * }
 */			
		.get(getLang, requireAuth, requireWebappLimited, requireValidUser, updateUserLoginTime, async (req, res) => {
			try {
				const kara = await engine.getLyrics(req.params.kara_id);
				res.json(OKMessage(kara));
			} catch(err) {
				
				res.statusCode = 500;
				res.json(errMessage('LYRICS_VIEW_ERROR',err.message,err.data));
			}
		});
	router.route('/playlists/current')
	/**
 * @api {get} /public/playlists/current Get current playlist information
 * @apiName GetPlaylistCurrent
 * @apiGroup Playlists
 * @apiPermission public
 * @apiVersion 2.1.0
 * @apiDescription This route allows to check basic information about the current playlist, no matter which ID it has (and without you having to know it)
 * @apiSuccess {Number} data/created_at Playlist creation date in UNIX timestamp
 * @apiSuccess {Number} data/flag_current Is playlist the current one? Mutually exclusive with `flag_public`
 * @apiSuccess {Number} data/flag_public Is playlist the public one? Mutually exclusive with `flag_current`
 * @apiSuccess {Number} data/flag_visible Is playlist visible to normal users?
 * @apiSuccess {Number} data/length Duration of playlist in seconds
 * @apiSuccess {Number} data/modified_at Playlist last edit date in UNIX timestamp
 * @apiSuccess {String} data/name Name of playlist
 * @apiSuccess {Number} data/num_karas Number of karaoke songs in the playlist
 * @apiSuccess {Number} data/playlist_id Database's playlist ID
 * @apiSuccess {Number} data/time_left Time left in seconds before playlist ends, relative to the currently playing song's position.
 *
 * @apiSuccessExample Success-Response:
 * HTTP/1.1 200 OK
 * {
 *   "data": {
 *       "created_at": 1508313440,
 *       "flag_current": 1,
 *       "flag_public": 0,
 *       "flag_visible": 1,
 *       "length": 0,
 *       "modified_at": 1508408078,
 *       "name": "Liste de lecture courante",
 *       "num_karas": 6,
 *       "playlist_id": 1,
 *       "time_left": 0
 *   }
 *}
 * @apiError PL_VIEW_CURRENT_ERROR Unable to fetch info from current playlist
 * @apiError WEBAPPMODE_CLOSED_API_MESSAGE API is disabled at the moment.
 * @apiErrorExample Error-Response:
 * HTTP/1.1 500 Internal Server Error
 * @apiErrorExample Error-Response:
 * HTTP/1.1 403 Forbidden
 */
		.get(getLang, requireAuth, requireWebappLimited, requireValidUser, updateUserLoginTime, async (req, res) => {
			// Get current Playlist
			try {					
				const playlist = await engine.getCurrentPLInfo(req.authToken);
				res.json(OKMessage(playlist));
			} catch(err) {
				logger.error(err);
				res.statusCode = 500;
				res.json(errMessage('PL_VIEW_CURRENT_ERROR',err));
			}
		});

	router.route('/playlists/current/karas')
	/**
 * @api {get} /public/playlists/current/karas Get list of karaokes in the current playlist
 * @apiName GetPlaylistKarasCurrent
 * @apiVersion 2.2.0
 * @apiGroup Playlists
 * @apiPermission public
 *
 * @apiParam {Number} pl_id Target playlist ID.
 * @apiParam {String} [filter] Filter list by this string.
 * @apiParam {Number} [from=0] Return only the results starting from this position. Useful for continuous scrolling. 0 if unspecified
 * @apiParam {Number} [size=999999] Return only x number of results. Useful for continuous scrolling. 999999 if unspecified.
 *
 * @apiSuccess {Object[]} data/content/karas Array of `kara` objects
 * @apiSuccess {Number} data/infos/count Number of karaokes in playlist
 * @apiSuccess {Number} data/infos/from Starting position of listing
 * @apiSuccess {Number} data/infos/to End position of listing
 *
 * @apiSuccessExample Success-Response:
 * HTTP/1.1 200 OK
 * {
 *   "data": {
 *       "content": [
 *           {
 *               "NORM_author": null,
 *               "NORM_creator": null,
 *               "NORM_pseudo_add": "Administrateur",
 *               "NORM_serie": "Dynasty Warriors 3",
 *               "NORM_serie_altname": "DW3/DW 3",
 *               "NORM_singer": null,
 *               "NORM_songwriter": null,
 *               "NORM_title": "Circuit",
 *               "author": null,
 *               "created_at": 1508423806,
 *               "creator": null,
 *               "duration": 0,
 *               "flag_blacklisted": 0,
 *               "flag_playing": 1,
 *               "flag_whitelisted": 0,
 * 	             "flag_dejavu": 0,
 *               "gain": 0,
 *               "kara_id": 176,
 *               "kid": "b0de301c-5756-49fb-b019-85a99a66586b",
 *               "language": "chi",
 *               "language_i18n": "Chinois",
 * 				 "lastplayed_at": null,
 *               "mediafile": "CHI - Dynasty Warriors 3 - GAME ED - Circuit.avi"
 *               "misc": "TAG_VIDEOGAME",
 *               "misc_i18n": "Jeu vidéo",
 *               "playlistcontent_id": 4946,
 *               "pos": 1,
 *               "pseudo_add": "Administrateur",
 * 				 "requested": 20,
 *               "serie": "Dynasty Warriors 3",
 * 				 "serie_i18n": {
 * 								"fre":"Guerriers de la Dynastie"
 * 								}
 *               "serie_altname": "DW3/DW 3",
 *               "singer": null,
 *               "songorder": 0,
 *               "songtype": "TYPE_ED",
 *               "songtype_i18n": "Ending",
 *               "songtype_i18n_short": "ED",
 *               "songwriter": null,
 *               "title": "Circuit",*
 * 				 "username": "admin",
 *               "viewcount": 0,
 *               "year": ""
 *           },
 *           ...
 *       ],
 *       "infos": {
 *           "count": 3,
 * 			 "from": 0,
 * 			 "to": 120
 *       }
 *   }
 * }
 * @apiError PL_VIEW_SONGS_CURRENT_ERROR Unable to fetch list of karaokes of current playlist
 * @apiError WEBAPPMODE_CLOSED_API_MESSAGE API is disabled at the moment.
 * @apiErrorExample Error-Response:
 * HTTP/1.1 500 Internal Server Error
 * @apiErrorExample Error-Response:
 * HTTP/1.1 403 Forbidden
 */

		.get(getLang, requireAuth, requireWebappLimited, requireValidUser, updateUserLoginTime, async (req, res) => {
			// Get current Playlist
			let size = req.query.size || 999999;
			size = parseInt(size, 10);
			let from = req.query.from || 0;
			from = parseInt(from, 10);
			try {	
				const playlist = await engine.getCurrentPLContents(req.query.filter, req.lang, from, size, req.authToken);
				res.json(OKMessage(playlist));
			} catch(err) {
				logger.error(err);
				res.statusCode = 500;
				res.json(errMessage('PL_VIEW_SONGS_CURRENT_ERROR',err));
			}
		});

	router.route('/playlists/public')
	/**
 * @api {get} /public/playlists/public Get public playlist information
 * @apiName GetPlaylistPublic
 * @apiGroup Playlists
 * @apiPermission public
 * @apiVersion 2.1.0
 * @apiDescription This route allows to check basic information about the public playlist, no matter which ID it has (and without you having to know it)
 * @apiSuccess {Number} data/created_at Playlist creation date in UNIX timestamp
 * @apiSuccess {Number} data/flag_current Is playlist the current one? Mutually exclusive with `flag_public`
 * @apiSuccess {Number} data/flag_public Is playlist the public one? Mutually exclusive with `flag_current`
 * @apiSuccess {Number} data/flag_visible Is playlist visible to normal users?
 * @apiSuccess {Number} data/length Duration of playlist in seconds
 * @apiSuccess {Number} data/modified_at Playlist last edit date in UNIX timestamp
 * @apiSuccess {String} data/name Name of playlist
 * @apiSuccess {Number} data/num_karas Number of karaoke songs in the playlist
 * @apiSuccess {Number} data/playlist_id Database's playlist ID
 * @apiSuccess {Number} data/time_left Time left in seconds before playlist ends, relative to the currently playing song's position.
 *
 * @apiSuccessExample Success-Response:
 * HTTP/1.1 200 OK
 * {
 *   "data": {
 *       "created_at": 1508313440,
 *       "flag_current": 1,
 *       "flag_public": 0,
 *       "flag_visible": 1,
 *       "length": 0,
 *       "modified_at": 1508408078,
 *       "name": "Liste de lecture courante",
 *       "num_karas": 6,
 *       "playlist_id": 1,
 *       "time_left": 0
 *   }
 *}
 * @apiError PL_VIEW_PUBLIC_ERROR Unable to fetch info from public playlist
 * @apiError WEBAPPMODE_CLOSED_API_MESSAGE API is disabled at the moment.

 * @apiErrorExample Error-Response:
 * HTTP/1.1 500 Internal Server Error
 * @apiErrorExample Error-Response:
 * HTTP/1.1 403 Forbidden
 */

		.get(getLang, requireAuth, requireWebappLimited, requireValidUser, updateUserLoginTime, async (req, res) => {
			// Get public Playlist
			try {	
				const playlist = await engine.getPublicPLInfo(req.authToken);
				res.json(OKMessage(playlist));
			} catch(err) {
				logger.error(err);
				res.statusCode = 500;
				res.json(errMessage('PL_VIEW_PUBLIC_ERROR',err));
			}
		});

	router.route('/playlists/public/karas')
	/**
 * @api {get} /public/playlists/public/karas Get list of karaokes in the public playlist
 * @apiName GetPlaylistKarasPublic
 * @apiVersion 2.2.0
 * @apiGroup Playlists
 * @apiPermission public
 *
 * @apiParam {Number} pl_id Target playlist ID.
 * @apiParam {String} [filter] Filter list by this string.
 * @apiParam {Number} [from=0] Return only the results starting from this position. Useful for continuous scrolling. 0 if unspecified
 * @apiParam {Number} [size=999999] Return only x number of results. Useful for continuous scrolling. 999999 if unspecified.
 *
 * @apiSuccess {Object[]} data/content/karas Array of `kara` objects
 * @apiSuccess {Number} data/infos/count Number of karaokes in playlist
 * @apiSuccess {Number} data/infos/from Starting position of listing
 * @apiSuccess {Number} data/infos/to End position of listing
 *
 * @apiSuccessExample Success-Response:
 * HTTP/1.1 200 OK
 * {
 *   "data": {
 *       "content": [
 *           {
 *               "NORM_author": null,
 *               "NORM_creator": null,
 *               "NORM_pseudo_add": "Administrateur",
 *               "NORM_serie": "Dynasty Warriors 3",
 *               "NORM_serie_altname": "DW3/DW 3",
 *               "NORM_singer": null,
 *               "NORM_songwriter": null,
 *               "NORM_title": "Circuit",
 *               "author": null,
 *               "created_at": 1508423806,
 *               "creator": null,
 *               "duration": 0,
 *               "flag_blacklisted": 0,
 *               "flag_playing": 1,
 *               "flag_whitelisted": 0,
 * 	             "flag_dejavu": 0,
 *               "gain": 0,
 *               "kara_id": 176,
 *               "kid": "b0de301c-5756-49fb-b019-85a99a66586b",
 *               "language": "chi",
 *               "language_i18n": "Chinois",
 * 				 "lastplayed_at": null,
 *               "mediafile": "CHI - Dynasty Warriors 3 - GAME ED - Circuit.avi"
 *               "misc": "TAG_VIDEOGAME",
 *               "misc_i18n": "Jeu vidéo",
 *               "playlistcontent_id": 4946,
 *               "pos": 1,
 *               "pseudo_add": "Administrateur",
 * 				 "requested": 20
 *               "serie": "Dynasty Warriors 3",
 * 				 "serie_i18n": {
 * 								"fre":"Guerriers de la Dynastie"
 * 								}
 *               "serie_altname": "DW3/DW 3",
 *               "singer": null,
 *               "songorder": 0,
 *               "songtype": "TYPE_ED",
 *               "songtype_i18n": "Ending",
 *               "songtype_i18n_short": "ED",
 *               "songwriter": null,
 *               "title": "Circuit",
 * 				 "username": "admin",
 *               "viewcount": 0,
 *               "year": ""
 *           },
 *           ...
 *       ],
 *       "infos": {
 *           "count": 3,
 * 			 "from": 0,
 * 			 "to": 120
 *       }
 *   }
 * }
 * @apiError PL_VIEW_SONGS_PUBLIC_ERROR Unable to fetch list of karaokes of public playlist
 * @apiError WEBAPPMODE_CLOSED_API_MESSAGE API is disabled at the moment.
 *
 * @apiErrorExample Error-Response:
 * HTTP/1.1 500 Internal Server Error
 * @apiErrorExample Error-Response:
 * HTTP/1.1 403 Forbidden
 */
		.get(getLang, requireAuth, requireWebappLimited, requireValidUser, updateUserLoginTime, async (req, res) => {
			// Get public Playlist
			let size = req.query.size || 999999;
			size = parseInt(size, 10);
			let from = req.query.from || 0;
			from = parseInt(from, 10);
			try {
				const playlist = await engine.getPublicPLContents(req.query.filter, req.lang, from, size, req.authToken);
				res.json(OKMessage(playlist));
			} catch(err) {
				logger.error(err);
				res.statusCode = 500;
				res.json(errMessage('PL_VIEW_SONGS_CURRENT_ERROR',err));
			}
		});
	router.route('/playlists/public/karas/:plc_id([0-9]+)/vote')
		/**
	 * @api {post} /public/playlists/public/karas/:plc_id/vote Up/downvote a song in public playlist
	 * @apiName PostVote
	 * @apiVersion 2.1.0
	 * @apiGroup Playlists
	 * @apiPermission public
	 *
	 * @apiParam {Number} plc_id Target playlist content ID
	 * @apiParam {String} [downvote] If anything is specified in this parameter, it'll be a downvote instead of upvote.
	 * @apiSuccess {String} code Return code
	 * @apiSuccess {String} args Name of song being upvoted
	 * @apiSuccessExample Success-Response:
	 * HTTP/1.1 200 OK
	 * {
	 *   "code": 'UPVOTE_DONE',
	 *   "args": 'Shoujo Kakumei Utena - Rinbu Revolution'
	 * }
	 * @apiError UPVOTE_FAILED Unable to upvote karaoke
	 * @apiError DOWNVOTE_FAILED Unable to downvote karaoke
	 * @apiError UPVOTE_ALREADY_DONE Karaoke has already been upvoted by this user
	 * @apiError DOWNVOTE_ALREADY_DONE Karaoke has already been downvoted by this user
	 *
	 * @apiErrorExample Error-Response:
	 * HTTP/1.1 500 Internal Server Error
	 */
	
		.post(getLang, requireAuth, requireValidUser, updateUserLoginTime, async (req, res) => {
			// Post an upvote
			try {
				const kara = await upvote.vote(req.params.plc_id,req.authToken.username,req.body.downvote);
				
				emitWS('playlistContentsUpdated', kara.playlist_id);
				res.json(OKMessage(null, kara.code, kara));
				
			} catch(err) {						
				res.statusCode = 500;
				res.json(errMessage(err.code,err.message));
			}
		});
	router.route('/playlists/public/karas/:plc_id([0-9]+)')
		/**
	 * @api {delete} /public/playlists/public/karas/:plc_id Delete song from public playlist
	 * @apiName DeletePublicSong
	 * @apiVersion 2.2.0
	 * @apiGroup Playlists
	 * @apiPermission public
	 *
	 * @apiParam {Number} plc_id Target playlist content ID
	 * @apiSuccess {String} args Name of playlist the song was deleted from
 	 * @apiSuccess {String} code Message to display
 	 *
 	 * @apiSuccessExample Success-Response:
 	 * HTTP/1.1 200 OK
 	 * {
 	 *   "args": "Liste de lecture publique",
 	 *   "code": "PL_SONG_DELETED",
 	 *   "data": null
 	 * }
 	 * @apiError PL_DELETE_SONG_ERROR Unable to delete the song from the selected playlist
 	 *
 	 * @apiErrorExample Error-Response:
 	 * HTTP/1.1 500 Internal Server Error
 	 * {
 	 *   "args": "Liste de lecture publique",
 	 *   "code": "PL_DELETE_SONG_ERROR",
 	 *   "message": "[PLC] GetPLContentInfo : PLCID 4960 unknown"
 	 * }
 	 */
	
		.delete(getLang, requireAuth, requireValidUser, updateUserLoginTime, async (req, res) => {
			try {
				const data = await engine.deleteKara(req.params.plc_id,null,req.authToken);
				emitWS('playlistContentsUpdated',data.pl_id);
				emitWS('playlistInfoUpdated',data.pl_id);
				res.statusCode = 200;
				res.json(OKMessage(null,'PL_SONG_DELETED',data.pl_name));
			} catch(err) {
				
				res.statusCode = 500;
				res.json(errMessage('PL_DELETE_SONG_ERROR',err.message,err.data));
			}			
		});
	router.route('/playlists/current/karas/:plc_id([0-9]+)')
		/**
	 * @api {delete} /public/playlists/current/karas/:plc_id Delete song from current playlist
	 * @apiName DeleteCurrentSong
	 * @apiVersion 2.2.0
	 * @apiGroup Playlists
	 * @apiPermission public
	 *
	 * @apiParam {Number} plc_id Target playlist content ID
	 * @apiSuccess {String} args Name of playlist the song was deleted from
 	 * @apiSuccess {String} code Message to display
 	 *
 	 * @apiSuccessExample Success-Response:
 	 * HTTP/1.1 200 OK
 	 * {
 	 *   "args": "Liste de lecture publique",
 	 *   "code": "PL_SONG_DELETED",
 	 *   "data": null
 	 * }
 	 * @apiError PL_DELETE_SONG_ERROR Unable to delete the song from the selected playlist
 	 *
 	 * @apiErrorExample Error-Response:
 	 * HTTP/1.1 500 Internal Server Error
 	 * {
 	 *   "args": "Liste de lecture publique",
 	 *   "code": "PL_DELETE_SONG_ERROR",
 	 *   "message": "[PLC] GetPLContentInfo : PLCID 4960 unknown"
 	 * }
 	 */
	
		.delete(getLang, requireAuth, requireValidUser, updateUserLoginTime, async (req, res) => {
			try {
				const data = await engine.deleteKara(req.params.plc_id,null,req.authToken);
				emitWS('playlistContentsUpdated',data.pl_id);
				emitWS('playlistInfoUpdated',data.pl_id);
				res.statusCode = 200;
				res.json(OKMessage(null,'PL_SONG_DELETED',data.pl_name));
			} catch(err) {
				
				res.statusCode = 500;
				res.json(errMessage('PL_DELETE_SONG_ERROR',err.message,err.data));
			}			
		});
	router.route('/tags')
	/**
	* @api {get} /public/tags Get tag list
	* @apiName GetTags
	* @apiVersion 2.1.0
	* @apiGroup Karaokes
	* @apiPermission public
	*
	* @apiSuccess {String} data/name Name of tag
	* @apiSuccess {String} data/name_i18n Translated name of tag
	* @apiSuccess {Number} data/tag_id Tag ID number
	* @apiSuccess {Number} data/type Tag type number
	*
	* @apiSuccessExample Success-Response:
	* HTTP/1.1 200 OK
	* {
	*     "data": [
	*        {
	*          "name": "20th Century",
	*          "name_i18n": "20th Century",
	*          "tag_id": 371,
	*          "type": 2
	*        },
	*        {
	*		   "name": "TYPE_AMV",
	*          "name_i18n": "Anime Music Video",
	*          "tag_id": 15,
	*          "type": 3
	*        },
	*        {
	*          "name": "ita",
	*          "name_i18n": "Italien",
	*          "tag_id": 370,
	*          "type": 5
	*        }
	*		 ...
	*   ]
	* }
	* @apiError TAGS_LIST_ERROR Unable to get list of tags
	* @apiError WEBAPPMODE_CLOSED_API_MESSAGE API is disabled at the moment.
	* @apiErrorExample Error-Response:
	* HTTP/1.1 500 Internal Server Error
	* @apiErrorExample Error-Response:
    * HTTP/1.1 403 Forbidden
	*/
		.get(getLang, requireAuth, requireWebappLimited, requireValidUser, updateUserLoginTime, async (req, res) => {
			try {
				const tags = await engine.getTags(req.query.lang);
				res.json(OKMessage(tags));
			} catch(err) {
				logger.error(err);
				res.statusCode = 500;
				res.json(errMessage('TAGS_LIST_ERROR',err));
			}
		});
	router.route('/users/:username')
	/**
 * @api {get} /public/users/:username View user details (public)
 * @apiName GetUser
 * @apiVersion 2.1.0
 * @apiGroup Users
 * @apiPermission public
 *
 * @apiParam {String} username Username to check details for.
 * @apiSuccess {String} data/login User's login
 * @apiSuccess {String} data/nickname User's nickname
 * @apiSuccess {String} data/NORM_nickname User's normalized nickname (deburr'ed)
 * @apiSuccess {String} [data/avatar_file] Directory and name of avatar image file. Can be empty if no avatar has been selected.
 * @apiSuccess {Number} data/flag_admin Is the user Admin ?
 * @apiSuccess {Number} data/flag_online Is the user an online account ?
 * @apiSuccess {Number} data/type Type of account (1 = user, 2 = guest)
 * @apiSuccess {Number} data/last_login Last login time in UNIX timestamp.
 * @apiSuccess {Number} data/user_id User's ID in the database
 * @apiSuccess {String} data/url User's URL in its profile
 * @apiSuccess {String} data/bio User's bio
 *
 * @apiSuccessExample Success-Response:
 * HTTP/1.1 200 OK
 * {
 *   "data": [
 *       {
 *           "NORM_nickname": "Administrator",
 *           "avatar_file": "",
 *           "flag_admin": 1,
 *           "flag_online": 0,
 *           "type": 1,
 *           "last_login": 0,
 *           "login": "admin",
 *           "nickname": "Administrator",
 *           "user_id": 1,
 * 			 "url": null,
 * 			 "bio": null,
 *       },
 *   ]
 * }
 * @apiError USER_VIEW_ERROR Unable to view user details
 * @apiError WEBAPPMODE_CLOSED_API_MESSAGE API is disabled at the moment.
 * @apiErrorExample Error-Response:
 * HTTP/1.1 500 Internal Server Error
 * {
 *   "code": "USER_VIEW_ERROR",
 *   "message": null
 * }
 * @apiErrorExample Error-Response:
 * HTTP/1.1 403 Forbidden
 */
		.get(getLang, requireAuth, requireWebappLimited, requireValidUser, updateUserLoginTime, async (req, res) => {
			try {
				const userdata = await user.findUserByName(req.params.username, {public:true});
				res.json(OKMessage(userdata));
			} catch(err) {
				logger.error(err);
				res.statusCode = 500;
				res.json(errMessage('USER_VIEW_ERROR',err));
			}
		})
	/**
 * @api {put} /public/users/:username Edit a user
 * @apiName EditUser
 * @apiVersion 2.1.0
 * @apiGroup Users
 * @apiPermission public
 *
 * @apiParam {String} username Username to edit
 * @apiParam {String} login New login for user
 * @apiParam {String} nickname New nickname for user
 * @apiParam {String} password New password. Can be empty (password won't be changed then)
 * @apiParam {String} bio User's bio info. Can be empty.
 * @apiParam {String} [email] User's mail. Can be empty.
 * @apiParam {String} [url] User's URL. Can be empty.
 * @apiParam {String} [admin] Is User admin or not
 * @apiSuccess {String} args ID of user deleted
 * @apiSuccess {String} code Message to display
 * @apiSuccess {Number} data ID of user deleted
 *
 * @apiSuccessExample Success-Response:
 * HTTP/1.1 200 OK
 * {
 *   "args": "lol",
 *   "code": "USER_UPDATED",
 *   "data": {
 *       "NORM_nickname": "lol",
 *       "bio": "lol2",
 *       "email": "lol3@lol.fr",
 *       "id": "3",
 *       "login": "test2",
 *       "nickname": "lol",
 *       "url": "http://lol4"
 *   }
 * }
 * @apiError USER_UPDATE_ERROR Unable to edit user
 *
 * @apiErrorExample Error-Response:
 * HTTP/1.1 500 Internal Server Error
 */
		.put(upload.single('avatarfile'), getLang, requireAuth, requireValidUser, updateUserLoginTime, requireAdmin, async (req, res) => {
			const validationErrors = check(req.body, {
				login: {presence: true},
				nickname: {presence: true}				
			});
			if (!validationErrors) {			
				// No errors detected
				if (req.body.bio) req.body.bio = unescape(req.body.bio.trim());
				if (req.body.email) req.body.email = unescape(req.body.email.trim());
				if (req.body.url) req.body.url = unescape(req.body.url.trim());
				if (req.body.nickname) req.body.nickname = unescape(req.body.nickname.trim());
				if (req.body.login) req.body.login = unescape(req.body.login.trim());
				if (req.body.admin) req.body.admin = parseInt(req.body.admin, 10);
				//Now we add user
				let avatar;
				if (req.file) avatar = req.file;
				try {
					const userdata = await user.editUser(req.params.username,req.body,avatar,req.authToken.role);
					emitWS('userUpdated',user.id);
					res.json(OKMessage(userdata,'USER_UPDATED',userdata.nickname));	
				} catch(err) {
					res.statusCode = 500;
					res.json(errMessage('USER_UPDATE_ERROR',err.message,err.data));
				}
			} else {
				// Errors detected
				// Sending BAD REQUEST HTTP code and error object.
				res.statusCode = 400;
				res.json(validationErrors);
			}
		});
	router.route('/top50')
	/**
 * @api {get} /public/top50 View Top 50 songs
 * @apiName GetTop50
 * @apiVersion 2.2.0
 * @apiGroup Karas
 * @apiPermission public
 *
 * @apiParam {String} [filter] Filter list by this string. 
 * @apiParam {Number} [from=0] Return only the results starting from this position. Useful for continuous scrolling. 0 if unspecified
 * @apiParam {Number} [size=999999] Return only x number of results. Useful for continuous scrolling. 999999 if unspecified.
 * 
 * @apiSuccess {Object[]} data/content/karas Array of `kara` objects 
 * @apiSuccess {Number} data/infos/count Number of karaokes in playlist
 * @apiSuccess {Number} data/infos/from Starting position of listing
 * @apiSuccess {Number} data/infos/to End position of listing
 *
 * @apiSuccessExample Success-Response:
 * HTTP/1.1 200 OK
 * {
 *   "data": {
 *       "content": [
 *           {
 *               "NORM_author": null,
 *               "NORM_creator": null,
 *               "NORM_serie": "Dynasty Warriors 3",
 *               "NORM_serie_altname": "DW3/DW 3",
 *               "NORM_singer": null,
 *               "NORM_songwriter": null,
 *               "NORM_title": "Circuit",
 *               "author": null,
 *               "created_at": 1508423806,
 *               "creator": null,
 *               "duration": 0,
 * 	             "flag_dejavu": 0,
 *               "gain": 0,
 *               "kara_id": 176,
 *               "kid": "b0de301c-5756-49fb-b019-85a99a66586b",
 *               "language": "chi",
 *               "language_i18n": "Chinois",
 * 				 "lastplayed_at": null,
 *               "misc": "TAG_VIDEOGAME",
 *               "misc_i18n": "Jeu vidéo",
 * 				 "requested": 20
 *               "serie": "Dynasty Warriors 3",
 * 				 "serie_i18n": {}
 *               "serie_altname": "DW3/DW 3",
 *               "singer": null,
 *               "songorder": 0,
 *               "songtype": "TYPE_ED",
 *               "songtype_i18n": "Ending",
 *               "songtype_i18n_short": "ED",
 *               "songwriter": null,
 *               "title": "Circuit",
 *               "videofile": "CHI - Dynasty Warriors 3 - GAME ED - Circuit.avi"
 *               "viewcount": 0,
 *               "year": ""
 *           },
 *           ...
 *       ],
 *       "infos": {
 *           "count": 3,
 * 			 "from": 0,
 * 			 "to": 120
 *       }
 *   }
 * }
 * @apiError TOP50_LIST_ERROR Unable to fetch list of karaokes
 *
 * @apiErrorExample Error-Response:
 * HTTP/1.1 500 Internal Server Error
 */
		.get(getLang, requireAuth, requireValidUser, updateUserLoginTime, async (req, res) => {
			// if the query has a &filter=xxx
			// then the playlist returned gets filtered with the text.
			let size = req.query.size || 999999;
			size = parseInt(size, 10);
			let from = req.query.from || 0;
			from = parseInt(from, 10);
			if (from < 0) from = 0;
			try {
				const karas = await engine.getTop50(req.body.filter,req.lang,from,size,req.authToken);
				res.json(OKMessage(karas));
			} catch(err) {
				res.statusCode = 500;
				res.json(errMessage('TOP50_LIST_ERROR',err));
			}				
		});

	router.route('/users/:username/requests')
	/**
 * @api {get} public/users/:username/requests View user's most requested songs
 * @apiName GetUserRequestedKaras
 * @apiVersion 2.1.0
 * @apiGroup Users
 * @apiPermission public
 *
 * @apiParam {String} username Username to check details for.
 * @apiSuccess {Object} data Kara object
 * @apiSuccessExample Success-Response:
 * HTTP/1.1 200 OK
* {
 *   "data": {
 *       "content": [
 *           {
 *               "NORM_author": null,
 *               "NORM_creator": null,
 *               "NORM_pseudo_add": "Administrateur",
 *               "NORM_serie": "Dynasty Warriors 3",
 *               "NORM_serie_altname": "DW3/DW 3",
 *               "NORM_singer": null,
 *               "NORM_songwriter": null,
 *               "NORM_title": "Circuit",
 *               "author": null,
 *               "created_at": 1508423806,
 *               "creator": null,
 *               "duration": 0,
 *               "flag_blacklisted": 0,
 *               "flag_playing": 1,
 *               "flag_whitelisted": 0,
 * 	             "flag_dejavu": 0,
 *               "gain": 0,
 *               "kara_id": 176,
 *               "kid": "b0de301c-5756-49fb-b019-85a99a66586b",
 *               "language": "chi",
 *               "language_i18n": "Chinois",
 * 				 "lastplayed_at": null,
 *               "misc": "TAG_VIDEOGAME",
 *               "misc_i18n": "Jeu vidéo",
 *               "playlistcontent_id": 4946,
 *               "pos": 1,
 *               "pseudo_add": "Administrateur",
 * 				 "requested": 20,
 *               "serie": "Dynasty Warriors 3",
 *               "serie_altname": "DW3/DW 3",
 *               "singer": null,
 *               "songorder": 0,
 *               "songtype": "TYPE_ED",
 *               "songtype_i18n": "Ending",
 *               "songtype_i18n_short": "ED",
 *               "songwriter": null,
 *               "title": "Circuit",*
 * 				 "username": "admin",
 *               "videofile": "CHI - Dynasty Warriors 3 - GAME ED - Circuit.avi"
 *               "viewcount": 0,
 *               "year": ""
 *           },
 *           ...
 *       ],
 *       "infos": {
 *           "count": 3,
 * 			 "from": 0,
 * 			 "to": 120
 *       }
 *   }
 * }
 * @apiError USER_REQUESTS_VIEW_ERROR Unable to view user requested karas
 *
 * @apiErrorExample Error-Response:
 * HTTP/1.1 500 Internal Server Error
 * {
 *   "code": "USER_REQUESTS_VIEW_ERROR",
 *   "message": null
 * }
 */
		.get(requireAuth, requireValidUser, updateUserLoginTime, (req,res) => {
			user.getUserRequests(req.params.username)
				.then((requestdata) => {
					res.json(OKMessage(requestdata));
				})
				.catch((err) => {
					logger.error(err);
					res.statusCode = 500;
					res.json(errMessage('USER_REQUESTS_VIEW_ERROR',err));
				});						
		});
	router.route('/myaccount')
	/**
 * @api {get} /public/myaccount View own user details
 * @apiName GetMyAccount
 * @apiVersion 2.1.0
 * @apiGroup Users
 * @apiPermission own
 *
 * @apiSuccess {String} data/login User's login
 * @apiSuccess {String} data/nickname User's nickname
 * @apiSuccess {String} data/NORM_nickname User's normalized nickname (deburr'ed)
 * @apiSuccess {String} [data/avatar_file] Directory and name of avatar image file. Can be empty if no avatar has been selected.
 * @apiSuccess {Number} data/flag_admin Is the user Admin ?
 * @apiSuccess {Number} data/flag_online Is the user an online account ?
 * @apiSuccess {Number} data/type Type of account (1 = user, 2 = guest)
 * @apiSuccess {Number} data/last_login Last login time in UNIX timestamp.
 * @apiSuccess {Number} data/user_id User's ID in the database
 * @apiSuccess {String} data/url User's URL in its profile
 * @apiSuccess {String} data/fingerprint User's fingerprint
 * @apiSuccess {String} data/bio User's bio
 * @apiSuccess {String} data/email User's email
 *
 * @apiSuccessExample Success-Response:
 * HTTP/1.1 200 OK
 * {
 *   "data": [
 *       {
 *           "NORM_nickname": "Administrator",
 *           "avatar_file": "",
 *           "flag_admin": 1,
 *           "flag_online": 0,
 *           "type": 1,
 *           "last_login": 0,
 *           "login": "admin",
 *           "nickname": "Administrator",
 *           "user_id": 1,
 * 			 "url": null,
 * 			 "email": null,
 * 			 "bio": null,
 * 			 "fingerprint": null
 *       },
 *   ]
 * }
 * @apiError USER_VIEW_ERROR Unable to view user details
 * @apiError WEBAPPMODE_CLOSED_API_MESSAGE API is disabled at the moment.
 * @apiErrorExample Error-Response:
 * HTTP/1.1 500 Internal Server Error
 * {
 *   "code": "USER_VIEW_ERROR",
 *   "message": null
 * }
 * @apiErrorExample Error-Response:
 * HTTP/1.1 403 Forbidden
 */
		.get(getLang, requireAuth, requireWebappLimited, requireValidUser, updateUserLoginTime, async (req, res) => {
			try {
				const userData = await user.findUserByName(req.authToken.username, {public:false});
				updateSongsLeft(userData.id);
				res.json(OKMessage(userData));
			} catch(err) {
				logger.error(err);
				res.statusCode = 500;
				res.json(errMessage('USER_VIEW_ERROR',err));
			}			
		})
	/**
 * @api {put} /public/myaccount Edit your own account
 * @apiName EditMyAccount
 * @apiVersion 2.1.0
 * @apiGroup Users
 * @apiPermission own
 *
 * @apiParam {String} nickname New nickname for user
 * @apiParam {String} [password] New password. Can be empty (password won't be changed then)
 * @apiParam {String} [bio] User's bio info. Can be empty.
 * @apiParam {String} [email] User's mail. Can be empty.
 * @apiParam {String} [url] User's URL. Can be empty.
 * @apiParam {ImageFile} [avatarfile] New avatar
 * @apiSuccess {String} args ID of user deleted
 * @apiSuccess {String} code Message to display
 * @apiSuccess {Number} data ID of user deleted
 *
 * @apiSuccessExample Success-Response:
 * HTTP/1.1 200 OK
 * {
 *   "args": "lol",
 *   "code": "USER_UPDATED",
 *   "data": {
 *       "NORM_nickname": "lol",
 *       "bio": "lol2",
 *       "email": "lol3@lol.fr",
 *       "id": "3",
 *       "login": "test2",
 *       "nickname": "lol",
 *       "url": "http://lol4"
 *   }
 * }
 * @apiError USER_UPDATE_ERROR Unable to edit user
 * @apiError WEBAPPMODE_CLOSED_API_MESSAGE API is disabled at the moment.
 * @apiErrorExample Error-Response:
 * HTTP/1.1 500 Internal Server Error
 * @apiErrorExample Error-Response:
 * HTTP/1.1 403 Forbidden
 */
		.put(upload.single('avatarfile'), getLang, requireAuth, requireWebappLimited, requireValidUser, updateUserLoginTime, async (req, res) => {
			const validationErrors = check(req.body, {
				nickname: {presence: true}				
			});
			if (!validationErrors) {			
				// No errors detected
				if (req.body.bio) req.body.bio = unescape(req.body.bio.trim());
				if (req.body.email) req.body.email = unescape(req.body.email.trim());
				if (req.body.url) req.body.url = unescape(req.body.url.trim());
				if (req.body.nickname) req.body.nickname = unescape(req.body.nickname.trim());				
				//Now we edit user
				let avatar;
				if (req.file) avatar = req.file;
				//Get username
				try {											
					const userdata = await user.editUser(req.authToken.username,req.body,avatar,req.authToken.role);
					emitWS('userUpdated',req.params.user_id);
					res.json(OKMessage(userdata,'USER_UPDATED',userdata.nickname));	
				} catch(err) {
					res.statusCode = 500;
					res.json(errMessage('USER_UPDATE_ERROR',err.message,err.data));
				}
			} else {
				// Errors detected
				// Sending BAD REQUEST HTTP code and error object.
				res.statusCode = 400;
				res.json(validationErrors);
			}
		});		

	router.route('/favorites')
	/**
 * @api {get} /public/favorites View own favorites
 * @apiName GetFavorites
 * @apiVersion 2.2.0
 * @apiGroup Favorites
 * @apiPermission own
 *
 * @apiParam {String} [filter] Filter list by this string.
 * @apiParam {Number} [from=0] Return only the results starting from this position. Useful for continuous scrolling. 0 if unspecified
 * @apiParam {Number} [size=999999] Return only x number of results. Useful for continuous scrolling. 999999 if unspecified.
 *
 * @apiSuccess {Object[]} data/content/karas Array of `kara` objects
 * @apiSuccess {Number} data/infos/count Number of karaokes in playlist
 * @apiSuccess {Number} data/infos/from Starting position of listing
 * @apiSuccess {Number} data/infos/to End position of listing
 *
 * @apiSuccessExample Success-Response:
 * HTTP/1.1 200 OK
 * {
 *   "data": {
 *       "content": [
 *           {
 *               "NORM_author": null,
 *               "NORM_creator": null,
 *               "NORM_pseudo_add": "Administrateur",
 *               "NORM_serie": "Dynasty Warriors 3",
 *               "NORM_serie_altname": "DW3/DW 3",
 *               "NORM_singer": null,
 *               "NORM_songwriter": null,
 *               "NORM_title": "Circuit",
 *               "author": null,
 *               "created_at": 1508423806,
 *               "creator": null,
 *               "duration": 0,
 *               "flag_blacklisted": 0,
 *               "flag_playing": 1,
 *               "flag_whitelisted": 0,
 *               "gain": 0,
 *               "kara_id": 176,
 *               "kid": "b0de301c-5756-49fb-b019-85a99a66586b",
 *               "language": "chi",
 *               "language_i18n": "Chinois",
 *               "mediafile": "CHI - Dynasty Warriors 3 - GAME ED - Circuit.avi"
 *               "misc": "TAG_VIDEOGAME",
 *               "misc_i18n": "Jeu vidéo",
 *               "playlistcontent_id": 4946,
 *               "pos": 1,
 *               "pseudo_add": "Administrateur",
 *               "serie": "Dynasty Warriors 3",
 * 				 "serie_i18n": {
 * 								"fre":"Guerriers de la Dynastie"
 * 								}
 *               "serie_altname": "DW3/DW 3",
 *               "singer": null,
 *               "songorder": 0,
 *               "songtype": "TYPE_ED",
 *               "songtype_i18n": "Ending",
 *               "songtype_i18n_short": "ED",
 *               "songwriter": null,
 *               "title": "Circuit",
 * 				 "username": "admin",
 *               "viewcount": 0,
 *               "year": ""
 *           },
 *           ...
 *       ],
 *       "infos": {
 *           "count": 3,
 * 			 "from": 0,
 * 			 "to": 120
 *       }
 *   }
 * }
 * @apiError FAVORITES_VIEW_ERROR Unable to fetch list of karaokes in favorites
 * @apiError WEBAPPMODE_CLOSED_API_MESSAGE API is disabled at the moment.
 * @apiErrorExample Error-Response:
 * HTTP/1.1 500 Internal Server Error
 * @apiErrorExample Error-Response:
 * HTTP/1.1 403 Forbidden
 */
		.get(getLang, requireAuth, requireWebappLimited, requireValidUser, updateUserLoginTime, async (req, res) => {
			
			let size = req.query.size || 999999;
			size = parseInt(size, 10);
			let from = req.query.from || 0;
			from = parseInt(from, 10);
			try {
				const karas = await favorites.getFavorites(req.authToken.username, req.query.filter, req.lang, from, size);
				res.json(OKMessage(karas));
			} catch(err) {
				logger.error(err);
				res.statusCode = 500;
				res.json(errMessage('FAVORITES_VIEW_ERROR',err));
			}			
		})
	/**
 * @api {post} /public/favorites Add karaoke to your favorites
 * @apiName PostFavorites
 * @apiVersion 2.1.0
 * @apiGroup Favorites
 * @apiPermission own
 *
 * @apiParam {Number} kara_id kara ID to add
 * @apiSuccess {Number} args/kara_id ID of kara added
 * @apiSuccess {Number} args/kara Name of kara added
 * @apiSuccess {Number} args/playlist_id ID of destinaton playlist
 * @apiSuccess {String} code Message to display
 *
 * @apiSuccessExample Success-Response:
 * HTTP/1.1 200 OK
 * {
 *   "args": {
 * 		 "kara": "Les Nuls - MV - Vous me subirez",
 *       "playlist_id": 1,
 *       "kara_id": 4946
 *   },
 *   "code": "FAVORITES_ADDED",
 *   "data": null
 * }
 * @apiError FAVORITES_ADD_SONG_ERROR Unable to add songs to the playlist
 * @apiError WEBAPPMODE_CLOSED_API_MESSAGE API is disabled at the moment.
 * @apiErrorExample Error-Response:
 * HTTP/1.1 500 Internal Server Error
 * {
 *   "args": null,
 *   "code": "FAVORITES_ADD_SONG_ERROR",
 *   "message": "Karaoke unknown"
 * }
 * @apiErrorExample Error-Response:
 * HTTP/1.1 403 Forbidden
 */
		.post(getLang, requireAuth, requireWebappLimited, requireValidUser, updateUserLoginTime, async (req, res) => {			
			const validationErrors = check(req.body, {
				kara_id: {integerValidator: true}				
			});
			if (!validationErrors) {			
				req.body.kara_id = parseInt(req.body.kara_id, 10);
				try {
					const data = await favorites.addToFavorites(req.authToken.username,req.body.kara_id);
					emitWS('favoritesUpdated',req.authToken.username);
					emitWS('playlistInfoUpdated',data.playlist_id);
					emitWS('playlistContentsUpdated',data.playlist_id);
					res.json(OKMessage(null,'FAVORITES_ADDED',data));	
				} catch(err) {
					res.statusCode = 500;
					res.json(errMessage('FAVORITES_ADD_SONG_ERROR',err.message,err.data));
				}
								
			} else {
				// Errors detected
				// Sending BAD REQUEST HTTP code and error object.
				res.statusCode = 400;
				res.json(validationErrors);
			}
		})

		
	/**
 * @api {delete} /public/favorites/ Delete karaoke from your favorites
 * @apiName DeleteFavorites
 * @apiVersion 2.1.0
 * @apiGroup Favorites
 * @apiPermission public
 *
 * @apiParam {Number} kara_id Kara ID to delete
 * @apiSuccess {String} code Message to display
 *
 * @apiSuccessExample Success-Response:
 * HTTP/1.1 200 OK
 * {
 *   "args": null,
 *   "code": "FAVORITES_DELETED",
 *   "data": null
 * }
 * @apiError FAVORITES_DELETE_ERROR Unable to delete the favorited song
 * @apiError WEBAPPMODE_CLOSED_API_MESSAGE API is disabled at the moment.
 * @apiErrorExample Error-Response:
 * HTTP/1.1 500 Internal Server Error
 * {
 *   "args": null,
 *   "code": "FAVORITES_DELETE_ERROR",
 *   "message": "Kara ID unknown"
 * }
 * @apiErrorExample Error-Response:
 * HTTP/1.1 403 Forbidden
 */
		.delete(getLang, requireAuth, requireWebappLimited, requireValidUser, updateUserLoginTime, async (req, res) => {
			// Delete kara from favorites
			// Deletion is through kara ID.			
			const validationErrors = check(req.body, {
				kara_id: {integerValidator: true}				
			});
			if (!validationErrors) {			
				req.body.kara_id = parseInt(req.body.kara_id, 10);			
				try {					
					const data = await favorites.deleteFavorite(req.authToken.username,req.body.kara_id);
					emitWS('favoritesUpdated',req.authToken.username);
					emitWS('playlistContentsUpdated',data.playlist_id);
					emitWS('playlistInfoUpdated',data.playlist_id);
					res.statusCode = 200;
					res.json(OKMessage(null,'FAVORITE_DELETED',data));
				} catch(err) {
					
					res.statusCode = 500;
					res.json(errMessage('FAVORITE_DELETE_ERROR',err.message,err.data));
				}
			}
			
		});
	router.route('/favorites/export')
	/**
 * @api {get} /favorites/export Export favorites
 * @apiDescription Export format is in JSON. You'll usually want to save it to a file for later use.
 * @apiName getFavoritesExport
 * @apiVersion 2.2.0
 * @apiGroup Favorites
 * @apiPermission public 
 * @apiSuccess {String} data Playlist in an exported format. See docs for more info.
 *
 * @apiSuccessExample Success-Response:
 * HTTP/1.1 200 OK
 * {
 *   "data": {
 *       "Header": {
 *           "description": "Karaoke Mugen Playlist File",
 *           "version": 2
 *       },
 *       "PlaylistContents": [
 *           {
 *               "flag_playing": 1,
 *               "kid": "b0de301c-5756-49fb-b019-85a99a66586b"
 *           },
 *           {
 *               "kid": "6da96a7d-7159-4ea7-a5ee-1d78a6eb44dd"
 *           },
 *           {
 *               "kid": "5af7ba4c-2325-451d-a24f-e7fd7c2d3ba8"
 *           },
 *           {
 *               "kid": "e0206f48-0f51-44e3-bf9a-b651916d0c05"
 *           }
 *       ],
 *       "PlaylistInformation": {
 *           "created_at": 1508936812,
 *           "flag_visible": 0,
 *           "modified_at": 1508936821,
 *           "name": "Test",
 *           "time_left": 0
 *       }
 *   }
 * }
 * @apiError FAVORITES_EXPORT_ERROR Unable to export favorites
 *
 * @apiErrorExample Error-Response:
 * HTTP/1.1 500 Internal Server Error
 * {
 *   "code": "FAVORITES_EXPORT_ERROR" 
 * }
 */		
		.get(getLang, requireAuth, requireValidUser, updateUserLoginTime, requireWebappLimited, async (req, res) => {
			// Returns the playlist and its contents in an exportable format (to save on disk)
			try {
				const playlist = await favorites.exportFavorites(req.authToken);
				// Not sending JSON : we want to send a string containing our text, it's already in stringified JSON format.
				res.json(OKMessage(playlist));
			} catch(err) {
				
				res.statusCode = 500;
				res.json(errMessage('FAVORITES_EXPORT_ERROR',err.message,err.data));
			}
		});
	router.route('/favorites/import')
	/**
 * @api {post} /favorites/import Import favorites
 * @apiName postFavoritesImport
 * @apiVersion 2.2.0
 * @apiGroup Favorites
 * @apiPermission public
 *
 * @apiSuccess {String} playlist Playlist in JSON form, following Karaoke Mugen's file format. See docs for more info.
 *
 * @apiSuccessExample Success-Response:
 * HTTP/1.1 200 OK
 * {
 *   "code": "FAVORITES_IMPORTED",
 *   "data": {
 *       "message": "Favorites imported",
 *       "unknownKaras": []
 *   }
 * }
 * @apiError FAVORITES_IMPORT_ERROR Unable to import playlist
 *
 * @apiErrorExample Error-Response:
 * HTTP/1.1 500 Internal Server Error
 * {
 *   "code": "FAVORITES_IMPORT_ERROR",
 *   "message": "No header section"
 * }
 */		
		.post(getLang, requireAuth, requireValidUser, updateUserLoginTime, requireWebappLimited, async (req, res) => {
			// Imports a playlist and its contents in an importable format (posted as JSON data)
			const validationErrors = check(req.body, {
				playlist: {isJSON: true}				
			});
			if (!validationErrors) {			
				try {	
					const data = await favorites.importFavorites(JSON.parse(req.body.playlist),req.authToken);
					const response = {
						message: 'Favorites imported',
						playlist_id: data.playlist_id
					};
					if (data.karasUnknown) response.unknownKaras = data.karasUnknown;							
					emitWS('playlistsUpdated');
					res.json(OKMessage(response,'PL_IMPORTED',data.playlist_id));
				} catch(err) {
					res.statusCode = 500;
					res.json(errMessage('PL_IMPORT_ERROR',err));
				}
			} else {
				// Errors detected
				// Sending BAD REQUEST HTTP code and error object.
				res.statusCode = 400;
				res.json(validationErrors);
			}
			
		});
	router.route('/users')
	/**
 * @api {get} /public/users List users
 * @apiName GetUsers
 * @apiVersion 2.1.0
 * @apiGroup Users
 * @apiPermission public
 *
 * @apiSuccess {String} data/login User's login
 * @apiSuccess {String} data/nickname User's nickname
 * @apiSuccess {String} data/NORM_nickname User's normalized nickname (deburr'ed)
 * @apiSuccess {String} [data/avatar_file] Directory and name of avatar image file. Can be empty if no avatar has been selected.
 * @apiSuccess {Number} data/flag_admin Is the user Admin ?
 * @apiSuccess {Number} data/flag_online Is the user an online account ?
 * @apiSuccess {Number} data/type Type of account (1 = user, 2 = guest)
 * @apiSuccess {Number} data/last_login Last login time in UNIX timestamp.
 * @apiSuccess {Number} data/user_id User's ID in the database
 *
 * @apiSuccessExample Success-Response:
 * HTTP/1.1 200 OK
 * {
 *   "data": [
 *       {
 *           "NORM_nickname": "Administrator",
 *           "avatar_file": "",
 *           "flag_admin": 1,
 *           "flag_online": 0,
 *           "type": 1,
 *           "last_login": 0,
 *           "login": "admin",
 *           "nickname": "Administrator",
 *           "user_id": 1
 *       },
 *       {
 *           "NORM_nickname": "test",
 *           "avatar_file": "user/3.jpg",
 *           "flag_admin": 0,
 *           "flag_online": 0,
 *           "type": 1,
 *           "last_login": 1511953198,
 *           "login": "test",
 *           "nickname": "test",
 *           "user_id": 3
 *       }
 *   ]
 * }
 * @apiError USER_LIST_ERROR Unable to list users
 * @apiError WEBAPPMODE_CLOSED_API_MESSAGE API is disabled at the moment.
 * @apiErrorExample Error-Response:
 * HTTP/1.1 500 Internal Server Error
 * {
 *   "code": "USER_LIST_ERROR",
 *   "message": null
 * }
 * @apiErrorExample Error-Response:
 * HTTP/1.1 403 Forbidden
 */
		.get(getLang, requireAuth, requireWebappLimited, requireValidUser, updateUserLoginTime, async (req, res) => {
			try {
				const users = await	user.listUsers();
				res.json(OKMessage(users));
			} catch(err) {
				logger.error(err);
				res.statusCode = 500;
				res.json(errMessage('USER_LIST_ERROR',err));
			}
		})

	/**
 * @api {post} /public/users Create new user
 * @apiName PostUser
 * @apiVersion 2.1.0
 * @apiGroup Users
 * @apiPermission public
 *
 * @apiParam {String} login Login name for the user
 * @apiParam {String} password Password for the user
 * @apiSuccess {String} code Message to display
 * @apiSuccess {Boolean} data Returns `true` if success
 *
 * @apiSuccessExample Success-Response:
 * HTTP/1.1 200 OK
 * {
 *   "code": "USER_CREATED",
 *   "data": true
 * }
 * @apiError USER_CREATE_ERROR Unable to create user
 * @apiError USER_ALREADY_EXISTS This username already exists 
 * @apiError WEBAPPMODE_CLOSED_API_MESSAGE API is disabled at the moment.
 * @apiError USER_ALREADY_EXISTS This username already exists
 *
 * @apiErrorExample Error-Response:
 * HTTP/1.1 500 Internal Server Error
 * {
 *   "args": "Axel",
 *   "code": "USER_ALREADY_EXISTS",
 *   "message": null
 * }
 * @apiErrorExample Error-Response:
 * HTTP/1.1 403 Forbidden
 */

		.post(requireWebappLimitedNoAuth, async (req, res) => {
			//Validate form data
			const validationErrors = check(req.body, {
				login: {presence: true},
				password: {presence: true}
			});
			if (!validationErrors) {			
				req.body.login = unescape(req.body.login.trim());
				// No errors detected
				try {						
					await user.createUser({...req.body, flag_admin: 0});
					res.json(OKMessage(true,'USER_CREATED'));
				} catch(err) {
					res.statusCode = 500;
					res.json(errMessage(err.code,err.message));
				}
			} else {
				// Errors detected
				// Sending BAD REQUEST HTTP code and error object.
				res.statusCode = 400;								
				res.json(validationErrors);
			}
		});		
	router.route('/songpoll')
	/**
 * @api {get} public/songpoll Get current poll status
 * @apiName GetPoll
 * @apiVersion 2.1.0
 * @apiGroup Song Poll
 * @apiPermission public
 *
 * @apiParam {String} [lang] ISO639-2B code of client's language (to return translated 
 * @apiParam {Number} [from=0] Return only the results starting from this position. Useful for continuous scrolling. 0 if unspecified
 * @apiParam {Number} [size=999999] Return only x number of results. Useful for continuous scrolling. 999999 if unspecified.* @apiSuccess {String} code Message to display

 * @apiSuccess {Array} data/poll Array of Playlistcontents objects (see `/public/playlist/current/karas` for sample)
 * @apiSuccess {Number} data/poll/votes Number of votes this song has earned
 * @apiSuccess {Boolean} data/flag_uservoted Has the user already voted for this poll?
 * @apiSuccessExample Success-Response:
 * HTTP/1.1 200 OK
 * {
 *   "data": {
 *       "flag_uservoted": false,
 *       "infos": {
 *           "count": 4,
 *           "from": 0,
 *           "to": 999999
 *       },
 *       "poll": [
 *           {
 *               "NORM_author": null,
 *               "NORM_creator": "MADHOUSE",
 *               "NORM_pseudo_add": "Administrator",
 *               "NORM_serie": "Death Parade",
 *               "NORM_serie_altname": null,
 *               "NORM_singer": "NoisyCell",
 *               "NORM_songwriter": "Ryosuke,Ryo",
 *               "NORM_title": "Last Theater",
 *               "author": null,
 *               "created_at": 1520026875.38,
 *               "creator": "MADHOUSE",
 *               "duration": 71,
 *               "flag_blacklisted": 0,
 *               "flag_dejavu": 0,
 *               "flag_playing": 0,
 *               "flag_whitelisted": 0,
 *               "gain": -8.62,
 *               "kara_id": 1452,
 *               "kid": "75b80966-ac1e-42db-bf2f-b97e0d84fe1d",
 *               "language": "eng",
 *               "language_i18n": "Anglais",
 *               "lastplayed_at": null,
 *               "misc": null,
 *               "misc_i18n": null,
 *               "playlistcontent_id": 19,
 *               "pos": 14,
 *               "pseudo_add": "Administrator",
 *               "serie": "Death Parade",
 *               "serie_altname": null,
 *               "singer": "NoisyCell",
 *               "songorder": 1,
 *               "songtype": "TYPE_ED",
 *               "songtype_i18n": "Ending",
 *               "songtype_i18n_short": "ED",
 *               "songwriter": "Ryosuke,Ryo",
 *               "title": "Last Theater",
 *               "username": "admin",
 *               "videofile": "ANG - Death Parade - ED1 - Last Theater.avi",
 *               "viewcount": 0,
 *               "votes": 0,
 *               "year": "2015"
 *           },
 *           ...
 *       ]
 *   }
 * }
 * @apiError POLL_LIST_ERROR Unable to list current poll
 * @apiError POLL_NOT_ACTIVE No poll is in progress
 * @apiError POLL_ALREADY_VOTED This user has already voted
 *
 * @apiErrorExample Error-Response:
 * HTTP/1.1 500 Internal Server Error
 * {
 *   "code": "POLL_LIST_ERROR",
 *   "message": null
 * }
 */
		.get(getLang, requireAuth, requireValidUser, updateUserLoginTime, async (req, res) => {
			let size = req.query.size || 999999;
			size = parseInt(size, 10);
			let from = req.query.from || 0;
			from = parseInt(from, 10);			
			try {
				const pollResult = await poll.getPoll(req.body.authToken,req.lang,from,size);
				res.json(OKMessage(pollResult));
			} catch(err) {
				res.statusCode = 500;
				res.json(errMessage(err.code));
			};
		})
	/**
 * @api {post} public/songpoll Vote in a poll
 * @apiName PostPoll
 * @apiVersion 2.1.0
 * @apiGroup Song Poll
 * @apiPermission public
 *
 * @apiParam {Number} [playlistcontent_id] PLC ID to vote for
 
 * @apiSuccess {Array} data/poll Array of Playlistcontents objects (see `/public/playlist/current/karas` for sample)
 * @apiSuccess {Number} data/poll/votes Number of votes this song has earned
 * @apiSuccess {Boolean} data/flag_uservoted Has the user already voted for this poll?
 * @apiSuccessExample Success-Response:
 * HTTP/1.1 200 OK
 * {
 *   "data": {
 *       "flag_uservoted": false,
 *       "infos": {
 *           "count": 4,
 *           "from": 0,
 *           "to": 999999
 *       },
 *       "poll": [
 *           {
 *               "NORM_author": null,
 *               "NORM_creator": "MADHOUSE",
 *               "NORM_pseudo_add": "Administrator",
 *               "NORM_serie": "Death Parade",
 *               "NORM_serie_altname": null,
 *               "NORM_singer": "NoisyCell",
 *               "NORM_songwriter": "Ryosuke,Ryo",
 *               "NORM_title": "Last Theater",
 *               "author": null,
 *               "created_at": 1520026875.38,
 *               "creator": "MADHOUSE",
 *               "duration": 71,
 *               "flag_blacklisted": 0,
 *               "flag_dejavu": 0,
 *               "flag_playing": 0,
 *               "flag_whitelisted": 0,
 *               "gain": -8.62,
 *               "kara_id": 1452,
 *               "kid": "75b80966-ac1e-42db-bf2f-b97e0d84fe1d",
 *               "language": "eng",
 *               "language_i18n": "Anglais",
 *               "lastplayed_at": null,
 *               "misc": null,
 *               "misc_i18n": null,
 *               "playlistcontent_id": 19,
 *               "pos": 14,
 *               "pseudo_add": "Administrator",
 *               "serie": "Death Parade",
 *               "serie_altname": null,
 *               "singer": "NoisyCell",
 *               "songorder": 1,
 *               "songtype": "TYPE_ED",
 *               "songtype_i18n": "Ending",
 *               "songtype_i18n_short": "ED",
 *               "songwriter": "Ryosuke,Ryo",
 *               "title": "Last Theater",
 *               "username": "admin",
 *               "videofile": "ANG - Death Parade - ED1 - Last Theater.avi",
 *               "viewcount": 0,
 *               "votes": 0,
 *               "year": "2015"
 *           },
 *           ...
 *       ]
 *   }
 * }
 * @apiError POLL_LIST_ERROR Unable to list current poll
 * @apiError POLL_NOT_ACTIVE No poll is in progress
 * @apiError POLL_ALREADY_VOTED This user has already voted
 *
 * @apiErrorExample Error-Response:
 * HTTP/1.1 500 Internal Server Error
 * {
 *   "code": "POLL_LIST_ERROR",
 *   "message": null
 * }
 */
		.post(getLang, requireAuth, requireValidUser, updateUserLoginTime, async (req, res) => {
			//Validate form data
			const validationErrors = check(req.body, {
				playlistcontent_id: {presence: true, numbersArrayValidator: true}				
			});
			if (!validationErrors) {			
				// No errors detected
				req.body.playlistcontent_id = parseInt(req.body.playlistcontent_id, 10);					
				try {

					const ret = await poll.addPollVote(req.body.playlistcontent_id,req.body.AuthToken);
					emitWS('songPollUpdated', ret.data);
					res.json(OKMessage(null,ret.code,ret.data));
				} catch(err) {
					res.statusCode = 500;
					res.json(errMessage(err.code,err.message));
				}	
							
			} else {
				// Errors detected
				// Sending BAD REQUEST HTTP code and error object.
				res.statusCode = 400;								
				res.json(validationErrors);
			}
		});
		
}
