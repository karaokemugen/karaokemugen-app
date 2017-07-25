const express = require('express');

const logger = require('../_common/utils/logger.js');
const bodyParser = require('body-parser');
        
module.exports = {
    SYSPATH:null,
    SETTINGS:null,
    LISTEN:null,
    DB_INTERFACE:null,
    _server:null,
    _engine_states:{},
    _local_states:{},
    init:function()
    {
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

        var app = express();
        app.use(bodyParser.urlencoded({ extended: true }));
        app.use(bodyParser.json());   
        var router = express.Router(); 

        app.listen(module.exports.LISTEN, function () {
            logger.info(__('API_SERVER_LISTEN',module.exports.LISTEN));
        });

        
        router.use(function(req, res, next) {
            // do logging
            //logger.info('API_LOG',req)
            next(); // make sure we go to the next routes and don't stop here
        });

        router.get('/', function (req, res) {
            res.send('Hello World!');
        });

        // Rules :
        // version of the API is decided in the path
        // Example : /v1/, /v2/, etc.
        // We output JSON only.
        // Endpoints :
        // karas
        // karas/xxxx
        // playlists
        // playlists/xxxx/karas
        // playlists/xxxx
        // playlists/public
        // playlists/current
        // series
        // series/xxxx
        // playlists/xxxx/filter
        // karas/filter        
        // blacklist
        // whitelist

        // Reminder of HTTP codes:
        // 200 : OK
        // 201 : CREATED
        // 404 : NOT FOUND
        // 400 : BAD REQUEST
        // 500 : INTERNAL ERROR
        // 403 : FORBIDDEN

        // In case of error, return the correct code an object 'error'

        router.route('/karas')
        .get(function(req,res){
            var karas = module.exports.onKaras();
            res.send(JSON.stringify(karas));
        })

        router.route('/playlists')
        .post(function(req,res){
            // L'objet posté arrive dans req.body.
            // Add playlist

        })
        .get(function(req,res){
            // Get list of playlists
            // Send response as json via res.json(object)
            // Set res.statusCode = 404 if not found
            // 
        })

        router.route('/playlists/:pl_id([0-9]+)')
        .get(function(req,res){
            //Access :pl_id by req.params.pl_id 
            // This get route gets infos from a playlist
        })
        .put(function(req,res){
            // Update playlist info
        })
        .post(function(req,res){
            // New Playlist
        })
        .delete(function(req,res){
            // Delete playlist
        })
        

        app.use('/api/v1', router);
        logger.info(__('API_SERVER_READY'));
        // Création d'un server http pour diffuser l'appli web du launcher
    },
    onTest:function(){
        // événement de test
        logger.log('warning','onTest not set');
    },
    onKaras:function(){
    
    }
}