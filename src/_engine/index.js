/**
 * @fileoverview Main engine source file
 */
process.on('uncaughtException', function (exception) {
	console.log(exception); // to see your exception details in the console
	// if you are on production, maybe you can send the exception details to your
	// email as well ?
});
process.on('unhandledRejection', (reason, p) => {
	console.log('Unhandled Rejection at: Promise', p, 'reason:', reason);
	// application specific logging, throwing an error, or other logic here
});

var fs = require('fs');
const path = require('path');
const logger = require('../_common/utils/logger.js');
const extend = require('extend');
const timestamp = require('unix-timestamp');
const ini = require('ini');
const ip = require('ip');
/**
 * @module engine
 * Main engine module.
 */
module.exports = {
	SYSPATH:null,
	SETTINGS:null,
	DB_INTERFACE:null,
	i18n:null,
	endOfPlaylist:false,
	currentPlaylistID:null,
	currentPlayingPLC:null,
	archivedStatus:null,
	playerNeedsRestart:false,
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
		counterToJingle:0,
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
	sendMessageToPlayer:function(message,duration){
		module.exports._services.player.message(message,duration);
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
	 * @function {next}
	 * If next song is available, play it.
	 */
	next:function(){
		module.exports.stop(true);
		module.exports._services.playlist_controller.next()
			.then(function(){
				module.exports.play();
			}).catch(function(){
				logger.warn('[Engine] Next song is not available');
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
		return new Promise(function(resolve){
			if(module.exports._states.status === 'play' && module.exports._services.player.playing) {
				module.exports.stop(true);
				module.exports.play();
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
		logger.debug('[Engine] Player Ending event triggered');
		var pNeedsRestart = new Promise((resolve,reject) => {
			if (module.exports.playerNeedsRestart) {
				logger.info('[Engine] Player restarts, please wait');
				module.exports.playerNeedsRestart = false;				
				module.exports._services.player.restartmpv()
					.then(() => {
						logger.debug('[Engine] Player restart complete');
						resolve();
					})
					.catch((err) => {
						reject(err);
					});
				
			} else {
				resolve();
			}
		});
		Promise.all([pNeedsRestart])
			.then(() => {				
				if (module.exports._states.counterToJingle == module.exports.SETTINGS.EngineJinglesInterval) { 
					module.exports._services.player.playJingle();
					module.exports._states.counterToJingle = 0;
				} else {										
					module.exports._services.playlist_controller.next()
						.then(function(){
							module.exports._services.player.displayInfo();				
							module.exports.tryToReadKaraInPlaylist();
							module.exports._states.counterToJingle++;
						})
						.catch(function(){
							module.exports._services.player.displayInfo();				
							logger.warn('[Engine] Next song is not available');
							module.exports.stop();
						});
				}
			})
			.catch((err) => {
				logger.error('[Engine] NeedsRestart Promise failed : '+err);
			});		
	},

	/**
	* @function
	* Try to read next karaoke in playlist.
	*/
	tryToReadKaraInPlaylist:function(){
		//logger.profile('StartPlaying');
		if(module.exports._states.status === 'play' && !module.exports._services.player.playing) {
			module.exports._services.playlist_controller.current()
				.then(function(kara){
					module.exports._services.player.play(
						kara.path.video,
						kara.path.subtitle,
						kara.gain,
						kara.infos
					);
					module.exports._states.currentlyPlayingKara = kara.kara_id;
					module.exports._broadcastStates();
					//Add a view to the viewcount
					module.exports.addViewcount(kara.kara_id,kara.kid);
				})
				.catch(function(){
					logger.info('Cannot find a song to play');
					module.exports.stop(true);
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
						logger.error('[Engine] Failed to update viewcounts on karaoke ID '+kid+' : '+err);
					});
			})
			.catch(function(err){
				logger.error('[Engine] Failed to add viewcount for karaoke '+kara_id+' : '+err);
			});
	},
	// ------------------------------------------------------------------
	// méthodes privées
	// ------------------------------------------------------------------

	_broadcastStates:function() {
		// diffuse l'état courant à tout les services concerné (normalement les webapp)
		module.exports._services.admin.setEngineStates(module.exports._states);
		module.exports._services.player._states = module.exports._states;
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
		module.exports.DB_INTERFACE = require(path.join(__dirname,'components/db_interface.js'));
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
		module.exports._services.admin = require(path.join(__dirname,'../_admin/index.js'));
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
		module.exports._services.frontend = require(path.join(__dirname,'../_webapp/index.js'));
		module.exports._services.frontend.LISTEN = module.exports._states.frontend_port;
		module.exports._services.frontend.SYSPATH = module.exports.SYSPATH;
		module.exports._services.frontend.SETTINGS = module.exports.SETTINGS;
		module.exports._services.frontend.DB_INTERFACE = module.exports.DB_INTERFACE;
		module.exports._services.frontend.i18n = module.exports.i18n;
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
		module.exports._services.ws = require(path.join(__dirname,'../_ws/index.js'));
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
		module.exports._services.apiserver = require(path.join(__dirname,'../_apiserver/index.js'));
		module.exports._services.apiserver.LISTEN = module.exports._states.apiserver_port;
		module.exports._services.apiserver.SYSPATH = module.exports.SYSPATH;
		module.exports._services.apiserver.SETTINGS = module.exports.SETTINGS;
		module.exports._services.apiserver.DB_INTERFACE = module.exports.DB_INTERFACE;
		// --------------------------------------------------------
		// diffusion des méthodes interne vers les events frontend
		// --------------------------------------------------------
		module.exports._services.apiserver.emitEvent = module.exports.emitEvent;
		module.exports._services.apiserver.onKaras = function(filter,lang,from,to){
			return new Promise(function(resolve,reject){
				module.exports._services.playlist_controller.getAllKaras()
					.then(function(playlist){
						module.exports._services.playlist_controller.translateKaraInfo(playlist,lang)
							.then(function(karalist){
								if (filter) {
									module.exports._services.playlist_controller.filterPlaylist(karalist,filter)
										.then(function(filtered_pl){	
											var response = {
												infos: { count : filtered_pl.length },
												content: filtered_pl.slice(from,to)
											};
											resolve(response);
										})
										.catch(function(err){
											logger.error('[Engine] PLC filterPlaylist : '+err);
											resolve(err);
										});
								} else {
									var response = {
										infos: { count : karalist.length },
										content: karalist.slice(from,to)
									};
									resolve(response);
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
		module.exports._services.apiserver.onKaraRandom = function(filter){
			return new Promise(function(resolve,reject){
				module.exports._services.playlist_controller.getRandomKara(module.exports.currentPlaylistID,filter)
					.then(function(kara_id){
						logger.debug('[Engine] Sending random kara_id : '+kara_id);
						resolve(kara_id);
					})
					.catch(function(err){
						logger.error('[Engine] PLC getAllKaras : '+err);
						reject(err);
					});
			});
		};
		module.exports._services.apiserver.onWhitelist = function(filter,lang,from,to){
			return new Promise(function(resolve,reject){
				module.exports._services.playlist_controller.getWhitelistContents()
					.then(function(playlist){
						module.exports._services.playlist_controller.translateKaraInfo(playlist,lang)
							.then(function(karalist){
								if (filter) {
									module.exports._services.playlist_controller.filterPlaylist(karalist,filter)
										.then(function(filtered_pl){
											var response = {
												infos: { count : filtered_pl.length },
												content: filtered_pl.slice(from,to)
											};
											resolve(response);	
										})
										.catch(function(err){
											logger.error('[Engine] PLC filterPlaylist : '+err);
											resolve(err);
										});
								} else {
									var response = {
										infos: { count : karalist.length },
										content: karalist.slice(from,to)
									};
									resolve(response);									
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
		module.exports._services.apiserver.onBlacklist = function(filter,lang,from,to){
			return new Promise(function(resolve,reject){
				module.exports._services.playlist_controller.getBlacklistContents()
					.then(function(playlist){
						module.exports._services.playlist_controller.translateKaraInfo(playlist,lang)
							.then(function(karalist){
								if (filter) {
									module.exports._services.playlist_controller.filterPlaylist(karalist,filter)
										.then(function(filtered_pl){
											var response = {
												infos: { count : filtered_pl.length },
												content: filtered_pl.slice(from,to)
											};
											resolve(response);										
										})
										.catch(function(err){
											logger.error('[Engine] PLC filterPlaylist : '+err);
											reject(err);
										});
								} else {
									var response = {
										infos: { count : karalist.length },
										content: karalist.slice(from,to)
									};
									resolve(response);									
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
		module.exports._services.apiserver.onTags = function(lang){
			return new Promise(function(resolve,reject){
				module.exports.DB_INTERFACE.getAllTags()
					.then(function(tags){
						module.exports._services.playlist_controller.translateTags(tags,lang)
							.then(function(tags_output){
								resolve(tags_output);
							})
							.catch(function(err){
								logger.error('[Engine] translateTags : '+err);
								reject(err);
							});
					})
					.catch(function(err){
						logger.error('[Engine] PLC getTags : '+err);
						reject(err);
					});
			});
		};
		module.exports._services.apiserver.onPlaylistExport = function(playlist_id){
			return new Promise(function(resolve,reject){
				module.exports._services.playlist_controller.exportPlaylist(playlist_id)
					.then(function(playlist){
						resolve(playlist);
					})
					.catch(function(err){
						logger.error('[Engine] PLC exportPlaylist : '+err);
						module.exports._services.playlist_controller.getPlaylistInfo(playlist_id)
							.then(function(playlist){
								err = {
									message: err,
									data: playlist.name
								};
								reject(err);
							})
							.catch(function(err){
								logger.error('[Engine] PLC getPlaylistInfo : '+err);
								err = {
									message: err,
									data: playlist_id
								};
								reject(err);
							});						
					});
			});
		};
		module.exports._services.apiserver.onPlaylistImport = function(playlist){
			return new Promise(function(resolve,reject){
				module.exports._services.playlist_controller.importPlaylist(playlist)
					.then(function(response){												
						resolve(response);
					})
					.catch(function(err){
						logger.error('[Engine] PLC importPlaylist : '+err);
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
							});
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
		module.exports._services.apiserver.onPlaylistShuffle = function(playlist_id){
			return new Promise(function(resolve,reject){
				module.exports._services.playlist_controller.shufflePlaylist(playlist_id)
					.then(function(){
						logger.info('[Engine] Playlist '+playlist_id+' shuffled');
						module.exports._services.playlist_controller.getPlaylistInfo(playlist_id)
							.then(function(playlist){
								resolve(playlist.name);
							})
							.catch(function(){
								resolve(playlist_id);
							});						
					})
					.catch(function(err){
						logger.error('[Engine] PLC shufflePlaylist : '+err);
						module.exports._services.playlist_controller.getPlaylistInfo(playlist_id)
							.then(function(playlist){
								err = {
									message: err,
									data: playlist.name
								};
								reject(err);
							})
							.catch(function(err){
								logger.error('[Engine] PLC getPlaylistInfo : '+err);
								err = {
									message: err,
									data: playlist_id
								};
								reject(err);
							});						
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
		};
		module.exports._services.apiserver.onPLCInfo = function(plc_id,lang,seenFromUser){
			return new Promise(function(resolve,reject){
				module.exports._services.playlist_controller.getKaraFromPlaylist(plc_id,seenFromUser)
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
		};
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
		};
		module.exports._services.apiserver.onPlaylistSingleInfo = function(id_playlist,seenFromUser){
			return new Promise(function(resolve,reject){
				module.exports._services.playlist_controller.getPlaylistInfo(id_playlist,seenFromUser)
					.then(function(playlist){
						resolve(playlist);
					})
					.catch(function(err){
						logger.error('[Engine] PLC getPlaylistInfo : '+err);
						err = {
							message: err,
							data: id_playlist
						};
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
						module.exports._services.playlist_controller.getPlaylistInfo(id_playlist)
							.then(function(playlist){
								err = {
									message: err,
									data: playlist.name
								};
								reject(err);
							})
							.catch(function(err){
								logger.error('[Engine] PLC getPlaylistInfo : '+err);
								err = {
									message: err,
									data: id_playlist
								};
								reject(err);
							});						
					});
			});
		};
		module.exports._services.apiserver.onPlaylistSingleKaraDelete = function(plc_ids,playlist_id){
			return new Promise(function(resolve,reject){
				logger.info('[Engine] Deleting karaokes from playlist '+playlist_id+' : '+plc_ids);
				var karas;
				if (typeof plc_ids === 'string') {
					karas = plc_ids.split(',');
				} else {
					karas = [plc_ids];
				}
				module.exports._services.playlist_controller.deleteKaraFromPlaylist(karas,playlist_id)
					.then(function(){
						module.exports._services.playlist_controller.getPlaylistInfo(playlist_id)
							.then(function(playlist){
								var data = {
									pl_id: playlist_id,
									pl_name: playlist.name
								};
								resolve(data);
							})
							.catch(function(err){
								logger.error('[Engine] PLC getPlaylistInfo : '+err);
								err = {
									message: err,
									data: playlist_id
								};
								reject(err);
							});
					})
					.catch(function(err){
						logger.error('[Engine] PLC deleteKaraFromPlaylist : '+err);
						module.exports._services.playlist_controller.getPlaylistInfo(playlist_id)
							.then(function(playlist){
								err = {
									message: err,
									data: playlist.name
								};
								reject(err);
							})
							.catch(function(err){
								logger.error('[Engine] PLC getPlaylistInfo : '+err);
								err = {
									message: err,
									data: playlist_id
								};
								reject(err);
							});
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
				var setting;
				//We re-read config.ini.default and compare it with the settings we have
				//If a setting is different, it is added to the settings to save.
				var defaultSettings = ini.parse(fs.readFileSync(path.resolve(module.exports.SYSPATH,'config.ini.default'), 'utf-8'));
				for (setting in settings){
					if (settings.hasOwnProperty(setting)){
						if (defaultSettings[setting] != settings[setting]) {
							if (setting.startsWith('os') ||
								setting == 'EngineDefaultLocale') {
								// Do nothing
								// We don't want to save these settings to file.
							} else {
								settingsToSave[setting] = settings[setting];
							}
						}
					}
				}

				//We need to add to settingsToSave system settings that might be in config.ini
				if (fs.existsSync(path.resolve(module.exports.SYSPATH,'config.ini'))) {
					var customSettings = ini.parse(fs.readFileSync(path.resolve(module.exports.SYSPATH,'config.ini'), 'utf-8'));
					for (setting in customSettings){
						if (setting.startsWith('Path') ||
							setting.startsWith('Bin') ||
							setting.startsWith('mpv')) {
							settingsToSave[setting] = customSettings[setting];
						}
					}
				}
				// Other settings for now have to be toggled through API calls
				// Let's detect which settings have changed. If any Player setting has been 
				// changed, we set the playerNeedsRestart to true
				for (setting in settings) {
					if (setting.startsWith('Player')) {
						if (module.exports.SETTINGS[setting] != settings[setting]) {
							module.exports.playerNeedsRestart = true;
							logger.info('[Engine] Setting mpv to restart after next song');
						}
					}
				}

				extend(true,module.exports.SETTINGS,settings);

				//Updating IP address
				if (module.exports.SETTINGS.EngineDisplayConnectionInfoHost == '') {
					module.exports.SETTINGS.osHost = ip.adress();
				} else {
					module.exports.SETTINGS.osHost = module.exports.SETTINGS.EngineDisplayConnectionInfoHost;
				}
				//Broadcasting settings
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

				// Sending settings through WS. We only send public settings
				var publicSettings = {};
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

				fs.writeFile(path.join(module.exports.SYSPATH,'config.ini'),ini.stringify(settingsToSave), function(err) {
					if (err) {
						logger.error('[Engine] Unable to save settings : '+err);
						reject(err);
					}
					logger.info('[Engine] Settings updated and saved to disk');
					resolve(publicSettings);
				});
			});
		};
		module.exports._services.apiserver.onPlaylistSingleEdit = function(id_playlist,playlist){
			return new Promise(function(resolve,reject){
				module.exports._services.playlist_controller.editPlaylist(id_playlist,playlist.name,playlist.flag_visible)
					.then(function(){
						resolve();
					})
					.catch(function(err){
						logger.error('[Engine] PLC editPlaylist : '+err);
						module.exports._services.playlist_controller.getPlaylistInfo(id_playlist)
							.then(function(playlist){
								err = {
									message: err,
									data: playlist.name
								};
								reject(err);
							})
							.catch(function(err){
								logger.error('[Engine] PLC getPlaylistInfo : '+err);
								err = {
									message: err,
									data: id_playlist
								};
								reject(err);
							});						
					});
			});
		};
		module.exports._services.apiserver.onPlaylistSingleSetCurrent = function(id_playlist){
			return new Promise(function(resolve,reject){
				module.exports._services.playlist_controller.isACurrentPlaylist()
					.then(function(playlist_id){
						module.exports._services.playlist_controller.setCurrentPlaylist(id_playlist)
							.then(function(id_playlist){
								module.exports._services.ws.socket.emit('playlistInfoUpdated', playlist_id);
								module.exports.currentPlaylistID = id_playlist;
								resolve(id_playlist);
							})
							.catch(function(err){
								logger.error('[Engine] PLC setCurrentPlaylist : '+err);
								module.exports._services.playlist_controller.getPlaylistInfo(id_playlist)
									.then(function(playlist){
										err = {
											message: err,
											data: playlist.name
										};
										reject(err);
									})
									.catch(function(err){
										logger.error('[Engine] PLC getPlaylistInfo : '+err);
										err = {
											message: err,
											data: id_playlist
										};
										reject(err);
									});						
								reject(err);
							});
					})
					.catch(function(err){
						logger.error('[Engine] PLC isACurrentPlaylist : '+err);
						module.exports._services.playlist_controller.getPlaylistInfo(id_playlist)
							.then(function(playlist){
								err = {
									message: err,
									data: playlist.name
								};
								reject(err);
							})
							.catch(function(err){
								logger.error('[Engine] PLC getPlaylistInfo : '+err);
								err = {
									message: err,
									data: id_playlist
								};
								reject(err);
							});						
						reject(err);
					});
			});
		};
		module.exports._services.apiserver.onPlaylistSingleSetPublic = function(id_playlist){
			return new Promise(function(resolve,reject){
				module.exports._services.playlist_controller.isAPublicPlaylist()
					.then(function(playlist_id){
						module.exports._services.playlist_controller.setPublicPlaylist(id_playlist)
							.then(function(id_playlist){
								module.exports._services.ws.socket.emit('playlistInfoUpdated', playlist_id);
								resolve(id_playlist);
							})
							.catch(function(err){
								logger.error('[Engine] PLC setPublicPlaylist : '+err);
								module.exports._services.playlist_controller.getPlaylistInfo(id_playlist)
									.then(function(playlist){
										err = {
											message: err,
											data: playlist.name
										};
										reject(err);
									})
									.catch(function(err){
										logger.error('[Engine] PLC getPlaylistInfo : '+err);
										err = {
											message: err,
											data: id_playlist
										};
										reject(err);
									});						
								
							});
					})
					.catch(function(err){
						logger.error('[Engine] PLC isAPublicPlaylist : '+err);
						module.exports._services.playlist_controller.getPlaylistInfo(id_playlist)
							.then(function(playlist){
								err = {
									message: err,
									data: playlist.name
								};
								reject(err);
							})
							.catch(function(err){
								logger.error('[Engine] PLC getPlaylistInfo : '+err);
								err = {
									message: err,
									data: id_playlist
								};
								reject(err);
							});						
						reject(err);
					});
			});
		};
		module.exports._services.apiserver.onShutdown = function(){
			return new Promise(function(resolve){
				logger.info('[Engine] Dropping the mic, shutting down!');
				resolve();
				setTimeout(function(){
					process.exit(0);
				},1000);
			});
		};
		module.exports._services.apiserver.onPlaylistSingleEmpty = function(id_playlist){
			return new Promise(function(resolve,reject){
				module.exports._services.playlist_controller.emptyPlaylist(id_playlist)
					.then(function(){
						resolve(id_playlist);
					})
					.catch(function(err){
						logger.error('[Engine] PLC emptyPlaylist : '+err);
						module.exports._services.playlist_controller.getPlaylistInfo(id_playlist)
							.then(function(playlist){
								err = {
									message: err,
									data: playlist.name
								};
								reject(err);
							})
							.catch(function(err){
								logger.error('[Engine] PLC getPlaylistInfo : '+err);
								err = {
									message: err,
									data: id_playlist
								};
								reject(err);
							});						
					});
			});
		};
		module.exports._services.apiserver.onBlacklistCriteriasEmpty = function(){
			return new Promise(function(resolve,reject){
				module.exports._services.playlist_controller.emptyBlacklistCriterias()
					.then(function(){
						resolve();
					})
					.catch(function(err){
						logger.error('[Engine] PLC emptyBlacklist : '+err);
						reject(err);
					});
			});
		};
		module.exports._services.apiserver.onWhitelistEmpty = function(){
			return new Promise(function(resolve,reject){
				module.exports._services.playlist_controller.emptyWhitelist()
					.then(function(){
						resolve();
					})
					.catch(function(err){
						logger.error('[Engine] PLC emptyWhitelist : '+err);
						reject(err);
					});
			});
		};
		module.exports._services.apiserver.onPlaylistSingleContents = function(id_playlist,filter,lang,seenFromUser,from,to){
			return new Promise(function(resolve,reject){
				module.exports._services.playlist_controller.getPlaylistContents(id_playlist,seenFromUser)
					.then(function(playlist){
						module.exports._services.playlist_controller.translateKaraInfo(playlist,lang)
							.then(function(karalist){
								if (filter) {
									module.exports._services.playlist_controller.filterPlaylist(karalist,filter)
										.then(function(filtered_pl){
											var response = {
												infos: { count : filtered_pl.length },
												content: filtered_pl.slice(from,to)
											};
											resolve(response);
										})
										.catch(function(err){
											logger.error('[Engine] PLC filterPlaylist : '+err);
											reject(err);
										});
								} else {
									var response = {
										infos: { count : karalist.length },
										content: karalist.slice(from,to)
									};
									resolve(response);
								}

							})
							.catch(function(err){
								logger.error('[Engine] PLC translateKaraInfo : '+err);
								module.exports._services.playlist_controller.getPlaylistInfo(id_playlist)
									.then(function(playlist){
										err = {
											message: err,
											data: playlist.name
										};
										reject(err);
									})
									.catch(function(err){
										logger.error('[Engine] PLC getPlaylistInfo : '+err);
										err = {
											message: err,
											data: id_playlist
										};
										reject(err);
									});						
								reject(err);
							});
					})
					.catch(function(err){
						logger.error('[Engine] PLC getPlaylistContents : '+err);
						module.exports._services.playlist_controller.getPlaylistInfo(id_playlist)
							.then(function(playlist){
								err = {
									message: err,
									data: playlist.name
								};
								reject(err);
							})
							.catch(function(err){
								logger.error('[Engine] PLC getPlaylistInfo : '+err);
								err = {
									message: err,
									data: id_playlist
								};
								reject(err);
							});						
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
													var response = {
														infos: { count : filtered_pl.length },
														content: filtered_pl.slice(from,to)
													};
													resolve(response);
												})
												.catch(function(err){
													logger.error('[Engine] PLC filterPlaylist : '+err);
													resolve(err);
												});
										} else {
											var response = {
												infos: { count : karalist.length },
												content: karalist.slice(from,to)
											};
											resolve(response);
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
													var response = {
														infos: { count : filtered_pl.length },
														content: filtered_pl.slice(from,to)
													};
													resolve(response);
												})
												.catch(function(err){
													logger.error('[Engine] PLC filterPlaylist : '+err);
													resolve(err);
												});
										} else {
											var response = {
												infos: { count : karalist.length },
												content: karalist.slice(from,to)
											};
											resolve(response);
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
				logger.profile('AddKara');				
				var karas = id_kara.split(',');
				if (module.exports._states.private) {
					//If Kara mode is private, then add to current playlist
					module.exports._services.playlist_controller.isACurrentPlaylist()
						.then(function(playlist_id) {
							logger.info('[Engine] Adding karaokes to playlist '+playlist_id+' : '+karas);							
							module.exports._services.playlist_controller.addKaraToPlaylist(karas,requester,playlist_id)
								.then(function(){
									if (module.exports.SETTINGS.EngineAutoPlay == 1 && 
										module.exports._states.status == 'stop' ) {
										module.exports.play();
									}
									module.exports._services.playlist_controller.getPlaylistInfo(playlist_id)
										.then(function(playlist){
											module.exports._services.playlist_controller.getKara(id_kara)
												.then((kara) => {
													var res = {
														kara: kara.title,
														playlist: playlist.name,
														kara_id: id_kara,
														playlist_id: playlist_id
													};
													logger.profile('AddKara');
													resolve(res);
												})
												.catch(() => {
													var res = {
														playlist: playlist.name,
													};																				resolve(res);
												});
										})
										.catch(function(err){
											logger.error('[Engine] PLC getPlaylistInfo : '+err);
											err = {
												message: err,
												data: {
													kara: id_kara,
													playlist: playlist_id
												}
											};
											logger.profile('AddKara');			
											reject(err);
										});						
								
								})
								.catch(function(err){
									logger.error('[Engine] PLC addKaraToCurrentPlaylist : '+err);
									module.exports._services.playlist_controller.getPlaylistInfo(playlist_id)
										.then(function(playlist){
											module.exports._services.playlist_controller.getKara(id_kara)
												.then((kara) => {
													var res = {
														message: err,
														data: {
															kara: kara.title,
															playlist: playlist.name
														}
													};
													logger.profile('AddKara');	
													reject(res);
												})
												.catch(() => {
													reject();
												});
										})
										.catch(function(err){
											logger.error('[Engine] PLC getPlaylistInfo : '+err);
											err = {
												message: err,
												data: {
													kara: id_kara,
													playlist: playlist_id,
												}
											};
											logger.profile('AddKara');
											reject(err);
										});						
								});
						})
						.catch(function(err) {
							logger.error('[PLC] isACurrentPlaylist : '+err);
							err = {
								message: 'Current playlist not found : '+err,
								data: undefined
							};
							logger.profile('AddKara');				
							reject(err);					
						});
				} else {
					//If Kara mode is public, then add to public playlist
					module.exports._services.playlist_controller.isAPublicPlaylist()
						.then(function(playlist_id) {
							logger.info('[Engine] Adding karaokes to playlist '+playlist_id+' : '+karas);
							logger.profile('AddKara');	
							module.exports._services.playlist_controller.addKaraToPlaylist(karas,requester,playlist_id)
								.then(function(){
									module.exports._services.playlist_controller.getPlaylistInfo(playlist_id)
										.then(function(playlist){
											module.exports._services.playlist_controller.getKara(id_kara)
												.then((kara) => {
													var res = {
														kara: kara.title,
														playlist: playlist.name,
														kara_id: id_kara,
														playlist_id: playlist_id
													};
													logger.profile('AddKara');
													resolve(res);
												})
												.catch(() => {
													logger.profile('AddKara');	
													resolve();
												});
										})
										.catch(function(err){
											logger.error('[Engine] PLC getPlaylistInfo : '+err);
											err = {
												message: err,
												data: {
													kara: id_kara,
													playlist: playlist_id
												}
											};
											logger.profile('AddKara');
											reject(err);
										});						
								})
								.catch(function(err){
									logger.error('[Engine] PLC addKaraToPublicPlaylist : '+err);
									module.exports._services.playlist_controller.getPlaylistInfo(playlist_id)
										.then(function(playlist){
											module.exports._services.playlist_controller.getKara(id_kara)
												.then((kara) => {
													var res = {
														message: err,
														data: {
															kara: kara.title,
															playlist: playlist.name
														}
													};
													logger.profile('AddKara');
													reject(res);
												})
												.catch(() => {
													logger.profile('AddKara');
													reject();
												});
										})
										.catch(function(err){
											logger.error('[Engine] PLC getPlaylistInfo : '+err);
											err = {
												message: err,
												data: {
													kara: id_kara,
													playlist: playlist_id,
												}
											};
											logger.profile('AddKara');
											reject(err);
										});						
								});
						})
						.catch(function(err) {
							logger.error('[PLC] isAPublicPlaylist : '+err);
							err = {
								message: 'Public playlist not found : '+err,
								data: undefined
							};
							logger.profile('AddKara');				
							reject(err);					
						});
				}
			});
		};
		module.exports._services.apiserver.onKaraAddToPlaylist = function(id_kara,requester,playlist_id,pos){
			return new Promise(function(resolve,reject){
				logger.info('[Engine] Adding karaokes to playlist '+playlist_id+' : '+id_kara);
				logger.profile('AddKara');
				var karas;
				if (typeof id_kara === 'string') {
					karas = id_kara.split(',');
				} else {
					karas = [id_kara];
				}
				module.exports._services.playlist_controller.addKaraToPlaylist(karas,requester,playlist_id,pos)
					.then(function(){
						logger.profile('AddKara');
						logger.info('[Engine] Finished adding karaokes to playlist '+playlist_id);
						if (module.exports.SETTINGS.EngineAutoPlay == 1 && 
							playlist_id == module.exports.currentPlaylistID &&
							module.exports._states.status == 'stop' ) {
							module.exports.play();
						}
						module.exports._services.playlist_controller.getPlaylistInfo(playlist_id)
							.then(function(playlist){
								module.exports._services.playlist_controller.getKara(id_kara)
									.then((kara) => {
										var res = {
											kara: kara.title,
											playlist: playlist.name
										};
										resolve(res);
									})
									.catch(() => {
										resolve();
									});
							})
							.catch(function(err){
								logger.error('[Engine] PLC getPlaylistInfo : '+err);
								err = {
									message: err,
									data: {
										kara: id_kara,
										playlist: playlist_id
									}
								};
								reject(err);
							});						
								
					})
					.catch(function(err){
						logger.profile('AddKara');
						logger.error('[Engine] PLC addKaraToPlaylist : '+err);
						module.exports._services.playlist_controller.getPlaylistInfo(playlist_id)
							.then(function(playlist){
								err = {
									message: err,
									data: playlist.name
								};
								reject(err);
							})
							.catch(function(err){
								logger.error('[Engine] PLC getPlaylistInfo : '+err);
								err = {
									message: err,
									data: playlist_id
								};
								reject(err);
							});												
					});
			});
		};
		module.exports._services.apiserver.onKaraCopyToPlaylist = function(plc_id,playlist_id,pos){
			return new Promise(function(resolve,reject){
				logger.info('[Engine] Copying karaokes to playlist '+playlist_id+' : '+plc_id);
				logger.profile('CopyKara');
				var plcs = plc_id.split(',');
				module.exports._services.playlist_controller.copyKaraToPlaylist(plcs,playlist_id,pos)
					.then(function(){
						logger.profile('CopyKara');
						logger.info('[Engine] Finished copying karaokes to playlist '+playlist_id);
						resolve(playlist_id);
					})
					.catch(function(err){
						logger.error('[Engine] PLC copyKaraToPlaylist : '+err);
						module.exports._services.playlist_controller.getPlaylistInfo(playlist_id)
							.then(function(playlist){
								err = {
									message: err,
									data: playlist.name
								};
								reject(err);
							})
							.catch(function(err){
								logger.error('[Engine] PLC getPlaylistInfo : '+err);
								err = {
									message: err,
									data: playlist_id
								};
								reject(err);
							});						
					});
			});
		};
		module.exports._services.apiserver.onKaraAddToWhitelist = function(id_kara,reason){
			return new Promise(function(resolve,reject){
				module.exports._services.playlist_controller.addKaraToWhitelist(id_kara,reason)
					.then(function(){
						module.exports._services.playlist_controller.getKara(id_kara)
							.then((kara) => {
								resolve(kara.title);
							})
							.catch(() => {
								resolve();
							});
					})
					.catch(function(err){
						logger.error('[Engine] PLC addKaraToWhitelist : '+err);
						module.exports._services.playlist_controller.getKara(id_kara)
							.then((kara) => {
								err = {
									message: err,
									data: kara.title
								};
								reject(err);
							})
							.catch(() => {
								err = {
									message: err,
									data: id_kara
								};
								reject(err);
							});
					});
			});
		};
		module.exports._services.apiserver.onMessage = function(message,duration){
			return new Promise(function(resolve){
				logger.debug('[Engine] Sending message "'+message+'" to OSD');
				module.exports.sendMessageToPlayer(message,duration);
				resolve();
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
					if (!options && typeof options !== 'undefined') options = 0;
					if (isNaN(options)) reject('Command seek must have a numeric option value');
					module.exports.seek(options);
					break;
				case 'goTo':
					if (!options && typeof options !== 'undefined') options = 0;
					if (isNaN(options)) reject('Command goTo must have a numeric option value');
					module.exports.goTo(options);
					break;
				case 'setVolume':
					if (!options && typeof options !== 'undefined') reject('Command setVolume must have a value');
					if (isNaN(options)) reject('Command setVolume must have a numeric option value');
					module.exports.setVolume(options);
				}
				resolve();
			});
		};
		module.exports._services.apiserver.onPlayerStatus = function(){
			return new Promise(function(resolve){
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
						logger.error('[Engine] DBI getStats : '+err);
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
						logger.error('[Engine] PLC getKaraLyrics : '+err);
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
	* Emit Event to the WS clients
	*/
	emitEvent:function(type,data){
		logger.debug('[Engine] Sending WS message '+type+' : '+JSON.stringify(data));
		module.exports._services.ws.socket.emit(type,data);
	},
	/**
	* @function
	* Starts playlist controller
	* Broadcasts syspath, database, and the playlistUpdated method
	*/
	_start_playlist_controller:function(){
		module.exports._services.playlist_controller = require(path.join(__dirname,'components/playlist_controller.js'));
		module.exports._services.playlist_controller.SYSPATH = module.exports.SYSPATH;
		module.exports._services.playlist_controller.SETTINGS = module.exports.SETTINGS;
		module.exports._services.playlist_controller.DB_INTERFACE = module.exports.DB_INTERFACE;
		module.exports._services.playlist_controller.onPlaylistUpdated = module.exports.playlistUpdated;
		module.exports._services.playlist_controller.onPlayingUpdated =
		module.exports.playingUpdated;
		module.exports._services.playlist_controller.emitEvent = module.exports.emitEvent;
		module.exports._services.playlist_controller.init();
		//Test if a playlist with flag_current exists. If not create one.
		module.exports._services.playlist_controller.isACurrentPlaylist()
			.then(function(playlist_id){
				//A playlist exists, setting currentPlaylistID
				module.exports.currentPlaylistID = playlist_id;
			})
			.catch(function(){
				//No playlist exists, creating one.
				logger.warn('[Engine] No current playlist found, creating one');
				module.exports._services.playlist_controller.createPlaylist(__('CURRENT_PLAYLIST'),1,1,0)
					.then(function (new_playlist){
						logger.info('[Engine] Current playlist created : '+new_playlist);
						// Build a dummy playlist for testing purpose
						module.exports._services.playlist_controller.build_dummy_current_playlist(new_playlist);
						module.exports.currentPlaylistID = new_playlist;
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
		module.exports._services.player = require(path.join(__dirname,'../_player/index.js'));
		module.exports._services.player.BINPATH = path.resolve(module.exports.SYSPATH,'app/bin');
		module.exports._services.player.SETTINGS = module.exports.SETTINGS;
		module.exports._services.player.SYSPATH = module.exports.SYSPATH;
		module.exports._services.player.frontend_port = module.exports._states.frontend_port;		
		module.exports._services.player.onEnd = module.exports.playerEnding;
		module.exports._services.player.skip = module.exports.next;
		module.exports._services.player._states = module.exports._states;
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
			};
			if (JSON.stringify(status) !== JSON.stringify(module.exports.archivedStatus)) {
				module.exports._services.ws.socket.emit('playerStatus',status);
				module.exports.archivedStatus = status;
			}
		};
		module.exports._services.player.init();
	}
};