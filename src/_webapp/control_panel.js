import logger from 'winston';
import express from 'express';
import {resolve} from 'path';
import bodyParser from 'body-parser';
import {getConfig} from '../_common/utils/config';
import passport from 'passport';
import adminController from '../_controllers/admin';
import authController from '../_controllers/auth';
import {configurePassport} from './passport_manager.js';

/**
 * Starting the express app for admin features, aka Control Panel
 * It's made with React
 *
 * Serving this app requires it being built first
 */
export async function initControlPanel(listenPort) {

	const conf = getConfig();
	const app = express();

	app.use(bodyParser.json()); // support json encoded bodies
	app.use(bodyParser.urlencoded({ extended: true })); // support encoded bodies

	app.use(passport.initialize());
	configurePassport();

	// Serve static files from the React app
	app.use(express.static(resolve(__dirname, '../../react_client/build')));

	// API router
	app.use('/api', apiRouter());
	app.use('/static/avatars',express.static(resolve(conf.appPath,conf.PathAvatars)));
	// The "catchall" handler: for any request that doesn't
	// match one above, send back React's index.html file.
	app.get('*', (req, res) => {
		res.sendFile(resolve(__dirname, '../../react_client/build/index.html'));
	});

	const port = listenPort || 5000;
	app.listen(port);

	logger.debug(`[Control Panel] Control Panel listening on ${port}`);
}

function apiRouter() {
	const apiRouter = express.Router();

	// Add auth routes
	authController(apiRouter);
	// Add admin routes
	adminController(apiRouter);

	return apiRouter;
}
