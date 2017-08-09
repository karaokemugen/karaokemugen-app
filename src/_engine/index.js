/**
 * @fileoverview Main engine source file
 */
var fs = require('fs');
const path = require('path');
const logger = require('../_common/utils/logger.js');
const extend = require('extend');
const timestamp = require('unix-timestamp');
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
		playlist:null,
		timeposition:0,
		currentlyPlayingKara:undefined,
	},
	_services:{
		admin: null,
		playlist_controller: null,
		player:null,
		apiserver:null,
	},
	/**
	 * Base method for starting up the engine.
	 * It starts up the DB Interface, player, playlist controller and admin dashboard.
	 * @function {run}
	 */
	run: function(){
		logger.debug('[Engine] Entering run...');
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
		logger.debug('[Engine] Entering exit...');
		process.exit();
	},

	/**
	 * Starts playing karaoke songs.
	 * @function {play}
	 */
	play:function(){
		logger.debug('[Engine] Entering play...');
		logger.debug('[Engine] Status = '+module.exports._states.status);
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
		logger.debug('[Engine] Entering stop...');
		logger.debug('[Engine] now = '+now);
		if(now)
			module.exports._services.player.stop();

		logger.debug('[Engine] status = '+module.exports._states.status);
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
		logger.debug('[Engine] Entering pause...');
		module.exports._services.player.pause();
		module.exports._states.status = 'pause';
		module.exports._broadcastStates();
	},
	mute:function(){
		logger.debug('[Engine] Entering mute...');
		module.exports._services.player.mute();
	},
	unmute:function(){
		logger.debug('[Engine] Entering unmute...');
		module.exports._services.player.unmute();		
	},
	seek:function(delta){
		logger.debug('[Engine] Entering seek...');
		module.exports._services.player.seek(delta);
	},
	reset:function(){
		logger.debug('[Engine] Entering reset...');
		module.exports._services.player.reset();
	},
	/**
	 * @function {pause}
	 * Pauses current song in the player and broadcasts new status.
	 */
	prev:function(){
		logger.debug('[Engine] Entering prev...');
		module.exports.stop(true);
		module.exports._services.playlist_controller.prev()
			.then(function(){
				logger.debug('[Engine] PLC Prev resolved');
				module.exports.play();
			}).catch(function(){
				logger.debug('[Engine] PLC Prev catched');
				module.exports.play();
				logger.warn('[Engine] Previous song is not available');
			});
	},
	/**
	 * @function {pause}
	 * Pauses current song in the player and broadcasts new status.
	 */
	next:function(){
		logger.debug('[Engine] Entering next...');
		module.exports.stop(true);
		module.exports._services.playlist_controller.next()
			.then(function(){
				logger.debug('[Engine] PLC next resolved');
				module.exports.play();
			}).catch(function(){
				logger.debug('[Engine] PLC next catched');
				logger.warn('Next song is not available');
			});
	},

	/**
	* @function {setPrivateOn}
	* @private
	*/
	setPrivateOn:function() {
		logger.debug('[Engine] Entering setPrivateOn...');
		module.exports._states.private = true;
		module.exports._broadcastStates();
	},
	/**
	* @function {setPrivateOff}
	*/
	setPrivateOff:function() {
		logger.debug('[Engine] Entering setPrivateOff...');
		module.exports._states.private = false;
		module.exports._broadcastStates();
	},
	/**
	* @function {togglePrivate}
	*/
	togglePrivate:function() {
		logger.debug('[Engine] Entering togglePrivate...');
		logger.debug('[Engine] Current state of private = '+module.exports._states.private);
		module.exports._states.private = !module.exports._states.private;
		logger.debug('[Engine] private is now '+module.exports._states.private);
		module.exports._broadcastStates();
	},

	/**
	* @function {toggleFullscreen}
	*/
	toggleFullscreen:function() {
		logger.debug('[Engine] Entering toggleFullscreen...');
		logger.debug('[Engine] Current state of fullscreen = '+module.exports._states.fullscreen);
		module.exports._states.fullscreen = !module.exports._states.fullscreen;
		module.exports._services.player.setFullscreen(module.exports._states.fullscreen);
		logger.debug('fullscreen is now '+module.exports._states.fullscreen);
		module.exports._broadcastStates();
	},
	/**
	* @function {toggleStayOnTop}
	*/
	toggleOnTop:function() {
		logger.debug('[Engine] Entering toggleOnTop...');
		logger.debug('[Engine] Current state of ontop = '+module.exports._states.ontop);
		// player services return new ontop states after change
		module.exports._states.ontop = module.exports._services.player.toggleOnTop();
		logger.debug('ontop is now '+module.exports._states.ontop);
		module.exports._broadcastStates();
	},

	// Methode lié à la lecture de kara
	/**
	* @function
	*
	*/
	playlistUpdated:function(){
		logger.debug('[Engine] Entering playlistUpdated...');		
		logger.debug('[Engine] Status = '+module.exports._states.status);		
		if(module.exports._states.status === 'play' && !module.exports._services.player.playing) {
			module.exports._services.playlist_controller.next()
				.then(function(){
					logger.debug('[Engine] PLC next resolved');		
					module.exports.tryToReadKaraInPlaylist();
				}).catch(function(){
					logger.debug('[Engine] PLC next catched');		
					logger.warn('Next song is not available');
				});
		}
	},
	/**
	* @function
	*
	*/
	playingUpdated:function(){
		logger.debug('[Engine] Entering playingUpdated...');		
		logger.debug('[Engine] Status = '+module.exports._states.status);				
		if(module.exports._states.status === 'play' && module.exports._services.player.playing) {
			module.exports.stop(true)				
			module.exports.play()
			resolve();								
		} else {
			resolve();
		}
	},
	/**
	* @function
	*
	* Function triggered on player ending its current song.
	*/
	playerEnding:function(){
		logger.debug('[Engine] Entering playerEnding...');		
		module.exports._services.playlist_controller.next()
			.then(function(){
				logger.debug('[Engine] PLC next resolved');		
				module.exports.tryToReadKaraInPlaylist();
			}).catch(function(){
				logger.debug('[Engine] PLC next catched');		
				logger.warn('Next song is not available');
			});
	},

	/**
	* @function
	* Try to read next karaoke in playlist.
	*/
	tryToReadKaraInPlaylist:function(){
		logger.debug('[Engine] Entering tryToReadKaraInPlaylist...');		
		module.exports._services.playlist_controller.current_playlist()
		.then(function(playlist){
			logger.debug('[Engine] PLC current_playlist resolved');		
			if(module.exports._states.playlist != playlist) {
				module.exports._states.playlist = playlist;
				module.exports._broadcastStates();
			}
		})
		.catch(function(err){
			logger.debug('[Engine] PLC current_playlist catched');		
			logger.error('[Engine] Unable to get playlist!')			
		})
		logger.debug('[Engine] Status = '+module.exports._states.status);		
		if(module.exports._states.status === 'play' && !module.exports._services.player.playing) {
			module.exports._services.playlist_controller.current()
				.then(function(kara){
					logger.debug('[Engine] PLC current resolved');		
					logger.info('Start playing '+kara.path.video);
					module.exports._services.player.play(
						kara.path.video,
						kara.path.subtitle,
						kara.id_kara
					);
					module.exports._states.currentlyPlayingKara = kara.id_kara;
					module.exports._broadcastStates();
					//Add a view to the viewcount
					module.exports.addViewcount(kara.id_kara,kara.kid);
				})
				.catch(function(){
					logger.debug('[Engine] PLC current catched');		
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
		logger.debug('[Engine] Entering addViewCount');		
		logger.debug('[Engine] kara_id = '+kara_id);		
		logger.debug('[Engine] kid = '+kid);		
		// Add one viewcount to the table
		var datetime = timestamp.now();
		module.exports.DB_INTERFACE.addViewcount(kara_id,kid,datetime)		
		.then(function(){
			logger.debug('[Engine] DBI addViewcount resolved');					
			// Recalculate viewcount and edit it in karasdb
			module.exports.DB_INTERFACE.updateTotalViewcounts(kid)
			.then(function(){
				logger.debug('[Engine] DBI updateTotalViewcounts resolved');						
			})
			.catch(function(err){
				logger.debug('[Engine] DBI updateTotalViewcounts catched');		
				logger.error('[Engine] Failed to update viewcounts on karaoke ID '+kid);
			})
		})
		.catch(function(err){
			logger.debug('[Engine] DBI addViewcount catched');					
			logger.error('[Engine] Failed to add viewcount for karaoke '+kara_id);
		})		
	},
	// ------------------------------------------------------------------
	// méthodes privées
	// ------------------------------------------------------------------

	_broadcastStates:function() {
		logger.debug('[Engine] Entering _broadcastStates');					
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
		logger.debug('[Engine] Entering _start_db_interface...');					
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
		logger.debug('[Engine] Entering _start_admin...');					
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
		logger.debug('[Engine] Entering _start_frontend...');					
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
	* Starts the API webservice on the selected port
	* Broadcasts syspath and settings, as well as db interface to that module.
	*/
	_start_apiserver:function(){
		logger.debug('[Engine] Entering _start_apiserver...');					
		module.exports._services.apiserver = require(path.resolve(__dirname,'../_apiserver/index.js'));
		module.exports._services.apiserver.LISTEN = module.exports._states.apiserver_port;
		module.exports._services.apiserver.SYSPATH = module.exports.SYSPATH;
		module.exports._services.apiserver.SETTINGS = module.exports.SETTINGS;
		module.exports._services.apiserver.DB_INTERFACE = module.exports.DB_INTERFACE;
		// --------------------------------------------------------
		// diffusion des méthodes interne vers les events frontend
		// --------------------------------------------------------
		module.exports._services.apiserver.onTest = module.exports.test;
		module.exports._services.apiserver.onKaras = function(filter,lang){
			logger.debug('[Engine] Entering apiserver.onKaras...');					
			logger.debug('[Engine] args = '+arguments)
			return new Promise(function(resolve,reject){
				module.exports._services.playlist_controller.getAllKaras()
					.then(function(playlist){
						logger.debug('[Engine] PLC getAllKaras resolved');
						module.exports._services.playlist_controller.translateKaraInfo(playlist,lang)
						.then(function(karalist){
							logger.debug('[Engine] PLC translateKaraInfo resolved');							
							if (filter) {
								module.exports._services.playlist_controller.filterPlaylist(karalist,filter)
								.then(function(filtered_pl){
									logger.debug('[Engine] PLC filterPlaylist resolved');							
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
						logger.error('[Engine] PLC getAllKaras : '+err);	
						reject(err);
					});
			});
		};
		module.exports._services.apiserver.onWhitelist = function(filter,lang){
			logger.debug('[Engine] Entering apiserver.onWhitelist...');					
			logger.debug('[Engine] args = '+arguments);
			return new Promise(function(resolve,reject){
				module.exports._services.playlist_controller.getWhitelistContents()
					.then(function(playlist){
						logger.debug('[Engine] PLC getWhitelistContents resolved');
						module.exports._services.playlist_controller.translateKaraInfo(playlist,lang)
						.then(function(karalist){
							logger.debug('[Engine] PLC translateKaraInfo resolved');							
							if (filter) {
								module.exports._services.playlist_controller.filterPlaylist(karalist,filter)
								.then(function(filtered_pl){
									logger.debug('[Engine] PLC filterPlaylist resolved');							
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
			logger.debug('[Engine] Entering apiserver.onBlacklist...');					
			logger.debug('[Engine] args = '+arguments);
			return new Promise(function(resolve,reject){
				module.exports._services.playlist_controller.getBlacklistContents()
					.then(function(playlist){
						logger.debug('[Engine] PLC getBlacklistContents resolved');
						module.exports._services.playlist_controller.translateKaraInfo(playlist,lang)
						.then(function(karalist){
							logger.debug('[Engine] PLC translateKaraInfo resolved');							
							if (filter) {
								module.exports._services.playlist_controller.filterPlaylist(karalist,filter)
								.then(function(filtered_pl){
									logger.debug('[Engine] PLC filterPlaylist resolved');							
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
		module.exports._services.apiserver.onBlacklistCriterias = function(){
			logger.debug('[Engine] Entering apiserver.onBlacklistCriterias...');					
			return new Promise(function(resolve,reject){
				module.exports._services.playlist_controller.getBlacklistCriterias()
					.then(function(blc){
						logger.debug('[Engine] PLC getBlacklistCriterias resolved');							
						resolve(blc);
					})
					.catch(function(err){
						logger.error('[Engine] PLC getBlacklistCriterias : '+err);							
						reject(err);
					});
			});
		};
		module.exports._services.apiserver.onBlacklistCriteriaAdd = function(blctype,blcvalue){
			logger.debug('[Engine] Entering apiserver.onBlacklistCriteriaAdd...');					
			logger.debug('[Engine] args = '+arguments);
			return new Promise(function(resolve,reject){
				module.exports._services.playlist_controller.addBlacklistCriteria(blctype,blcvalue)
					.then(function(){
						logger.debug('[Engine] PLC addBlacklistCriterias resolved');							
						resolve();
					})
					.catch(function(err){
						logger.error('[Engine] PLC addBlacklistCriterias : '+err);							
						reject(err);
					});
			});
		};
		module.exports._services.apiserver.onBlacklistCriteriaDelete = function(blc_id){
			logger.debug('[Engine] Entering apiserver.onBlacklistCriteriaDelete...');					
			logger.debug('[Engine] args = '+arguments);
			return new Promise(function(resolve,reject){				
				module.exports._services.playlist_controller.deleteBlacklistCriteria(blc_id)
					.then(function(){
						logger.debug('[Engine] PLC deleteBlacklistCriterias resolved');							
						resolve();
					})
					.catch(function(err){
						logger.error('[Engine] PLC deleteBlacklistCriterias : '+err);							
						reject(err);
					});
			});
		};
		module.exports._services.apiserver.onBlacklistCriteriaEdit = function(blc_id,blctype,blcvalue){
			logger.debug('[Engine] Entering apiserver.onBlacklistCriteriaEdit...');					
			logger.debug('[Engine] args = '+arguments);
			return new Promise(function(resolve,reject){
				module.exports._services.playlist_controller.editBlacklistCriteria(blc_id,blctype,blcvalue)
					.then(function(){
						logger.debug('[Engine] PLC editBlacklistCriterias resolved');							
						resolve();
					})
					.catch(function(err){
						logger.error('[Engine] PLC editBlacklistCriterias : '+err);							
						reject(err);
					});
			});
		};
		module.exports._services.apiserver.onPlaylistShuffle = function(pl_id){
			logger.debug('[Engine] Entering apiserver.onPlaylistShuffle...');
			logger.debug('[Engine] args = '+arguments);
			return new Promise(function(resolve,reject){
				module.exports._services.playlist_controller.shufflePlaylist(pl_id)
					.then(function(){
						logger.debug('[Engine] PLC shufflePlaylist resolved');							
						resolve();
					})
					.catch(function(err){
						logger.error('[Engine] PLC shufflePlaylist : '+err);							
						reject(err);
					});
			});
		};
		module.exports._services.apiserver.onKaraSingle = function(id_kara,lang){
			logger.debug('[Engine] Entering apiserver.onKaraSingle...');					
			logger.debug('[Engine] args = '+arguments);
			return new Promise(function(resolve,reject){
				module.exports._services.playlist_controller.getKara(id_kara)
					.then(function(kara){
						logger.debug('[Engine] PLC getKara resolved');	
						module.exports._services.playlist_controller.translateKaraInfo(kara,lang)
							.then(function(karalist){
								logger.debug('[Engine] PLC translateKaraInfo resolved');	
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
		module.exports._services.apiserver.onPlaylists = function(seenFromUser){
			logger.debug('[Engine] Entering apiserver.onPlaylists...');					
			logger.debug('[Engine] args = '+arguments);
			return new Promise(function(resolve,reject){
				module.exports._services.playlist_controller.getPlaylists(seenFromUser)
					.then(function(playlists){
						logger.debug('[Engine] PLC getPlaylists resolved');							
						resolve(playlists);
					})
					.catch(function(err){
						logger.error('[Engine] PLC getPlaylists : '+err);							
						reject(err);
					});
			});
		};
		module.exports._services.apiserver.onPlaylistCreate = function(playlist){
			logger.debug('[Engine] Entering apiserver.onPlaylistCreate...');					
			logger.debug('[Engine] args = '+arguments);
			return new Promise(function(resolve,reject){
				module.exports._services.playlist_controller.createPlaylist(playlist.name,playlist.flag_visible,playlist.flag_current,playlist.flag_public)
					.then(function (new_playlist){
						logger.debug('[Engine] PLC createPlaylist resolved');
						logger.debug('[Engine] New playlist : '+new_playlist);
						resolve(new_playlist);
					})
					.catch(function(err){						
						logger.error('[Engine] PLC createPlaylist : '+err);
						reject(err);
					});
			});
		}
		module.exports._services.apiserver.onPlaylistSingleInfo = function(id_playlist,seenFromUser){
			logger.debug('[Engine] Entering apiserver.onPlaylistSingleInfo...');
			logger.debug('[Engine] args = '+arguments);
			return new Promise(function(resolve,reject){
				module.exports._services.playlist_controller.getPlaylistInfo(id_playlist,seenFromUser)
					.then(function(playlist){
						logger.debug('[Engine] PLC getPlaylistInfo resolved');											
						resolve(playlist);
					})
					.catch(function(err){
						logger.error('[Engine] PLC getPlaylistInfo : '+err);
						reject(err);
					});
			});
		};
		module.exports._services.apiserver.onPlaylistSingleDelete = function(id_playlist,id_newplaylist){
			logger.debug('[Engine] Entering apiserver.onPlaylistSingleDelte...');					
			logger.debug('[Engine] args = '+arguments);
			return new Promise(function(resolve,reject){
				module.exports._services.playlist_controller.deletePlaylist(id_playlist,id_newplaylist)
					.then(function(){
						logger.debug('[Engine] PLC deletePlaylist resolved');											
						resolve();
					})
					.catch(function(err){
						logger.error('[Engine] PLC deletePlaylist : '+err);
						reject(err);
					});
			});
		};
		module.exports._services.apiserver.onPlaylistSingleKaraDelete = function(playlistcontent_id){
			logger.debug('[Engine] Entering apiserver.onPlaylistSingleKaraDelete...');
			logger.debug('[Engine] args = '+arguments);
			return new Promise(function(resolve,reject){
				module.exports._services.playlist_controller.deleteKaraFromPlaylist(playlistcontent_id)
					.then(function(){
						logger.debug('[Engine] PLC deleteKaraFromPlaylist resolved');		
						resolve();
					})
					.catch(function(err){
						logger.error('[Engine] PLC deleteKaraFromPlaylist : '+err);
						reject(err);
					});
			});
		};
		module.exports._services.apiserver.onWhitelistSingleKaraDelete = function(wl_id){
			logger.debug('[Engine] Entering apiserver.onWhitelistSingleKaraDelete...');
			logger.debug('[Engine] args = '+arguments);
			return new Promise(function(resolve,reject){
				module.exports._services.playlist_controller.deleteKaraFromWhitelist(wl_id)
					.then(function(){
						logger.debug('[Engine] PLC deleteKaraFromWhitelist resolved');		
						resolve();
					})
					.catch(function(err){
						logger.error('[Engine] PLC deleteKaraFromWhitelist : '+err);
						reject(err);
					});
			});
		};
		module.exports._services.apiserver.onWhitelistSingleKaraEdit = function(wl_id,reason){
			logger.debug('[Engine] Entering apiserver.onWhitelistSingleKaraEdit...');
			logger.debug('[Engine] args = '+arguments);
			return new Promise(function(resolve,reject){
				module.exports._services.playlist_controller.editWhitelistKara(wl_id,reason)
					.then(function(){
						logger.debug('[Engine] PLC editWhitelistKara resolved');		
						resolve();
					})
					.catch(function(err){
						logger.error('[Engine] PLC editWhitelistKara : '+err);
						reject(err);
					});
			});
		};
		module.exports._services.apiserver.onPlaylistSingleKaraEdit = function(playlistcontent_id,pos,flag_playing){
			logger.debug('[Engine] Entering apiserver.onPlaylistSingleKaraEdit...');
			logger.debug('[Engine] args = '+arguments);
			return new Promise(function(resolve,reject){
				module.exports._services.playlist_controller.editKaraFromPlaylist(playlistcontent_id,pos,flag_playing)
					.then(function(){
						logger.debug('[Engine] PLC editKaraFromPlaylist resolved');		
						resolve();
					})
					.catch(function(err){
						logger.error('[Engine] PLC editKaraFromPlaylist : '+err);
						reject(err);
					});
			});
		};
		module.exports._services.apiserver.onSettingsUpdate = function(settings) {
			logger.debug('[Engine] Entering apiserver.onSettingsUpdate...');
			logger.debug('[Engine] args = '+arguments);
			return new Promise(function(resolve,reject){
				extend(true,module.exports.SETTINGS,settings);
				logger.debug('[Engine] New settings : '+module.exports.SETTINGS);		

				// TODO : Need to save settings here

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

				resolve();
			});
		};
		module.exports._services.apiserver.onPlaylistSingleEdit = function(id_playlist,playlist){
			logger.debug('[Engine] Entering apiserver.onPlaylistSingleEdit...');
			logger.debug('[Engine] args = '+arguments);
			return new Promise(function(resolve,reject){
				module.exports._services.playlist_controller.editPlaylist(id_playlist,playlist.name,playlist.flag_visible,playlist.flag_current,playlist.flag_public)
					.then(function(){
						logger.debug('[Engine] PLC editPlaylist resolved');		
						resolve();
					})
					.catch(function(err){
						logger.error('[Engine] PLC editPlaylist : '+err);
						reject(err);						
					});
			});
		}
		module.exports._services.apiserver.onPlaylistSingleContents = function(id_playlist,lang,seenFromUser){
			logger.debug('[Engine] Entering apiserver.onPlaylistSingleContents...');
			logger.debug('[Engine] args = '+arguments);
			return new Promise(function(resolve,reject){
				module.exports._services.playlist_controller.getPlaylistContents(id_playlist,seenFromUser)
					.then(function(playlist){
						logger.debug('[Engine] PLC getPlaylistContents resolved');		
						module.exports._services.playlist_controller.translateKaraInfo(playlist,lang)
							.then(function(karalist){
								logger.debug('[Engine] PLC translateKaraInfo resolved');		
								resolve(karalist);
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
			logger.debug('[Engine] Entering apiserver.onPlaylistCurrentInfo...');
			logger.debug('[Engine] args = '+arguments);
			return new Promise(function(resolve,reject){
				module.exports._services.playlist_controller.isACurrentPlaylist()
					.then(function(id_playlist){
						logger.debug('[Engine] PLC isACurrentPlaylist resolved');		
						module.exports._services.playlist_controller.getPlaylistInfo(id_playlist)
							.then(function(playlist){
								logger.debug('[Engine] PLC getPlaylistInfo resolved');		
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
		module.exports._services.apiserver.onPlaylistCurrentContents = function(lang){
			logger.debug('[Engine] Entering apiserver.onPlaylistCurrentContents...');
			logger.debug('[Engine] args = '+arguments);
			return new Promise(function(resolve,reject){
				module.exports._services.playlist_controller.isACurrentPlaylist()
					.then(function(id_playlist){
						logger.debug('[Engine] PLC isACurrentPlaylist resolved');		
						module.exports._services.playlist_controller.getPlaylistContents(id_playlist)
							.then(function(playlist){
								logger.debug('[Engine] PLC getPlaylistContents resolved');		
								module.exports._services.playlist_controller.translateKaraInfo(playlist,lang)
									.then(function(karalist){
										logger.debug('[Engine] PLC translateKaraInfo resolved');		
										resolve(karalist);
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
			logger.debug('[Engine] Entering apiserver.onPlaylistPublicInfo...');
			logger.debug('[Engine] args = '+arguments);
			return new Promise(function(resolve,reject){
				module.exports._services.playlist_controller.isAPublicPlaylist()				
					.then(function(id_playlist){
						logger.debug('[Engine] PLC isAPublicPlaylist resolved');		
						module.exports._services.playlist_controller.getPlaylistInfo(id_playlist)
							.then(function(playlist){
								logger.debug('[Engine] PLC getPlaylistInfo resolved');		
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
		module.exports._services.apiserver.onPlaylistPublicContents = function(lang){
			logger.debug('[Engine] Entering apiserver.onPlaylistPublicContents...');
			logger.debug('[Engine] args = '+arguments);
			return new Promise(function(resolve,reject){
				module.exports._services.playlist_controller.isAPublicPlaylist()
					.then(function(id_playlist){
						logger.debug('[Engine] PLC isAPublicPlaylist resolved');		
						module.exports._services.playlist_controller.getPlaylistContents(id_playlist)
							.then(function(playlist){
								logger.debug('[Engine] PLC getPlaylistContents resolved');		
								module.exports._services.playlist_controller.translateKaraInfo(playlist,lang)
									.then(function(karalist){
										logger.debug('[Engine] PLC translateKaraInfo resolved');		
										resolve(karalist);
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
			logger.debug('[Engine] Entering apiserver.onAddToModePlaylist...');
			logger.debug('[Engine] args = '+arguments);
			return new Promise(function(resolve,reject){
				logger.debug('[Engine] Private state = '+module.exports._states.private);
				if (module.exports._states.private) {
					//If Kara mode is private, then add to current playlist
					module.exports._services.playlist_controller.addKaraToCurrentPlaylist(id_kara,requester)
						.then(function(){
							logger.debug('[Engine] PLC addKaraToCurrentPlaylist resolved')
							resolve();
						})
						.catch(function(err){
							logger.error('[Engine] PLC addKaraToCurrentPlaylist : '+err);
							reject(err);
						});
				} else {
					//If Kara mode is public, then add to public playlist
					module.exports._services.playlist_controller.addKaraToPublicPlaylist(id_kara,requester)
						.then(function(){
							logger.debug('[Engine] PLC addKaraToPublicPlaylist resolved')
							resolve();
						})
						.catch(function(err){
							logger.error('[Engine] PLC addKaraToPublicPlaylist : '+err);
							reject(err);
						});
				}
			});
		};
		module.exports._services.apiserver.onKaraAddToPlaylist = function(id_kara,requester,playlist_id,pos){
			logger.debug('[Engine] Entering apiserver.onKaraAddToPlaylist...');
			logger.debug('[Engine] args = '+arguments);
			return new Promise(function(resolve,reject){
				module.exports._services.playlist_controller.addKaraToPlaylist(id_kara,requester,playlist_id,pos)
					.then(function(){
						logger.debug('[Engine] PLC addKaraToPlaylist resolved')
						resolve();
					})
					.catch(function(err){
						logger.error('[Engine] PLC addKaraToPlaylist : '+err)
						reject(err);
					});
			});
		};
		module.exports._services.apiserver.onKaraAddToWhitelist = function(id_kara,reason){
			logger.debug('[Engine] Entering apiserver.onKaraAddToWhitelist...');
			logger.debug('[Engine] args = '+arguments);
			return new Promise(function(resolve,reject){
				module.exports._services.playlist_controller.addKaraToWhitelist(id_kara,reason)
					.then(function(){
						logger.debug('[Engine] PLC addKaraToWhitelist resolved')
						resolve();
					})
					.catch(function(err){
						logger.error('[Engine] PLC addKaraToWhitelist : '+err)
						reject(err);
					});
			});
		};
		module.exports._services.apiserver.onPlayerCommand = function(command,options){
			logger.debug('[Engine] Entering apiserver.onPlayerCommand...');
			logger.debug('[Engine] args = '+arguments);
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
					case 'seek':
						if (!options) options = 0;
						module.exports.seek(options)
						break;
					case 'reset':
						module.exports.reset();
						break;
				}
				resolve();
			});
		};
		module.exports._services.apiserver.onPlayerStatus = function(){
			logger.debug('[Engine] Entering apiserver.onPlayerStatus...');					
			return new Promise(function(resolve,reject){				
				resolve({
					private: module.exports._states.private,
					status: module.exports._states.status,
					ontop: module.exports._states.ontop,
					fullscreen: module.exports._states.fullscreen,
					timeposition: module.exports._services.player.timeposition,				
					duration: module.exports._services.player.duration,
					mutestatus: module.exports._services.player.mutestatus,
					playerstatus: module.exports._services.player.playerstatus,
					currentlyplaying: module.exports._states.currentlyPlayingKara,
					subtext: module.exports._services.player.subtext,
				});
			});
		};
		module.exports._services.apiserver.onStats = function(){
			logger.debug('[Engine] Entering apiserver.onStats...');					
			return new Promise(function(resolve,reject){
				module.exports.DB_INTERFACE.getStats()
					.then(function(stats){
						logger.debug('[Engine] DBI getStats resolved')
						resolve(stats);
					})
					.catch(function(err){
						logger.error('[Engine] DBI getStats : '+err)
						reject(err);
					});
			});
		};
		module.exports._services.apiserver.onKaraSingleLyrics = function(kara_id){
			logger.debug('[Engine] Entering apiserver.onKaraSingleLyrics...');					
			logger.debug('[Engine] args = '+arguments);
			return new Promise(function(resolve,reject){
				module.exports._services.playlist_controller.getKaraLyrics(kara_id)
					.then(function(lyrics){
						logger.debug('[Engine] PLC getKaraLyrics resolved')
						resolve(lyrics);
					})
					.catch(function(err){							
						logger.error('[Engine] PLC getKaraLyrics : '+err)
						reject(err);
					});
			});
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
		logger.debug('[Engine] Entering _start_playlist_controller...');					
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
				logger.debug('[Engine] PLC isACurrentPlaylist resolved');		
			})
			.catch(function(){
				logger.debug('[Engine] PLC isACurrentPlaylist : '+err);		
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
				logger.debug('[Engine] PLC isAPublicPlaylist resolved');		
			})
			.catch(function(){
				//No playlist exists, creating one.
				logger.debug('[Engine] PLC isAPublicPlaylist : '+err);		
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
		logger.debug('[Engine] Entering _start_player...');					
		module.exports._services.player = require(path.resolve(__dirname,'../_player/index.js'));
		module.exports._services.player.BINPATH = path.resolve(module.exports.SYSPATH,'app/bin');
		module.exports._services.player.SETTINGS = module.exports.SETTINGS;
		module.exports._services.player.onEnd = module.exports.playerEnding;
		// si le wallpaper de la config existe bien on le configure dans le player
		if(module.exports.SETTINGS.PlayerWallpaper && fs.existsSync(path.resolve(module.exports.SYSPATH,module.exports.SETTINGS.PlayerWallpaper)))
			module.exports._services.player.background = path.resolve(module.exports.SYSPATH,module.exports.SETTINGS.PlayerWallpaper);
		module.exports._services.player.screen = module.exports.SETTINGS.PlayerScreen;
		module.exports._services.player.fullscreen = module.exports.SETTINGS.PlayerFullscreen>0;
		module.exports._services.player.stayontop = module.exports.SETTINGS.PlayerStayOnTop>0;
		module.exports._services.player.nohud = module.exports.SETTINGS.PlayerNoHud>0;
		module.exports._services.player.nobar = module.exports.SETTINGS.PlayerNoBar>0;
		module.exports._services.player.init();

	}
};