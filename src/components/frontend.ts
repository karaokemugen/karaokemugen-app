// Node Modules
import {json,urlencoded} from 'body-parser';
import compression from 'compression';
import express from 'express';
import {createServer} from 'http';
import passport from 'passport';
import {resolve} from 'path';

import authController from '../controllers/auth';
import blacklistController from '../controllers/frontend/blacklist';
import downloadController from '../controllers/frontend/download';
import favoritesController from '../controllers/frontend/favorites';
import karaController from '../controllers/frontend/kara';
import miscController from '../controllers/frontend/misc';
import playerController from '../controllers/frontend/player';
import playlistsController from '../controllers/frontend/playlists';
import pollController from '../controllers/frontend/poll';
import repoController from '../controllers/frontend/repo';
import sessionController from '../controllers/frontend/session';
import tagsController from '../controllers/frontend/tags';
import userController from '../controllers/frontend/user';
import whitelistController from '../controllers/frontend/whitelist';
import {getConfig, resolvedPathAvatars, resolvedPathRepos} from '../lib/utils/config';
import logger from '../lib/utils/logger';
import {configurePassport} from '../lib/utils/passport_manager';
import sentry from '../utils/sentry';
import { initWS } from '../lib/utils/ws';
import { getState } from '../utils/state';

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
	pollController(apiRouter);
	repoController(apiRouter);

	return apiRouter;
}

/** Initialize frontend express server */
export function initFrontend(): number {
	try {
		const conf = getConfig();
		const state = getState();
		const app = express();
		app.use(passport.initialize());
		configurePassport();
		app.use(compression());
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
			app.use('/system', express.static(resolve(state.resourcePath, 'systempanel/build')));
			app.get('/system/*', (_req, res) => {
				res.sendFile(resolve(state.resourcePath, 'systempanel/build/index.html'));
			});
		}

		//Path to video previews
		resolvedPathRepos('Medias').forEach(dir => app.use('/medias', express.static(dir)));
		//Path to user avatars
		app.use('/avatars', express.static(resolvedPathAvatars()));

		//Frontend
		app.use(express.static(resolve(state.resourcePath, 'frontend/build')));
		app.get('/*', (_req, res) => {
			res.sendFile(resolve(state.resourcePath, 'frontend/build/index.html'));
		});

		const server = createServer(app);
		// Init websockets
		initWS(server);
		let port = conf.Frontend.Port;
		try {
			server.listen(port, () => {
				logger.debug(`[Webapp] Webapp is READY and listens on port ${port}`);
			});
		} catch(err) {
			// Likely port is busy for some reason, so we're going to change that number to something else.
			try {
				port = port + 1;
				server.listen(port, () => {
					logger.debug(`[Webapp] Webapp is READY and listens on port ${port}`);
				});
			} catch(err) {
				// Utter failure
				const error = new Error(err);
				sentry.error(error);
				throw error;
			}
		}
		return port;
	} catch(err) {
		const error = new Error(err);
		sentry.error(error);
		throw error;
	}
}


