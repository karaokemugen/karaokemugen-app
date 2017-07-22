const path = require('path');

const logger = require('../_common/utils/logger.js');

module.exports = {
	SYSPATH:null,
	SETTINGS:null,
	LISTEN:null,
	DB_INTERFACE:null,
	_server:null,
	_io:null,
	_engine_states:{},
	_local_states:{
		generate_karabd:false,
	},

	init : function(){
		if(module.exports.SYSPATH === null)
		{
			logger.error('SYSPATH is null');
			process.exit();
		}
		if(module.exports.SETTINGS === null)
		{
			logger.error('SETTINGS is null');
			process.exit();
		}
		if(module.exports.LISTEN === null)
		{
			logger.error('LISTEN is null');
			process.exit();
		}
		if(module.exports.DB_INTERFACE === null)
		{
			logger.error('DB_INTERFACE is null');
			process.exit();
		}

		// Création d'un server http pour diffuser l'appli web du launcher
		if(module.exports._server==null)
		{
			module.exports._server = require(path.join(__dirname,'../_common/utils/httpserver.js'))(path.join(__dirname,'httpdocs'));

			// Chargement de socket.io sur l'appli web du launcher
			module.exports._io = require('socket.io').listen(module.exports._server);
			module.exports._io.sockets.on('connection', function (socket) {
				logger.info(__('CLIENT_CONNECTED',socket.id));
				socket.emit('engine_states', module.exports._engine_states);
				socket.emit('local_states', module.exports._local_states);
				// Création des évènements d'entrée (actions de l'utilisateur)
				socket.on('message', function (message) {
					switch (message) {
						default:
							logger.debug(__('CLIENT_SAYS',message));
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
						case 'pause':
							module.exports.onPause();
							break;
						case 'prev':
							module.exports.onPrev();
							break;
						case 'next':
							module.exports.onNext();
							break;
						case 'togglePrivate':
							module.exports.onTogglePrivate();
							break;
						case 'toggleFullscreen':
							module.exports.onToggleFullscreen();
							break;
						case 'toggleOnTop':
							module.exports.onToggleOnTop();
							break;
						case 'terminate':
							setTimeout(function(){
								// on insert un décalage car la webapp doit d'abord déclencher la fermeture de la fenetre du navigateur internet
								module.exports.onTerminate();
							},500);
							break;
						case 'generate_karabd':
							module.exports.generateKaraDb(socket);
							break;
						default:
							logger.warn(__('UNKNOWN_ACTION',action));
							break;
					}
				});
			});
			module.exports._server.listen(module.exports.LISTEN);
			logger.info(__('DASHBOARD_READY'));
		}
		else
		{
			logger.error(__('DASHBOARD_ALREADY_STARTED'));
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
			logger.info('Launcher::Serveur : Go to http://'+ip.address()+':'+module.exports.LISTEN);
			cp.exec('firefox --new-tab http://'+ip.address()+':'+module.exports.LISTEN);
		}
		else
		{
			open('http://'+ip.address()+':'+module.exports.LISTEN);
		}
	},

	setEngineStates:function(newStates)
	{
		// set new states
		module.exports._engine_states = newStates;
		// emit change to webpage
		module.exports._io.emit('engine_states', this._engine_states);
	},
	setLocalStates:function(k,v)
	{
		// set new states
		module.exports._local_states[k] = v;
		// emit change to webpage
		module.exports._io.emit('local_states', this._local_states);
	},

	generateKaraDb:function(socket)
	{
		module.exports.setLocalStates('generate_karabd',true);
		// on coupe l'accès à la base de données
		module.exports.DB_INTERFACE.close().then(function(){
				logger.info('Admin starting generate db script...');
				// on vide les logs
				socket.emit('generate_karabd', {event:'cleanLog'});

			var generator = require('./generate_karasdb.js');
			generator.SYSPATH = module.exports.SYSPATH;
			generator.SETTINGS = module.exports.SETTINGS;
			generator.onLog = function(type,message) {
				logger.info(__('DATABASE_GENERATION',message));
				if(type!='notice')
					socket.emit('generate_karabd', {event:'addLog',data:message});
			}
			generator.run().then(function(response){
				// on relance l'interface de base de données et on sort du mode rebuild
				module.exports.DB_INTERFACE.init();
				module.exports.setLocalStates('generate_karabd',false);
			}).catch(function(response,error){
					console.log(response);
					module.exports.DB_INTERFACE.init();
					module.exports.setLocalStates('generate_karabd',false);
			});
		});
	},

	// ---------------------------------------------------------------------------
	// Evenements à référencer par le composant  parent
	// ---------------------------------------------------------------------------

	onPlay:function(){
		// événement émis pour quitter l'application
		logger.log('warning','onPlay not set');
	},
	onStop:function(){
		// événement émis pour quitter l'application
		logger.log('warning','onStop not set');
	},
	onStopNow:function(){
		// événement émis pour quitter l'application
		logger.log('warning','onStopNow not set');
	},

	onTerminate:function(){
		// événement émis pour quitter l'application
		logger.log('warning','onTerminate not set');
	},

	onTogglePrivate:function(){
		// événement émis pour quitter l'application
		logger.log('warning','onPrivateToggle not set');
	},

	onToggleFullscreen:function(){
		// événement émis pour quitter l'application
		logger.log('warning','onToggleFullscreen not set');
	},

	onToggleOnTop:function(){
		// événement émis pour quitter l'application
		logger.log('warning','onToggleOnTop not set');
	},

}