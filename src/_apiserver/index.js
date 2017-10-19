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
			// Endpoints :
			// karas
			// karas/xxxx
			// playlists
			// playlists/xxxx/karas
			// playlists/xxxx
			// playlists/public
			// playlists/current
			// series
			// series/xxxx
			// playlists/xxxx/filter
			// karas/filter
			// blacklist
			// whitelist

			// Validators & sanitizers :
			// https://github.com/chriso/validator.js

			// Reminder of HTTP codes:
			// 200 : OK
			// 201 : CREATED
			// 404 : NOT FOUND
			// 400 : BAD REQUEST
			// 500 : INTERNAL ERROR
			// 403 : FORBIDDEN

			// In case of error, return the correct code an object 'error'

			// Admin routes
			routerAdmin.route('/shutdown')
				.post(function(req,res){
					// Sends command to shutdown the app.

					module.exports.onShutdown()
						.then(function(){
							res.json('Shutdown in progress.');
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
							res.json(playlists);
						})
						.catch(function(err){
							logger.error(err);
							res.statusCode = 500;
							res.json(err);
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
										res.json(new_playlist);
									})
									.catch(function(err){
										logger.error(err);
										res.statusCode = 500;
										res.json(err);
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
							if (playlist == []) res.statusCode = 404;
							res.json(playlist);
						})
						.catch(function(err){
							logger.error(err);
							res.statusCode = 500;
							res.json(err);
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
										res.json('Playlist '+req.params.pl_id+' updated');
									})
									.catch(function(err){
										logger.error(err);
										res.statusCode = 500;
										res.json(err);
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
					var playlist_id = req.params.pl_id;
					module.exports.onPlaylistSingleDelete(playlist_id)
						.then(function(){
							module.exports.emitEvent('playlistsUpdated');
							res.json('Deleted '+playlist_id);
						})
						.catch(function(err){
							logger.error(err);
							res.statusCode = 500;
							res.json(err);
						});
				});

			routerAdmin.route('/playlists/:pl_id([0-9]+)/empty')
				.put(function(req,res){
				// Empty playlist

					module.exports.onPlaylistSingleEmpty(req.params.pl_id)
						.then(function(){
							module.exports.emitEvent('playlistContentsUpdated',req.params.pl_id);
							res.json('Playlist '+req.params.pl_id+' emptied');
						})
						.catch(function(err){
							logger.error(err);
							res.statusCode = 500;
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
							res.json('Whitelist emptied');
						})
						.catch(function(err){
							logger.error(err);
							res.statusCode = 500;
							res.json(err);
						});
				});
			routerAdmin.route('/blacklist/criterias/empty')
				.put(function(req,res){
				// Empty blacklist criterias

					module.exports.onBlacklistEmpty()
						.then(function(){
							module.exports.emitEvent('blacklistUpdated');
							res.json('Blacklist criterias emptied');
						})
						.catch(function(err){
							logger.error(err);
							res.statusCode = 500;
							res.json(err);
						});
				});
			routerAdmin.route('/playlists/:pl_id([0-9]+)/setCurrent')
				.put(function(req,res){
					// set playlist to current

					module.exports.onPlaylistSingleSetCurrent(req.params.pl_id)
						.then(function(){
							module.exports.emitEvent('playlistInfoUpdated',req.params.pl_id);
							module.exports.emitEvent('playlistsUpdated',req.params.pl_id);
							res.json('Playlist '+req.params.pl_id+' is now current');
						})
						.catch(function(err){
							logger.error(err);
							res.statusCode = 500;
							res.json(err);
						});
				});
			routerAdmin.route('/playlists/:pl_id([0-9]+)/setPublic')
				.put(function(req,res){
					// Empty playlist

					module.exports.onPlaylistSingleSetPublic(req.params.pl_id)
						.then(function(){
							module.exports.emitEvent('playlistInfoUpdated',req.params.pl_id);
							module.exports.emitEvent('playlistsUpdated');
							res.json('Playlist '+req.params.pl_id+' is now public');
						})
						.catch(function(err){
							logger.error(err);
							res.statusCode = 500;
							res.json(err);
						});
				});
			routerAdmin.route('/playlists/:pl_id([0-9]+)/karas')
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
						size = req.query.size;
					}
					var from;
					if (!req.query.from) {
						from = 0;
					} else {
						from = req.query.from;
					}
					var seenFromUser = false;
					req.sanitize('size').toInt();
					req.sanitize('from').toInt();
					module.exports.onPlaylistSingleContents(playlist_id,filter,lang,seenFromUser,from,size)
						.then(function(playlist){
							if (playlist == []) res.statusCode = 404;
							res.json(playlist);
						})
						.catch(function(err){
							logger.error(err);
							res.statusCode = 500;
							res.json(err);
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
										module.exports.emitEvent('playlistContentsUpdated',result.playlist_id);
										res.statusCode = 201;
										if (req.body.pos === undefined) var pos = 'last';
										res.json('Karaoke '+result.karaAdded+' added by '+req.body.requestedby+' to playlist '+playlist_id+' at position '+pos);
									})
									.catch(function(err){
										logger.error(err);
										res.statusCode = 500;
										res.json(err);
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
										module.exports.emitEvent('playlistContentsUpdated',pl_id);
										res.statusCode = 201;
										res.json('Playlist content(s) '+req.body.plc_id+' copied to playlist '+req.params.pl_id+' at position '+req.body.pos);
									})
									.catch(function(err){
										logger.error(err);
										res.statusCode = 500;
										res.json(err);
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
									.then(function(pl_id){
										module.exports.emitEvent('playlistContentsUpdated',pl_id);
										res.statusCode = 200;
										res.json('Playlist content(s) '+req.body.plc_id+' deleted');
									})
									.catch(function(err){
										logger.error(err);
										res.statusCode = 500;
										res.json(err);
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
							res.json(kara);
						})
						.catch(function(err){
							logger.error(err);
							res.statusCode = 500;
							res.json(err);
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
									.then(function(pl_id){
										res.json('PLC '+req.params.plc_id+' edited in playlist '+pl_id);
									})
									.catch(function(err){
										logger.error(err);
										res.statusCode = 500;
										res.json(err);
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
					res.json(module.exports.SETTINGS);
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
							req.sanitize('EngineDisplayConnectionInfoQRCode').toInt();
							req.sanitize('EngineDisplayConnectionInfo').toInt();

							var SETTINGS = req.body;
							module.exports.onSettingsUpdate(SETTINGS)
								.then(function(publicSettings){
									module.exports.emitEvent('settingsUpdated',publicSettings);
									res.json('Settings updated');
								})
								.catch(function(err){
									logger.error(err);
									res.statusCode = 500;
									res.json(err);
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
							in: 'body'
						}
					});

					req.getValidationResult().then(function(result) {
						if (result.isEmpty()) {
							req.sanitize('duration').toInt();
							if(req.body.destination !== 'screen') {
								module.exports.emitEvent('adminMessage', req.body );
								if (req.body.destination === 'users') {
									res.statusCode = 200;
									res.json('Your message has been displayed to the users');
								}
							}
							if(req.body.destination !== 'users') {
								module.exports.onMessage(req.body.message,req.body.duration)
									.then(function(){
										res.statusCode = 200;
										res.json('Your message has been displayed');
									})
									.catch(function(err){
										logger.error(err);
										res.statusCode = 500;
										res.json(err);
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
					var size;
					if (!req.query.size) {
						size = 999999;
					} else {
						size = req.query.to;
					}
					var from;
					if (!req.query.from) {
						from = 0;
					} else {
						from = req.query.from;
					}
					req.sanitize('size').toInt();
					req.sanitize('from').toInt();					
					if (from < 0) from = 0;
					module.exports.onWhitelist(filter,lang,from,size)
						.then(function(karas){
							res.json(karas);
						})
						.catch(function(err){
							logger.error(err);
							res.statusCode = 500;
							res.json(err);
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
									res.json('Karaoke '+req.body.kara_id+' added to whitelist with reason \''+req.body.reason+'\'');
								})
								.catch(function(err){
									logger.error(err);
									res.statusCode = 500;
									res.json(err);
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
					var size;
					if (!req.query.size) {
						size = 999999;
					} else {
						size = req.query.size;
					}
					var from;
					if (!req.query.from) {
						from = 0;
					} else {
						from = req.query.from;
					}
					req.sanitize('size').toInt();
					req.sanitize('from').toInt();
					if (from < 0) from = 0;										
					module.exports.onBlacklist(filter,lang,from,size)
						.then(function(karas){
							res.json(karas);
						})
						.catch(function(err){
							logger.error(err);
							res.statusCode = 500;
							res.json(err);
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
							res.json('Deleted WLID '+req.params.wl_id);
						})
						.catch(function(err){
							logger.error(err);
							res.statusCode = 500;
							res.json(err);
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
									res.json('Whitelist item '+req.params.wl_id+' edited with reason \''+req.body.reason+'\'');
								})
								.catch(function(err){
									logger.error(err);
									res.statusCode = 500;
									res.json(err);
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
							res.json(blc);
						})
						.catch(function(err){
							logger.error(err);
							res.statusCode = 500;
							res.json(err);
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
									res.json('Blacklist criteria type '+req.body.blcriteria_type+' with value \''+req.body.blcriteria_value+'\' added');
								})
								.catch(function(err){
									logger.error(err);
									res.statusCode = 500;
									res.json(err);
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
							res.json('Deleted BLCID '+req.params.blc_id);
						})
						.catch(function(err){
							logger.error(err);
							res.statusCode = 500;
							res.json(err);
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
									res.json('Blacklist criteria '+req.params.blc_id+' type '+req.body.blcriteria_type+' with value \''+req.body.blcriteria_value+'\' edited');
								})
								.catch(function(err){
									logger.error(err);
									res.statusCode = 500;
									res.json(err);
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
									res.json('Command '+req.body.command+' executed');
								})
								.catch(function(err){
									logger.error(err);
									res.statusCode = 500;
									res.json(err);
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
							res.send(playlist);
						})
						.catch(function(err){
							logger.error(err);
							res.statusCode = 500;
							res.json(err);
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
									res.json(response);

								})
								.catch(function(err){
									logger.error(err);
									res.statusCode = 500;
									res.json(err);
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
							res.json('Playlist '+req.params.pl_id+' shuffled');
						})
						.catch(function(err){
							logger.error(err);
							res.statusCode = 500;
							res.json(err);
						});
				});

			// Public routes


			routerPublic.route('/playlists')
				.get(function(req,res){
					// Get list of playlists, only return the visible ones
					var seenFromUser = true;
					module.exports.onPlaylists(seenFromUser)
						.then(function(playlists){
							res.json(playlists);
						})
						.catch(function(err){
							res.statusCode = 500;
							res.json(err);
						});
				});
			routerPublic.route('/playlists/:pl_id([0-9]+)')
				.get(function(req,res){
					// Get playlist, only if visible
					//Access :pl_id by req.params.pl_id
					// This get route gets infos from a playlist
					var playlist_id = req.params.pl_id;
					var seenFromUser = true;
					module.exports.onPlaylistSingleInfo(playlist_id,seenFromUser)
						.then(function(playlist){
							if (playlist == null) res.statusCode = 404;
							res.json(playlist);
						})
						.catch(function(err){
							logger.error(err);
							res.statusCode = 500;
							res.json(err);
						});
				});
			routerPublic.route('/playlists/:pl_id([0-9]+)/karas')
				.get(function(req,res){
					// Get playlist contents, only if visible
					//Access :pl_id by req.params.pl_id
					var playlist_id = req.params.pl_id;
					var filter = req.query.filter;
					var lang = req.query.lang;
					var size;
					if (!req.query.size) {
						size = 999999;
					} else {
						size = req.query.size;
					}
					var from;
					if (!req.query.from) {
						from = 0;
					} else {
						from = req.query.from;
					}
					var seenFromUser = true;
					req.sanitize('size').toInt();
					req.sanitize('from').toInt();
					module.exports.onPlaylistSingleContents(playlist_id,filter,lang,seenFromUser,from,size)
						.then(function(playlist){
							if (playlist == null) res.statusCode = 404;
							res.json(playlist);
						})
						.catch(function(err){
							logger.error(err);
							res.statusCode = 500;
							res.json(err);
						});
				});

			routerPublic.route('/playlists/:pl_id([0-9]+)/karas/:plc_id([0-9]+)')
				.get(function(req,res){
					var seenFromUser = true;
					module.exports.onPLCInfo(req.params.plc_id,req.query.lang,seenFromUser)
						.then(function(kara){
							res.json(kara);
						})
						.catch(function(err){
							logger.error(err);
							res.statusCode = 500;
							res.json(err);
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
					res.json(settings);
				});
			routerPublic.route('/stats')
				.get(function(req,res){
					module.exports.onStats()
						.then(function(stats){
							res.json(stats);
						})
						.catch(function(err){
							logger.error(err);
							res.statusCode = 500;
							res.json(err);
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
							size = req.query.to;
						}
						var from;
						if (!req.query.from) {
							from = 0;
						} else {
							from = req.query.from;
						}
						req.sanitize('size').toInt();
						req.sanitize('from').toInt();
						module.exports.onWhitelist(filter,lang,from,size)
							.then(function(karas){
								res.json(karas);
							})
							.catch(function(err){
								logger.error(err);
								res.statusCode = 500;
								res.json(err);
							});
					} else {
						res.StatusCode = 403;
						res.json('Displaying whitelist to public is disabled');
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
							size = req.query.size;
						}
						var from;
						if (!req.query.from) {
							from = 0;
						} else {
							from = req.query.from;
						}
						req.sanitize('size').toInt();
						req.sanitize('from').toInt();
						module.exports.onBlacklist(filter,lang,from,size)
							.then(function(karas){
								res.json(karas);
							})
							.catch(function(err){
								logger.error(err);
								res.statusCode = 500;
								res.json(err);
							});
					} else {
						res.StatusCode = 403;
						res.json('Displaying blacklist to public is disabled');
					}
				});

			routerPublic.route('/blacklist/criterias')
				.get(function(req,res){
					//Get list of blacklist criterias IF the settings allow public to see it
					if (module.exports.SETTINGS.EngineAllowViewBlacklistCriterias == 1) {
						module.exports.onBlacklistCriterias()
							.then(function(blc){
								res.json(blc);
							})
							.catch(function(err){
								logger.error(err);
								res.statusCode = 500;
								res.json(err);
							});
					} else {
						res.StatusCode = 403;
						res.json('Displaying blacklist criterias to public is disabled');
					}
				});

			routerPublic.route('/player')
				.get(function(req,res){
					// Get player status
					// What's playing, time in seconds, duration of song

					//return status of the player

					module.exports.onPlayerStatus()
						.then(function(status){
							res.json(status);
						})
						.catch(function(err){
							logger.error(err);
							res.statusCode = 500;
							res.json(err);
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
						size = req.query.size;
					}
					var from;
					if (!req.query.from) {
						from = 0;
					} else {
						from = req.query.from;
					}
					if (from < 0) from = 0;
					req.sanitize('size').toInt();
					req.sanitize('from').toInt();
					module.exports.onKaras(filter,lang,from,size)
						.then(function(karas){
							res.json(karas);
						})
						.catch(function(err){
							logger.error(err);
							res.statusCode = 500;
							res.json(err);
						});
				});

			routerPublic.route('/karas/random')
				.get(function(req,res){
					module.exports.onKaraRandom(req.query.filter)
						.then(function(kara_id){
							if (!kara_id) {
								res.statusCode = 500;
								res.json('No selectable karaoke. Are all songs already in current playlist?');
							} else {
								res.json(kara_id);
							}

						})
						.catch(function(err){
							logger.error(err);
							res.statusCode = 500;
							res.json(err);
						});
				});
			routerPublic.route('/karas/:kara_id([0-9]+)')
				.get(function(req,res){
					module.exports.onKaraSingle(req.params.kara_id,req.query.lang)
						.then(function(kara){
							if (kara == []) res.statusCode = 404;
							res.json(kara);
						})
						.catch(function(err){
							logger.error(err);
							res.statusCode = 500;
							res.json(err);
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
								.then(function(pl_id){
									module.exports.emitEvent('playlistContentsUpdated',pl_id);
									res.statusCode = 201;
									res.json('Karaoke '+req.params.kara_id+' added by '+req.body.requestedby);
								})
								.catch(function(err){
									logger.error(err);
									res.statusCode = 500;
									res.json(err);
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
							if (kara == []) res.statusCode = 404;
							res.json(kara);
						})
						.catch(function(err){
							logger.error(err);
							res.statusCode = 500;
							res.json(err);
						});
				});
			routerPublic.route('/playlists/current')
				.get(function(req,res){
					// Get current Playlist

					module.exports.onPlaylistCurrentInfo()
						.then(function(playlist){
							res.json(playlist);
						})
						.catch(function(err){
							logger.error(err);
							res.statusCode = 500;
							res.json(err);
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
							res.json(playlist);
						})
						.catch(function(err){
							logger.error(err);
							res.statusCode = 500;
							res.json(err);
						});
				});

			routerPublic.route('/playlists/public')
				.get(function(req,res){
					// Get current Playlist
					module.exports.onPlaylistPublicInfo()
						.then(function(playlist){
							res.json(playlist);
						})
						.catch(function(err){
							logger.error(err);
							res.statusCode = 500;
							res.json(err);
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
							res.json(playlist);
						})
						.catch(function(err){
							logger.error(err);
							res.statusCode = 500;
							res.json(err);
						});
				});

			routerPublic.route('/tags')
				.get(function(req,res){
					module.exports.onTags(req.query.lang)
						.then(function(tags){
							if (tags == []) res.statusCode = 404;
							res.json(tags);
						})
						.catch(function(err){
							logger.error(err);
							res.statusCode = 500;
							res.json(err);
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
