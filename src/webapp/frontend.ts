// Node Modules
import {resolve} from 'path';
import express from 'express';
import cookieParser from 'cookie-parser';
import compression from 'compression';
import {urlencoded, json} from 'body-parser';
import passport from 'passport';
import {createServer} from 'http';

// KM Imports
import logger from '../lib/utils/logger';
import {getConfig, resolvedPathAvatars, resolvedPathRepos} from '../lib/utils/config';
import {configurePassport} from '../lib/utils/passport_manager';
import { initWS } from '../lib/utils/ws';
import { getState } from '../utils/state';

// Api routes
import authController from '../controllers/auth';
import pollController from '../controllers/frontend/poll';
import downloadController from '../controllers/frontend/download';
import userController from '../controllers/frontend/user';
import whitelistController from '../controllers/frontend/whitelist';
import blacklistController from '../controllers/frontend/blacklist';
import favoritesController from '../controllers/frontend/favorites';
import miscController from '../controllers/frontend/misc';
import playerController from '../controllers/frontend/player';
import sessionController from '../controllers/frontend/session';
import karaController from '../controllers/frontend/kara';
import tagsController from '../controllers/frontend/tags';
import seriesController from '../controllers/frontend/series';
import playlistsController from '../controllers/frontend/playlists';
import repoController from '../controllers/frontend/repo';

/** Declare all routers for API types */
function apiRouter() {
	const apiRouter = express.Router();

	// Add auth routes
	authController(apiRouter);
	downloadController(apiRouter);
	blacklistController(apiRouter);
	favoritesController(apiRouter);
	miscController(apiRouter);
	playerController(apiRouter);
	playlistsController(apiRouter);
	userController(apiRouter);
	whitelistController(apiRouter);
	sessionController(apiRouter);
	karaController(apiRouter);
	tagsController(apiRouter);
	seriesController(apiRouter);
	pollController(apiRouter);
	repoController(apiRouter);

	return apiRouter;
}

/** Initialize frontend express server */
export async function initFrontend() {
	try {
		const conf = getConfig();
		const state = getState();
		const app = express();
		app.use(passport.initialize());
		configurePassport();
		app.use(compression());
		app.use(cookieParser());
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
		//path for system control panel
		// System is not served in demo mode.
		if (!state.isDemo) {
			app.use('/system', express.static(resolve(__dirname, '../../systempanel/build')));
			app.get('/system/*', (_req, res) => {
				res.sendFile(resolve(__dirname, '../../systempanel/build/index.html'));
			});
		}

		//Path to video previews
		resolvedPathRepos('Medias').forEach(dir => app.use('/medias', express.static(dir)));
		//Path to user avatars
		app.use('/avatars', express.static(resolvedPathAvatars()));

		//Frontend
		app.use(express.static(resolve(__dirname, '../../frontend/build')));
		app.get('/*', (_req, res) => {
			res.sendFile(resolve(__dirname, '../../frontend/build/index.html'));
		});

		const server = createServer(app);
		// Init websockets
		initWS(server);
		server.listen(conf.Frontend.Port, () => {
			logger.debug(`[Webapp] Webapp is READY and listens on port ${conf.Frontend.Port}`);
		});
	} catch(err) {
		throw err;
	}
}


