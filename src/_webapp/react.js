const logger = require('winston');
const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');

const passport = require('passport');
const JwtStrategy = require('passport-jwt').Strategy;
const ExtractJwt = require('passport-jwt').ExtractJwt;
const LocalStrategy = require('passport-local');

const config = require('../_common/utils/config');
const adminController = require('../_controllers/admin');
const authController = require('../_controllers/auth');

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
	app.use(express.static(path.resolve(__dirname, '../../client/build')));

	// API router
	app.use('/api', apiRouter());

	// The "catchall" handler: for any request that doesn't
	// match one above, send back React's index.html file.
	app.get('*', (req, res) => {
		res.sendFile(path.resolve(__dirname, '../../client/build/index.html'));
	});

	const port = listenPort || 5000;
	app.listen(port);

	logger.info(`[Dashboard] React frontend app listening on ${port}`);
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

function localPassportStrategy(config) {
	const localOptions = {usernameField: 'username', passwordField: 'password'};
	const adminPassword = config.AdminPassword;

	return new LocalStrategy(localOptions, function (username, password, done) {
		if (password === adminPassword) {
			return done(null, username);
		} else {
			return done(null, false);
		}
	});
}

function jwtPassportStrategy(config) {

	const jwtOptions = {
		jwtFromRequest: ExtractJwt.fromHeader('authorization'),
		secretOrKey: config.JwtSecret
	};

	return new JwtStrategy(jwtOptions, function (payload, done) {
		return done(null, payload.username);
	});
}
