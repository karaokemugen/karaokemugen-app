
import passport from 'passport';
import {Strategy} from 'passport-jwt';
import {ExtractJwt} from 'passport-jwt';
import LocalStrategy from 'passport-local';

import {hashPassword,findUserByName} from '../_services/user';
import {getConfig} from '../_common/utils/config';

export function configurePassport(conf) {

	const resolvedConf = conf || getConfig();

	const localLogin = localPassportStrategy(resolvedConf);
	const jwtLogin = jwtPassportStrategy(resolvedConf);

	passport.use(jwtLogin);
	passport.use(localLogin);
}

function localPassportStrategy() {
	const localOptions = {usernameField: 'username', passwordField: 'password'};

	return new LocalStrategy(localOptions, function (username, password, done) {
		const hash = hashPassword(password);
		findUserByName(username)
			.then((userdata) => {
				//User not found
				if (!userdata) return done(null, false);
				//User is a guest, no password check needed
				if (userdata.type === 2) return done(null, username);
				//User is not a guest, and password mismatches
				if (hash !== userdata.password) return done(null, false);
				//Everything's daijoubu
				return done(null, username); 
			}) 
			.catch(() => done(null, false)); 
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
