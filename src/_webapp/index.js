const http = require('http');
const path = require('path');
const express = require('express');
const exphbs = require('express-handlebars');

const logger = require('../_common/utils/logger.js');

module.exports = {
    SYSPATH:null,
    SETTINGS:null,
    LISTEN:null,
    DB_INTERFACE:null,
    _server:null,
    _engine_states:{},
    _local_states:{},

    init : function(){
        if(module.exports.SYSPATH === null)
        {
            logger.error(__('SYSPATH_NULL'));
            process.exit();
        }
        if(module.exports.SETTINGS === null)
        {
            logger.error(__('SETTINGS_NULL'));
            process.exit();
        }
        if(module.exports.LISTEN === null)
        {
            logger.error(__('LISTEN_NULL'));
            process.exit();
        }
        if(module.exports.DB_INTERFACE === null)
        {
            logger.error(__('DBI_NULL'));
            process.exit();
        }

        // Création d'un server http pour diffuser l'appli web du launcher
        if(module.exports._server==null)
        {
            module.exports._server = express();
            module.exports._server.engine('hbs', exphbs({layoutsDir: path.join(__dirname, 'views/layouts/'), extname: '.hbs'}));
            module.exports._server.set('view engine', 'hbs');
            module.exports._server.set('views', path.join(__dirname, 'views/'));
			module.exports._server.use(express.static(__dirname + '/'));
			
            module.exports._server.get('/', function (req, res) {
                res.render('home', {"layout": "main"});
            });
            module.exports._server.get('/coucou', function (req, res) {
                res.render('home', {"layout": "test"});
            });
			
            module.exports._server.get('/admin', function (req, res) {
                res.render('admin', {"layout": "adminHeader", "mdpAdminHash" : Buffer(":shami").toString('base64'), "trad" : 
					JSON.stringify({"TYPE_AMV": __('TYPE_AMV'),
					"TYPE_AMV_SHORT": __('TYPE_AMV_SHORT'),
					"TYPE_INSERTSONG": __('TYPE_INSERTSONG'),
					"TYPE_INSERTSONG_SHORT": __('TYPE_INSERTSONG_SHORT'),
					"TYPE_MUSIC": __('TYPE_MUSIC'),
					"TYPE_MUSIC_SHORT": __('TYPE_MUSIC_SHORT'),
					"TYPE_LIVE": __('TYPE_LIVE'),
					"TYPE_LIVE_SHORT": __('TYPE_LIVE_SHORT'),
					"TYPE_CM": __('TYPE_CM'),
					"TYPE_CM_SHORT": __('TYPE_CM_SHORT'),
					"TYPE_ED": __('TYPE_ED'),
					"TYPE_ED_SHORT": __('TYPE_ED_SHORT'),
					"TYPE_OP": __('TYPE_OP'),
					"TYPE_OP_SHORT": __('TYPE_OP_SHORT'),
					"TYPE_TRAILER": __('TYPE_TRAILER'),
					"TYPE_TRAILER_SHORT": __('TYPE_TRAILER_SHORT'),
					"TYPE_OTHER": __('TYPE_OTHER'),
					"TYPE_OTHER_SHORT": __('TYPE_OTHER_SHORT'),
					"TYPE_PV": __('TYPE_PV')})	});
            });	
			
            module.exports._server.use(function (req, res, next) {
                res.status(404);

                // respond with html page
                if (req.accepts('html')) {
                    res.render('404', {url: req.url});
                    return;
                }

                // default to plain-text. send()
                res.type('txt').send('Not found');
            });

            module.exports._server.listen(module.exports.LISTEN);

            logger.info(__('WEBAPP_LISTENING'),module.exports.LISTEN);
            logger.info(__('WEBAPP_READY'));

            // trigger test event (call engine deffered method and log response)
            //console.log(module.exports.onTest());
        }
        else
        {
            logger.error(__('WEBAPP_ALREADY_STARTED'));
        }
    },

    // ---------------------------------------------------------------------------
    // Evenements à référencer par le composant  parent
    // ---------------------------------------------------------------------------

    onTest:function(){
        // événement de test
        logger.log('warning','onTest not set');
    },
}
