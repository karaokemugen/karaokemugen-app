// Node Modules
import compression from 'compression';
import cors from 'cors';
import express, { json, Router, urlencoded } from 'express';
import { createServer } from 'http';
import { resolve } from 'path';

import authController from '../controllers/auth.js';
import backgroundsController from '../controllers/frontend/backgrounds.js';
import downloadController from '../controllers/frontend/download.js';
import emulateController from '../controllers/frontend/emulate.js';
import favoritesController from '../controllers/frontend/favorites.js';
import filesController, { filesSocketController } from '../controllers/frontend/files.js';
import inboxController from '../controllers/frontend/inbox.js';
import karaController from '../controllers/frontend/kara.js';
import miscController from '../controllers/frontend/misc.js';
import playerController from '../controllers/frontend/player.js';
import playlistsController from '../controllers/frontend/playlists.js';
import pollController from '../controllers/frontend/poll.js';
import repoController from '../controllers/frontend/repo.js';
import sessionController from '../controllers/frontend/session.js';
import smartPlaylistsController from '../controllers/frontend/smartPlaylists.js';
import tagsController from '../controllers/frontend/tags.js';
import testController from '../controllers/frontend/test.js';
import userController from '../controllers/frontend/user.js';
import { resolvedPath, resolvedPathRepos } from '../lib/utils/config.js';
import logger, { profile } from '../lib/utils/logger.js';
import { initWS, SocketIOApp } from '../lib/utils/ws.js';
import sentry from '../utils/sentry.js';
import { getState } from '../utils/state.js';

const service = 'Frontend';

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
		profile('initFrontend');
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
				logger.debug(`Webapp is READY and listens on port ${port}`, { service });
			});
		} catch (err) {
			// Likely port is busy for some reason, so we're going to change that number to something else.
			port += 1;
			server.listen(port, () => {
				logger.debug(`Webapp is READY and listens on port ${port}`, { service });
			});
		}
		return port;
	} catch (err) {
		// Utter failure
		logger.error('Webapp is NOT READY', { service, obj: err });
		sentry.error(err);
		throw err;
	} finally {
		profile('initFrontend');
	}
}
