const express = require('express');
const expressValidator = require('express-validator');
const logger = require('winston');
const bodyParser = require('body-parser');
const basicAuth = require('express-basic-auth');

function numberTest(element) {
	if (isNaN(element)) {
		return false;
	} else {
		return true;
	}
}

function errMessage(code,message,args) {
	//console.log(code+','+args+','+message);
	return {
		code: code,
		args: args,
		message: message
	};	
}

function OKMessage(data,code,args) {
	//console.log(code+','+JSON.stringify(args)+','+JSON.stringify(data));
	return {
		code: code,
		args: args,		
		data: data,		
	};
}

module.exports = {
	SYSPATH:null,
	SETTINGS:null,
	LISTEN:null,
	DB_INTERFACE:null,
	_server:null,
	_engine_states:{},
	_local_states:{},
	init:function() {
		return new Promise(function(resolve){
			if(module.exports.SYSPATH === null) {
				logger.error('SysPath is null!');
				process.exit();
			}
			if(module.exports.SETTINGS === null) {
				logger.error('SETTINGS is null!');
				process.exit();
			}
			if(module.exports.LISTEN === null) {
				logger.error('LISTEN is null!');
				process.exit();
			}
			if(module.exports.DB_INTERFACE === null) {
				logger.error('DB_INTERFACE is null!');
				process.exit();
			}

			var app = express();
			app.use(bodyParser.urlencoded({ extended: true, limit: '50mb' }));
			app.use(bodyParser.json());			
			// Calling express validator with a custom validator, used for the player commands
			// to check if they're from the allowed list.
			// We use another custom validator to test for array of numbers
			// used mainly with adding/removing lists of karaokes
			app.use(expressValidator({
				customValidators: {
					enum: (input, options) => options.includes(input),
					numbersArray: function(input) {
						if (input) {
							if (typeof input === 'string' && input.includes(',')) {
								var array = input.split(',');
								return array.some(numberTest);
							} else {
								return numberTest(input);
							}
						} else {
							return false;
						}

					}
				}
			}));
			var routerPublic = express.Router();
			var routerAdmin = express.Router();

			app.listen(module.exports.LISTEN, function () {
				logger.info('[API] API server is READY and listens on port '+module.exports.LISTEN);
			});

			routerAdmin.use(basicAuth({ authorizer: AdminPasswordSetting }));
			routerAdmin.use(function(req,res,next) {
				next();
			});
			function AdminPasswordSetting(username, password){
				return password === module.exports.SETTINGS.AdminPassword;
			}

			routerPublic.use(function(req, res, next) {
				// do logging
				//logger.info('API_LOG',req)
				next(); // make sure we go to the next routes and don't stop here
			});

			routerPublic.get('/', function (req, res) {
				res.send('Hello World!');
			});

			// Rules :
			// version of the API is decided in the path
			// Example : /v1/, /v2/, etc.
			// We output JSON only.

			// Validators & sanitizers :
			// https://github.com/chriso/validator.js

			// Reminder of HTTP codes:
			// 200 : OK
			// 201 : CREATED
			// 404 : NOT FOUND
			// 400 : BAD REQUEST
			// 500 : INTERNAL ERROR
			// 403 : FORBIDDEN

			// In case of error, return the correct code and object 'error'

			// Admin routes
			/**
 * @api {post} admin/shutdown Shutdown the entire application
 * @apiName PostShutdown
 * @apiGroup Admin-Main
 * @apiVersion 1.0.0
 *
 * @apiSuccess {String} Shutdown in progress.
 *
 * @apiSuccessExample Success-Response:
 * HTTP/1.1 200 OK
 * "Shutdown in progress."
 * 
 */
			routerAdmin.route('/shutdown')
				.post(function(req,res){
					// Sends command to shutdown the app.

					module.exports.onShutdown()
						.then(function(){
							res.json('Shutdown in progress');
						})
						.catch(function(err){
							logger.error(err);
							res.statusCode = 500;
							res.json(err);
						});
				});
			routerAdmin.route('/playlists')
			/**
 * @api {get} admin/playlists/ Get list of playlists
 * @apiName GetPlaylists
 * @apiGroup Admin-Playlists
 * @apiVersion 1.0.0
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
 *           "length": 0,
 *           "modified_at": 1508408078,
 *           "name": "Liste de lecture courante",
 *           "num_karas": 6,
 *           "playlist_id": 1,
 *           "time_left": 0
 *       }
 *   ]
 * }
 * @apiError PL_LIST_ERROR Unable to fetch a list of playlists
 *
 * @apiErrorExample Error-Response:
 * HTTP/1.1 500 Internal Server Error
 */

				.get(function(req,res){
					// Get list of playlists
					module.exports.onPlaylists()
						.then(function(playlists){
							res.json(OKMessage(playlists));
						})
						.catch(function(err){
							logger.error(err);
							res.statusCode = 500;							
							res.json(errMessage('PL_LIST_ERROR',err));
						});
				})
			/**
 * @api {post} admin/playlists/ Create a playlist
 * @apiName PostPlaylist
 * @apiVersion 1.0.0
 * @apiGroup Admin-Playlists
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
				.post(function(req,res){

				// Add playlist
					req.check({
						'name': {
							in: 'body',
							notEmpty: true,
						},
						'flag_visible': {
							in: 'body',
							notEmpty: true,
							isBoolean: {
								errorMessage: 'Invalid visible flag (must be boolean)'
							}
						},
						'flag_public': {
							in: 'body',
							notEmpty: true,
							isBoolean: {
								errorMessage: 'Invalid public flag (must be boolean)'
							}
						},
						'flag_current': {
							in: 'body',
							notEmpty: true,
							isBoolean: {
								errorMessage: 'Invalid current flag (must be boolean)'
							}
						},
					});

					req.getValidationResult()
						.then(function(result){
							if (result.isEmpty()) {
								// No errors detected
								req.sanitize('name').trim();
								req.sanitize('name').unescape();
								req.sanitize('flag_visible').toBoolean();
								req.sanitize('flag_public').toBoolean();
								req.sanitize('flag_current').toBoolean();

								//Now we add playlist
								module.exports.onPlaylistCreate(req.body)
									.then(function(new_playlist){
										module.exports.emitEvent('playlistsUpdated');
										res.statusCode = 201;
										res.json(OKMessage(new_playlist,'PL_CREATED',req.body.name));
									})
									.catch(function(err){
										logger.error(err);
										res.statusCode = 500;
										res.json(errMessage('PL_CREATE_ERROR',err,req.body.name));
									});
							} else {
								// Errors detected
								// Sending BAD REQUEST HTTP code and error object.
								res.statusCode = 400;								
								res.json(result.mapped());
							}
						});
				});

			routerAdmin.route('/playlists/:pl_id([0-9]+)')
			/**
 * @api {post} admin/playlists/:pl_id Get playlist information
 * @apiName GetPlaylist
 * @apiGroup Admin-Playlists
 * @apiVersion 1.0.0
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
				.get(function(req,res){
					//Access :pl_id by req.params.pl_id
					// This get route gets infos from a playlist
					var playlist_id = req.params.pl_id;

					module.exports.onPlaylistSingleInfo(playlist_id)
						.then(function(playlist){
							res.json(OKMessage(playlist));
						})
						.catch(function(err){
							logger.error(err.message);
							res.statusCode = 500;
							res.json(errMessage('PL_VIEW_ERROR',err.message,err.data));
						});
				})
			/**
 * @api {put} admin/playlists/:pl_id Update a playlist's information
 * @apiName PutPlaylist
 * @apiVersion 1.0.0
 * @apiGroup Admin-Playlists
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
				.put(function(req,res){
					// Update playlist info

					req.check({
						'name': {
							in: 'body',
							notEmpty: true,
						},
						'flag_visible': {
							in: 'body',
							notEmpty: true,
							isBoolean: {
								errorMessage: 'Invalid visible flag (must be boolean)'
							}
						},
					});

					req.getValidationResult()
						.then(function(result){
							if (result.isEmpty()) {
								// No errors detected
								req.sanitize('name').trim();
								req.sanitize('name').unescape();
								req.sanitize('flag_visible').toBoolean();

								//Now we add playlist
								module.exports.onPlaylistSingleEdit(req.params.pl_id,req.body)
									.then(function(){
										module.exports.emitEvent('playlistInfoUpdated',req.params.pl_id);
										res.json(OKMessage(req.params.pl_id,'PL_UPDATED',req.params.pl_id));	
									})
									.catch(function(err){
										logger.error(err.message);
										res.statusCode = 500;
										res.json(errMessage('PL_UPDATE_ERROR',err.message,err.data));
									});
							} else {
								// Errors detected
								// Sending BAD REQUEST HTTP code and error object.
								res.statusCode = 400;
								res.json(result.mapped());
							}
						});
				})
			/**
 * @api {delete} admin/playlists/:pl_id Delete a playlist
 * @apiName DeletePlaylist
 * @apiVersion 1.0.0
 * @apiGroup Admin-Playlists
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
				.delete(function(req,res){					
					module.exports.onPlaylistSingleDelete(req.params.pl_id)
						.then(function(){
							module.exports.emitEvent('playlistsUpdated');
							res.json(OKMessage(req.params.pl_id,'PL_DELETED',req.params.pl_id));
						})
						.catch(function(err){
							logger.error(err.message);
							res.statusCode = 500;
							res.json(errMessage('PL_DELETE_ERROR',err.message,err.data));
						});
				});

			routerAdmin.route('/playlists/:pl_id([0-9]+)/empty')
			/**
 * @api {put} admin/playlists/:pl_id/empty Empty a playlist
 * @apiName PutEmptyPlaylist
 * @apiVersion 1.0.0
 * @apiGroup Admin-Playlists
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
				.put(function(req,res){
				// Empty playlist

					module.exports.onPlaylistSingleEmpty(req.params.pl_id)
						.then(function(){
							module.exports.emitEvent('playlistContentsUpdated',req.params.pl_id);
							res.json(OKMessage(req.params.pl_id,'PL_EMPTIED',req.params.pl_id));							
						})
						.catch(function(err){
							logger.error(err.message);
							res.statusCode = 500;
							res.json(errMessage('PL_EMPTY_ERROR',err.message,err.data));
							res.json(err);
						});
				});
			routerAdmin.route('/whitelist/empty')
			/**
 * @api {put} admin/whitelist/empty Empty whitelist
 * @apiName PutEmptyWhitelist
 * @apiVersion 1.0.0
 * @apiGroup Admin-Whitelist
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
				.put(function(req,res){
				// Empty whitelist

					module.exports.onWhitelistEmpty()
						.then(function(){
							module.exports.emitEvent('blacklistUpdated');
							module.exports.emitEvent('whitelistUpdated');
							res.json(OKMessage(null,'WL_EMPTIED'));							
						})
						.catch(function(err){
							logger.error(err);
							res.statusCode = 500;
							res.json(errMessage('WL_EMPTY_ERROR',err));						
						});
				});
			routerAdmin.route('/blacklist/criterias/empty')
			/**
 * @api {put} admin/blacklist/criterias/empty Empty list of blacklist criterias
 * @apiName PutEmptyBlacklist
 * @apiVersion 1.0.0
 * @apiGroup Admin-Blacklist
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
				.put(function(req,res){
				// Empty blacklist criterias

					module.exports.onBlacklistCriteriasEmpty()
						.then(function(){
							module.exports.emitEvent('blacklistUpdated');
							res.json(OKMessage(null,'BLC_EMPTIED'));							
						})
						.catch(function(err){
							logger.error(err);
							res.statusCode = 500;							
							res.json(errMessage('BLC_EMPTY_ERROR',err));
						});
				});
			routerAdmin.route('/playlists/:pl_id([0-9]+)/setCurrent')
			/**
 * @api {put} admin/playlists/:pl_id/setCurrent Set playlist to current
 * @apiName PutSetCurrentPlaylist
 * @apiVersion 1.0.0
 * @apiGroup Admin-Playlists
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
				.put(function(req,res){
					// set playlist to current

					module.exports.onPlaylistSingleSetCurrent(req.params.pl_id)
						.then(function(){
							module.exports.emitEvent('playlistInfoUpdated',req.params.pl_id);
							res.json(OKMessage(null,'PL_SET_CURRENT',req.params.pl_id));
						})
						.catch(function(err){
							logger.error(err.message);
							res.statusCode = 500;
							res.json(errMessage('PL_SET_CURRENT_ERROR',err.message,err.data));
						});
				});
			routerAdmin.route('/playlists/:pl_id([0-9]+)/setPublic')
			/**
 * @api {put} admin/playlists/:pl_id/setPublic Set playlist to public
 * @apiName PutSetPublicPlaylist
 * @apiVersion 1.0.0
 * @apiGroup Admin-Playlists
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
				.put(function(req,res){
					// Empty playlist

					module.exports.onPlaylistSingleSetPublic(req.params.pl_id)
						.then(function(){
							module.exports.emitEvent('playlistInfoUpdated',req.params.pl_id);
							res.json(OKMessage(null,'PL_SET_PUBLIC',req.params.pl_id));
						})
						.catch(function(err){
							logger.error(err.message);
							res.statusCode = 500;
							res.json(errMessage('PL_SET_PUBLIC_ERROR',err.message,err.data));
						});
				});
			routerAdmin.route('/playlists/:pl_id([0-9]+)/karas')
			/**
 * @api {get} admin/playlists/:pl_id/karas Get list of karaokes in a playlist
 * @apiName GetPlaylistKaras
 * @apiVersion 1.0.0
 * @apiGroup Admin-Playlists
 * 
 * @apiParam {Number} pl_id Target playlist ID.
 * @apiParam {String} filter Filter list by this string. (optional)
 * @apiParam {String} lang ISO639-2B code of client's language (to return translated text into the user's language)
 * @apiParam {Number} from Return only the results starting from this position. Useful for continuous scrolling. 0 if unspecified
 * @apiParam {Number} size Return only x number of results. Useful for continuous scrolling. 999999 if unspecified.
 * 
 * @apiSuccess {Object[]} data/content/karas Array of `kara` objects 
 * @apiSuccess {Number} data/infos/count Number of karaokes in playlist
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
 *               "misc": "TAG_VIDEOGAME",
 *               "misc_i18n": "Jeu vidéo",
 *               "playlistcontent_id": 4946,
 *               "pos": 1,
 *               "pseudo_add": "Administrateur",
 *               "serie": "Dynasty Warriors 3",
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
 *           "count": 3
 *       }
 *   }
 * }
 * @apiError PL_VIEW_SONGS_ERROR Unable to fetch list of karaokes in a playlist
 *
 * @apiErrorExample Error-Response:
 * HTTP/1.1 500 Internal Server Error
 */
				.get(function(req,res){
					//Access :pl_id by req.params.pl_id
					// This get route gets infos from a playlist
					var playlist_id = req.params.pl_id;
					var filter = req.query.filter;
					var lang = req.query.lang;
					var size;
					if (!req.query.size) {
						size = 999999;
					} else {
						size = parseInt(req.query.size);
					}
					var from;
					if (!req.query.from) {
						from = 0;
					} else {
						from = parseInt(req.query.from);
					}
					var seenFromUser = false;
					module.exports.onPlaylistSingleContents(playlist_id,filter,lang,seenFromUser,from,size)
						.then(function(playlist){							
							res.json(OKMessage(playlist));
						})
						.catch(function(err){
							logger.error(err.message);
							res.statusCode = 500;
							res.json(errMessage('PL_VIEW_SONGS_ERROR',err.message,err.data));
						});
				})
			/**
 * @api {post} admin/playlists/:pl_id/karas Add karaokes to playlist
 * @apiName PatchPlaylistKaras
 * @apiVersion 1.0.0
 * @apiGroup Admin-Playlists
 * 
 * @apiParam {Number} pl_id Target playlist ID.
 * @apiParam {Number[]} kara_id List of `kara_id` separated by commas (`,`). Example : `1021,2209,44,872`
 * @apiParam {Number} pos Position in target playlist where to copy the karaoke to. If not specified, will place karaokes at the end of target playlist. `-1` adds karaokes after the currently playing song in target playlist.
 * @apiParam {String} requestedby Name of user who added the song.
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
				.post(function(req,res){
					//add a kara to a playlist
					var playlist_id = req.params.pl_id;
					req.checkBody({
						'requestedby': {
							in: 'body',
							notEmpty: true,
						},
						'kara_id': {
							in: 'body',
							notEmpty: true,
							numbersArray: true,
						},
						'pos': {
							in: 'body',
							optional: true,
							isInt: true,
						}
					});

					req.getValidationResult()
						.then(function(result) {
							if (result.isEmpty()) {
								req.sanitize('requestedby').trim();
								req.sanitize('requestedby').unescape();
								req.sanitize('playlist_id').toInt();
								if (req.body.pos != undefined) req.sanitize('pos').toInt();
								module.exports.onKaraAddToPlaylist(req.body.kara_id,req.body.requestedby,playlist_id,req.body.pos)
									.then(function(result){
										module.exports.emitEvent('playlistInfoUpdated',playlist_id);
										module.exports.emitEvent('playlistContentsUpdated',playlist_id);
										res.statusCode = 201;		
										var args = {
											playlist: result.playlist
										};
										res.json(OKMessage(null,'PL_SONG_ADDED',args));
									})
									.catch(function(err){
										logger.error(err.message);
										res.statusCode = 500;
										res.json(errMessage('PL_ADD_SONG_ERROR',err.message,err.data));										
									});
							} else {
								// Errors detected
								// Sending BAD REQUEST HTTP code and error object.
								res.statusCode = 400;
								res.json(result.mapped());
							}
						});
				})
			/**
 * @api {patch} admin/playlists/:pl_id/karas Copy karaokes to another playlist
 * @apiName PatchPlaylistKaras
 * @apiVersion 1.0.0
 * @apiGroup Admin-Playlists
 * 
 * @apiParam {Number} pl_id Target playlist ID.
 * @apiParam {Number[]} plc_id List of `playlistcontent_id` separated by commas (`,`). Example : `1021,2209,44,872`
 * @apiParam {Number} pos Position in target playlist where to copy the karaoke to. If not specified, will place karaokes at the end of target playlist
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
				.patch(function(req,res){
					//add karas from a playlist to another
					req.checkBody({
						'plc_id': {
							in: 'body',
							notEmpty: true,
							numbersArray: true,
						},
						'pos': {
							in: 'body',
							optional: true,
							isInt: true,
						}
					});

					req.getValidationResult()
						.then(function(result) {
							if (result.isEmpty()) {
								if (req.body.pos != undefined) req.sanitize('pos').toInt();
								module.exports.onKaraCopyToPlaylist(req.body.plc_id,req.params.pl_id,req.body.pos)
									.then(function(pl_id){
										module.exports.emitEvent('playlistContentsUpdated',pl_id);
										res.statusCode = 201;
										var args = {
											plc_ids: req.body.plc_id.split(','),
											playlist_id: parseInt(req.params.pl_id)
										};
										res.json(OKMessage(null,'PL_SONG_MOVED',args));
									})
									.catch(function(err){
										logger.error(err.message);
										res.statusCode = 500;
										res.json(errMessage('PL_MOVE_SONG_ERROR',err.message,err.data));
									});
							} else {
								// Errors detected
								// Sending BAD REQUEST HTTP code and error object.
								res.statusCode = 400;
								res.json(result.mapped());
							}
						});
				})

			/**
 * @api {delete} admin/playlists/:pl_id/karas Delete karaokes to playlist
 * @apiName DeletePlaylistKaras
 * @apiVersion 1.0.0
 * @apiGroup Admin-Playlists
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
				.delete(function(req,res){
					// Delete kara from playlist
					// Deletion is through playlist content's ID.
					// There is actually no need for a playlist number to be used at this moment.
					req.checkBody({
						'plc_id': {
							in: 'body',
							notEmpty: true,
							numbersArray: true,
						}
					});

					req.getValidationResult()
						.then(function(result) {
							if (result.isEmpty()) {
								module.exports.onPlaylistSingleKaraDelete(req.body.plc_id,req.params.pl_id)
									.then(function(data){
										module.exports.emitEvent('playlistContentsUpdated',data.pl_id);
										module.exports.emitEvent('playlistInfoUpdated',data.pl_id);
										res.statusCode = 200;
										res.json(OKMessage(null,'PL_SONG_DELETED',data.pl_name));
									})
									.catch(function(err){
										logger.error(err.message);
										res.statusCode = 500;
										res.json(errMessage('PL_DELETE_SONG_ERROR',err.message,err.data));
									});
							} else {
								// Errors detected
								// Sending BAD REQUEST HTTP code and error object.
								res.statusCode = 400;
								res.json(result.mapped());
							}
						});
				});

			routerAdmin.route('/playlists/:pl_id([0-9]+)/karas/:plc_id([0-9]+)')
			/**
 * @api {get} admin/playlists/:pl_id/karas/:plc_id Get song info from a playlist
 * @apiName GetPlaylistPLC
 * @apiVersion 1.0.0
 * @apiGroup Admin-Playlists
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
 * @apiSuccess {Number} data/gain Calculated audio gain for the karaoke's video, in decibels (can be negative)
 * @apiSuccess {Number} data/kara_id Karaoke's ID in the main database
 * @apiSuccess {String} data/kid Karaoke's unique ID (survives accross database generations)
 * @apiSuccess {String} data/language Song's language in ISO639-2B format, separated by commas when a song has several languages
 * @apiSuccess {String} data/language_i18n Song's language translated in the client's native language
 * @apiSuccess {String} data/misc Internal tag list (`TAG_VIDEOGAME`, etc.)
 * @apiSuccess {String} data/misc_i18n Translated tag list
 * @apiSuccess {Number} data/playlist_id ID of playlist this song belongs to
 * @apiSuccess {Number} data/playlistcontent_ID PLC ID of this song.
 * @apiSuccess {Number} data/pos Position in the playlist. First song has a position of `1`
 * @apiSuccess {String} data/pseudo_add User who added/requested the song
 * @apiSuccess {String} data/serie Name of series/show the song belongs to
 * @apiSuccess {String} data/serie_altname Alternative name(s) of series/show this song belongs to. Names are separated by forward slashes (`/`)
 * @apiSuccess {String} data/singer Singer's name, if known.
 * @apiSuccess {Number} data/songorder Song's order, relative to it's type. Opening 1, Opening 2, Ending 1, Ending 2, etc.
 * @apiSuccess {String} data/songtype Song's type internal tag (`TYPE_OP`, `TYPE_ED`, `TYPE_IN` ...)
 * @apiSuccess {String} data/songtype_i18n Translated song's type (`Opening`, `Ending`, `Insert Song`...)
 * @apiSuccess {String} data/songtype_i18n_short Short translated version of the song's type (`OP`, `ED`, `IN`, ...)
 * @apiSuccess {Number} data/time_before_play Estimated time remaining before the song is going to play (in seconds). `0` if the song is currently playing or if there is no song selected as currently playing in the playlist (thus making this estimate impossible)
 * @apiSuccess {String} data/title Song's title
 * @apiSuccess {String} data/videofile Video's filename
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
 *           "gain": 0,
 *           "kara_id": 1007,
 *           "kid": "c05e24eb-206b-4ff5-88d4-74e8d5ad6f75",
 *           "language": "jpn",
 *           "language_i18n": "Japonais",
 *           "misc": null,
 *           "misc_i18n": null,
 *           "playlist_id": 2,
 *           "playlistcontent_id": 4961,
 *           "pos": 12,
 *           "pseudo_add": "Axel",
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
 *           "videofile": "JAP - C3 ~ Cube X Cursed X Curious - ED1 - Hana.avi",
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
				.get(function(req,res){
					module.exports.onPLCInfo(req.params.plc_id,req.query.lang)
						.then(function(kara){
							res.json(OKMessage(kara));
						})
						.catch(function(err){
							logger.error(err);
							res.statusCode = 500;
							res.json(errMessage('PL_VIEW_CONTENT_ERROR',err));
						});
				})
			/**
 * @api {put} admin/playlists/:pl_id/karas/:plc_id Update song in a playlist
 * @apiName PutPlaylistKara
 * @apiVersion 1.0.0
 * @apiGroup Admin-Playlists
 * 
 * @apiParam {Number} pl_id Playlist ID. **Note :** Irrelevant since `plc_id` is unique already.
 * @apiParam {Number} plc_id `playlistcontent_id` of the song to update
 * @apiParam {Number} pos Position in target playlist where to move the song to.
 * @apiParam {Number} flag_playing If set to 1, the select song will become the currently playing song.
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
				.put(function(req,res){
					//Update playlist's karaoke song
					//Params: position
					req.checkBody({
						'pos': {
							in: 'body',
							optional: true,
							isInt: true,
						},
						'flag_playing': {
							in: 'body',
							optional: true,
							isInt: true,
						}
					});

					req.getValidationResult()
						.then(function(result) {
							if (result.isEmpty()) {
								if (req.body.pos != undefined) req.sanitize('pos').toInt();
								if (req.body.flag_playing != undefined) req.sanitize('flag_playing').toInt();
								module.exports.onPlaylistSingleKaraEdit(req.params.plc_id,req.body.pos,req.body.flag_playing)
									.then(function(){
										// pl_id is returned from this promise
										res.json(OKMessage(req.params.plc_id,'PL_CONTENT_MODIFIED'));
									})
									.catch(function(err){
										logger.error(err);
										res.statusCode = 500;
										res.json(errMessage('PL_MODIFY_CONTENT_ERROR',err));
									});
							} else {
								// Errors detected
								// Sending BAD REQUEST HTTP code and error object.
								res.statusCode = 400;
								res.json(result.mapped());
							}
						});
				});

			routerAdmin.route('/settings')
			/**
 * @api {get} admin/settings Get settings
 * @apiName GetSettings
 * @apiVersion 1.0.0
 * @apiGroup Admin-Main
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
 *       "EngineJinglesInterval": "1",
 *       "EnginePrivateMode": "1",
 *       "EngineRepeatPlaylist": "0",
 *       "EngineSongsPerPerson": "10000",
 *       "PathAltname": "../times/series_altnames.csv",
 *       "PathBackgrounds": "app/backgrounds",
 *       "PathBin": "app/bin",
 *       "PathDB": "app/db",
 *       "PathDBKarasFile": "karas.sqlite3",
 *       "PathDBUserFile": "userdata.sqlite3",
 *       "PathJingles": "app/jingles",
 *       "PathKaras": "../times/karas",
 *       "PathSubs": "../times/lyrics",
 *       "PathTemp": "app/temp",
 *       "PathVideos": "app/data/videos",
 *       "PathVideosHTTP": "",
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
 *       "osHost": "10.202.40.43"
 *   }
 * }
 */
				.get(function(req,res){
					res.json(OKMessage(module.exports.SETTINGS));
				})
			/**
 * @api {put} admin/settings Update settings
 * @apiName PutSettings
 * @apiVersion 1.0.0
 * @apiGroup Admin-Main
 *
 * @apiParam {String} AdminPassword Administrator's password.
 * @apiParam {Number} EngineAllowNicknameChange Allow/disallow users to change their nickname once set.
 * @apiParam {Number} EngineAllowViewBlacklist Allow/disallow users to view blacklist contents from the guest interface
 * @apiParam {Number} EngineAllowViewWhitelist Allow/disallow users to view whitelist contents from the guest interface
 * @apiParam {Number} EngineAllowViewBlacklistCriterias Allow/disallow users to view blacklist criterias list from the guest interface
 * @apiParam {Number} EngineAllowAutoPlay Enable/disable AutoPlay feature (starts playing once a song is added to current playlist)
 * @apiParam {Number} EngineDisplayConnectionInfo Show/hide connection info during jingles or pauses (the "Go to http://" message) 
 * @apiParam {Number} EngineDisplayConnectionInfoHost Force IP/Hostname displayed during jingles or pauses in case autodetection returns the wrong IP
 * @apiParam {Number} EngineDisplayConnectionInfoMessage Add a small message before the text showing the URL to connect to
 * @apiParam {Number} EngineDisplayConnectionInfoQRCode Enable/disable QR Code during pauses inbetween two songs.
 * @apiParam {Number} EngineDisplayNickname Enable/disable displaying the username who requested a song.
 * @apiParam {Number} EngineJinglesInterval Interval in number of songs between two jingles. 0 to disable entirely.
 * @apiParam {Number} EnginePrivateMode 0 = Public Karaoke mode, 1 = Private Karaoke Mode. See documentation.
 * @apiParam {Number} EngineRepeatPlaylist Enable/disable auto repeat playlist when at end.
 * @apiParam {Number} EngineSongsPerPerson Number of songs allowed per person.
 * @apiParam {Number} PlayerFullscreen Enable/disable full screen mode
 * @apiParam {Number} PlayerNoBar 1 = Hide progress bar / 0 = Show progress bar
 * @apiParam {Number} PlayerNoHud 1 = Hide HUD / 0 = Show HUD
 * @apiParam {Number} PlayerPIP Enable/disable Picture-in-picture mode
 * @apiParam {String} PlayerPIPPositionX Horizontal position of PIP screen (`Left`/`Center`/`Right`) 
 * @apiParam {String} PlayerPIPPositionY Vertical position of PIP screen (`Top`/`Center`/`Bottom`)
 * @apiParam {Number} PlayerPIPSize Size in percentage of the PIP screen
 * @apiParam {Number} PlayerScreen Screen number to display the videos on. If screen number is not available, main screen is used. `9` means autodetection.
 * @apiParam {Number} PlayerStayOnTop Enable/disable stay on top of all windows.  
 * @apiSuccess {Object} data Contains all configuration settings. See example or documentation for what each setting does.
 *
 * @apiSuccessExample Success-Response:
 * HTTP/1.1 200 OK
 
 */
				.put(function(req,res){
					//Update settings
					req.checkBody({
						'AdminPassword': {
							in: 'body',
							notEmpty: true
						},
						'EngineAllowNicknameChange': {
							in: 'body',
							notEmpty: true,
							isBoolean: true,
						},
						'EngineAllowViewBlacklist': {
							in: 'body',
							notEmpty: true,
							isBoolean: true,
						},
						'EngineAllowViewWhitelist': {
							in: 'body',
							notEmpty: true,
							isBoolean: true,
						},
						'EngineAllowViewBlacklistCriterias': {
							in: 'body',
							notEmpty: true,
							isBoolean: true,
						},
						'EngineDisplayConnectionInfo': {
							in: 'body',
							notEmpty: true,
							isBoolean: true,
						},
						'EngineDisplayConnectionInfoHost': {
							in: 'body',
						},
						'EngineDisplayConnectionInfoMessage': {
							in: 'body',
						},
						'EngineDisplayConnectionInfoQRCode': {
							in: 'body',
							notEmpty: true,
							isBoolean: true,
						},
						'EngineDisplayNickname': {
							in: 'body',
							notEmpty: true,
							isBoolean: true,
						},
						'EnginePrivateMode': {
							in: 'body',
							notEmpty: true,
							isBoolean: true,
						},
						'EngineSongsPerPerson': {
							in: 'body',
							notEmpty: true,
							isInt: true,
						},
						'EngineJinglesInterval': {
							in: 'body',
							notEmpty: true,
							isInt: true,
						},
						'EngineRepeatPlaylist': {
							in: 'body',
							notEmpty: true,
							isInt: true,
						},
						'EngineAutoPlay': {
							in: 'body',
							notEmpty: true,
							isInt: true,
						},
						'PlayerFullscreen': {
							in: 'body',
							notEmpty: true,
							isBoolean: true,
						},
						'PlayerNoBar': {
							in: 'body',
							notEmpty: true,
							isBoolean: true,
						},
						'PlayerNoHud': {
							in: 'body',
							notEmpty: true,
							isBoolean: true,
						},
						'PlayerScreen': {
							in: 'body',
							notEmpty: true,
							isInt: true,
						},
						'PlayerStayOnTop': {
							in: 'body',
							notEmpty: true,
							isBoolean: true,
						},
						'PlayerPIP': {
							in: 'body',
							notEmpty: true,
							isBoolean: true,
						},
						'PlayerPIPSize': {
							in: 'body',
							notEmpty: true,
							isInt: true,
						}
					});

					req.checkBody('PlayerPIPPositionX')
						.notEmpty()
						.enum(['Left',
							'Center',
							'Right'
						]
						);
					req.checkBody('PlayerPIPPositionY')
						.notEmpty()
						.enum(['Top',
							'Center',
							'Bottom'
						]
						);

					req.getValidationResult().then(function(result) {
						if (result.isEmpty()) {
							req.sanitize('EngineAllowNicknameChange').toInt();
							req.sanitize('EngineAllowViewWhitelist').toInt();
							req.sanitize('EngineAllowViewBlacklist').toInt();
							req.sanitize('EngineAllowViewBlacklistCriterias').toInt();
							req.sanitize('EngineDisplayNickname').toInt();
							req.sanitize('EngineDisplayConnectionInfoQRCode').toInt();
							req.sanitize('EngineDisplayConnectionInfo').toInt();
							req.sanitize('EngineDisplayConnectionInfoMessage').trim();
							req.sanitize('EngineDisplayConnectionInfoMessage').unescape();
							req.sanitize('EngineDisplayConnectionInfoHost').trim();
							req.sanitize('EngineDisplayConnectionInfoHost').unescape();
							req.sanitize('EngineAutoPlay').toInt();
							req.sanitize('EngineRepeatPlaylist').toInt();
							req.sanitize('EngineJinglesInterval').toInt();
							req.sanitize('PlayerFullscreen').toInt();
							req.sanitize('PlayerNoBar').toInt();
							req.sanitize('PlayerNoHud').toInt();
							req.sanitize('PlayerStayOnTop').toInt();
							req.sanitize('PlayerScreen').toInt();
							req.sanitize('EngineSongsPerPerson').toInt();
							req.sanitize('EnginePrivateMode').toInt();
							req.sanitize('PlayerPIP').toInt();
							req.sanitize('PlayerPIPSize').toInt();
							req.sanitize('PlayerPIP').toInt();							
							var SETTINGS = req.body;
							module.exports.onSettingsUpdate(SETTINGS)
								.then(function(publicSettings){
									module.exports.emitEvent('settingsUpdated',publicSettings);
									res.json(OKMessage(module.exports.SETTINGS,'SETTINGS_UPDATED'));
								})
								.catch(function(err){
									logger.error(err);
									res.statusCode = 500;
									res.json(errMessage('SETTINGS_UPDATE_ERROR',err));
								});
						} else {
							// Errors detected
							// Sending BAD REQUEST HTTP code and error object.
							res.statusCode = 400;
							res.json(result.mapped());
						}
					});
				});

			routerAdmin.route('/player/message')
			/**
 * @api {post} admin/player/message Send a message to screen or users' devices
 * @apiName PostPlayerMessage
 * @apiVersion 1.0.0
 * @apiGroup Admin-Player
 * 
 * @apiParam {String} message Message to display
 * @apiParam {Number} duration (optional) Duration of message in miliseconds
 * @apiParam {String} destination (optional) `users` for user's devices, or `screen` for the screen on which the karaoke is running. Default is `screen`.
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
				.post(function(req,res){
					req.check({
						'duration': {
							in: 'body',
							isInt: true,
							optional: true
						},
						'message': {
							in: 'body',
							notEmpty: true,
						},
						'destination': {
							in: 'body',
							optional: true
						}
					});

					req.getValidationResult().then(function(result) {
						if (result.isEmpty()) {
							req.sanitize('duration').toInt();
							if(req.body.destination !== 'screen') {
								module.exports.emitEvent('adminMessage', req.body );
								if (req.body.destination === 'users') {
									res.statusCode = 200;
									res.json(OKMessage(req.body,'MESSAGE_SENT',req.body));
								}
							}
							if(req.body.destination !== 'users') {
								module.exports.onMessage(req.body.message,req.body.duration)
									.then(function(){
										res.statusCode = 200;
										res.json(OKMessage(req.body,'MESSAGE_SENT'));
									})
									.catch(function(err){
										logger.error(err);
										res.statusCode = 500;
										res.json(errMessage('MESSAGE_SEND_ERROR',err));
									});
							}
						} else {
							// Errors detected
							// Sending BAD REQUEST HTTP code and error object.
							res.statusCode = 400;
							res.json(result.mapped());
						}
					});
				});

			routerAdmin.route('/whitelist')
			/**
 * @api {get} admin/whitelist Get whitelist
 * @apiName GetWhitelist
 * @apiVersion 1.0.0
 * @apiGroup Admin-Whitelist
 * 
 * @apiParam {String} filter Filter list by this string. (optional)
 * @apiParam {String} lang ISO639-2B code of client's language (to return translated text into the user's language)
 * @apiParam {Number} from Return only the results starting from this position. Useful for continuous scrolling. 0 if unspecified
 * @apiParam {Number} size Return only x number of results. Useful for continuous scrolling. 999999 if unspecified.* @apiSuccess {String} code Message to display
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
 *               "serie": null,
 *               "serie_altname": null,
 *               "singer": "Dschinghis Khan",
 *               "songorder": 0,
 *               "songtype": "TYPE_MUSIC",
 *               "songtype_i18n": "Music Video",
 *               "songtype_i18n_short": "MV",
 *               "songwriter": "Ralph Siegel",
 *               "title": "Moskau",
 *               "videofile": "ALL - Dschinghis Khan - MV - Moskau.avi",
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
				.get(function(req,res){
					var lang = req.query.lang;
					var filter = req.query.filter;
					var size;
					if (!req.query.size) {
						size = 999999;
					} else {
						size = parseInt(req.query.size);
					}
					var from;
					if (!req.query.from) {
						from = 0;
					} else {
						from = parseInt(req.query.from);
					}
					module.exports.onWhitelist(filter,lang,from,size)
						.then(function(karas){
							res.json(OKMessage(karas));
						})
						.catch(function(err){
							logger.error(err);
							res.statusCode = 500;
							res.json(errMessage('WL_VIEW_ERROR',err));
						});
				})
			/**
 * @api {post} admin/whitelist Add song to whitelist
 * @apiName PostWhitelist
 * @apiVersion 1.0.0
 * @apiGroup Admin-Whitelist
 * 
 * @apiParam {Number[]} kara_id Karaoke song IDs, separated by commas
 * @apiSuccess {Number} args Arguments associated with message
 * @apiSuccess {Number} code Message to display
 * @apiSuccess {Number[]} data/kara_id List of karaoke IDs separated by commas
 *
 * @apiSuccessExample Success-Response:
 * HTTP/1.1 200 OK
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
				.post(function(req,res){
					req.check({
						'kara_id': {
							in: 'body',
							notEmpty: true,
							numbersArray: true,
						},						
					});
					req.getValidationResult().then(function(result) {
						if (result.isEmpty()) {							
							module.exports.onKaraAddToWhitelist(req.body.kara_id)
								.then(function(){
									module.exports.emitEvent('whitelistUpdated');
									module.exports.emitEvent('blacklistUpdated');
									res.statusCode = 201;
									res.json(OKMessage(req.body,'WL_SONG_ADDED',req.body.kara_id));									
								})
								.catch(function(err){
									logger.error(err.message);
									res.statusCode = 500;
									res.json(errMessage('WL_ADD_SONG_ERROR',err.message,err.data));
								});
						} else {
							// Errors detected
							// Sending BAD REQUEST HTTP code and error object.
							res.statusCode = 400;
							res.json(result.mapped());
						}
					});
				})
			/**
 * @api {delete} admin/whitelist Delete whitelist item
 * @apiName DeleteWhitelist
 * @apiVersion 1.0.0
 * @apiGroup Admin-Whitelist
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
				.delete(function(req,res){
					//Delete kara from whitelist
					// Deletion is through whitelist ID.
					req.checkBody({
						'wlc_id': {
							in: 'body',
							notEmpty: true,
							numbersArray: true,
						}
					});
					req.getValidationResult().then(function(result) {
						if (result.isEmpty()) {
							module.exports.onWhitelistSingleKaraDelete(req.body.wlc_id)
								.then(function(){
									module.exports.emitEvent('whitelistUpdated');
									module.exports.emitEvent('blacklistUpdated');
									res.json(OKMessage(req.body.wlc_id,'WL_SONG_DELETED',req.body.wlc_id));							
								})
								.catch(function(err){
									logger.error(err);
									res.statusCode = 500;
									res.json(errMessage('WL_DELETE_SONG_ERROR',err));
								});
						} else {
							// Errors detected
							// Sending BAD REQUEST HTTP code and error object.
							res.statusCode = 400;
							res.json(result.mapped());
						}
					});
				});

			routerAdmin.route('/blacklist')
 /*
 * @api {get} admin/blacklist Get blacklist
 * @apiName GetBlacklist
 * @apiVersion 1.0.0
 * @apiGroup Admin-Blacklist
 * 
 * @apiParam {String} filter Filter list by this string. (optional)
 * @apiParam {String} lang ISO639-2B code of client's language (to return translated text into the user's language)
 * @apiParam {Number} from Return only the results starting from this position. Useful for continuous scrolling. 0 if unspecified
 * @apiParam {Number} size Return only x number of results. Useful for continuous scrolling. 999999 if unspecified.* @apiSuccess {String} code Message to display
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
 *               "serie": "Capitaine Flam",
 *               "serie_altname": "Kyaputen Fyucha",
 *               "singer": "Richard Simon",
 *               "songorder": 0,
 *               "songtype": "TYPE_OP",
 *               "songtype_i18n": "Opening",
 *               "songtype_i18n_short": "OP",
 *               "songwriter": "Roger Dumas",
 *               "title": "",
 *               "videofile": "FR - Capitaine Flam - OP.avi",
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
				.get(function(req,res){
					var lang = req.query.lang;
					var filter = req.query.filter;
					var size;
					if (!req.query.size) {
						size = 999999;
					} else {
						size = parseInt(req.query.size);
					}
					var from;
					if (!req.query.from) {
						from = 0;
					} else {
						from = parseInt(req.query.from);
					}
					if (from < 0) from = 0;										
					module.exports.onBlacklist(filter,lang,from,size)
						.then(function(karas){
							res.json(OKMessage(karas));
						})
						.catch(function(err){
							logger.error(err);
							res.statusCode = 500;
							res.json(errMessage('BL_VIEW_ERROR',err));
						});
				});				
			routerAdmin.route('/blacklist/criterias')
/*
 * @api {get} admin/blacklist/criterias Get list of blacklist criterias
 * @apiName GetBlacklistCriterias
 * @apiVersion 1.0.0
 * @apiGroup Admin-Blacklist
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
				.get(function(req,res){
					//Get list of blacklisted karas
					module.exports.onBlacklistCriterias()
						.then(function(blc){
							res.json(OKMessage(blc));
						})
						.catch(function(err){
							logger.error(err);
							res.statusCode = 500;
							res.json(errMessage('BLC_VIEW_ERROR',err));
						});
				})
				.post(function(req,res){
					//Add blacklist criteria
					req.check({
						'blcriteria_type': {
							in: 'body',
							notEmpty: true,
							isInt: true,
						},
						'blcriteria_value': {
							in: 'body',
							notEmpty: true,							
						}
					});

					req.getValidationResult().then(function(result) {
						if (result.isEmpty()) {
							module.exports.onBlacklistCriteriaAdd(req.body.blcriteria_type,req.body.blcriteria_value)
								.then(function(){
									module.exports.emitEvent('blacklistUpdated');
									res.statusCode = 201;
									res.json(OKMessage(req.body,'BLC_ADDED',req.body));
								})
								.catch(function(err){
									logger.error(err);
									res.statusCode = 500;
									res.json(errMessage('BLC_ADD_ERROR',err));
								});
						} else {
							// Errors detected
							// Sending BAD REQUEST HTTP code and error object.
							res.statusCode = 400;
							res.json(result.mapped());
						}
					});
				});

			routerAdmin.route('/blacklist/criterias/:blc_id([0-9]+)')
				.delete(function(req,res){

					module.exports.onBlacklistCriteriaDelete(req.params.blc_id)
						.then(function(){
							module.exports.emitEvent('blacklistUpdated');
							res.json(OKMessage(req.params.blc_id,'BLC_DELETED',req.params.blc_id));							
						})
						.catch(function(err){
							logger.error(err);
							res.statusCode = 500;
							res.json(errMessage('BLC_DELETE_ERROR',err));	
						});
				})
				.put(function(req,res){
					//Update BLC
					req.check({
						'blcriteria_type': {
							in: 'body',
							notEmpty: true,
							isInt: true,
						},
						'blcriteria_value': {
							in: 'body',
							notEmpty: true,
						}
					});

					req.getValidationResult().then(function(result) {
						if (result.isEmpty()) {
							module.exports.onBlacklistCriteriaEdit(req.params.blc_id,req.body.blcriteria_type,req.body.blcriteria_value)
								.then(function(){
									module.exports.emitEvent('blacklistUpdated');
									res.json(OKMessage(req.body,'BLC_UPDATED',req.params.blc_id));
								})
								.catch(function(err){
									logger.error(err);
									res.statusCode = 500;
									res.json(errMessage('BLC_UPDATE_ERROR',err));
								});
						} else {
							// Errors detected
							// Sending BAD REQUEST HTTP code and error object.
							res.statusCode = 400;
							res.json(result.mapped());
						}
					});
				});

			routerAdmin.route('/player')
				.put(function(req,res){
					req.checkBody('command')
						.notEmpty()
						.enum(['play',
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
							'hideSubs',
						]
						);
					req.getValidationResult().then(function(result) {
						if (result.isEmpty()) {
							module.exports.onPlayerCommand(req.body.command,req.body.options)
								.then(function(){
									res.json(OKMessage(req.body,'COMMAND_SENT',req.body));
								})
								.catch(function(err){
									logger.error(err);
									res.statusCode = 500;
									res.json(errMessage('COMMAND_SEND_ERROR',err));
								});
						} else {
							// Errors detected
							// Sending BAD REQUEST HTTP code and error object.
							res.statusCode = 400;
							res.json(result.mapped());
						}
					});
				});


			routerAdmin.route('/playlists/:pl_id([0-9]+)/export')
				.get(function(req,res){
					// Returns the playlist and its contents in an exportable format (to save on disk)
					module.exports.onPlaylistExport(req.params.pl_id)
						.then(function(playlist){
							// Not sending JSON : we want to send a string containing our text, it's already in stringified JSON format.
							res.json(OKMessage(playlist));
						})
						.catch(function(err){
							logger.error(err.message);
							res.statusCode = 500;
							res.json(errMessage('PL_EXPORT_ERROR',err.message,err.data));
						});
				});
			routerAdmin.route('/playlists/import')
				.post(function(req,res){
					// Imports a playlist and its contents in an importable format (posted as JSON data)
					req.check({
						'playlist': {
							in: 'body',
							notEmpty: true,
							isJSON: true,
						}
					});
					req.getValidationResult().then(function(result) {
						if (result.isEmpty()) {
							module.exports.onPlaylistImport(JSON.parse(req.body.playlist))
								.then(function(result){
									
									var response = {
										message: 'Playlist imported',
										playlist_id: result.playlist_id
									};
									if (result.karasUnknown) {
										response.unknownKaras = result.karasUnknown;
									}
									module.exports.emitEvent('playlistsUpdated');
									res.json(OKMessage(response,'PL_IMPORTED',result.playlist_id));

								})
								.catch(function(err){
									logger.error(err);
									res.statusCode = 500;
									res.json(errMessage('PL_IMPORT_ERROR',err));
								});
						} else {
							// Errors detected
							// Sending BAD REQUEST HTTP code and error object.
							res.statusCode = 400;
							res.json(result.mapped());
						}
					});
				});


			routerAdmin.route('/playlists/:pl_id([0-9]+)/shuffle')
				.put(function(req,res){
					module.exports.onPlaylistShuffle(req.params.pl_id)
						.then(function(){
							module.exports.emitEvent('playlistContentsUpdated',req.params.pl_id);
							res.json(OKMessage(req.params.pl_id,'PL_SHUFFLED',req.params.pl_id));							
						})
						.catch(function(err){
							logger.error(err.message);
							res.statusCode = 500;
							res.json(errMessage('PL_SHUFFLE_ERROR',err.message,err.data));
						});
				});

			// Public routes


			routerPublic.route('/playlists')
				.get(function(req,res){
					// Get list of playlists, only return the visible ones
					var seenFromUser = true;
					module.exports.onPlaylists(seenFromUser)
						.then(function(playlists){
							res.json(OKMessage(playlists));
						})
						.catch(function(err){
							res.statusCode = 500;
							res.json(errMessage('PL_LIST_ERROR',err));	
						});
				});
			routerPublic.route('/playlists/:pl_id([0-9]+)')
				.get(function(req,res){
					// Get playlist, only if visible
					//Access :pl_id by req.params.pl_id
					// This get route gets infos from a playlist
					var seenFromUser = true;
					module.exports.onPlaylistSingleInfo(req.params.pl_id,seenFromUser)
						.then(function(playlist){							
							res.json(OKMessage(playlist));
						})
						.catch(function(err){
							logger.error(err.message);
							res.statusCode = 500;
							res.json(errMessage('PL_VIEW_ERROR',err.message,err.data));
						});
				});
			routerPublic.route('/playlists/:pl_id([0-9]+)/karas')
				.get(function(req,res){
					// Get playlist contents, only if visible
					//Access :pl_id by req.params.pl_id					
					var filter = req.query.filter;
					var lang = req.query.lang;
					var size;
					if (!req.query.size) {
						size = 999999;
					} else {
						size = parseInt(req.query.size);
					}
					var from;
					if (!req.query.from) {
						from = 0;
					} else {
						from = parseInt(req.query.from);
					}
					var seenFromUser = true;
					module.exports.onPlaylistSingleContents(req.params.pl_id,filter,lang,seenFromUser,from,size)
						.then(function(playlist){
							if (playlist == null) res.statusCode = 404;
							res.json(OKMessage(playlist));
						})
						.catch(function(err){
							logger.error(err.message);
							res.statusCode = 500;
							res.json(errMessage('PL_VIEW_SONGS_ERROR',err.message,err.data));
						});
				});

			routerPublic.route('/playlists/:pl_id([0-9]+)/karas/:plc_id([0-9]+)')
				.get(function(req,res){
					var seenFromUser = true;
					module.exports.onPLCInfo(req.params.plc_id,req.query.lang,seenFromUser)
						.then(function(kara){
							res.json(OKMessage(kara));
						})
						.catch(function(err){
							logger.error(err.message);
							res.statusCode = 500;
							res.json(errMessage('PL_VIEW_CONTENT_ERROR',err.message,err.data));
						});
				});
			routerPublic.route('/settings')
				.get(function(req,res){
					//We don't want to return all settings.
					var settings = {};
					for (var key in module.exports.SETTINGS) {
						if (module.exports.SETTINGS.hasOwnProperty(key)) {

							if (!key.startsWith('Path') &&
								!key.startsWith('Admin') &&
								!key.startsWith('Bin')
							) {
								settings[key] = module.exports.SETTINGS[key];
							}
						}
					}
					res.json(OKMessage(settings));
				});
			routerPublic.route('/stats')
				.get(function(req,res){
					module.exports.onStats()
						.then(function(stats){
							res.json(OKMessage(stats));
						})
						.catch(function(err){
							logger.error(err);
							res.statusCode = 500;
							res.json(errMessage('STATS_ERROR',err));
						});
				});

			routerPublic.route('/whitelist')
				.get(function(req,res){
					//Returns whitelist IF the settings allow public to see it
					if (module.exports.SETTINGS.EngineAllowViewWhitelist == 1) {
						var lang = req.query.lang;
						var filter = req.query.filter;
						var size;
						if (!req.query.size) {
							size = 999999;
						} else {
							size = parseInt(req.query.size);
						}
						var from;
						if (!req.query.from) {
							from = 0;
						} else {
							from = parseInt(req.query.from);
						}
						module.exports.onWhitelist(filter,lang,from,size)
							.then(function(karas){
								res.json(OKMessage(karas));
							})
							.catch(function(err){
								logger.error(err);
								res.statusCode = 500;
								res.json(errMessage('WL_VIEW_ERROR',err));
							});
					} else {
						res.StatusCode = 403;
						res.json(errMessage('WL_VIEW_FORBIDDEN'));
					}
				});

			routerPublic.route('/blacklist')
				.get(function(req,res){
					//Get list of blacklisted karas IF the settings allow public to see it
					if (module.exports.SETTINGS.EngineAllowViewBlacklist == 1) {
						var lang = req.query.lang;
						var filter = req.query.filter;
						var size;
						if (!req.query.size) {
							size = 999999;
						} else {
							size = parseInt(req.query.size);
						}
						var from;
						if (!req.query.from) {
							from = 0;
						} else {
							from = parseInt(req.query.from);
						}
						module.exports.onBlacklist(filter,lang,from,size)
							.then(function(karas){
								res.json(OKMessage(karas));
							})
							.catch(function(err){
								logger.error(err);
								res.statusCode = 500;
								res.json(errMessage('BL_VIEW_ERROR',err));
							});
					} else {
						res.StatusCode = 403;
						res.json(errMessage('BL_VIEW_FORBIDDEN'));
					}
				});

			routerPublic.route('/blacklist/criterias')
				.get(function(req,res){
					//Get list of blacklist criterias IF the settings allow public to see it
					if (module.exports.SETTINGS.EngineAllowViewBlacklistCriterias == 1) {
						module.exports.onBlacklistCriterias()
							.then(function(blc){
								res.json(OKMessage(blc));
							})
							.catch(function(err){
								logger.error(err);
								res.statusCode = 500;
								res.json(errMessage('BLC_VIEW_ERROR',err));
							});
					} else {
						res.StatusCode = 403;
						res.json(errMessage('BLC_VIEW_FORBIDDEN'));
					}
				});

			routerPublic.route('/player')
				.get(function(req,res){
					// Get player status
					// What's playing, time in seconds, duration of song

					//return status of the player

					module.exports.onPlayerStatus()
						.then(function(status){
							res.json(OKMessage(status));
						})
						.catch(function(err){
							logger.error(err);
							res.statusCode = 500;
							res.json(errMessage('PLAYER_STATUS_ERROR',err));
						});

				});
			routerPublic.route('/karas')
				.get(function(req,res){
					// if the query has a &filter=xxx
					// then the playlist returned gets filtered with the text.
					var filter = req.query.filter;
					var lang = req.query.lang;
					var size;
					if (!req.query.size) {
						size = 999999;
					} else {
						size = parseInt(req.query.size);
					}
					var from;
					if (!req.query.from) {
						from = 0;
					} else {
						from = parseInt(req.query.from);
					}
					if (from < 0) from = 0;					
					module.exports.onKaras(filter,lang,from,size)
						.then(function(karas){
							res.json(OKMessage(karas));
						})
						.catch(function(err){
							logger.error(err);
							res.statusCode = 500;
							res.json(errMessage('SONG_LIST_ERROR',err));
						});
				});

			routerPublic.route('/karas/random')
				.get(function(req,res){
					module.exports.onKaraRandom(req.query.filter)
						.then(function(kara_id){
							if (!kara_id) {
								res.statusCode = 500;
								res.json(errMessage('GET_UNLUCKY'));
							} else {
								res.json(OKMessage(kara_id));
							}

						})
						.catch(function(err){
							logger.error(err);
							res.statusCode = 500;
							res.json(errMessage('GET_LUCKY_ERROR',err));
						});
				});
			routerPublic.route('/karas/:kara_id([0-9]+)')
				.get(function(req,res){
					module.exports.onKaraSingle(req.params.kara_id,req.query.lang)
						.then(function(kara){							
							res.json(OKMessage(kara));
						})
						.catch(function(err){
							logger.error(err);
							res.statusCode = 500;
							res.json(errMessage('SONG_VIEW_ERROR',err));
						});
				})
				.post(function(req,res){
					// Add Kara to the playlist currently used depending on mode
					req.check({
						'requestedby': {
							in: 'body',
							notEmpty: true,
						}
					});

					req.getValidationResult().then(function(result) {
						if (result.isEmpty()) {
							req.sanitize('requestedby').trim();
							req.sanitize('requestedby').unescape();
							module.exports.onKaraAddToModePlaylist(req.params.kara_id,req.body.requestedby)
								.then(function(data){
									module.exports.emitEvent('playlistContentsUpdated',data.playlist_id);
									module.exports.emitEvent('playlistInfoUpdated',data.playlist_id);
									res.statusCode = 201;
									res.json(OKMessage(data,'PLAYLIST_MODE_SONG_ADDED',data));
								})
								.catch(function(err){
									res.statusCode = 500;
									res.json(errMessage(err.code,err.message,err.data));
								});
						} else {
							// Errors detected
							// Sending BAD REQUEST HTTP code and error object.
							res.statusCode = 400;
							res.json(result.mapped());
						}
					});
				});

			routerPublic.route('/karas/:kara_id([0-9]+)/lyrics')
				.get(function(req,res){
					module.exports.onKaraSingleLyrics(req.params.kara_id)
						.then(function(kara){							
							res.json(OKMessage(kara));
						})
						.catch(function(err){
							logger.error(err.message);
							res.statusCode = 500;
							res.json(errMessage('LYRICS_VIEW_ERROR',err.message,err.data));
						});
				});
			routerPublic.route('/playlists/current')
				.get(function(req,res){
					// Get current Playlist

					module.exports.onPlaylistCurrentInfo()
						.then(function(playlist){
							res.json(OKMessage(playlist));
						})
						.catch(function(err){
							logger.error(err);
							res.statusCode = 500;
							res.json(errMessage('PL_VIEW_CURRENT_ERROR',err));
						});
				});

			routerPublic.route('/playlists/current/karas')
				.get(function(req,res){
					// Get current Playlist
					var lang = req.query.lang;
					var filter = req.query.filter;
					var from;
					if (!req.query.from) {
						from = 0;
					} else {
						from = req.query.from;
					}
					var to;
					if (!req.query.to) {
						to = 999999;
					} else {
						to = req.query.to;
					}
					module.exports.onPlaylistCurrentContents(filter, lang, from, to)
						.then(function(playlist){
							res.json(OKMessage(playlist));
						})
						.catch(function(err){
							logger.error(err);
							res.statusCode = 500;
							res.json(errMessage('PL_VIEW_SONGS_CURRENT_ERROR',err));
						});
				});

			routerPublic.route('/playlists/public')
				.get(function(req,res){
					// Get current Playlist
					module.exports.onPlaylistPublicInfo()
						.then(function(playlist){
							res.json(OKMessage(playlist));
						})
						.catch(function(err){
							logger.error(err);
							res.statusCode = 500;
							res.json(errMessage('PL_VIEW_PUBLIC_ERROR',err));
						});
				});

			routerPublic.route('/playlists/public/karas')
				.get(function(req,res){
					// Get current Playlist
					var lang = req.query.lang;
					var filter = req.query.filter;
					var to;
					if (!req.query.to) {
						to = 999999;
					} else {
						to = req.query.to;
					}
					var from;
					if (!req.query.from) {
						from = 0;
					} else {
						from = req.query.from;
					}
					module.exports.onPlaylistPublicContents(filter, lang, from, to)
						.then(function(playlist){
							res.json(OKMessage(playlist));
						})
						.catch(function(err){
							logger.error(err);
							res.statusCode = 500;
							res.json(errMessage('PL_VIEW_SONGS_CURRENT_ERROR',err));
						});
				});

			routerPublic.route('/tags')
				.get(function(req,res){
					module.exports.onTags(req.query.lang)
						.then(function(tags){
							res.json(OKMessage(tags));
						})
						.catch(function(err){
							logger.error(err);
							res.statusCode = 500;
							res.json(errMessage('TAGS_LIST_ERROR',err));
						});
				});

			// Add headers
			app.use(function (req, res, next) {

				// Website you wish to allow to connect
				res.setHeader('Access-Control-Allow-Origin', '*');

				// Request methods you wish to allow
				res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');

				// Request headers you wish to allow
				res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Authorization, Accept, Key');

				// Set to true if you need the website to include cookies in the requests sent
				// to the API (e.g. in case you use sessions)
				// res.setHeader('Access-Control-Allow-Credentials', true);

				if (req.method === 'OPTIONS') {
					res.statusCode = 200;
					res.json();
				} else {
					// Pass to next layer of middleware
					next();
				}
			});

			app.use('/api/v1/public', routerPublic);
			app.use('/api/v1/admin', routerAdmin);
			resolve();
		});
	},
	onTest:function(){
		// événement de test
		logger.log('warning','onTest not set');
	},
	onKaras:function(){},
	onKaraSingle:function(){},
	onPLCInfo:function(){},
	onPlaylists:function(){},
	onPlaylistCreate:function(){},
	onPlaylistSingleInfo:function(){},
	onPlaylistSingleDelete:function(){},
	onPlaylistSingleEdit:function(){},
	onPlaylistSingleEmpty:function(){},
	onPlaylistSingleSetPublic:function(){},
	onPlaylistSingleSetCurrent:function(){},
	onPlaylistSingleContents:function(){},
	onPlaylistSingleKaraDelete:function(){},
	onPlaylistSingleKaraEdit:function(){},
	onWhitelistSingleKaraDelete:function(){},
	onPlaylistCurrentInfo:function(){},
	onPlaylistCurrentContents:function(){},
	onPlaylistPublicInfo:function(){},
	onPlaylistPublicContents:function(){},
	onPlaylistShuffle:function(){},
	onKaraAddToModePlaylist:function(){},
	onKaraAddToPlaylist:function(){},
	onKaraAddToWhitelist:function(){},
	onSettingsUpdate:function(){},
	onWhitelist:function(){},
	onBlacklist:function(){},
	onBlacklistCriterias:function(){},
	onBlacklistCriteriaAdd:function(){},
	onBlacklistCriteriaDelete:function(){},
	onBlacklistCriteriaEdit:function(){},
	onPlayerCommand:function(){},
	onPlayerStatus:function(){},
	onStats:function(){},
	onKaraSingleLyrics:function(){},
	onShutdown:function(){},
	onKaraCopyToPlaylist:function(){},
	emitEvent:function(){},
	onTags:function(){},
	onPlaylistExport:function(){},
	onMessage:function(){},
	onWhitelistEmpty:function(){},
	onBlacklistCriteriasEmpty:function(){},
	onKaraRandom:function(){},
};
