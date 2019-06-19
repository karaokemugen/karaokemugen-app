import {join, resolve} from 'path';
import express from 'express';
import exphbs from 'express-handlebars';
import cookieParser from 'cookie-parser';
import compression from 'compression';
import {address} from 'ip';
import logger from '../lib/utils/logger';
import i18n from 'i18n';
import {getConfig} from '../lib/utils/config';
import {urlencoded, json} from 'body-parser';
import passport from 'passport';
import {configurePassport} from './passport_manager';
import {createServer} from 'http';
import { initializationCatchphrases } from '../utils/constants';
import sample from 'lodash.sample';
import { initWS } from '../lib/utils/ws';

// Api routes
import systemConfigController from '../controllers/system/config';
import authController from '../controllers/auth';
import { getState } from '../utils/state';
import systemDBController from '../controllers/system/database';
import systemKaraController from '../controllers/system/kara';
import systemTagController from '../controllers/system/tag';
import systemSeriesController from '../controllers/system/series';
import systemUsersController from '../controllers/system/user';
import systemDownloadController from '../controllers/system/download';
import adminBlacklistController from '../controllers/frontend/admin/blacklist';
import adminFavoritesController from '../controllers/frontend/admin/favorites';
import adminMiscController from '../controllers/frontend/admin/misc';
import adminPlayerController from '../controllers/frontend/admin/player';
import adminPlaylistsController from '../controllers/frontend/admin/playlists';
import adminUserController from '../controllers/frontend/admin/user';
import adminWhitelistController from '../controllers/frontend/admin/whitelist';
import publicBlacklistController from '../controllers/frontend/public/blacklist';
import publicFavoritesController from '../controllers/frontend/public/favorites';
import publicMiscController from '../controllers/frontend/public/misc';
import publicPlaylistsController from '../controllers/frontend/public/playlists';
import publicKaraController from '../controllers/frontend/public/kara';
import publicPollController from '../controllers/frontend/public/poll';
import publicUserController from '../controllers/frontend/public/user';
import publicWhitelistController from '../controllers/frontend/public/whitelist';

function apiRouter() {
	const apiRouter = express.Router();

	// Add auth routes
	authController(apiRouter);
	// Add system routes
	systemConfigController(apiRouter);
	systemDBController(apiRouter);
	systemKaraController(apiRouter);
	systemTagController(apiRouter);
	systemSeriesController(apiRouter);
	systemUsersController(apiRouter);
	systemDownloadController(apiRouter);
	// Add public/admin routes
	adminBlacklistController(apiRouter);
	adminFavoritesController(apiRouter);
	adminMiscController(apiRouter);
	adminPlayerController(apiRouter);
	adminPlaylistsController(apiRouter);
	adminUserController(apiRouter);
	adminWhitelistController(apiRouter);

	publicBlacklistController(apiRouter);
	publicFavoritesController(apiRouter);
	publicMiscController(apiRouter);
	publicPlaylistsController(apiRouter);
	publicKaraController(apiRouter);
	publicPollController(apiRouter);
	publicUserController(apiRouter);
	publicWhitelistController(apiRouter);

	return apiRouter;
}


export async function initFrontend() {
	try {
		const conf = getConfig();
		const state = getState();
		const app = express();
		app.engine('hbs', exphbs({
			layoutsDir: join(__dirname, '../../frontend/ressources/views/layouts/'),
			extname: '.hbs',
			defaultLayout: 'welcomeHeader',
			helpers: {
			//How comes array functions do not work here?
				i18n: function() {
					const args = Array.prototype.slice.call(arguments);
					const options = args.pop();
					return i18n.__.apply(options.data.root, args);
				},
				if_eq: (a: any, b: any, opts: any) => {
					if(a === b)
						return opts.fn(this);
					else
						return opts.inverse(this);
				}
			}
		}));
		const routerAdmin = express.Router();
		const routerWelcome = express.Router();
		app.use(passport.initialize());
		configurePassport();
		app.set('view engine', 'hbs');
		app.set('views', join(__dirname, '/../../frontend/ressources/views/'));
		app.use(compression());
		app.use(cookieParser());
		app.use(i18n.init);
		app.use(urlencoded({ extended: true, limit: '50mb' }));
		app.use(json({limit: '50mb'}));
		app.use('/api', apiRouter());
		// Add headers
		app.use((req, res, next) => {
		// Website you wish to allow to connect
			res.setHeader('Access-Control-Allow-Origin', '*');
			// Request methods you wish to allow
			res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');
			// Request headers you wish to allow
			res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Authorization, Accept, Key');
			req.method === 'OPTIONS'
				? res.json()
				: next();
		});
		app.use(express.static(__dirname + '/../../frontend/'));
		//path for system control panel
		if (!state.isDemo) {
			app.use('/system', express.static(resolve(__dirname, '../../react_systempanel/build')));
			app.get('/system/*', (_req, res) => {
				res.sendFile(resolve(__dirname, '../../react_systempanel/build/index.html'));
			});
		}
		//Path to locales for webapp
		app.use('/locales', express.static(__dirname + '/../locales/'));
		//Path to video previews
		app.use('/previews', express.static(resolve(state.appPath,conf.System.Path.Previews)));
		//Path to user avatars
		app.use('/avatars', express.static(resolve(state.appPath,conf.System.Path.Avatars)));
		app.use('/admin', routerAdmin);
		app.use('/welcome', routerWelcome);

		app.get('/', (req, res) => {
			const config = getConfig();
			let view = 'public';
			if (+config.Frontend.Mode === 0) {
				view = 'publicClosed';
			} else if (+config.Frontend.Mode === 1) {
				view = 'publicLimited';
			}
			let url: string;
			config.Karaoke.Display.ConnectionInfo.Host
				? url = config.Karaoke.Display.ConnectionInfo.Host
				: url = address();

			res.render(view, {'layout': 'publicHeader',
				'clientAdress'	:	`http://${url}`,
				'webappMode'	:	+config.Frontend.Mode,
				'onlineHost'  	:	config.Online.Users ? config.Online.Host : '',
				'query'			:	JSON.stringify(req.query)
			});
		});
		routerAdmin.get('/', async (req, res) => {
			const config = getConfig();

			res.render('admin', {'layout': 'adminHeader',
				'clientAdress'	:	`http://${address()}`,
				'query'			:	JSON.stringify(req.query),
				'appFirstRun'	:	config.App.FirstRun,
				'onlineHost'  	:	config.Online.Users ? config.Online.Host : '',
				'webappMode'	:	config.Frontend.Mode
			});
		});
		routerWelcome.get('/', (req, res) => {
			const config = getConfig();
			res.render('welcome', {
				'appFirstRun'	:	config.App.FirstRun,
				'catchphrases'	:	sample(initializationCatchphrases),
				'clientAdress'	:	`http://${address()}`,
				'query'			:	JSON.stringify(req.query),
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
		initWS(server);
		server.listen(conf.Frontend.Port, () => {
			logger.debug(`[Webapp] Webapp is READY and listens on port ${conf.Frontend.Port}`);
		});
	}catch(err) {
		console.log(err);
		throw err;
	}
}


