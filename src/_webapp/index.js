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
            logger.error('SYSPATH is null');
            process.exit();
        }
        if(module.exports.SETTINGS === null)
        {
            logger.error('SETTINGS is null');
            process.exit();
        }
        if(module.exports.LISTEN === null)
        {
            logger.error('LISTEN is null');
            process.exit();
        }
        if(module.exports.DB_INTERFACE === null)
        {
            logger.error('DB_INTERFACE is null');
            process.exit();
        }

        // Création d'un server http pour diffuser l'appli web du launcher
        if(module.exports._server==null)
        {
            module.exports._server = express();
            module.exports._server.engine('hbs', exphbs({layoutsDir: path.join(__dirname, 'views/layouts/'), extname: '.hbs'}));
            module.exports._server.set('view engine', 'hbs');
            module.exports._server.set('views', path.join(__dirname, 'views/'));

            module.exports._server.get('/', function (req, res) {
                res.render('home', {"layout": "main"});
            });
            module.exports._server.get('/coucou', function (req, res) {
                res.render('home', {"layout": "test"});
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

            logger.info(`Webapp frontend started on port ${module.exports.LISTEN}`);

            // trigger test event (call engine deffered method and log response)
            //console.log(module.exports.onTest());
        }
        else
        {
            logger.error('Server already started.');
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
