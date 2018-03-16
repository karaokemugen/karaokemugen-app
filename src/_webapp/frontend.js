import {join, resolve} from 'path';
import express from 'express';
import exphbs from 'express-handlebars';
import cookieParser from 'cookie-parser';
import {address} from 'ip';
import {graphics} from 'systeminformation';
const logger = require('winston');
import i18n from 'i18n';
import {getConfig} from '../_common/utils/config';
import {urlencoded, json} from 'body-parser';
import expressValidator from 'express-validator';
import passport from 'passport';
import {configurePassport} from '../_webapp/passport_manager';
import authController from '../_controllers/auth';
import {APIControllerPublic, APIControllerAdmin} from '../_controllers/api';
import {createServer} from 'http';

let ws;

export async function emitWS(type,data) {
	//logger.debug('[WS] Sending message '+type+' : '+JSON.stringify(data));
	ws.sockets.emit(type,data);
}

function numberTest(element) {
	if (isNaN(element)) return false;
	return true;
}

export async function initFrontend(port) {
	const app = express();
	app.engine('hbs', exphbs({
		layoutsDir: join(__dirname, 'ressources/views/layouts/'), 
		extname: '.hbs',
		
		helpers: {
			i18n: function() {
				var args = Array.prototype.slice.call(arguments);
				var options = args.pop();						
				return i18n.__.apply(options.data.root, args);	
			},
			if_eq: function(a, b, opts) {
				if(a == b)
					return opts.fn(this);
				else
					return opts.inverse(this);
			}
		}
	}));
	const routerAdmin = express.Router();
	app.use(passport.initialize());
	configurePassport();
	const conf = getConfig();
	app.set('view engine', 'hbs');
	app.set('views', join(__dirname, 'ressources/views/'));
	app.use(cookieParser());
	app.use(i18n.init);
	app.use(urlencoded({ extended: true, limit: '50mb' }));
	app.use(json());
	// Calling express validator with custom validators, used for the player commands
	// to check if they're from the allowed list.
	// We use another custom validator to test for array of numbers
	// used mainly with adding/removing lists of karaokes
	app.use(expressValidator({
		customValidators: {
			enum: (input, options) => options.includes(input),
			stringsArray: (input) => {
				if (input) {
					if (typeof input === 'string' && input.includes(',')) {
						return input.split(',');
					}
					return input;
				}
				return false;
			},
			numbersArray: (input) => {
				if (input) {
					// Test if we get a single number or a list of comma separated numbers
					if (typeof input === 'string' && input.includes(',')) {
						let array = input.split(',');
						return array.some(numberTest);
					} 
					return numberTest(input);
				}
				return false;
			}
		}
	}));
	
	function routerAuth() {
		const apiRouter = express.Router();
		// Adding auth routes here.
		authController(apiRouter);
		return apiRouter;
	}

	function routerAPIPublic() {
		const apiRouter = express.Router();
		// Adding auth routes here.
		APIControllerPublic(apiRouter);
		return apiRouter;
	}

	function routerAPIAdmin() {
		const apiRouter = express.Router();
		// Adding auth routes here.
		APIControllerAdmin(apiRouter);
		return apiRouter;
	}

	app.use('/api/v1/auth', routerAuth());
	app.use('/api/v1/public', routerAPIPublic());
	app.use('/api/v1/admin', routerAPIAdmin());			
	// Add headers
	app.use(function (req, res, next) {
		// Website you wish to allow to connect
		res.setHeader('Access-Control-Allow-Origin', '*');
		// Request methods you wish to allow
		res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');
		// Request headers you wish to allow
		res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Authorization, Accept, Key');
		if (req.method === 'OPTIONS') {
			res.statusCode = 200;
			res.json();
		} else {
			// Pass to next layer of middleware
			next();
		}
	});
	app.use(express.static(__dirname + '/'));
	//Path to locales for webapp
	app.use('/locales',express.static(__dirname + '/../_common/locales/'));
	//Path to video previews
	app.use('/previews',express.static(resolve(conf.appPath,conf.PathPreviews)));
	//Path to user avatars
	app.use('/avatars',express.static(resolve(conf.appPath,conf.PathAvatars)));
	app.use('/admin', routerAdmin);	

	app.get('/', (req, res) => {
		var config = getConfig();
			
		var view = 'public';
		if(config.WebappMode === '0') {
			view = 'publicClosed';
		} else if (config.WebappMode === '1') {
			view = 'publicLimited';
		}
		let url;
		if (config.EngineConnectionInfoHost) {
			url = config.EngineConnectionInfoHost
		} else {
			url = address();
		}

		res.render(view, {'layout': 'publicHeader',
			'clientAdress'	:	'http://'+url,
			'webappMode'	:	config.WebappMode,
			'query'			:	JSON.stringify(req.query)
		});
	});
	routerAdmin.get('/', (req, res) => {
		//Get list of monitors to allow users to select one for the player
		graphics().then((data) => {
			logger.debug('[Webapp] Displays detected : '+JSON.stringify(data.displays));
			[0,1,2,3,4].forEach(function(key) {
				if (data.displays[key] && data.displays[key].model) {
					data.displays[key].model = data.displays[key].model.replace('�','e');
				}
				if (!data.displays[key]) {
					data.displays[key] = {model : ''};
				}
			});
					
			res.render('admin', {'layout': 'adminHeader',
				'clientAdress'	:	'http://'+address(),
				'mdpAdmin'		:	conf.AdminPassword,
				'displays'		:	data.displays,
				'query'			:	JSON.stringify(req.query),
				'webappMode'	:	conf.WebappMode
			});
		});		
	});			
			
	app.use((req, res) => {
		res.status(404);
		// respond with html page
		if (req.accepts('html')) {	
			res.render('404', {url: req.url});
			return;
		}
		// default to plain-text. send()
		res.type('txt').send('Not found');
	});
	const server = createServer(app);
	ws = require('socket.io').listen(server);	
	server.listen(port, () => {
		logger.debug(`[Webapp] Webapp is READY and listens on port ${port}`);   		
	});
	setTimeout(() => {
		emitWS('test','mytest');
	},15000);
}
		

		