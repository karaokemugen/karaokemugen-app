const express = require('express');
const expressValidator = require('express-validator');
const logger = require('../_common/utils/logger.js');
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
				.post(function(req,res){
				// req.body = posted object.

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
										res.statusCode = 500;								res.json(errMessage('PL_CREATE_ERROR',err,req.body.name));
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
				.put(function(req,res){
				// Empty playlist

					module.exports.onPlaylistSingleEmpty(req.params.pl_id)
						.then(function(){
							module.exports.emitEvent('playlistInfoUpdated',req.params.pl_id);
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
				.put(function(req,res){
				// Empty blacklist criterias

					module.exports.onBlacklistEmpty()
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
				.get(function(req,res){
					//Access :pl_id by req.params.pl_id
					// This get route gets infos from a playlist
					var playlist_id = req.params.pl_id;
					var filter = req.query.filter;
					var lang = req.query.lang;
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
					var seenFromUser = false;
					module.exports.onPlaylistSingleContents(playlist_id,filter,lang,seenFromUser,from,to)
						.then(function(playlist){							
							res.json(OKMessage(playlist));
						})
						.catch(function(err){
							logger.error(err.message);
							res.statusCode = 500;
							res.json(errMessage('PL_VIEW_SONGS_ERROR',err.message,err.data));
						});
				})
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
										module.exports.emitEvent('playlistInfoUpdated',req.params.pl_id);
										module.exports.emitEvent('playlistContentsUpdated',req.params.pl_id);
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
										module.exports.emitEvent('playlistInfoUpdated',pl_id);
										module.exports.emitEvent('playlistContentsUpdated',pl_id);
										res.statusCode = 201;
										var args = {
											kara_ids: req.body.plc_id,
											playlist: req.params.pl_id					
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
										module.exports.emitEvent('playlistInfoUpdated',data.pl_id);
										module.exports.emitEvent('playlistContentsUpdated',data.pl_id);
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
				.get(function(req,res){
					res.json(OKMessage(module.exports.SETTINGS));
				})
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
							req.sanitize('PlayerFullscreen').toInt();
							req.sanitize('PlayerNoBar').toInt();
							req.sanitize('PlayerNoHud').toInt();
							req.sanitize('PlayerStayOnTop').toInt();
							req.sanitize('PlayerScreen').toInt();
							req.sanitize('EngineSongsPerPerson').toInt();
							req.sanitize('EnginePrivateMode').toInt();
							req.sanitize('PlayerPIP').toInt();
							req.sanitize('PlayerPIPSize').toInt();

							var SETTINGS = req.body;
							module.exports.onSettingsUpdate(SETTINGS)
								.then(function(publicSettings){
									module.exports.emitEvent('settingsUpdated',publicSettings);
									res.json(OKMessage(module.export.SETTINGS,'SETTINGS_UPDATED'));
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
				.get(function(req,res){
					var lang = req.query.lang;
					var filter = req.query.filter;
					module.exports.onWhitelist(filter,lang)
						.then(function(karas){
							res.json(OKMessage(karas));
						})
						.catch(function(err){
							logger.error(err);
							res.statusCode = 500;
							res.json(errMessage('WL_VIEW_ERROR',err));
						});
				})
				.post(function(req,res){
					req.check({
						'kara_id': {
							in: 'body',
							notEmpty: true,
							isInt: true,
						},
						'reason': {
							in: 'body',
							notEmpty: true,
						}
					});

					req.getValidationResult().then(function(result) {
						if (result.isEmpty()) {
							req.sanitize('kara_id').toInt();
							module.exports.onKaraAddToWhitelist(req.body.kara_id,req.body.reason)
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
				});

			routerAdmin.route('/blacklist')
				.get(function(req,res){
					var lang = req.query.lang;
					var filter = req.query.filter;
					module.exports.onBlacklist(filter,lang)
						.then(function(karas){
							res.json(OKMessage(karas));
						})
						.catch(function(err){
							logger.error(err);
							res.statusCode = 500;
							res.json(errMessage('BL_VIEW_ERROR',err));
						});
				});
			routerAdmin.route('/whitelist/:wl_id([0-9]+)')
				.delete(function(req,res){
					//Delete kara from whitelist
					// Deletion is through whitelist ID.
					module.exports.onWhitelistSingleKaraDelete(req.params.wl_id)
						.then(function(){
							module.exports.emitEvent('whitelistUpdated');
							module.exports.emitEvent('blacklistUpdated');
							res.json(OKMessage(req.params.wl_id,'WL_SONG_DELETED',req.params.wl_id));							
						})
						.catch(function(err){
							logger.error(err);
							res.statusCode = 500;
							res.json(errMessage('WL_DELETE_SONG_ERROR',err));
						});
				})
				.put(function(req,res){
					req.check({
						'reason': {
							in: 'body',
							notEmpty: true,
						}
					});

					req.getValidationResult().then(function(result) {
						if (result.isEmpty()) {
							module.exports.onWhitelistSingleKaraEdit(req.params.wl_id,req.body.reason)
								.then(function(){
									module.exports.emitEvent('whitelistUpdated');
									res.json(OKMessage(null,'WL_SONG_UPDATED',req.params.wl_id));									
								})
								.catch(function(err){
									logger.error(err);
									res.statusCode = 500;
									res.json(errMessage('WL_UPDATE_SONG_ERROR',err));
								});
						} else {
							// Errors detected
							// Sending BAD REQUEST HTTP code and error object.
							res.statusCode = 400;
							res.json(result.mapped());
						}
					});
				});

			routerAdmin.route('/blacklist/criterias')
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
					// Update status of player (play/pause/stopNow/stopNext)
					// Commands:
					// play - starts off kara / resumes from pause
					// pause - pauses player in mid song
					// stopNow - stops the karaoke NOW
					// stopAfter - stops the karaoke after the current song finishes
					// skip - skips to next song
					// prev - goes to previous song
					// toggleFullscreen - as it says
					// toggleAlwaysOnTop - as it says
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
					var seenFromUser = true;
					module.exports.onPlaylistSingleContents(req.params.pl_id,filter,lang,seenFromUser,from,to)
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
						module.exports.onWhitelist(filter,lang)
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
						module.exports.onBlacklist(filter,lang)
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

					module.exports.onKaras(filter,lang,from,to)
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
							var data = {
								kara_id: req.params.kara_id,
								requester: req.body.requestedby
							};									
							module.exports.onKaraAddToModePlaylist(req.params.kara_id,req.body.requestedby)
								.then(function(data){									
									module.exports.emitEvent('playlistContentsUpdated',data.playlist_id);
									module.exports.emitEvent('playlistInfoUpdated',data.playlist_id);
									res.statusCode = 201;
									res.json(OKMessage(data,'PLAYLIST_MODE_SONG_ADDED',data));
								})
								.catch(function(err){
									logger.error(err.message);
									res.statusCode = 500;
									res.json(errMessage('PLAYLIST_MODE_ADD_SONG_ERROR',err.message,err.data));
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
	onWhitelistSingleKaraEdit:function(){},
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
	onBlacklistEmpty:function(){},
	onKaraRandom:function(){},
};
