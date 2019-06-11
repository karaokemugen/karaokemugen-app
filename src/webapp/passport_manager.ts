
import passport from 'passport';
import {Strategy, ExtractJwt} from 'passport-jwt';
import LocalStrategy from 'passport-local';

import {hashPassword, findUserByName} from '../services/user';
import {getConfig} from '../lib/utils/config';
import { User } from '../types/user';

export function configurePassport() {
	passport.use(localPassportStrategy());
	passport.use(jwtPassportStrategy());
}

function localPassportStrategy() {
	const localOptions = {usernameField: 'username', passwordField: 'password'};
	const strategy = new LocalStrategy(localOptions, (username: string, password: string, done: any) => {
		const hash = hashPassword(password);
		findUserByName(username)
			.then((userdata: User) => {
				//User not found
				if (!userdata) return done(null, false);
				//User is a guest, no password check needed
				if (userdata.type === 2) return done(null, username);
				//User is not a guest, and password mismatches
				if (hash !== userdata.password) return done(null, false);
				//Everything's daijoubu
				done(null, username);
			})
			.catch(() => done(null, false));
	});
	return strategy;
}

function jwtPassportStrategy() {
	const jwtOptions = {
		jwtFromRequest: ExtractJwt.fromHeader('authorization'),
		secretOrKey: getConfig().App.JwtSecret
	};
	return new Strategy(jwtOptions, function (payload, done) {
		return done(null, payload.username);
	});
}
