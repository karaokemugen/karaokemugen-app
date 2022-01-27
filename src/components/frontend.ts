// Node Modules
import compression from 'compression';
import cors from 'cors';
import express, { json, Router, urlencoded } from 'express';
import { createServer } from 'http';
import { resolve } from 'path';

import authController from '../controllers/auth';
import backgroundsController from '../controllers/frontend/backgrounds';
import downloadController from '../controllers/frontend/download';
import emulateController from '../controllers/frontend/emulate';
import favoritesController from '../controllers/frontend/favorites';
import filesController, { filesSocketController } from '../controllers/frontend/files';
import inboxController from '../controllers/frontend/inbox';
import karaController from '../controllers/frontend/kara';
import miscController from '../controllers/frontend/misc';
import playerController from '../controllers/frontend/player';
import playlistsController from '../controllers/frontend/playlists';
import pollController from '../controllers/frontend/poll';
import repoController from '../controllers/frontend/repo';
import sessionController from '../controllers/frontend/session';
import smartPlaylistsController from '../controllers/frontend/smartPlaylists';
import tagsController from '../controllers/frontend/tags';
import testController from '../controllers/frontend/test';
import userController from '../controllers/frontend/user';
import { resolvedPath, resolvedPathRepos } from '../lib/utils/config';
import logger from '../lib/utils/logger';
import { initWS, SocketIOApp } from '../lib/utils/ws';
import sentry from '../utils/sentry';
import { getState } from '../utils/state';

/** Declare all routers for API types */

function apiHTTPRouter(ws: SocketIOApp): Router {
	const router = express.Router();
	filesController(router);
	emulateController(router, ws);
	return router;
}

function apiRouter(ws: SocketIOApp) {
	filesSocketController(ws);
	authController(ws);
	downloadController(ws);
	favoritesController(ws);
	backgroundsController(ws);
	miscController(ws);
	playerController(ws);
	playlistsController(ws);
	userController(ws);
	sessionController(ws);
	karaController(ws);
	tagsController(ws);
	pollController(ws);
	repoController(ws);
	smartPlaylistsController(ws);
	inboxController(ws);
	if (getState().isTest) testController(ws);
}

/** Initialize frontend express server */
export default function initFrontend(): number {
	try {
		const state = getState();
		const app = express();
		app.use(cors());
		app.use(compression());
		app.use(urlencoded({ extended: true, limit: '50mb' }));
		app.use(json({ limit: '50mb' }));
		// Add headers
		app.use((req, res, next) => {
			// Website you wish to allow to connect
			res.setHeader('Access-Control-Allow-Origin', '*');
			// Request methods you wish to allow
			res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');
			// Request headers you wish to allow
			res.setHeader(
				'Access-Control-Allow-Headers',
				'Origin, X-Requested-With, Content-Type, Authorization, Accept, Key'
			);
			req.method === 'OPTIONS' ? res.json() : next();
		});

		// Path to video previews
		app.use('/previews', express.static(resolvedPath('Previews'), { fallthrough: false }));
		// Path to backgrounds
		app.use('/backgrounds', express.static(resolvedPath('Backgrounds'), { fallthrough: false }));
		// There's a single /medias path which will list all files in all folders. Pretty handy.
		resolvedPathRepos('Medias').forEach(dir => app.use('/medias', express.static(dir)));
		// Path to user avatars
		app.use('/avatars', express.static(resolvedPath('Avatars')));

		// Serve session export data
		app.use('/sessionExports', express.static(resolve(state.dataPath, 'sessionExports/')));

		// HTTP standards are important.
		app.use('/coffee', (_req, res) => res.status(418).json());

		app.use('/', express.static(resolve(state.resourcePath, 'kmfrontend/build')));
		app.get('/*', (_req, res) => {
			res.sendFile(resolve(state.resourcePath, 'kmfrontend/build/index.html'));
		});

		const server = createServer(app);
		// Init websockets
		const ws = initWS(server);
		apiRouter(ws);
		app.use('/api', apiHTTPRouter(ws));
		let port = state.frontendPort;
		try {
			server.listen(port, () => {
				logger.debug(`Webapp is READY and listens on port ${port}`, { service: 'Webapp' });
			});
		} catch (err) {
			// Likely port is busy for some reason, so we're going to change that number to something else.
			port += 1;
			server.listen(port, () => {
				logger.debug(`Webapp is READY and listens on port ${port}`, { service: 'Webapp' });
			});
		}
		return port;
	} catch (err) {
		// Utter failure
		logger.error('Webapp is NOT READY', { service: 'Webapp', obj: err });
		sentry.error(err);
		throw err;
	}
}
