import {join, resolve} from 'path';
import express from 'express';
import exphbs from 'express-handlebars';
import cookieParser from 'cookie-parser';
import {address} from 'ip';
import {graphics} from 'systeminformation';
const logger = require('winston');
import i18n from 'i18n';
import {getConfig} from '../_common/utils/config';

export async function initFrontend(port) {
	const app = express();
	app.engine('hbs', exphbs({
		layoutsDir: join(__dirname, 'ressources/views/layouts/'), 
		extname: '.hbs',
		
		helpers: {
			i18n: function() {
				var args = Array.prototype.slice.call(arguments);
				var options = args.pop();						
				return i18n.__.apply(options.data.root, args);	
			},
			if_eq: function(a, b, opts) {
				if(a == b)
					return opts.fn(this);
				else
					return opts.inverse(this);
			}
		}
	}));
	const routerAdmin = express.Router();
	const conf = getConfig();
	app.set('view engine', 'hbs');
	app.set('views', join(__dirname, 'ressources/views/'));
	app.use(cookieParser());
	app.use(i18n.init);
	app.use(express.static(__dirname + '/'));
	//Path to locales for webapp
	app.use('/locales',express.static(__dirname + '/../_common/locales/'));
	//Path to video previews
	app.use('/previews',express.static(resolve(conf.appPath,conf.PathPreviews)));
	//Path to user avatars
	app.use('/avatars',express.static(resolve(conf.appPath,conf.PathAvatars)));
	app.use('/admin', routerAdmin);	

	app.get('/', (req, res) => {
		var conf = getConfig();
			
		var view = 'public';
		if(conf.WebappMode === '0') {
			view = 'publicClosed';
		} else if (conf.WebappMode === '1') {
			view = 'publicLimited';
		}
		res.render(view, {'layout': 'publicHeader',
			'clientAdress'	:	'http://'+address(),
			'webappMode'	:	conf.WebappMode,
			'query'			:	JSON.stringify(req.query)
		});
	});
	routerAdmin.get('/', (req, res) => {
		//Get list of monitors to allow users to select one for the player
		graphics().then((data) => {
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
				'clientAdress'	:	'http://'+address(),
				'mdpAdmin'		:	conf.AdminPassword,
				'displays'		:	data.displays,
				'query'			:	JSON.stringify(req.query)
			});
		});		
	});			
			
	app.use((req, res) => {
		res.status(404);
		// respond with html page
		if (req.accepts('html')) {
			res.render('404', {url: req.url});
			return;
		}
		// default to plain-text. send()
		res.type('txt').send('Not found');
	});
	app.listen(port);
	logger.debug(`[Webapp] Webapp is READY and listens on port ${port}`);   			
}
		

		