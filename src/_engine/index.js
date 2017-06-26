var path = require('path');

module.exports = {
	SYSPATH:null,
	_states:{
		status:'stop', // [stop,play] // etat générale de l'application Karaoke - STOP => la lecture de la playlist est interrompu
		private:true, // [bool(true|false)] // Karaoke en mode privé ou publique
	},
	_services:{
		db_interface:null,
		admin: null,
		playlist_controler: null,
		player:null,
	},

	run: function(){
		// méthode de démarrage de base
		if(this.SYSPATH === null)
		{
			console.log('_engine/index.js : SYSPATH is null');
			process.exit();
		}
		this._start_player();
		this._start_db_interface();
		this._start_playlist_controler();
		this._start_admin();
		this._broadcastStates();
	},
	exit:function(){
		// coupe tout le système
		process.exit();
	},

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
	stop:function(now){
		if(now)
			module.exports._services.player.stop();

		if(module.exports._states.status !== 'stop')
		{
			module.exports._states.status = 'stop';
			module.exports._broadcastStates();
		}
	},
	pause:function(){
		module.exports._services.player.pause()
		// l'état globale n'a pas besoin de changer
		// le player ne terminera jamais son morceau en restant en pause
		module.exports._broadcastStates();
	},

	setPrivateOn:function()
	{
		module.exports._states.private = true;
		module.exports._broadcastStates();
	},
	setPrivateOff:function()
	{
		module.exports._states.private = false;
		module.exports._broadcastStates();
	},
	togglePrivate:function()
	{
		module.exports._states.private = !this._states.private;
		module.exports._broadcastStates();
	},

	// Methode lié à la lecture de kara
	playlistUpdated:function(){
		module.exports.tryToReadNextKaraInPlaylist();
	},
	playerEnding:function(){
		module.exports.tryToReadNextKaraInPlaylist();
	},

	tryToReadNextKaraInPlaylist:function(){
		if(module.exports._states.status === 'play' && !module.exports._services.player.playing)
		{
			kara = module.exports._services.playlist_controler.get_next_kara();
			console.log(kara);
			if(kara)
			{
				module.exports._services.player.play(
					kara.videofile,
					kara.subfile,
					kara.kara_id
				);
			}
			module.exports._broadcastPlaylist();
		}
	},

	// ------------------------------------------------------------------
	// méthodes privées
	// ------------------------------------------------------------------

	_broadcastStates:function()
	{
		// diffuse l'état courant à tout les services concerné (normalement les webapp)
		this._services.admin.setStates(this._states);
	},

	_broadcastPlaylist:function()
	{
		// récupère la playlist à jour et la diffuser vers les services concerné (normalement les webapp)
	},

	// ------------------------------------------------------------------
	// methodes de démarrage des services
	// ------------------------------------------------------------------

	_start_db_interface: function()
	{
		this._services.db_interface = require(path.resolve(__dirname,'components/db_interface.js'));
		this._services.db_interface.SYSPATH = this.SYSPATH;
		this._services.db_interface.init();
	},
	_start_admin:function(){
		this._services.admin = require(path.resolve(__dirname,'../_admin/index.js'));
		this._services.admin.LISTEN = 1338;
		this._services.admin.SYSPATH = this.SYSPATH;
		this._services.admin.DB_INTERFACE = this._db_interface;
		// --------------------------------------------------------
		// diffusion des méthodes interne vers les events admin
		// --------------------------------------------------------
		this._services.admin.onTerminate = module.exports.exit;
		// Evenement de changement bascule privé/publique
		this._services.admin.onTogglePrivate = module.exports.togglePrivate;
		// Supervision des évènement de changement de status (play/stop)
		this._services.admin.onPlay = module.exports.play;
		this._services.admin.onStop = module.exports.stop;
		this._services.admin.onStopNow = function(){module.exports.stop(true)};
		// --------------------------------------------------------
		// on démarre ensuite le service
		this._services.admin.init();
		// et on lance la commande pour ouvrir la page web
		this._services.admin.open();
	},
	_start_playlist_controler:function(){
		this._services.playlist_controler = require(path.resolve(__dirname,'components/playlist_controler.js'));
		this._services.playlist_controler.SYSPATH = this.SYSPATH;
		this._services.playlist_controler.DB_INTERFACE = this._db_interface;
		this._services.playlist_controler.onPlaylistUpdated = this.playlistUpdated;
		this._services.playlist_controler.init();
		var playlist_id = this._services.playlist_controler.createPlaylist('Ma plélyst lol',0,1,0);
		console.log('New playlist created with ID : '+playlist_id);
		// on ajoute 4 morceau dans la playlist
		this._services.playlist_controler.addKara(1,'toto');
		this._services.playlist_controler.addKara(2,'tata');
		this._services.playlist_controler.addKara(3,'titi');
		this._services.playlist_controler.addKara(4,'tutu');
	},
	_start_player:function()
	{
		this._services.player = require(path.resolve(__dirname,'../_player/index.js'));
		this._services.player.BINPATH = path.resolve(this.SYSPATH,'app/bin');
		this._services.player.onEnd = this.playerEnding;
		this._services.player.init();
	}
}