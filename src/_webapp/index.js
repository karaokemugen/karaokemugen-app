const path = require('path');
const express = require('express');
const exphbs = require('express-handlebars');
const cookieParser = require('cookie-parser');
const ip = require('ip');
const si = require('systeminformation');
const logger = require('winston');

const basicAuth = require('express-basic-auth');

import passport from 'passport';
import {Strategy} from 'passport-local';
import {hashPassword, findUserByID, checkUserCredentials} from '../_common/utils/auth.js';

function AdminPasswordAuth(username, password){
	return password === module.exports.SETTINGS.AdminPassword;
}

function getUnauthorizedResponse(req) {
	return req.auth ?
		('Credentials ' + req.auth.user + ':' + req.auth.password + ' rejected') :
		'No credentials provided';
}

module.exports = {
	SYSPATH:null,
	SETTINGS:null,
	LISTEN:null,
	DB_INTERFACE:null,
	_server:null,
	_engine_states:{},
	_local_states:{},
	i18n:null,
	init:function(){
		
		// Init passport strategy
		passport.use(new Strategy(
			(username, password, cb) => {
				checkUserCredentials(username, password)
					.then((user) => {
						if (!user) return cb(null, false); 
						const hash = hashPassword(password, user.password);
						if (hash != password) return cb(null, false); 
						return cb(null, user);				
					})
					.catch((err) => {
						return (err, false);
					});				
			}));
		// Serializing user ID into session data
		passport.serializeUser((user, cb) => {
			return cb(null, user.id);
		});
		passport.deserializeUser((id, cb) => {
			findUserByID(id)
				.then((user) => {
					if (!user) {
						return cb(null,false);
					} else {
						return cb(null,user);
					}
				})
				.catch((err) => {
					return cb(err);
				});				
		});
	

		// Création d'un server http pour diffuser l'appli web du launcher
		if(app==null) {
			var app = express();
			app.engine('hbs', exphbs({
				layoutsDir: path.join(__dirname, 'ressources/views/layouts/'), 
				extname: '.hbs',
				helpers: {
					i18n: function() {
						var args = Array.prototype.slice.call(arguments);
						var options = args.pop();						
						return module.exports.i18n.__.apply(options.data.root, args);	
					}
				}
			}));
			var routerAdmin = express.Router();
			routerAdmin.use(basicAuth({ 
				authorizer: AdminPasswordAuth,
				challenge: true,
				realm: 'Karaoke Mugen Admin',
				unauthorizedResponse: getUnauthorizedResponse
			}));			
			routerAdmin.use(function(req,res,next) {
				next();
			});
			app.set('view engine', 'hbs');
			app.set('views', path.join(__dirname, 'ressources/views/'));
			app.use(passport.initialize());
			app.use(passport.session());
			app.use(cookieParser());
			app.use(module.exports.i18n.init);
			app.use(express.static(__dirname + '/'));
			app.use('/locales',express.static(__dirname + '/../_common/locales/'));
			app.use('/previews',express.static(path.resolve(module.exports.SYSPATH,module.exports.SETTINGS.PathPreviews)));
			app.use('/admin', routerAdmin);		
			app.get('/', function (req, res) {
				res.render('public', {'layout': 'publicHeader',
					'clientAdress'	:		'http://'+ip.address(),
					'query'			:	JSON.stringify(req.query)
				});
			});
			app.get('/login',
				(req, res) => {
					res.render('login');
				});
  
			app.post('/login', passport.authenticate('local', { successRedirect: '/good-login', failureRedirect: '/bad-login' }));
  
			app.get('/logout',
				(req, res) => {
					req.logout();
					res.redirect('/');
				});

			app.get('/profile',
				require('connect-ensure-login').ensureLoggedIn(),
				(req, res) => {
					res.render('profile', { user: req.user });
				});
			routerAdmin.get('/', function (req, res) {
				si.graphics().then( function(data) {
					logger.debug('[Webapp] Displays detected : '+JSON.stringify(data.displays));
					[0,1,2,3,4].forEach(function(key) {
						if (data.displays[key] && data.displays[key].model) {
							data.displays[key].model = data.displays[key].model.replace('�','e');
						}
						if (!data.displays[key]) {
							data.displays[key] = {model : ''};
						}
					});
					
					res.render('admin', {'layout': 'adminHeader',
						'clientAdress'	:	'http://'+ip.address(),
						'mdpAdmin'		:	module.exports.SETTINGS.AdminPassword,
						'displays'		:	data.displays,
						'query'			:	JSON.stringify(req.query)
					});
				});		
			});			
			
			app.use(function (req, res) {
				res.status(404);

				// respond with html page
				if (req.accepts('html')) {
					res.render('404', {url: req.url});
					return;
				}

				// default to plain-text. send()
				res.type('txt').send('Not found');
			});

			app.listen(module.exports.LISTEN);

			logger.info('[Webapp] Webapp is READY and listens on port '+module.exports.LISTEN);   			
		} else {
			logger.error('[Webapp] Webapp already started');
		}
	},
};
