/**
 * @fileoverview Main engine source file
 */
const path = require('path');
const logger = require('../_common/utils/logger.js');

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
		admin_port:1338,
		frontend_port:1337,
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
		logger.info('Engine is starting');

		if(this.SYSPATH === null)
		{
			logger.error('SYSPATH is null');
			process.exit();
		}
		if(this.SETTINGS === null)
		{
			logger.error('SETTINGS is null');
			process.exit();
		}

		this._start_db_interface().then(function(){
			module.exports._start_player();
			module.exports._start_playlist_controller();
			module.exports._start_admin();
			module.exports._start_frontend();
			module.exports._broadcastStates();
		}).catch(function(response){
			console.log(response);
		});
	},

	//---------------------------------------------------------------
	// 	 /$$$$$$$$ /$$$$$$$$  /$$$$$$  /$$$$$$$$
	// 	|__  $$__/| $$_____/ /$$__  $$|__  $$__/
	// 	   | $$   | $$      | $$  \__/   | $$
	// 	   | $$   | $$$$$   |  $$$$$$    | $$
	// 	   | $$   | $$__/    \____  $$   | $$
	// 	   | $$   | $$       /$$  \ $$   | $$
	// 	   | $$   | $$$$$$$$|  $$$$$$/   | $$
	// 	   |__/   |________/ \______/    |__/
	//
	//
	//

	test:function(){
		//console.log('This is an engine test event !');
		return 'This is an engine test event response !';
	},

	test_playlist_controller: function(){
		if(this.SYSPATH === null)
		{
			logger.error('SYSPATH is null');
			process.exit();
		}
		if(this.SETTINGS === null)
		{
			logger.error('SETTINGS is null');
			process.exit();
		}

		this._start_db_interface().then(function(){
			module.exports._start_player();
			module.exports._start_playlist_controller();

			logger.info('Start playlist controller test procedure');

			// Here is the test
			// module.exports._services.playlist_controller.whatever_you_want()
			logger.error('TODO: Implement test procedure ');

			process.exit();

		}).catch(function(response){
			//console.log(response);
			process.exit();
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
		if(module.exports._states.status !== 'play')
		{
			// passe en mode lecture (le gestionnaire de playlist vas travailler à nouveau)
			module.exports._states.status = 'play';
			module.exports._broadcastStates();

			module.exports.tryToReadNextKaraInPlaylist();
		}
		else if(module.exports._states.status === 'play')
		{
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

		if(module.exports._states.status !== 'stop')
		{
			module.exports._states.status = 'stop';
			module.exports._broadcastStates();
		}
	},
	/**
	 * @function {pause}
	 * Pauses current song in the player and broadcasts new status.
	 */
	pause:function(){
		module.exports._services.player.pause()
		// l'état globale n'a pas besoin de changer
		// le player ne terminera jamais son morceau en restant en pause
		module.exports._broadcastStates();
	},

	/**
	* @function {setPrivateOn}
	* @private
	*/
	setPrivateOn:function()
	{
		module.exports._states.private = true;
		module.exports._broadcastStates();
	},
	/**
	* @function {setPrivateOff}
	*/
	setPrivateOff:function()
	{
		module.exports._states.private = false;
		module.exports._broadcastStates();
	},
	/**
	* @function {togglePrivate}
	*/
	togglePrivate:function()
	{
		module.exports._states.private = !module.exports._states.private;
		logger.debug('private is now '+module.exports._states.private);
		module.exports._broadcastStates();
	},

	// Methode lié à la lecture de kara
	/**
	* @function
	*
	*/
	playlistUpdated:function(){
		module.exports.tryToReadNextKaraInPlaylist();
	},
	/**
	* @function
	*
	* Function triggered on player ending its current song.
	*/
	playerEnding:function(){
		module.exports.tryToReadNextKaraInPlaylist();
	},

	/**
	* @function
	* Try to read next karaoke in playlist.
	*/
	tryToReadNextKaraInPlaylist:function(){
		if(module.exports._states.status === 'play' && !module.exports._services.player.playing)
		{
			kara = module.exports._services.playlist_controller.get_next_kara();
			if(kara)
			{
				logger.info('Next song is '+kara.title);
				module.exports._services.player.play(
					kara.videofile,
					kara.subfile,
					kara.kara_id
				);
			}
			logger.log('warning','Next song is not available');
			module.exports._broadcastPlaylist();
		}
	},

	// ------------------------------------------------------------------
	// méthodes privées
	// ------------------------------------------------------------------

	_broadcastStates:function()
	{
		// diffuse l'état courant à tout les services concerné (normalement les webapp)
		module.exports._services.admin.setEngineStates(module.exports._states);
	},

	_broadcastPlaylist:function()
	{
		// récupère la playlist à jour et la diffuser vers les services concerné (normalement les webapp)
	},

	// ------------------------------------------------------------------
	// methodes de démarrage des services
	// ------------------------------------------------------------------

	/**
	* @function _start_db_interface
	* Starts database interface.
	* Requires the db_interface.js script
	*/
	_start_db_interface: function()
	{
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
		// Supervision des évènement de changement de status (play/stop)
		module.exports._services.admin.onPlay = module.exports.play;
		module.exports._services.admin.onStop = module.exports.stop;
		module.exports._services.admin.onStopNow = function(){module.exports.stop(true)};
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
	* Starts playlist controller
	* Broadcasts syspath, database, and the playlistUpdated method
	*/
	_start_playlist_controller:function(){
		module.exports._services.playlist_controller = require(path.resolve(__dirname,'components/playlist_controller.js'));
		module.exports._services.playlist_controller.SYSPATH = module.exports.SYSPATH;
		module.exports._services.playlist_controller.DB_INTERFACE = module.exports.DB_INTERFACE;
		module.exports._services.playlist_controller.onPlaylistUpdated = module.exports.playlistUpdated;
		module.exports._services.playlist_controller.init();
		//Test if a playlist with flag_current exists. If not create one.
		module.exports._services.playlist_controller.isACurrentPlaylist()
			.then(function(){
				//A playlist exists, nothing to do.
			})
			.catch(function(){
				//No playlist exists, creating one.
				logger.warn('No playlist with current flag exists. Creating one...');
				module.exports._services.playlist_controller.createPlaylist('Current playlist',1,1,0)
					.then(function (new_playlist){
						logger.info("Current playlist created with ID : "+new_playlist);
				})
					.catch(function(err){
						logger.error("Unable to create current playlist : "+err);
				});
			})
		module.exports._services.playlist_controller.isAPublicPlaylist()
			.then(function(){
				//A playlist exists, nothing to do.
			})
			.catch(function(){
				//No playlist exists, creating one.
				logger.warn('No playlist with public flag exists. Creating one...');
				module.exports._services.playlist_controller.createPlaylist('Public playlist',1,0,1)
					.then(function (new_playlist){
						logger.info("Public playlist created with ID : "+new_playlist);
				})
					.catch(function(err){
						logger.error("Unable to create public playlist : "+err);
				});
			})
		/* Update playlist's number of karas
		module.exports._services.playlist_controller.updatePlaylistNumOfKaras(1)
			.then(function(num_karas){
				console.log(num_karas);
			})
			.catch(function(err){
				console.log(err);
			});
		*/
		/* Update playlist's duration
		module.exports._services.playlist_controller.updatePlaylistDuration(1)
			.then(function(duration){
				console.log(duration);
			})
			.catch(function(err){
				console.log(err);
			});
		*/
		/*
		module.exports._services.playlist_controller.reorderPlaylist(1)
			.then(function(playlist){
				console.log(playlist);
			})
			.catch(function(err){
				console.log(err);
			});
		*/
		/* Getting all karas from Playlist

		module.exports._services.playlist_controller.getPlaylistContents(45)
			.then(function(playlist){
				logger.profile('Search');
				module.exports._services.playlist_controller.filterPlaylist(playlist,'gotta')
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
	    */
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
		module.exports._services.playlist_controller.addKaraToPlaylist(2017,'Axél',1,1)
			.then(function(){
				logger.info("Kara added");
			})
			.catch(function(err){
				logger.error("Kara add failed : "+err);
			});
		*/
		/* Add karaoke to public playlist example. Public playlist is autodetected.		
		module.exports._services.playlist_controller.addKaraToPublicPlaylist(2017,'Axél',1)
			.then(function(){
				logger.info("Kara added");
			})
			.catch(function(err){
				logger.error("Kara add failed : "+err);
			});
		*/
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
	_start_player:function()
	{
		module.exports._services.player = require(path.resolve(__dirname,'../_player/index.js'));
		module.exports._services.player.BINPATH = path.resolve(module.exports.SYSPATH,'app/bin');
		module.exports._services.player.onEnd = module.exports.playerEnding;
		module.exports._services.player.init();
	}
}