var path = require('path');

module.exports = {
	SYSPATH:null,
	SETTINGS:null,
	DB_INTERFACE:null,
	_server:null,
	_io:null,
	_engine_states:{},
	_local_states:{},

	init : function(){
		if(module.exports.SYSPATH === null)
		{
			console.log('_engine/components/playlist_controler.js : SYSPATH is null');
			process.exit();
		}
		if(module.exports.SETTINGS === null)
		{
			console.log('_engine/components/playlist_controler.js : SETTINGS is null');
			process.exit();
		}
		if(module.exports.DB_INTERFACE === null)
		{
			console.log('_engine/components/playlist_controler.js : DB_INTERFACE is null');
			process.exit();
		}

		// Création d'un server http pour diffuser l'appli web du launcher
		if(module.exports._server==null)
		{
			if(module.exports.LISTEN)
			{
				module.exports._server = require(path.join(__dirname,'../_common/utils/httpserver.js'))(path.join(__dirname,'httpdocs'));

				// Chargement de socket.io sur l'appli web du launcher
				module.exports._io = require('socket.io').listen(module.exports._server);
				module.exports._io.sockets.on('connection', function (socket) {
					console.log('Launcher::Serveur : Un client est connecté ! ('+socket.id+')');
					socket.emit('states', module.exports._states);
					// Création des évènements d'entrée (actions de l'utilisateur)
					socket.on('message', function (message) {
						switch (message) {
							default:
								console.log('Launcher::Serveur : Un client me parle ! Il me dit : ' + message);
								break;
						}
					});
					socket.on('action', function (action) {
						switch (action) {
							case 'play':
								module.exports.onPlay();
								break;
							case 'stop':
								module.exports.onStop();
								break;
							case 'stop.now':
								module.exports.onStopNow();
								break;
							case 'togglePrivate':
								module.exports.onTogglePrivate();
								break;
							case 'terminate':
								setTimeout(function(){
									// on insert un décalage car la webapp doit d'abord déclencher la fermeture de la fenetre du navigateur internet
									module.exports.onTerminate();
								},500);
								break;
							case 'generate_karabd':
								module.exports.setLocalStates('generate_karabd',true);
								// on stop le moteur de kara avant de procéder à la reconstruction
								module.exports.onStopNow();
								// on coupe l'accès à la base de données
								module.exports.DB_INTERFACE.close();
								// procédure interne à l'admin on ne le signale pas à l'admin
								var generator = require('./generate_karasdb.js');
								generator.SYSPATH = module.exports.SYSPATH;
								generator.SETTINGS = module.exports.SETTINGS;
								generator.run().then(function(response){
									// on relance l'interface de base de données
									module.exports.DB_INTERFACE.init();
									// et on emet un event vers linterface d'admin
									socket.emit('generate_karabd', {event:'setLog',data:response});
									module.exports.setLocalStates('generate_karabd',false);
								}).catch(function(response,error){
									socket.emit('generate_karabd', {event:'setLog',data:error});
									module.exports.setLocalStates('generate_karabd',false);
								});
								break;
							default:
								console.log('Launcher::Serveur : Action inconnu : ' + action);
								break;
						}
					});
				});
				module.exports._server.listen(module.exports.LISTEN);
			}
			else
			{
				console.log('Launcher::Serveur : PORT is not defined');
				console.log('var server = require("./launcher/index.js"); server.LISTEN = 1338;');
			}
		}
		else
		{
			console.log('Launcher::Serveur : Serveur allready started');
		}
	},
	open: function(){
		// enfin on lance le serveur web du launcher et on tente d'ouvrir un navigateur
		var ip = require("ip");
		var cp = require('child_process');
		var open = require('open');
		var os = require('os');

		if(os.platform()=='linux')
		{
			console.log('Launcher::Serveur : Go to http://'+ip.address()+':1338');
			cp.exec('firefox --new-tab http://'+ip.address()+':1338');
		}
		else
		{
			open('http://'+ip.address()+':1338');
		}
	},

	setStates:function(newStates)
	{
		// set new states
		module.exports._states = newStates;
		// emit change to webpage
		module.exports._io.emit('states', this._states);
	},
	setLocalStates:function(k,v)
	{
		// set new states
		module.exports._local_states[k] = v;
		// emit change to webpage
		module.exports._io.emit('local_states', this._local_states);
	},

	// ---------------------------------------------------------------------------
	// Evenements à référencer par le composant  parent
	// ---------------------------------------------------------------------------

	onPlay:function(){
		// événement émis pour quitter l'application
		console.log('_admin/index.js :: onPlay not set')
	},
	onStop:function(){
		// événement émis pour quitter l'application
		console.log('_admin/index.js :: onStop not set')
	},
	onStopNow:function(){
		// événement émis pour quitter l'application
		console.log('_admin/index.js :: onStopNow not set')
	},

	onTerminate:function(){
		// événement émis pour quitter l'application
		console.log('_admin/index.js :: onTerminate not set')
	},

	onTogglePrivate:function(){
		// événement émis pour quitter l'application
		console.log('_admin/index.js :: onPrivateToggle not set')
	},

}