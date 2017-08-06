/**
 * @fileoverview Main engine source file
 */
var fs = require('fs');
const path = require('path');
const logger = require('../_common/utils/logger.js');
const extend = require('extend');
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
		status:'stop', // [stop,play] // etat générale de l'application Karaoke - STOP => la lecture de la playlist est interrompu
		private:true, // [bool(true|false)] // Karaoke en mode privé ou publique
		fullscreen:true,
		ontop:true,
		admin_port:1338,
		frontend_port:1337,
		apiserver_port:1339,
		playlist:null,
		timeposition:0,
	},
	_services:{
		admin: null,
		playlist_controller: null,
		player:null,
	},
	/**
	 * Base method for starting up the engine.
	 * It starts up the DB Interface, player, playlist controller and admin dashboard.
	 * @function {run}
	 */
	run: function(){
		if(this.SYSPATH === null) {
			logger.error(__('SYSPATH_NULL'));
			process.exit();
		}
		if(this.SETTINGS === null) {
			logger.error(__('SETTINGS_NULL'));
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
			console.log(response);
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
			module.exports._states.status = 'play';
			module.exports._broadcastStates();

			module.exports.tryToReadKaraInPlaylist();
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
		if(now)
			module.exports._services.player.stop();

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
		// l'état globale n'a pas besoin de changer
		// le player ne terminera jamais son morceau en restant en pause
		module.exports._broadcastStates();
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
				logger.info('Previous song is not available');
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
				logger.info('Next song is not available');
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
		logger.debug('private is now '+module.exports._states.private);
		module.exports._broadcastStates();
	},

	/**
	* @function {toggleFullscreen}
	*/
	toggleFullscreen:function() {
		module.exports._states.fullscreen = !module.exports._states.fullscreen;
		module.exports._services.player.setFullscreen(module.exports._states.fullscreen);
		logger.debug('fullscreen is now '+module.exports._states.fullscreen);
		module.exports._broadcastStates();
	},
	/**
	* @function {toggleStayOnTop}
	*/
	toggleOnTop:function() {
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
		if(module.exports._states.status === 'play' && !module.exports._services.player.playing) {
			module.exports._services.playlist_controller.next()
				.then(function(){
					module.exports.tryToReadKaraInPlaylist();
				}).catch(function(){
					logger.info('Next song is not available');
				});
		}
	},
	/**
	* @function
	*
	*/
	playingUpdated:function(){
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
		module.exports._services.playlist_controller.next()
			.then(function(){
				module.exports.tryToReadKaraInPlaylist();
			}).catch(function(){
				logger.info('Next song is not available');
			});
	},

	/**
	* @function
	* Try to read next karaoke in playlist.
	*/
	tryToReadKaraInPlaylist:function(){
		module.exports._services.playlist_controller.current_playlist().then(function(playlist){
			if(module.exports._states.playlist != playlist) {
				module.exports._states.playlist = playlist;
				module.exports._broadcastStates();
			}
		});
		if(module.exports._states.status === 'play' && !module.exports._services.player.playing) {
			module.exports._services.playlist_controller.current()
				.then(function(kara){
					logger.info('Start playing '+kara.title);
					module.exports._services.player.play(
						kara.path.video,
						kara.path.subtitle,
						kara.id_kara
					);
					module.exports._broadcastStates();
				})
				.catch(function(){
					logger.info('Cannot found a song to play');
					module.exports._broadcastStates();
				});
		}
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
		module.exports._services.apiserver.onKaras = function(filter,lang){
			return new Promise(function(resolve,reject){
				module.exports._services.playlist_controller.getAllKaras()
					.then(function(playlist){
						module.exports._services.playlist_controller.translateKaraInfo(playlist,lang)
						.then(function(karalist){
							if (filter) {
								module.exports._services.playlist_controller.filterPlaylist(karalist,filter)
								.then(function(filtered_pl){
									resolve(filtered_pl)
								})
								.catch(function(err){
									resolve(err);
								});							
							} else {
								resolve(karalist);
							}
						})
						.catch(function(err){
							reject(err);
						});						
					})
					.catch(function(err){
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
									resolve(err);
								});							
							} else {
								resolve(karalist);
							}
						})
						.catch(function(err){
							reject(err);
						});						
					})
					.catch(function(err){
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
									resolve(err);
								});							
							} else {
								resolve(karalist);
							}
						})
						.catch(function(err){
							reject(err);
						});						
					})
					.catch(function(err){
						reject(err);
					});
			});
		};
		module.exports._services.apiserver.onBlacklistCriterias = function(){
			return new Promise(function(resolve,reject){
				module.exports._services.playlist_controller.getBlacklistCriterias()
					.then(function(blc){
						resolve(blc);
					})
					.catch(function(err){
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
						reject(err);
					});
			});
		};
		module.exports._services.apiserver.onPlaylistShuffle = function(pl_id){
			return new Promise(function(resolve,reject){
				module.exports._services.playlist_controller.shufflePlaylist(pl_id)
					.then(function(){
						resolve();
					})
					.catch(function(err){
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
								reject(err);
							});
					})
					.catch(function(err){
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
						reject(err);
					});
			});
		};
		module.exports._services.apiserver.onPlaylistCreate = function(playlist){
			return new Promise(function(resolve,reject){
				module.exports._services.playlist_controller.createPlaylist(playlist.name,playlist.flag_visible,playlist.flag_current,playlist.flag_public)
					.then(function (new_playlist){
						var res = {
							new_playlist_id: new_playlist
						};
						resolve(res);
					})
					.catch(function(err){
						var res = {
							error: err
						};
						reject(res);
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
						reject(err);
					});
			});
		};
		module.exports._services.apiserver.onPlaylistSingleDelete = function(id_playlist,id_newplaylist){
			return new Promise(function(resolve,reject){
				module.exports._services.playlist_controller.deletePlaylist(id_playlist,id_newplaylist)
					.then(function(){
						resolve();
					})
					.catch(function(err){
						reject(err);
					});
			});
		};
		module.exports._services.apiserver.onPlaylistSingleKaraDelete = function(playlistcontent_id){
			return new Promise(function(resolve,reject){
				module.exports._services.playlist_controller.deleteKaraFromPlaylist(playlistcontent_id)
					.then(function(){
						resolve();
					})
					.catch(function(err){
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
						reject(err);
					});
			});
		};
		module.exports._services.apiserver.onPlaylistSingleKaraEdit = function(playlistcontent_id,pos,flag_playing){
			return new Promise(function(resolve,reject){
				module.exports._services.playlist_controller.editKaraFromPlaylist(playlistcontent_id,pos,flag_playing)
					.then(function(){
						resolve();
					})
					.catch(function(err){
						reject(err);
					});
			});
		};
		module.exports._services.apiserver.onSettingsUpdate = function(settings) {
			return new Promise(function(resolve,reject){
				extend(true,module.exports.SETTINGS,settings);

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
			return new Promise(function(resolve,reject){
				module.exports._services.playlist_controller.editPlaylist(id_playlist,playlist.name,playlist.flag_visible,playlist.flag_current,playlist.flag_public)
					.then(function(){
						resolve();
					})
					.catch(function(err){
						reject(err);
					});
			});
		}
		module.exports._services.apiserver.onPlaylistSingleContents = function(id_playlist,lang,seenFromUser){
			return new Promise(function(resolve,reject){
				module.exports._services.playlist_controller.getPlaylistContents(id_playlist,seenFromUser)
					.then(function(playlist){
						module.exports._services.playlist_controller.translateKaraInfo(playlist,lang)
							.then(function(karalist){
								resolve(karalist);
							})
							.catch(function(err){
								reject(err);
							});
					})
					.catch(function(err){
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
								reject(err);
							});
					})
					.catch(function(err){
						if (err) {
							reject(err);
						} else {
							reject('No current playlist found');
						}
					});
			});
		};
		module.exports._services.apiserver.onPlaylistCurrentContents = function(lang){
			return new Promise(function(resolve,reject){
				module.exports._services.playlist_controller.isACurrentPlaylist()
					.then(function(id_playlist){
						module.exports._services.playlist_controller.getPlaylistContents(id_playlist)
							.then(function(playlist){
								module.exports._services.playlist_controller.translateKaraInfo(playlist,lang)
									.then(function(karalist){
										resolve(karalist);
									})
									.catch(function(err){
										reject(err);
									});
							})
							.catch(function(err){
								reject(err);
							});
					})
					.catch(function(err){
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
				module.exports._services.playlist_controller.isACurrentPlaylist()
					.then(function(id_playlist){
						module.exports._services.playlist_controller.getPlaylistInfo(id_playlist)
							.then(function(playlist){
								resolve(playlist);
							})
							.catch(function(err){
								reject(err);
							});
					})
					.catch(function(err){
						if (err) {
							reject(err);
						} else {
							reject('No public playlist found');
						}
					});
			});
		};
		module.exports._services.apiserver.onPlaylistPublicContents = function(lang){
			return new Promise(function(resolve,reject){
				module.exports._services.playlist_controller.isAPublicPlaylist()
					.then(function(id_playlist){
						module.exports._services.playlist_controller.getPlaylistContents(id_playlist)
							.then(function(playlist){
								module.exports._services.playlist_controller.translateKaraInfo(playlist,lang)
									.then(function(karalist){
										resolve(karalist);
									})
									.catch(function(err){
										reject(err);
									});
							})
							.catch(function(err){
								reject(err);
							});
					})
					.catch(function(err){
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
				module.exports._states.private = false;
				if (module.exports._states.private) {
					//If Kara mode is private, then add to current playlist
					module.exports._services.playlist_controller.addKaraToCurrentPlaylist(id_kara,requester)
						.then(function(){
							resolve();
						})
						.catch(function(err){
							reject(err);
						});
				} else {
					//If Kara mode is public, then add to public playlist
					module.exports._services.playlist_controller.addKaraToPublicPlaylist(id_kara,requester)
						.then(function(){
							resolve();
						})
						.catch(function(err){
							reject(err);
						});
				}
			});
		};
		module.exports._services.apiserver.onKaraAddToPlaylist = function(id_kara,requester,playlist_id,pos){
			return new Promise(function(resolve,reject){
				module.exports._services.playlist_controller.addKaraToPlaylist(id_kara,requester,playlist_id,pos)
					.then(function(){
						resolve();
					})
					.catch(function(err){
						reject(err);
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
						reject(err);
					});
			});
		};
		module.exports._services.apiserver.onPlayerCommand = function(command){
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
				}
				resolve();
			});
		};
		module.exports._services.apiserver.onPlayerStatus = function(){
			return new Promise(function(resolve,reject){
					resolve({
						private: module.exports._states.private,
						status: module.exports._states.status,
						ontop: module.exports._states.ontop,
						fullscreen: module.exports._states.fullscreen,
						timeposition: module.exports._services.player.timeposition						
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
				logger.warn(__('NO_CURRENT_PLAYLIST'));
				module.exports._services.playlist_controller.createPlaylist(__('CURRENT_PLAYLIST'),1,1,0)
					.then(function (new_playlist){
						logger.info(__('CURRENT_PLAYLIST_CREATED',new_playlist));
						// Build a dummy playlist for testing purpose
						module.exports._services.playlist_controller.build_dummy_current_playlist(new_playlist);
					})
					.catch(function(err){
						logger.error(__('CURRENT_PLAYLIST_CREATE_ERROR',err));
					});
			});
		module.exports._services.playlist_controller.isAPublicPlaylist()
			.then(function(){
				//A playlist exists, nothing to do.
			})
			.catch(function(){
				//No playlist exists, creating one.
				logger.warn(__('NO_PUBLIC_PLAYLIST'));
				module.exports._services.playlist_controller.createPlaylist(__('PUBLIC_PLAYLIST'),1,0,1)
					.then(function (new_playlist){
						logger.info(__('PUBLIC_PLAYLIST_CREATED',new_playlist));
					})
					.catch(function(err){
						logger.error(__('PUBLIC_PLAYLIST_CREATE_ERROR',err));
					});
			});
		/* Update playlist's number of karas
		module.exports._services.playlist_controller.updatePlaylistNumOfKaras(1)
			.then(function(num_karas){
				console.log(num_karas);
			})
			.catch(function(err){
				console.log(err);
			});
		*/
		/*
		module.exports._services.playlist_controller.toggleDisplayNickname(true)
			.then(function(){
				console.log('Success toggling all karas');
			})
			.catch(function(err){
				console.log(err);
			});
		
		/* Update playlist's duration
		module.exports._services.playlist_controller.updatePlaylistDuration(1)
			.then(function(duration){
				console.log(duration);
			})
			.catch(function(err){
				console.log(err);
			});
		*/
		/* Reorder/sort playlist example
		module.exports._services.playlist_controller.reorderPlaylist(2)
			.then(function(playlist){
				//console.log(playlist);
			})
			.catch(function(err){
				console.log(err);
			});
		/* Shuffle playlist example
		module.exports._services.playlist_controller.shufflePlaylist(1)
			.then(function(playlist){
				console.log(playlist);
				logger.info('Shuffled playlist.');
			})
			.catch(function(err){
				console.log(err);
			});
		/* Add blacklist criteria
		module.exports._services.playlist_controller.addBlacklistCriteria(1000,'Love')
			.then(function(){
				console.log('Add criteria OK');
				module.exports._services.playlist_controller.generateBlacklist()
				.then(function(){
					console.log('Generate OK');
				})
				.catch(function(err){
					console.log(err);
				});
			})
			.catch(function(err){
				console.log(err);
			});
		/* Delete blacklist criteria
		module.exports._services.playlist_controller.deleteBlacklistCriteria(5)
			.then(function(){
				console.log('Delete criteria OK');
				module.exports._services.playlist_controller.generateBlacklist()
				.then(function(){
					console.log('Generation OK');
				})
				.catch(function(err){
					console.log(err);
				});
			})
			.catch(function(err){
				console.log(err);
			});
		/* Edit blacklist criteria
		module.exports._services.playlist_controller.editBlacklistCriteria(3,1000,'Eurovision lol')
			.then(function(){
				console.log('Edited criteria OK');
			})
			.catch(function(err){
				console.log(err);
			});	*/
		/* List all blacklist criterias
		module.exports._services.playlist_controller.getBlacklistCriterias()
			.then(function(blcriteria){
				console.log(blcriteria);
			})
			.catch(function(err){
				console.log(err);
			});
		/* Generate blacklist
		module.exports._services.playlist_controller.generateBlacklist()
			.then(function(){
				console.log('OK');
			})
			.catch(function(err){
				console.log(err);
			});
		/* Deleting kara from playlist example
		module.exports._services.playlist_controller.deleteKaraFromPlaylist(1982,1)
			.then(function(playlist){
				console.log('Delete OK');
			})
			.catch(function(err){
				console.log(err);
			});
		*/
		/* Getting all karas from Playlist

		module.exports._services.playlist_controller.getPlaylistContents(1)
			.then(function(playlist){
				logger.profile('Search');
				module.exports._services.playlist_controller.filterPlaylist(playlist,'hunter')
				.then(function(filtered_pl){
					console.log(filtered_pl);
					logger.profile('Search');
				})
				.catch(function(err) {
					console.log(err);
				})
			})
			.catch(function(err){
				console.log(err);
			});

		/* Getting all karas
		module.exports._services.playlist_controller.getAllKaras()
			.then(function(playlist){
				logger.profile('Search');
				module.exports._services.playlist_controller.filterPlaylist(playlist,'Bleach ED Pace')
				.then(function(filtered_pl){
					console.log(filtered_pl);
					console.log('Karaoke songs found : '+filtered_pl.length);
					logger.profile('Search');
				})
				.catch(function(err) {
					console.log(err);
				})
			})
			.catch(function(err){
				console.log(err);
			});
	    */
		/* Adding kara to playlist example
		module.exports._services.playlist_controller.addKaraToPlaylist(4571,'Axél',2)
			.then(function(){
				logger.info("Kara added");
			})
			.catch(function(err){
				logger.error("Kara add failed : "+err);
			});
		/* Adding kara to whitelist example
		module.exports._services.playlist_controller.addKaraToWhitelist(4571,'Because reasons')
			.then(function(){
				logger.info("Kara added");
			})
			.catch(function(err){
				logger.error("Kara add failed : "+err);
			});
		/* Add karaoke to public playlist example. Public playlist is autodetected.
		module.exports._services.playlist_controller.addKaraToPublicPlaylist(4571,'Axél',1)
			.then(function(){
				logger.info("Kara added");
			})
			.catch(function(err){
				logger.error("Kara add failed : "+err);
			});
		/* */
		/* Add karaoke to current playlist example. Current playlist is autodetected.
		module.exports._services.playlist_controller.addKaraToCurrentPlaylist(1000,'Axél',1)
			.then(function(){
				logger.info("Kara added");
			})
			.catch(function(err){
				logger.error("Kara add failed : "+err);
			});
		/* */
		/* Making playlist visible example :
		module.exports._services.playlist_controller.setVisiblePlaylist(1)
			.then(function(playlist){
				logger.info("Playlist set to visible");
			})
			.catch(function(err){
				logger.error("Playlist view failed : "+err);
			});
		*/
		/* Selecting playlist example :
		module.exports._services.playlist_controller.getPlaylistInfo(1)
			.then(function(playlist){
				logger.info("Playlist get OK");
				logger.log('debug','Playlist information : '+JSON.stringify(playlist));
			})
			.catch(function(err){
				logger.error("Playlist view failed : "+err);
			});
		/* Editing playlist example :
		module.exports._services.playlist_controller.editPlaylist(1,'Super plélyst lol',0,1,0)
			.then(function (){
				logger.info("Playlist edited.");
			})
			.catch(function(err){
				logger.error("Playlist edit failed : "+err);
			});
		*/
		/* Creating playlist example :
		module.exports._services.playlist_controller.createPlaylist('Ma plélyst lol',0,1,0)
			.then(function (new_playlist){
				logger.info("New playlist created with ID : "+new_playlist.id);
			})
			.catch(function(err){
				logger.error("New playlist fail : "+err);
			});
		*/
		/* Deleting playlist example :
		module.exports._services.playlist_controller.deletePlaylist(34,36)
		    .then(function (values){
				logger.info("Playlist "+values.playlist_id+" deleted. Transferred flags to "+values.new_curorpubplaylist_id);
			})
			.catch(function(err){
				logger.error("Deleting playlist failed : "+err);
			});
		*/
		/* Deleting kara from playlist example :
		module.exports._services.playlist_controller.deleteKaraFromPlaylist(16)
		    .then(function (){
				logger.info("Karaoke deleted from playlist.");
			})
			.catch(function(err){
				logger.error("Deleting kara from playlist failed : "+err);
			});
		*/
		/* Deleting kara from whitelist example :
		module.exports._services.playlist_controller.deleteKaraFromWhitelist(1)
		    .then(function (){
				logger.info("Karaoke deleted from whitelist.");
			})
			.catch(function(err){
				logger.error("Deleting kara from whitelist failed : "+err);
			});
		*/
		// on ajoute 4 morceau dans la playlist
		//module.exports._services.playlist_controller.addKara(1,'toto');
		//module.exports._services.playlist_controller.addKara(2,'tata');
		//module.exports._services.playlist_controller.addKara(3,'titi');
		//module.exports._services.playlist_controller.addKara(4,'tutu');
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