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
	},
	// méthodes publiques
	run: function(){
		if(this.SYSPATH === null)
		{
			console.log('_engine/index.js : SYSPATH is null');
			process.exit();
		}
		this._start_db_interface();
		this._start_playlist_controler();
		this._start_admin();
	},
	play:function(){

	},
	stop:function(){

	},
	pause:function(){

	},

	// ------------------------------------------------------------------
	// méthodes privées
	// ------------------------------------------------------------------

	_diffuseStates:function()
	{
		// diffuse l'état courant à tout les services concerné
		this._services.admin.setStates(this._states);
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

		// lorsque l'application admin demande à fermer l'application
		this._services.admin.onTerminate = function(){
			process.exit();
		};

		// lorsque l'application admin demande à fermer l'application
		this._services.admin.onTogglePrivate = function(){
			// change internale state
			module.exports._states.private = !this._states.private;
			module.exports._diffuseStates();
		};

		// on démarre ensuite le service
		this._services.admin.init();
		// et on lance la commande pour ouvrir la page web
		this._services.admin.open();
	},
	_start_playlist_controler:function(){
		this._services.playlist_controler = require(path.resolve(__dirname,'components/playlist_controler.js'));
		this._services.playlist_controler.SYSPATH = this.SYSPATH;
		this._services.playlist_controler.DB_INTERFACE = this._db_interface;
		this._services.playlist_controler.init();
	}
}