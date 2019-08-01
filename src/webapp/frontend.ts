import {resolve} from 'path';
import express from 'express';
import cookieParser from 'cookie-parser';
import compression from 'compression';
import logger from '../lib/utils/logger';
import {getConfig, resolvedPathAvatars, resolvedPathMedias} from '../lib/utils/config';
import {urlencoded, json} from 'body-parser';
import passport from 'passport';
import {configurePassport} from '../lib/utils/passport_manager';
import {createServer} from 'http';
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

/** Declare all routers for API types */
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
			app.use('/system', express.static(resolve(__dirname, '../../react_systempanel/build')));
			app.get('/system/*', (_req, res) => {
				res.sendFile(resolve(__dirname, '../../react_systempanel/build/index.html'));
			});
		}

		//Path to video previews
		app.use('/medias', express.static(resolvedPathMedias()[0]));
		//Path to user avatars
		app.use('/avatars', express.static(resolvedPathAvatars()));

		app.use(express.static(resolve(__dirname, '/../../frontend/build')));
		app.get('/*', (_req, res) => {
			res.sendFile(resolve(__dirname, '../../frontend/build/index.html'));
		});

		const server = createServer(app);
		initWS(server);
		server.listen(conf.Frontend.Port, () => {
			logger.debug(`[Webapp] Webapp is READY and listens on port ${conf.Frontend.Port}`);
		});
	} catch(err) {
		throw err;
	}
}


