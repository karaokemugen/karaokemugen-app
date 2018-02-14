import logger from 'winston';
import express from 'express';
import {resolve} from 'path';
import bodyParser from 'body-parser';

import passport from 'passport';
import adminController from '../_controllers/admin';
import authController from '../_controllers/auth';

module.exports = {
	startExpressReactServer: startExpressReactServer
};

import {configurePassport} from './passport_manager.js';

/**
 * Démarrage de l'application Express servant le frontend React, développé dans un sous-projet JS
 * séparé, dans le répertoire 'client'.
 *
 * Servir cette application nécessite qu'elle soit préalablement construite.
 */
function startExpressReactServer(listenPort) {

	const app = express();

	app.use(bodyParser.json()); // support json encoded bodies
	app.use(bodyParser.urlencoded({ extended: true })); // support encoded bodies

	app.use(passport.initialize());
	configurePassport();

	// Serve static files from the React app
	app.use(express.static(resolve(__dirname, '../_dashboard')));

	// API router
	app.use('/api', apiRouter());

	// The "catchall" handler: for any request that doesn't
	// match one above, send back React's index.html file.
	app.get('*', (req, res) => {
		res.sendFile(resolve(__dirname, '../_dashboard/index.html'));
	});

	const port = listenPort || 5000;
	app.listen(port);

	logger.info(`[Dashboard] Dashboard listening on ${port}`);
}

function apiRouter() {
	const apiRouter = express.Router();

	// Ajout des routes d'identification.
	authController(apiRouter);
	// Ajout des routes d'administration, nécessitant une identification.
	adminController(apiRouter);

	return apiRouter;
}
