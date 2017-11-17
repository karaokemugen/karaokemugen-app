const passport = require('passport');
const JwtStrategy = require('passport-jwt').Strategy;
const ExtractJwt = require('passport-jwt').ExtractJwt;
const LocalStrategy = require('passport-local');
const config = require('../_common/utils/config');

module.exports = function initPassport(conf) {

	const resolvedConf = conf || config.getConfig();

	const localLogin = localPassportStrategy(resolvedConf);
	const jwtLogin = jwtPassportStrategy(resolvedConf);

	passport.use(jwtLogin);
	passport.use(localLogin);
};

function localPassportStrategy(config) {
	const localOptions = {usernameField: 'username'};
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
