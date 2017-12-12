import logger from 'winston';
import express from 'express';
import {resolve} from 'path';
import bodyParser from 'body-parser';

import passport from 'passport';
import {Strategy} from 'passport-jwt';
import {ExtractJwt} from 'passport-jwt';
import LocalStrategy from 'passport-local';

import config from '../_common/utils/config';
import adminController from '../_controllers/admin';
import authController from '../_controllers/auth';
import {hashPassword,findUserByName} from '../_common/utils/user';

module.exports = {
	startExpressReactServer: startExpressReactServer
};


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

function configurePassport(conf) {

	const resolvedConf = conf || config.getConfig();

	const localLogin = localPassportStrategy(resolvedConf);
	const jwtLogin = jwtPassportStrategy(resolvedConf);

	passport.use(jwtLogin);
	passport.use(localLogin);
}

function localPassportStrategy() {
	const localOptions = {usernameField: 'username', passwordField: 'password'};

	return new LocalStrategy(localOptions, function (username, password, done) {
		password = hashPassword(password);
		findUserByName(username)
			.then((userdata) => {
				if (!userdata) return done(null, false);				
				if (password != userdata.password) return done(null, false);
				return done(null, username);
			});
	});
}

function jwtPassportStrategy(config) {

	const jwtOptions = {
		jwtFromRequest: ExtractJwt.fromHeader('authorization'),
		secretOrKey: config.JwtSecret
	};

	return new Strategy(jwtOptions, function (payload, done) {
		return done(null, payload.username);
	});
}
