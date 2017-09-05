const path = require('path');
const express = require('express');
const exphbs = require('express-handlebars');
const cookieParser = require('cookie-parser')
const ip = require('ip');

const logger = require('../_common/utils/logger.js');

module.exports = {
	SYSPATH:null,
	SETTINGS:null,
	LISTEN:null,
	DB_INTERFACE:null,
	_server:null,
	_engine_states:{},
	_local_states:{},
	i18n:null,
	init : function(){
		if(module.exports.SYSPATH === null) {
			logger.error('Webapp :: SysPath is null !');
			process.exit(1);
		}
		if(module.exports.SETTINGS === null) {
			logger.error('Webapp :: Settings are null !');
			process.exit(1);
		}
		if(module.exports.LISTEN === null) {
			logger.error('Webapp :: Listen port is not set !');
			process.exit(1);
		}
		if(module.exports.DB_INTERFACE === null) {
			logger.error('Webapp :: DB Interface not set !');
			process.exit(1);
		}

		// Création d'un server http pour diffuser l'appli web du launcher
		if(module.exports._server==null) {
			module.exports._server = express();
			module.exports._server.engine('hbs', exphbs({
				layoutsDir: path.join(__dirname, 'views/layouts/'), 
				extname: '.hbs',
				helpers: {
					i18n: function() {
						var args = Array.prototype.slice.call(arguments);
						var options = args.pop();						
						return module.exports.i18n.__.apply(options.data.root, args);	
					}
				}
			}));
			module.exports._server.set('view engine', 'hbs');
			module.exports._server.set('views', path.join(__dirname, 'views/'));
			module.exports._server.use(cookieParser());
			module.exports._server.use(module.exports.i18n.init);
			module.exports._server.use(express.static(__dirname + '/'));
			
			

			module.exports._server.get('/', function (req, res) {
				res.render('public', {'layout': 'publicHeader', 'clientAdress' : 'http://'+ip.address() });
			});
			module.exports._server.get('/admin', function (req, res) {
				res.render('admin', {'layout': 'adminHeader', 'clientAdress' : 'http://'+ip.address() , 'mdpAdmin' : module.exports.SETTINGS.AdminPassword });
			});				

			module.exports._server.use(function (req, res) {
				res.status(404);

				// respond with html page
				if (req.accepts('html')) {
					res.render('404', {url: req.url});
					return;
				}

				// default to plain-text. send()
				res.type('txt').send('Not found');
			});

			module.exports._server.listen(module.exports.LISTEN);

			logger.info('[Webapp] Webapp is READY and listens on port '+module.exports.LISTEN);
            
			// trigger test event (call engine deffered method and log response)
			//console.log(module.exports.onTest());
		} else {
			logger.error('[Webapp] Webapp already started');
		}
	},

	// ---------------------------------------------------------------------------
	// Evenements à référencer par le composant  parent
	// ---------------------------------------------------------------------------

	onTest:function(){
		// événement de test
		logger.log('warning','onTest not set');
	},
};
