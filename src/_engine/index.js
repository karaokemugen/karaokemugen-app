/**
 * @fileoverview Main engine source file
 */
var fs = require('fs');
const path = require('path');
const logger = require('../_common/utils/logger.js');
const extend = require('extend');
const timestamp = require('unix-timestamp');
const ini = require('ini');
const async = require('async');

/**
 * @module engine
 * Main engine module.
 */
module.exports = {
	SYSPATH:null,
	SETTINGS:null,
	DB_INTERFACE:null,
	/**
	 * @private
	 * Engine status.
	 * Can be stop or play. Stop by default.
	 */
	_states:{
		status:'stop', // [stop,play,pause] // etat générale de l'application Karaoke - STOP => la lecture de la playlist est interrompu
		private:true, // [bool(true|false)] // Karaoke en mode privé ou publique
		fullscreen:true,
		ontop:true,
		admin_port:1338,
		frontend_port:1337,
		apiserver_port:1339,
		ws_port:1340,
		playlist:null,
		timeposition:0,
		currentlyPlayingKara:undefined,
	},
	_services:{
		admin: null,
		playlist_controller: null,
		player:null,
		apiserver:null,
		ws:null,
	},
	/**
	 * Base method for starting up the engine.
	 * It starts up the DB Interface, player, playlist controller and admin dashboard.
	 * @function {run}
	 */
	run: function(){
		if(this.SYSPATH === null) {
			logger.error('SysPath is null !');
			process.exit();
		}
		if(this.SETTINGS === null) {
			logger.error('SETTINGS is null !');
			process.exit();
		}

		// settings some player config in engine _states
		module.exports._states.fullscreen = module.exports.SETTINGS.PlayerFullscreen>0;
		module.exports._states.ontop = module.exports.SETTINGS.PlayerStayOnTop>0;

		this._start_db_interface().then(function(){
			module.exports._start_player();
			module.exports._start_playlist_controller();
			module.exports._start_admin();
			module.exports._start_frontend();
			module.exports._start_apiserver();
			module.exports._start_wsserver();
			module.exports._broadcastStates();
		}).catch(function(response){
			logger.error(response);
		});
	},

	// 	 /$$      /$$             /$$     /$$                       /$$
	// 	| $$$    /$$$            | $$    | $$                      | $$
	// 	| $$$$  /$$$$  /$$$$$$  /$$$$$$  | $$$$$$$   /$$$$$$   /$$$$$$$  /$$$$$$$
	// 	| $$ $$/$$ $$ /$$__  $$|_  $$_/  | $$__  $$ /$$__  $$ /$$__  $$ /$$_____/
	// 	| $$  $$$| $$| $$$$$$$$  | $$    | $$  \ $$| $$  \ $$| $$  | $$|  $$$$$$
	// 	| $$\  $ | $$| $$_____/  | $$ /$$| $$  | $$| $$  | $$| $$  | $$ \____  $$
	// 	| $$ \/  | $$|  $$$$$$$  |  $$$$/| $$  | $$|  $$$$$$/|  $$$$$$$ /$$$$$$$/
	// 	|__/     |__/ \_______/   \___/  |__/  |__/ \______/  \_______/|_______/
	//
	//
	//

	/**
	 * Exits application.
	 * @function {exit}
	 */
	exit:function(){
		process.exit();
	},

	/**
	 * Starts playing karaoke songs.
	 * @function {play}
	 */
	play:function(){
		if(module.exports._states.status !== 'play') {
			// passe en mode lecture (le gestionnaire de playlist vas travailler à nouveau)
			if (module.exports._states.status === 'pause') {
				module.exports._states.status = 'play';
				module.exports._services.player.resume();
				module.exports._broadcastStates();		
			}
			if (module.exports._states.status === 'stop') {
				module.exports._states.status = 'play';
				module.exports.tryToReadKaraInPlaylist();
				module.exports._broadcastStates();		
			}							
		} else if(module.exports._states.status === 'play') {
			// resume current play if needed
			module.exports._services.player.resume();
		}

	},
	/**
	* @function {stop}
	* @param  {boolean} now {If set, stops karaoke immediately. If not, karaoke will stop at end of current song}
	*/
	stop:function(now){
		if(now) {
			logger.info('[Engine] Karaoke stopping NOW.');
			module.exports._services.player.stop();
		} else {
			logger.info('[Engine] Karaoke stopping at the end of current song');
		}

		if(module.exports._states.status !== 'stop') {
			module.exports._states.status = 'stop';
			module.exports._broadcastStates();
		}
	},
	/**
	 * @function {pause}
	 * Pauses current song in the player and broadcasts new status.
	 */
	pause:function(){
		module.exports._services.player.pause();
		module.exports._states.status = 'pause';
		module.exports._broadcastStates();
	},
	mute:function(){
		module.exports._services.player.mute();
	},
	unmute:function(){
		module.exports._services.player.unmute();		
	},
	seek:function(delta){
		module.exports._services.player.seek(delta);
	},
	goTo:function(seconds){
		module.exports._services.player.goTo(seconds);
	},
	reset:function(){
		module.exports._services.player.reset();
	},
	setVolume:function(volume){
		module.exports._services.player.setVolume(volume);
	},
	showSubs:function(){
		module.exports._services.player.showSubs();
	},
	hideSubs:function(){
		module.exports._services.player.hideSubs();
	},
	/**
	 * @function {pause}
	 * Pauses current song in the player and broadcasts new status.
	 */
	prev:function(){
		module.exports.stop(true);
		module.exports._services.playlist_controller.prev()
			.then(function(){
				module.exports.play();
			}).catch(function(){
				module.exports.play();
				logger.warn('[Engine] Previous song is not available');
			});
	},
	/**
	 * @function {pause}
	 * Pauses current song in the player and broadcasts new status.
	 */
	next:function(){
		module.exports.stop(true);
		module.exports._services.playlist_controller.next()
			.then(function(){
				module.exports.play();
			}).catch(function(){
				logger.warn('Next song is not available');
			});
	},

	/**
	* @function {setPrivateOn}
	* @private
	*/
	setPrivateOn:function() {
		module.exports._states.private = true;
		module.exports._broadcastStates();
	},
	/**
	* @function {setPrivateOff}
	*/
	setPrivateOff:function() {
		module.exports._states.private = false;
		module.exports._broadcastStates();
	},
	/**
	* @function {togglePrivate}
	*/
	togglePrivate:function() {
		module.exports._states.private = !module.exports._states.private;
		module.exports._broadcastStates();
	},

	/**
	* @function {toggleFullscreen}
	*/
	toggleFullscreen:function() {
		module.exports._states.fullscreen = !module.exports._states.fullscreen;
		module.exports._services.player.setFullscreen(module.exports._states.fullscreen);
		module.exports._broadcastStates();
	},
	/**
	* @function {toggleStayOnTop}
	*/
	toggleOnTop:function() {
		// player services return new ontop states after change
		module.exports._states.ontop = module.exports._services.player.toggleOnTop();
		module.exports._broadcastStates();
	},

	// Methode lié à la lecture de kara
	/**
	* @function
	*
	*/
	playlistUpdated:function(){
		if(module.exports._states.status === 'play' && !module.exports._services.player.playing) {
			module.exports._services.playlist_controller.next()
				.then(function(){
					module.exports.tryToReadKaraInPlaylist();
				}).catch(function(){
					logger.warn('Next song is not available');
				});
		}
	},
	/**
	* @function
	*
	*/
	playingUpdated:function(){
		return new Promise(function(resolve,reject){
			if(module.exports._states.status === 'play' && module.exports._services.player.playing) {
				module.exports.stop(true)				
				module.exports.play()
				resolve();								
			} else {
				resolve();
			}
		});
	},
	/**
	* @function
	*
	* Function triggered on player ending its current song.
	*/
	playerEnding:function(){
		module.exports._services.playlist_controller.next()
			.then(function(){
				module.exports.tryToReadKaraInPlaylist();
			}).catch(function(){
				logger.warn('Next song is not available');
				module.exports.stop();
			});
	},

	/**
	* @function
	* Try to read next karaoke in playlist.
	*/
	tryToReadKaraInPlaylist:function(){
		module.exports._services.playlist_controller.current_playlist()
		.then(function(playlist){
			if(module.exports._states.playlist != playlist) {
				module.exports._states.playlist = playlist;
				module.exports._broadcastStates();
			}
		})
		.catch(function(err){
			logger.error('[Engine] Unable to get playlist!')			
		})
		if(module.exports._states.status === 'play' && !module.exports._services.player.playing) {
			module.exports._services.playlist_controller.current()
				.then(function(kara){
					logger.info('Start playing '+kara.path.video);
					module.exports._services.player.play(
						kara.path.video,
						kara.path.subtitle,
						kara.id_kara,
						kara.gain
					);
					module.exports._states.currentlyPlayingKara = kara.kara_id;
					module.exports._broadcastStates();
					//Add a view to the viewcount
					module.exports.addViewcount(kara.kara_id,kara.kid);
				})
				.catch(function(){
					logger.info('Cannot find a song to play');
					module.exports._broadcastStates();
				});
		}
	},
	/**
	* @function {Adds one viewcount for this kara}
	* @param {number} kara_id {ID of kara to add a viewcount to}
	* @return {promise} {Promise}
	*/
	addViewcount:function(kara_id,kid){
		// Add one viewcount to the table
		var datetime = timestamp.now();
		module.exports.DB_INTERFACE.addViewcount(kara_id,kid,datetime)		
		.then(function(){
			// Recalculate viewcount and edit it in karasdb
			module.exports.DB_INTERFACE.updateTotalViewcounts(kid)
			.then(function(){
			})
			.catch(function(err){
				logger.error('[Engine] Failed to update viewcounts on karaoke ID '+kid);
			})
		})
		.catch(function(err){
			logger.error('[Engine] Failed to add viewcount for karaoke '+kara_id);
		})		
	},
	// ------------------------------------------------------------------
	// méthodes privées
	// ------------------------------------------------------------------

	_broadcastStates:function() {
		// diffuse l'état courant à tout les services concerné (normalement les webapp)
		module.exports._services.admin.setEngineStates(module.exports._states);
	},

	// ------------------------------------------------------------------
	// methodes de démarrage des services
	// ------------------------------------------------------------------

	/**
	* @function _start_db_interface
	* Starts database interface.
	* Requires the db_interface.js script
	*/
	_start_db_interface: function() {
		module.exports.DB_INTERFACE = require(path.resolve(__dirname,'components/db_interface.js'));
		module.exports.DB_INTERFACE.SYSPATH = module.exports.SYSPATH;
		module.exports.DB_INTERFACE.SETTINGS = module.exports.SETTINGS;
		return module.exports.DB_INTERFACE.init();
	},
	/**
	* @function
	* Starts the admin dashboard webservice on the selected port
	* Broadcasts syspath and settings, as well as db interface to that module.
	*/
	_start_admin:function(){
		module.exports._services.admin = require(path.resolve(__dirname,'../_admin/index.js'));
		module.exports._services.admin.LISTEN = module.exports._states.admin_port;
		module.exports._services.admin.SYSPATH = module.exports.SYSPATH;
		module.exports._services.admin.SETTINGS = module.exports.SETTINGS;
		module.exports._services.admin.DB_INTERFACE = module.exports.DB_INTERFACE;
		// --------------------------------------------------------
		// diffusion des méthodes interne vers les events admin
		// --------------------------------------------------------
		module.exports._services.admin.onTerminate = module.exports.exit;
		// Evenement de changement bascule privé/publique
		module.exports._services.admin.onTogglePrivate = module.exports.togglePrivate;
		// Evenement de changement bascule fullscreen/windowed
		module.exports._services.admin.onToggleFullscreen = module.exports.toggleFullscreen;
		module.exports._services.admin.onToggleOnTop = module.exports.toggleOnTop;
		// Supervision des évènement de changement de status (play/stop)
		module.exports._services.admin.onPlay = module.exports.play;
		module.exports._services.admin.onStop = module.exports.stop;
		module.exports._services.admin.onNext = module.exports.next;
		module.exports._services.admin.onPrev = module.exports.prev;
		module.exports._services.admin.onPause = module.exports.pause;
		module.exports._services.admin.onStopNow = function(){
			module.exports.stop(true);
		};
		// --------------------------------------------------------
		// on démarre ensuite le service
		module.exports._services.admin.init();
		// et on lance la commande pour ouvrir la page web
		module.exports._services.admin.open();
	},
	/**
	* @function
	* Starts the admin dashboard webservice on the selected port
	* Broadcasts syspath and settings, as well as db interface to that module.
	*/
	_start_frontend:function(){
		module.exports._services.frontend = require(path.resolve(__dirname,'../_webapp/index.js'));
		module.exports._services.frontend.LISTEN = module.exports._states.frontend_port;
		module.exports._services.frontend.SYSPATH = module.exports.SYSPATH;
		module.exports._services.frontend.SETTINGS = module.exports.SETTINGS;
		module.exports._services.frontend.DB_INTERFACE = module.exports.DB_INTERFACE;
		// --------------------------------------------------------
		// diffusion des méthodes interne vers les events frontend
		// --------------------------------------------------------
		module.exports._services.frontend.onTest = module.exports.test;
		// --------------------------------------------------------
		// on démarre ensuite le service
		module.exports._services.frontend.init();
	},
	/**
	* @function
	* Starts the websocket server on the selected port
	* Broadcasts syspath and settings to that module.
	*/
	_start_wsserver:function(){
		module.exports._services.ws = require(path.resolve(__dirname,'../_ws/index.js'));
		module.exports._services.ws.LISTEN = module.exports._states.ws_port;
		module.exports._services.ws.SYSPATH = module.exports.SYSPATH;
		module.exports._services.ws.SETTINGS = module.exports.SETTINGS;		
		module.exports._services.ws.init();
	},
	/**
	* @function
	* Starts the API webservice on the selected port
	* Broadcasts syspath and settings, as well as db interface to that module.
	*/
	_start_apiserver:function(){
		module.exports._services.apiserver = require(path.resolve(__dirname,'../_apiserver/index.js'));
		module.exports._services.apiserver.LISTEN = module.exports._states.apiserver_port;
		module.exports._services.apiserver.SYSPATH = module.exports.SYSPATH;
		module.exports._services.apiserver.SETTINGS = module.exports.SETTINGS;
		module.exports._services.apiserver.DB_INTERFACE = module.exports.DB_INTERFACE;
		// --------------------------------------------------------
		// diffusion des méthodes interne vers les events frontend
		// --------------------------------------------------------
		module.exports._services.apiserver.onTest = module.exports.test;
		module.exports._services.apiserver.onKaras = function(filter,lang,from,to){
			return new Promise(function(resolve,reject){
				module.exports._services.playlist_controller.getAllKaras()
					.then(function(playlist){
						module.exports._services.playlist_controller.translateKaraInfo(playlist,lang)
						.then(function(karalist){
							if (filter) {
								module.exports._services.playlist_controller.filterPlaylist(karalist,filter)
								.then(function(filtered_pl){
									resolve(filtered_pl.slice(from,to))
								})
								.catch(function(err){
									logger.error('[Engine] PLC filterPlaylist : '+err);	
									resolve(err);
								});							
							} else {
								resolve(karalist.slice(from,to));
							}
						})
						.catch(function(err){
							logger.error('[Engine] PLC translateKaraInfo : '+err);	
							reject(err);
						});						
					})
					.catch(function(err){
						logger.error('[Engine] PLC getAllKaras : '+err);	
						reject(err);
					});
			});
		};
		module.exports._services.apiserver.onWhitelist = function(filter,lang){
			return new Promise(function(resolve,reject){
				module.exports._services.playlist_controller.getWhitelistContents()
					.then(function(playlist){
						module.exports._services.playlist_controller.translateKaraInfo(playlist,lang)
						.then(function(karalist){
							if (filter) {
								module.exports._services.playlist_controller.filterPlaylist(karalist,filter)
								.then(function(filtered_pl){
									resolve(filtered_pl)
								})
								.catch(function(err){
									logger.error('[Engine] PLC filterPlaylist : '+err);	
									resolve(err);
								});							
							} else {
								resolve(karalist);
							}
						})
						.catch(function(err){
							logger.error('[Engine] PLC translateKaraInfo : '+err);	
							reject(err);
						});						
					})
					.catch(function(err){
						logger.error('[Engine] PLC getWhitelistContents : '+err);	
						reject(err);
					});
			});
		};
		module.exports._services.apiserver.onBlacklist = function(filter,lang){
			return new Promise(function(resolve,reject){
				module.exports._services.playlist_controller.getBlacklistContents()
					.then(function(playlist){
						module.exports._services.playlist_controller.translateKaraInfo(playlist,lang)
						.then(function(karalist){
							if (filter) {
								module.exports._services.playlist_controller.filterPlaylist(karalist,filter)
								.then(function(filtered_pl){
									resolve(filtered_pl)
								})
								.catch(function(err){
									logger.error('[Engine] PLC filterPlaylist : '+err);	
									resolve(err);
								});							
							} else {
								resolve(karalist);
							}
						})
						.catch(function(err){
							logger.error('[Engine] PLC translateKaraInfo : '+err);	
							reject(err);
						});						
					})
					.catch(function(err){
						logger.error('[Engine] PLC getBlacklistContents : '+err);	
						reject(err);
					});
			});
		};
		module.exports._services.apiserver.onBlacklistCriterias = function(lang){
			return new Promise(function(resolve,reject){
				module.exports._services.playlist_controller.getBlacklistCriterias()
					.then(function(blc){
						module.exports._services.playlist_controller.translateBlacklistCriterias(blc,lang)
							.then(function(blc_output){
								resolve(blc_output);
							})
							.catch(function(err){
								logger.error('[Engine] translateBlacklistCriterias : '+err);							
								reject(err);
							})
					})
					.catch(function(err){
						logger.error('[Engine] PLC getBlacklistCriterias : '+err);							
						reject(err);
					});
			});
		};
		module.exports._services.apiserver.onBlacklistCriteriaAdd = function(blctype,blcvalue){
			return new Promise(function(resolve,reject){
				module.exports._services.playlist_controller.addBlacklistCriteria(blctype,blcvalue)
					.then(function(){						
						resolve();
					})
					.catch(function(err){
						logger.error('[Engine] PLC addBlacklistCriterias : '+err);							
						reject(err);
					});
			});
		};
		module.exports._services.apiserver.onBlacklistCriteriaDelete = function(blc_id){
			return new Promise(function(resolve,reject){				
				module.exports._services.playlist_controller.deleteBlacklistCriteria(blc_id)
					.then(function(){						
						resolve();
					})
					.catch(function(err){
						logger.error('[Engine] PLC deleteBlacklistCriterias : '+err);							
						reject(err);
					});
			});
		};
		module.exports._services.apiserver.onBlacklistCriteriaEdit = function(blc_id,blctype,blcvalue){
			return new Promise(function(resolve,reject){
				module.exports._services.playlist_controller.editBlacklistCriteria(blc_id,blctype,blcvalue)
					.then(function(){						
						resolve();
					})
					.catch(function(err){
						logger.error('[Engine] PLC editBlacklistCriterias : '+err);							
						reject(err);
					});
			});
		};
		module.exports._services.apiserver.onPlaylistShuffle = function(pl_id){
			return new Promise(function(resolve,reject){
				module.exports._services.playlist_controller.shufflePlaylist(pl_id)
					.then(function(){						
						resolve(pl_id);
					})
					.catch(function(err){
						logger.error('[Engine] PLC shufflePlaylist : '+err);							
						reject(err);
					});
			});
		};
		module.exports._services.apiserver.onKaraSingle = function(id_kara,lang){
			return new Promise(function(resolve,reject){
				module.exports._services.playlist_controller.getKara(id_kara)
					.then(function(kara){
						module.exports._services.playlist_controller.translateKaraInfo(kara,lang)
							.then(function(karalist){
								resolve(karalist);
							})
							.catch(function(err){
								logger.error('[Engine] PLC translateKaraInfo : '+err);	
								reject(err);
							});
					})
					.catch(function(err){
						logger.error('[Engine] PLC getKara : '+err);	
						reject(err);
					});
			});
		}
		module.exports._services.apiserver.onPLCInfo = function(id_plc,lang,seenFromUser){
			return new Promise(function(resolve,reject){
				module.exports._services.playlist_controller.getKaraFromPlaylist(id_plc,seenFromUser)
					.then(function(kara){
						module.exports._services.playlist_controller.translateKaraInfo(kara,lang)
							.then(function(karalist){
								resolve(karalist);
							})
							.catch(function(err){
								logger.error('[Engine] PLC translateKaraInfo : '+err);	
								reject(err);
							});
					})
					.catch(function(err){
						logger.error('[Engine] PLC getKaraFromPlaylist : '+err);	
						reject(err);
					});
			});
		}
		module.exports._services.apiserver.onPlaylists = function(seenFromUser){
			return new Promise(function(resolve,reject){
				module.exports._services.playlist_controller.getPlaylists(seenFromUser)
					.then(function(playlists){
						resolve(playlists);
					})
					.catch(function(err){
						logger.error('[Engine] PLC getPlaylists : '+err);							
						reject(err);
					});
			});
		};
		module.exports._services.apiserver.onPlaylistCreate = function(playlist){
			return new Promise(function(resolve,reject){
				module.exports._services.playlist_controller.createPlaylist(playlist.name,playlist.flag_visible,playlist.flag_current,playlist.flag_public)
					.then(function (new_playlist){
						resolve(new_playlist);
					})
					.catch(function(err){						
						logger.error('[Engine] PLC createPlaylist : '+err);
						reject(err);
					});
			});
		}
		module.exports._services.apiserver.onPlaylistSingleInfo = function(id_playlist,seenFromUser){
			return new Promise(function(resolve,reject){
				module.exports._services.playlist_controller.getPlaylistInfo(id_playlist,seenFromUser)
					.then(function(playlist){
						resolve(playlist);
					})
					.catch(function(err){
						logger.error('[Engine] PLC getPlaylistInfo : '+err);
						reject(err);
					});
			});
		};
		module.exports._services.apiserver.onPlaylistSingleDelete = function(id_playlist){
			return new Promise(function(resolve,reject){
				module.exports._services.playlist_controller.deletePlaylist(id_playlist)
					.then(function(){
						resolve();
					})
					.catch(function(err){
						logger.error('[Engine] PLC deletePlaylist : '+err);
						reject(err);
					});
			});
		};
		module.exports._services.apiserver.onPlaylistSingleKaraDelete = function(playlistcontent_id){
			return new Promise(function(resolve,reject){
				module.exports._services.playlist_controller.deleteKaraFromPlaylist(playlistcontent_id)
					.then(function(playlist_id){
						resolve(playlist_id);
					})
					.catch(function(err){
						logger.error('[Engine] PLC deleteKaraFromPlaylist : '+err);
						reject(err);
					});
			});
		};
		module.exports._services.apiserver.onWhitelistSingleKaraDelete = function(wl_id){
			return new Promise(function(resolve,reject){
				module.exports._services.playlist_controller.deleteKaraFromWhitelist(wl_id)
					.then(function(){
						resolve();
					})
					.catch(function(err){
						logger.error('[Engine] PLC deleteKaraFromWhitelist : '+err);
						reject(err);
					});
			});
		};
		module.exports._services.apiserver.onWhitelistSingleKaraEdit = function(wl_id,reason){
			return new Promise(function(resolve,reject){
				module.exports._services.playlist_controller.editWhitelistKara(wl_id,reason)
					.then(function(){
						resolve();
					})
					.catch(function(err){
						logger.error('[Engine] PLC editWhitelistKara : '+err);
						reject(err);
					});
			});
		};
		module.exports._services.apiserver.onPlaylistSingleKaraEdit = function(playlistcontent_id,pos,flag_playing){
			return new Promise(function(resolve,reject){
				module.exports._services.playlist_controller.editKaraFromPlaylist(playlistcontent_id,pos,flag_playing)
					.then(function(playlist_id){
						resolve(playlist_id);
					})
					.catch(function(err){
						logger.error('[Engine] PLC editKaraFromPlaylist : '+err);
						reject(err);
					});
			});
		};
		module.exports._services.apiserver.onSettingsUpdate = function(settings) {
			return new Promise(function(resolve,reject){								
				var settingsToSave = {};				
				var defaultSettings = ini.parse(fs.readFileSync(path.join(module.exports.SYSPATH,'config.ini.default'), 'utf-8'));				
				for (var setting in settings){
					if (settings.hasOwnProperty(setting)){
						if (defaultSettings[setting] != settings[setting]) {							
							if (setting == 'os' ||
							    setting == 'EngineDefaultLocale') {
								// Do nothing
								// We don't want to save these settings to file.									
							} else {
								settingsToSave[setting] = settings[setting];
							}							
						}							
					}
				}

				extend(true,module.exports.SETTINGS,settings);
				
				module.exports._services.apiserver.SETTINGS = module.exports.SETTINGS;
				module.exports._services.playlist_controller.SETTINGS = module.exports.SETTINGS;
				module.exports._services.player.SETTINGS = module.exports.SETTINGS;
				module.exports._services.admin.SETTINGS = module.exports.SETTINGS;
				module.exports._services.frontend.SETTINGS = module.exports.SETTINGS;								

				// Part where we toggle settings
				if (module.exports.SETTINGS.EnginePrivateMode === 1) {
					module.exports.setPrivateOn();
				} else {
					module.exports.setPrivateOff();
				}

				// Other settings for now have to be toggled through API calls						

				// Sending settins through WS. We only send public settings
				var publicSettings = {}
				for (var key in module.exports.SETTINGS) {
					if (module.exports.SETTINGS.hasOwnProperty(key)) {

						if (!key.startsWith('Path') &&
							!key.startsWith('Admin') &&
							!key.startsWith('Bin') &&
							!key.startsWith('os')
						) {
							publicSettings[key] = module.exports.SETTINGS[key];
						}
					}
				}
				
				fs.writeFile(path.join(module.exports.SYSPATH,'config.ini'),ini.stringify(settingsToSave), function(err, rep) {
					if (err) {
						logger.error('[Engine] Unable to save settings : '+err);
						reject(err);
					}
						logger.info('[Engine] Settings updated and saved to disk')
						resolve(publicSettings);
					});				
			});
		};
		module.exports._services.apiserver.onPlaylistSingleEdit = function(id_playlist,playlist){
			return new Promise(function(resolve,reject){
				module.exports._services.playlist_controller.editPlaylist(id_playlist,playlist.name,playlist.flag_visible)
					.then(function(){
						module.exports._services.ws.socket.emit('playlistInfoUpdated',id_playlist);
						resolve();
					})
					.catch(function(err){
						logger.error('[Engine] PLC editPlaylist : '+err);
						reject(err);						
					});
			});
		}
		module.exports._services.apiserver.onPlaylistSingleSetCurrent = function(id_playlist){
			return new Promise(function(resolve,reject){
				module.exports._services.playlist_controller.setCurrentPlaylist(id_playlist)
					.then(function(id_playlist){
						resolve(id_playlist);
					})
					.catch(function(err){
						logger.error('[Engine] PLC setCurrentPlaylist : '+err);
						reject(err);						
					});
			});
		}
		module.exports._services.apiserver.onPlaylistSingleSetPublic = function(id_playlist){
			return new Promise(function(resolve,reject){
				module.exports._services.playlist_controller.setPublicPlaylist(id_playlist)
					.then(function(id_playlist){
						resolve();
					})
					.catch(function(err){
						logger.error('[Engine] PLC setPublicPlaylist : '+err);
						reject(err);						
					});
			});
		}
		module.exports._services.apiserver.onShutdown = function(){
			return new Promise(function(resolve,reject){
				logger.info('[Engine] Dropping the mic, shutting down!');
				resolve();
				setTimeout(function(){
					process.exit(0)
				},1000);
			});
		}
		module.exports._services.apiserver.onPlaylistSingleEmpty = function(id_playlist){
			return new Promise(function(resolve,reject){
				module.exports._services.playlist_controller.emptyPlaylist(id_playlist)
					.then(function(){						
						resolve(id_playlist);
					})
					.catch(function(err){
						logger.error('[Engine] PLC emptyPlaylist : '+err);
						reject(err);						
					});
			});
		}
		module.exports._services.apiserver.onPlaylistSingleContents = function(id_playlist,filter,lang,seenFromUser,from,to){			
			return new Promise(function(resolve,reject){
				module.exports._services.playlist_controller.getPlaylistContents(id_playlist,seenFromUser)
					.then(function(playlist){
						module.exports._services.playlist_controller.translateKaraInfo(playlist,lang)
							.then(function(karalist){
								if (filter) {
									module.exports._services.playlist_controller.filterPlaylist(karalist,filter)
										.then(function(filtered_pl){
										resolve(filtered_pl.slice(from,to))
										})
										.catch(function(err){
											logger.error('[Engine] PLC filterPlaylist : '+err);	
											resolve(err);
										});
								} else {
									resolve(karalist.slice(from,to));
								}
								
							})
							.catch(function(err){
								logger.error('[Engine] PLC translateKaraInfo : '+err);
								reject(err);
							});
					})
					.catch(function(err){
						logger.error('[Engine] PLC getPlaylistContents : '+err);
						reject(err);
					});
			});
		};
		module.exports._services.apiserver.onPlaylistCurrentInfo = function(){
			return new Promise(function(resolve,reject){
				module.exports._services.playlist_controller.isACurrentPlaylist()
					.then(function(id_playlist){
						module.exports._services.playlist_controller.getPlaylistInfo(id_playlist)
							.then(function(playlist){
								resolve(playlist);
							})
							.catch(function(err){
								logger.error('[Engine] PLC getPlaylistInfo : '+err);
								reject(err);
							});
					})
					.catch(function(err){
						logger.error('[Engine] PLC isACurrentPlaylist : '+err);
						if (err) {
							reject(err);
						} else {
							reject('No current playlist found');
						}
					});
			});
		};
		module.exports._services.apiserver.onPlaylistCurrentContents = function(filter,lang,from,to){
			return new Promise(function(resolve,reject){
				module.exports._services.playlist_controller.isACurrentPlaylist()
					.then(function(id_playlist){
						module.exports._services.playlist_controller.getPlaylistContents(id_playlist)
							.then(function(playlist){
								module.exports._services.playlist_controller.translateKaraInfo(playlist,lang)
									.then(function(karalist){
										if (filter) {
											module.exports._services.playlist_controller.filterPlaylist(karalist,filter)
												.then(function(filtered_pl){
												resolve(filtered_pl.slice(from,to))
												})
												.catch(function(err){
													logger.error('[Engine] PLC filterPlaylist : '+err);	
													resolve(err);
												});
										} else {
											resolve(karalist.slice(from,to));
										}
									})
									.catch(function(err){
										logger.error('[Engine] PLC translateKaraInfo : '+err);
										reject(err);
									});
							})
							.catch(function(err){
								logger.error('[Engine] PLC getPlaylistContents : '+err);
								reject(err);
							});
					})
					.catch(function(err){
						logger.error('[Engine] PLC isACurrentPlaylist : '+err);
						if (err) {
							reject(err);
						} else {
							reject('No current playlist found');
						}
					});
			});
		};
		module.exports._services.apiserver.onPlaylistPublicInfo = function(){
			return new Promise(function(resolve,reject){
				module.exports._services.playlist_controller.isAPublicPlaylist()				
					.then(function(id_playlist){
						module.exports._services.playlist_controller.getPlaylistInfo(id_playlist)
							.then(function(playlist){
								resolve(playlist);
							})
							.catch(function(err){
								logger.error('[Engine] PLC getPlaylistInfo : '+err);
								reject(err);
							});
					})
					.catch(function(err){
						logger.error('[Engine] PLC isAPublicPlaylist : '+err);
						if (err) {
							reject(err);
						} else {
							reject('No public playlist found');
						}
					});
			});
		};
		module.exports._services.apiserver.onPlaylistPublicContents = function(filter,lang,from,to){
			return new Promise(function(resolve,reject){
				module.exports._services.playlist_controller.isAPublicPlaylist()
					.then(function(id_playlist){
						module.exports._services.playlist_controller.getPlaylistContents(id_playlist)
							.then(function(playlist){
								module.exports._services.playlist_controller.translateKaraInfo(playlist,lang)
									.then(function(karalist){
										if (filter) {
											module.exports._services.playlist_controller.filterPlaylist(karalist,filter)
												.then(function(filtered_pl){
												resolve(filtered_pl.slice(from,to))
												})
												.catch(function(err){
													logger.error('[Engine] PLC filterPlaylist : '+err);	
													resolve(err);
												});
										} else {
											resolve(karalist.slice(from,to));
										}
									})
									.catch(function(err){
										logger.error('[Engine] PLC translateKaraInfo : '+err);
										reject(err);
									});
							})
							.catch(function(err){
								logger.error('[Engine] PLC getPlaylistContents : '+err);
								reject(err);
							});
					})
					.catch(function(err){
						logger.error('[Engine] PLC isAPublicPlaylist : '+err);
						if (err) {
							reject(err);
						} else {
							reject('No public playlist found');
						}
					});
			});
		};
		module.exports._services.apiserver.onKaraAddToModePlaylist = function(id_kara,requester){
			return new Promise(function(resolve,reject){
				if (module.exports._states.private) {
					//If Kara mode is private, then add to current playlist
					module.exports._services.playlist_controller.addKaraToCurrentPlaylist(id_kara,requester)
						.then(function(id_playlist){							
							resolve(id_playlist);
						})
						.catch(function(err){
							logger.error('[Engine] PLC addKaraToCurrentPlaylist : '+err);
							reject(err);
						});
				} else {
					//If Kara mode is public, then add to public playlist
					module.exports._services.playlist_controller.addKaraToPublicPlaylist(id_kara,requester)
						.then(function(id_playlist){
							resolve(id_playlist);
						})
						.catch(function(err){
							logger.error('[Engine] PLC addKaraToPublicPlaylist : '+err);
							reject(err);
						});
				}
			});
		};
		module.exports._services.apiserver.onKaraAddToPlaylist = function(id_kara,requester,playlist_id,pos){
			return new Promise(function(resolve,reject){
				module.exports._services.playlist_controller.addKaraToPlaylist(id_kara,requester,playlist_id,pos)
					.then(function(){						
						resolve(playlist_id);
					})
					.catch(function(err){
						logger.error('[Engine] PLC addKaraToPlaylist : '+err)
						reject(err);
					});
			});
		};
		module.exports._services.apiserver.onKarasAddToPlaylist = function(karaList,playlist_id){
			return new Promise(function(resolve,reject){
				// When adding a group of karaokes, they are added by user "Admin" by default.
				// Also, they're added at the end of the list.
				// No exceptions. :)
				karaArray = karaList.split(',');
				var requester = 'Admin';
				logger.debug('[Engine] Group add of karas : '+karaList)
				async.eachLimit(karaArray, 800, function(kara_id, callback){
					module.exports._services.playlist_controller.addKaraToPlaylist(kara_id,requester,playlist_id)
						.then(function(){
							logger.info('[Engine] Group add : Karaoke '+kara_id+' added to playlist '+playlist_id);
							callback();
						})
						.catch(function(err){
							logger.warn('[Engine] Group add : error adding karaoke '+kara_id+' to playlist '+playlist_id+' : '+err);
							callback(err);
						});
				},function(err){
					if (err) {
						logger.warn('[Engine] Group add : one or more karaokes could not be added to playlist '+playlist_id+' : '+err);
						reject(err);
					} else {
						logger.info('[Engine] All group karas added')
						resolve();
					}					
				});
			});
		};
		module.exports._services.apiserver.onKaraAddToWhitelist = function(id_kara,reason){
			return new Promise(function(resolve,reject){
				module.exports._services.playlist_controller.addKaraToWhitelist(id_kara,reason)
					.then(function(){
						resolve();
					})
					.catch(function(err){
						logger.error('[Engine] PLC addKaraToWhitelist : '+err)
						reject(err);
					});
			});
		};
		module.exports._services.apiserver.onPlayerCommand = function(command,options){
			return new Promise(function(resolve,reject){
				// play - starts off kara
				// pause - pauses player in mid song / resending the command unpauses
				// stopNow - stops the karaoke NOW
				// stopAfter - stops the karaoke after the current song finishes
				// skip - skips to next song
				// prev - goes to previous song
				// toggleFullscreen - as it says
				// toggleAlwaysOnTop - as it says
				switch (command) {
					case 'play':
						module.exports.play();
						break;
					case 'stopNow':
						module.exports.stop(true);
						break;
					case 'pause':
						module.exports.pause();
						break;
					case 'stopAfter':
						module.exports.stop();
						break;
					case 'skip':
						module.exports.next();
						break;
					case 'prev':
						module.exports.prev();
						break;
					case 'toggleFullscreen':
						module.exports.toggleFullscreen();
						break;
					case 'toggleAlwaysOnTop':
						module.exports.toggleOnTop();
						break;
					case 'mute':
						module.exports.mute();
						break;
					case 'unmute':
						module.exports.unmute();
						break;
					case 'showSubs':
						module.exports.showSubs();
						break;
					case 'hideSubs':
						module.exports.hideSubs();
						break;
					case 'seek':
						if (!options && typeof options !== "undefined") options = 0;
						if (isNaN(options)) reject('Command seek must have a numeric option value');
						module.exports.seek(options)
						break;
					case 'goTo':
						if (!options && typeof options !== "undefined") options = 0;
						if (isNaN(options)) reject('Command goTo must have a numeric option value');
						module.exports.goTo(options);
						break;
					case 'setVolume':
						if (!options && typeof options !== "undefined") reject('Command setVolume must have a value');
						if (isNaN(options)) reject('Command setVolume must have a numeric option value');
						module.exports.setVolume(options);
				}
				resolve();
			});
		};
		module.exports._services.apiserver.onPlayerStatus = function(){
			return new Promise(function(resolve,reject){				
				resolve({
					private: module.exports._states.private,
					status: module.exports._states.status,
					onTop: module.exports._states.ontop,
					fullscreen: module.exports._states.fullscreen,
					timePosition: module.exports._services.player.timeposition,				
					duration: module.exports._services.player.duration,
					muteStatus: module.exports._services.player.mutestatus,
					playerStatus: module.exports._services.player.playerstatus,
					currentlyPlaying: module.exports._states.currentlyPlayingKara,
					subText: module.exports._services.player.subtext,
					volume: module.exports._services.player.volume,
					showSubs: module.exports._services.player.showsubs,
				});
			});
		};
		module.exports._services.apiserver.onStats = function(){
			return new Promise(function(resolve,reject){
				module.exports.DB_INTERFACE.getStats()
					.then(function(stats){
						resolve(stats);
					})
					.catch(function(err){
						logger.error('[Engine] DBI getStats : '+err)
						reject(err);
					});
			});
		};
		module.exports._services.apiserver.onKaraSingleLyrics = function(kara_id){
			return new Promise(function(resolve,reject){
				module.exports._services.playlist_controller.getKaraLyrics(kara_id)
					.then(function(lyrics){
						resolve(lyrics);
					})
					.catch(function(err){							
						logger.error('[Engine] PLC getKaraLyrics : '+err)
						reject(err);
					});
			});
		};
		module.exports._services.apiserver.emitEvent = function(type,data){	
			logger.debug('[Engine] Sending WS message '+type+' : '+data)		
			module.exports._services.ws.socket.emit(type,data);					
		};
		// --------------------------------------------------------
		// on démarre ensuite le service
		module.exports._services.apiserver.init();
	},
	/**
	* @function
	* Starts playlist controller
	* Broadcasts syspath, database, and the playlistUpdated method
	*/
	_start_playlist_controller:function(){
		module.exports._services.playlist_controller = require(path.resolve(__dirname,'components/playlist_controller.js'));
		module.exports._services.playlist_controller.SYSPATH = module.exports.SYSPATH;
		module.exports._services.playlist_controller.SETTINGS = module.exports.SETTINGS;
		module.exports._services.playlist_controller.DB_INTERFACE = module.exports.DB_INTERFACE;
		module.exports._services.playlist_controller.onPlaylistUpdated = module.exports.playlistUpdated;
		module.exports._services.playlist_controller.onPlayingUpdated =
		module.exports.playingUpdated;
		module.exports._services.playlist_controller.init();
		//Test if a playlist with flag_current exists. If not create one.
		module.exports._services.playlist_controller.isACurrentPlaylist()
			.then(function(){
				//A playlist exists, nothing to do.
			})
			.catch(function(){
				//No playlist exists, creating one.
				logger.warn('[Engine] No current playlist found, creating one');
				module.exports._services.playlist_controller.createPlaylist(__('CURRENT_PLAYLIST'),1,1,0)
					.then(function (new_playlist){
						logger.info('[Engine] Current playlist created : '+new_playlist);
						// Build a dummy playlist for testing purpose
						module.exports._services.playlist_controller.build_dummy_current_playlist(new_playlist);
					})
					.catch(function(err){
						logger.error('[Engine] Failed to create current playlist :'+err);
					});
			});
		module.exports._services.playlist_controller.isAPublicPlaylist()
			.then(function(){
				//A playlist exists, nothing to do.
			})
			.catch(function(){
				//No playlist exists, creating one.
				logger.warn('[Engine] No public playlist found, creating one');
				module.exports._services.playlist_controller.createPlaylist(__('PUBLIC_PLAYLIST'),1,0,1)
					.then(function (new_playlist){
						logger.info('[Engine] Public playlist created : '+new_playlist);
					})
					.catch(function(err){
						logger.error('[Engine] Failed to create public playlist :'+err);
					});
			});		
	},
	/**
	* @function
	* Starts player interface
	* This is used to drive mpv or whatever video player is used.
	*/
	_start_player:function() {
		module.exports._services.player = require(path.resolve(__dirname,'../_player/index.js'));
		module.exports._services.player.BINPATH = path.resolve(module.exports.SYSPATH,'app/bin');
		module.exports._services.player.SETTINGS = module.exports.SETTINGS;		
		module.exports._services.player.SYSPATH = module.exports.SYSPATH;		
		module.exports._services.player.frontend_port = module.exports._states.frontend_port;
		module.exports._services.player.onEnd = module.exports.playerEnding;
		// TODO : Wallpaper is not yet configurable : this will be reworked later
		/*if(module.exports.SETTINGS.PlayerWallpaper && fs.existsSync(path.resolve(module.exports.SYSPATH,module.exports.SETTINGS.PlayerWallpaper)))
			module.exports._services.player.background = path.resolve(module.exports.SYSPATH,module.exports.SETTINGS.PlayerWallpaper); */
		module.exports._services.player.screen = module.exports.SETTINGS.PlayerScreen;
		module.exports._services.player.fullscreen = module.exports.SETTINGS.PlayerFullscreen>0;
		module.exports._services.player.stayontop = module.exports.SETTINGS.PlayerStayOnTop>0;
		module.exports._services.player.nohud = module.exports.SETTINGS.PlayerNoHud>0;
		module.exports._services.player.nobar = module.exports.SETTINGS.PlayerNoBar>0;
		module.exports._services.player.pipmode = module.exports.SETTINGS.PlayerPIP>0;
		module.exports._services.player.pippositionx = module.exports.SETTINGS.PlayerPIPPositionX;
		module.exports._services.player.pippositiony = module.exports.SETTINGS.PlayerPIPPositionY;
		module.exports._services.player.pipsize = module.exports.SETTINGS.PlayerPIPSize;
		module.exports._services.player.vo = module.exports.SETTINGS.mpvVideoOutput;
		module.exports._services.player.onStatusChange = function(){				
			var status = {
				private: module.exports._states.private,
				status: module.exports._states.status,
				onTop: module.exports._states.ontop,
				fullscreen: module.exports._states.fullscreen,
				timePosition: module.exports._services.player.timeposition,				
				duration: module.exports._services.player.duration,
				muteStatus: module.exports._services.player.mutestatus,
				playerStatus: module.exports._services.player.playerstatus,
				currentlyPlaying: module.exports._states.currentlyPlayingKara,
				subText: module.exports._services.player.subtext,
				showSubs: module.exports._services.player.showsubs,
				volume: module.exports._services.player.volume,
			}			
			module.exports._services.ws.socket.emit('playerStatus',status);
		};
		module.exports._services.player.init();
	}
};