const express = require('express');
const expressValidator = require('express-validator');
const logger = require('../_common/utils/logger.js');
const bodyParser = require('body-parser');
const S = require('string');
const basicAuth = require('express-basic-auth');
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
        app.use(expressValidator());

        var routerPublic = express.Router();
        var routerAdmin = express.Router();

        app.listen(module.exports.LISTEN, function () {
            logger.info(__('API_SERVER_LISTEN',module.exports.LISTEN));
        });

        routerAdmin.use(basicAuth({ authorizer: AdminPasswordSetting }))
        routerAdmin.use(function(req,res,next) {
            next();
        })
        function AdminPasswordSetting(username, password){
            return password === 'shami';
        }

        routerPublic.use(function(req, res, next) {
            // do logging
            //logger.info('API_LOG',req)
            next(); // make sure we go to the next routes and don't stop here            
        });

        routerPublic.get('/', function (req, res) {
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

        // Validators & sanitizers : 
        // https://github.com/chriso/validator.js

        // Reminder of HTTP codes:
        // 200 : OK
        // 201 : CREATED
        // 404 : NOT FOUND
        // 400 : BAD REQUEST
        // 500 : INTERNAL ERROR
        // 403 : FORBIDDEN

        // In case of error, return the correct code an object 'error'

        // Admin routes
        routerAdmin.route('/playlists')
        .get(function(req,res){
            // Get list of playlists
            module.exports.onPlaylists()
            .then(function(playlists){
                res.json(playlists);
            })
            .catch(function(err){
                res.statusCode = 500;
                res.json(err);
            })
        })
        .post(function(req,res){
            // req.body = posted object.

            // Add playlist
            req.checkBody({
                'name': {
                    in: 'body',
                    notEmpty: true,                    
                },
                'flag_visible': {
                    in: 'body',
                    notEmpty: true,
                    isBoolean: {
                        errorMessage: 'Invalid visible flag (must be boolean)'
                    }                    
                },
                'flag_public': {
                    in: 'body',
                    notEmpty: true,
                    isBoolean: {
                        errorMessage: 'Invalid public flag (must be boolean)'
                    }                    
                },
                'flag_current': {
                    in: 'body',
                    notEmpty: true,
                    isBoolean: {
                        errorMessage: 'Invalid current flag (must be boolean)'
                    }                    
                },
            });
            
            req.getValidationResult().then(function(result){
                if (result.isEmpty())
                {
                    // No errors detected
                    req.sanitize('name').trim();
                    req.sanitize('name').unescape();
                    req.sanitize('flag_visible').toBoolean();
                    req.sanitize('flag_public').toBoolean();
                    req.sanitize('flag_current').toBoolean();

                    //Now we add playlist
                    module.exports.onPlaylistCreate(req.body)
                    .then(function(new_playlist){
                            res.statusCode = 201;
                            res.json(new_playlist);
                    })
                    .catch(function(err){
                            res.statusCode = 500;
                            res.json(err);
                    })
                } else {
                    // Errors detected
                    // Sending BAD REQUEST HTTP code and error object.
                    res.statusCode = 400;
                    res.json(result.mapped());
                }
            })
        })
        routerAdmin.route('/playlists/:pl_id([0-9]+)')
        .get(function(req,res){
            //Access :pl_id by req.params.pl_id 
            // This get route gets infos from a playlist
            var playlist_id = req.params.pl_id;
            
            module.exports.onPlaylistSingleInfo(playlist_id).then(function(playlist){
                if (playlist == []) res.statusCode = 404;
                res.json(playlist);
            })
            .catch(function(err){
                res.statusCode = 500;
                res.json(err);
            })
        })
        .put(function(req,res){
            // Update playlist info
        })
        .delete(function(req,res){
            // Delete playlist
        })
        
        routerAdmin.route('/playlists/:pl_id([0-9]+)/karas')
        .get(function(req,res){
            //Access :pl_id by req.params.pl_id 
            // This get route gets infos from a playlist
            var playlist_id = req.params.pl_id;
            
            module.exports.onPlaylistSingleContents(playlist_id)
            .then(function(playlist){
                if (playlist == []) res.statusCode = 404;
                res.json(playlist);
            })
            .catch(function(err){
                res.statusCode = 500;
                res.json(err);
            })
        })

        // Public routes
        routerPublic.route('/karas')
        .get(function(req,res){
            // if the query has a &filter=xxx
            // then the playlist returned gets filtered with the text.
            var filter = req.query.filter;            
            module.exports.onKaras(filter)
            .then(function(karas){
                res.json(karas);
            })
            .catch(function(err){
                res.statusCode = 500;
                res.json(err);
            })
        })

        
        routerPublic.route('/karas/:id_kara([0-9]+)')
        .get(function(req,res){
            var id_kara = req.params.id_kara;
            
            module.exports.onKaraSingle(id_kara).then(function(kara){
                if (kara == []) res.statusCode = 404;
                res.json(kara);
            })
            .catch(function(err){
                res.statusCode = 500;
                res.json(err);
            })
        })
        .post(function(req,res){
            // Add Kara to the playlist currently used depending on mode
            var id_kara = req.params.id_kara;
            req.checkBody({
                'requestedby': {
                    in: 'body',
                    notEmpty: true,                    
                }                
            });
            
            req.getValidationResult().then(function(result)
            {
                if (result.isEmpty())
                {
                    req.sanitize('requestedby').trim();
                    req.sanitize('requestedby').unescape();
                    module.exports.onKaraAddToModePlaylist(id_kara,req.body.requestedby)
                    .then(function(){
                        res.statusCode = 201;
                        res.json('Karaoke '+id_kara+' added by '+req.body.requestedby);
                    })
                    .catch(function(err){
                        console.log(err);
                        res.statusCode = 500;
                        res.json(err);
                    })
                } else {
                    // Errors detected
                    // Sending BAD REQUEST HTTP code and error object.
                    res.statusCode = 400;
                    res.json(result.mapped());
                }
            });            
        })
            
        routerPublic.route('/playlists/current')
        .get(function(req,res){
            // Get current Playlist
            module.exports.onPlaylistCurrentInfo()
            .then(function(playlist){
                res.json(playlist);
            })            
            .catch(function(err){
                res.statusCode = 500;
                res.json(err);
            })
        })

        routerPublic.route('/playlists/current/karas')
        .get(function(req,res){
            // Get current Playlist
            module.exports.onPlaylistCurrentContents()
            .then(function(playlist){
                res.json(playlist);
            })            
            .catch(function(err){
                res.statusCode = 500;
                res.json(err);
            })
        })

        routerPublic.route('/playlists/public')
        .get(function(req,res){
            // Get current Playlist
            module.exports.onPlaylistCurrentInfo()
            .then(function(playlist){
                res.json(playlist);
            })            
            .catch(function(err){
                res.statusCode = 500;
                res.json(err);
            })
        })

        routerPublic.route('/playlists/public/karas')
        .get(function(req,res){
            // Get current Playlist
            module.exports.onPlaylistCurrentContents()
            .then(function(playlist){
                res.json(playlist);
            })            
            .catch(function(err){
                res.statusCode = 500;
                res.json(err);
            })
        })
        // Add headers
		app.use(function (req, res, next) {
		
			// Website you wish to allow to connect
			res.setHeader('Access-Control-Allow-Origin', 'http://localhost:1337');

			// Request methods you wish to allow
			res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');

			// Request headers you wish to allow
			res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Authorization, Accept, Key');

			// Set to true if you need the website to include cookies in the requests sent
			// to the API (e.g. in case you use sessions)
			// res.setHeader('Access-Control-Allow-Credentials', true);
			
			if (req.method === 'OPTIONS') {
				res.send(200);
			} else { 
				// Pass to next layer of middleware
				next();
			}
		});
		
        app.use('/api/v1/public', routerPublic);
        app.use('/api/v1/admin', routerAdmin);
        logger.info(__('API_SERVER_READY'));
        // Création d'un server http pour diffuser l'appli web du launcher
    },
    onTest:function(){
        // événement de test
        logger.log('warning','onTest not set');
    },
    onKaras:function(filter){},
    onKaraSingle:function(){},
    onPlaylists:function(){},
    onPlaylistCreate:function(){},
    onPlaylistSingleInfo:function(){},
    onPlaylistSingleContents:function(){},
    onPlaylistCurrentInfo:function(){},
    onPlaylistCurrentContents:function(){},
    onPlaylistPublicInfo:function(){},
    onPlaylistPublicContents:function(){},
    onKaraAddToModePlaylist:function(){},
}