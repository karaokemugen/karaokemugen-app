const express = require('express');
const expressValidator = require('express-validator');
const logger = require('../_common/utils/logger.js');
const bodyParser = require('body-parser');
const S = require('string');
const basicAuth = require('express-basic-auth');
const extend = require('extend');

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
            req.check({
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
            
            req.check({
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
                    module.exports.onPlaylistSingleEdit(req.params.pl_id,req.body)
                    .then(function(){                            
                            res.json('Playlist '+req.params.pl_id+' updated');
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
        .delete(function(req,res){
            var playlist_id = req.params.pl_id;
            req.checkBody({
                'newplaylist_id': {
                    in: 'body',
                    optional: true,
                    isInt: true,
                }           
            });
            
            req.getValidationResult().then(function(result)
            {
                if (result.isEmpty())
                {
                    if (req.body.newplaylist_id != undefined) req.sanitize('newplaylist_id').toInt();
                    module.exports.onPlaylistSingleDelete(playlist_id,req.body.newplaylist_id)
                    .then(function(){
                        res.statusCode = 201;
                        if (req.body.newplaylist_id === undefined) {                            
                            var newplaylist = ', switched flags to playlist '+newplaylist_id;
                        } else {
                            var newplaylist = '';
                        }
                        res.json('Deleted '+playlist_id+newplaylist);
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
            });            
        })
        
        routerAdmin.route('/playlists/:pl_id([0-9]+)/karas')
        .get(function(req,res){
            //Access :pl_id by req.params.pl_id 
            // This get route gets infos from a playlist
            var playlist_id = req.params.pl_id;
            var lang = req.query.lang;
            module.exports.onPlaylistSingleContents(playlist_id,lang)
            .then(function(playlist){
                if (playlist == []) res.statusCode = 404;
                res.json(playlist);
            })
            .catch(function(err){
                res.statusCode = 500;
                res.json(err);
            })
        })
        .post(function(req,res){
            //add a kara to a playlist
            var playlist_id = req.params.pl_id;
            req.checkBody({
                'requestedby': {
                    in: 'body',
                    notEmpty: true,                    
                },
                'kara_id': {
                    in: 'body',
                    notEmpty: true,
                    isInt: true,
                },
                'pos': {
                    in: 'body',
                    optional: true,
                    isInt: true,
                }           
            });
            
            req.getValidationResult().then(function(result)
            {
                if (result.isEmpty())
                {
                    req.sanitize('requestedby').trim();
                    req.sanitize('requestedby').unescape();
                    req.sanitize('playlist_id').toInt();
                    if (req.body.pos != undefined) req.sanitize('pos').toInt();
                    module.exports.onKaraAddToPlaylist(req.body.kara_id,req.body.requestedby,playlist_id,req.body.pos)
                    .then(function(){
                        res.statusCode = 201;
                        if (req.body.pos === undefined) var pos = 'last';
                        res.json('Karaoke '+req.body.kara_id+' added by '+req.body.requestedby+' to playlist '+playlist_id+' at position '+pos);
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
            });    
        })
        
        routerAdmin.route('/playlists/:pl_id([0-9]+)/karas/:plc_id([0-9]+)')
        .put(function(req,res){
            //Update playlist's karaoke song
            //Params: position and flag_playing 
            //if flag_playing = 1 then flag_playing = 0 is set on all other songs from this PL 
            req.checkBody({
                'pos': {
                    in: 'body',
                    optional: true,                    
                    isInt: true,
                },
                'flag_playing': {
                    in: 'body',
                    notEmpty: true,
                    isBoolean: {
                        errorMessage: 'Invalid playing flag (must be boolean)'
                    }  
                },                
            });   

            req.getValidationResult().then(function(result)
            {
                if (result.isEmpty())
                {
                    req.sanitize('flag_playing').toBoolean();
                    if (req.body.pos != undefined) req.sanitize('pos').toInt();
                    module.exports.onPlaylistSingleKaraEdit(req.params.plc_id,req.body.pos,req.body.flag_playing)
                    .then(function(){
                        res.json('PLC '+req.params.plc_id+' edited in playlist '+req.params.pl_id);
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
            });        
        })
        .delete(function(req,res){
            // Delete kara from playlist
            // Deletion is through playlist content's ID.
            // There is actually no need for a playlist number to be used at this moment.
            var playlistcontent_id = req.params.plc_id;
                        
            module.exports.onPlaylistSingleKaraDelete(playlistcontent_id)
            .then(function(){
                res.json('Deleted PLCID '+playlistcontent_id);
            })
            .catch(function(err){
                res.statusCode = 500;
                res.json(err);
            })         
        })
        
        routerAdmin.route('/settings')
        .get(function(req,res){
            res.json(module.exports.SETTINGS);            
        })
        .put(function(req,res){
            //Update settings
            req.checkBody({
                'AdminPassword': {
                    in: 'body',
                    notEmpty: true                    
                },
                'EngineAllowNicknameChange': {
                    in: 'body',
                    notEmpty: true,
                    isBoolean: true,
                },                
                'EngineDisplayNickname': {
                    in: 'body',
                    notEmpty: true,
                    isBoolean: true,
                },
                'EngineSongsPerPerson': {
                    in: 'body',
                    notEmpty: true,
                    isInt: true,
                },             
                'PlayerFullscreen': {
                    in: 'body',
                    notEmpty: true,
                    isBoolean: true,
                },         
                'PlayerNoBar': {
                    in: 'body',
                    notEmpty: true,
                    isBoolean: true,
                },
                'PlayerNoHud': {
                    in: 'body',
                    notEmpty: true,
                    isBoolean: true,
                },    
                'PlayerScreen': {
                    in: 'body',
                    notEmpty: true,
                    isInt: true,
                },       
                'PlayerStayOnTop': {
                    in: 'body',
                    notEmpty: true,
                    isBoolean: true,
                },                                                                               
            });   

            req.getValidationResult().then(function(result)
            {
                if (result.isEmpty())
                {
                    req.sanitize('AllowNicknameChange').toBoolean();
                    req.sanitize('DisplayNickname').toBoolean();
                    req.sanitize('Fullscreen').toBoolean();
                    req.sanitize('NoBar').toBoolean();
                    req.sanitize('NoHud').toBoolean();
                    req.sanitize('AlwaysOnTop').toBoolean();
                    req.sanitize('Screen').toInt();
                    req.sanitize('SongsPerPerson').toInt();

                    var SETTINGS = req.body;
                    module.exports.onSettingsUpdate(SETTINGS)                       
                    .then(function(){
                        res.json('Settings updated');
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
            }); 
        })

        routerAdmin.route('/whitelist')
        .get(function(req,res){
            var lang = req.query.lang;        
            var filter = req.query.filter;
            module.exports.onWhitelist(filter,lang)
            .then(function(karas){
                res.json(karas);
            })
            .catch(function(err){                
                res.statusCode = 500;
                res.json(err);
            })
        })
        .post(function(req,res){
            // Add Kara to the playlist currently used depending on mode
            req.check({
                'id_kara': {
                    in: 'body',
                    notEmpty: true,                    
                    isInt: true,
                },
                'reason': {
                    in: 'body',
                    notEmpty: true,
                }
            });
            
            req.getValidationResult().then(function(result)
            {
                if (result.isEmpty())
                {
                    req.sanitize('id_kara').toInt();
                    module.exports.onKaraAddToWhitelist(req.body.id_kara,req.body.reason)
                    .then(function(){
                        res.statusCode = 201;
                        res.json('Karaoke '+req.body.id_kara+' added to whitelist with reason \''+req.body.reason+'\'');
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
            });            
        })

        routerAdmin.route('/whitelist/:wl_id([0-9]+)')
        .delete(function(req,res){
            //Delete kara from whitelist
            // Deletion is through whitelist ID.            
            module.exports.onWhitelistSingleKaraDelete(req.params.wl_id)
            .then(function(){
                res.json('Deleted WLID '+req.params.wl_id);
            })
            .catch(function(err){
                res.statusCode = 500;
                res.json(err);
            })         
        })
        .put(function(req,res){
            req.check({
                'reason': {
                    in: 'body',
                    notEmpty: true,
                }
            });
            
            req.getValidationResult().then(function(result)
            {
                if (result.isEmpty())
                {                    
                    module.exports.onWhitelistSingleKaraEdit(req.params.wl_id,req.body.reason)
                    .then(function(){
                        res.json('Whitelist item '+req.params.wl_id+' edited whitelist reason \''+req.body.reason+'\'');
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
            });            
        })

        routerAdmin.route('/blacklist')
        .get(function(req,res){
            //Get list of blacklisted karas
            var lang = req.query.lang;        
            var filter = req.query.filter;
            module.exports.onBlacklist(filter,lang)
            .then(function(karas){
                res.json(karas);
            })
            .catch(function(err){                
                res.statusCode = 500;
                res.json(err);
            })
        })
        
        routerAdmin.route('/blacklist/criterias')
        .get(function(req,res){
            //Get list of blacklisted karas
            module.exports.onBlacklistCriterias()
            .then(function(blc){
                res.json(blc);
            })
            .catch(function(err){                
                res.statusCode = 500;
                res.json(err);
            })
        })
        .post(function(req,res){
            //Add blacklist criteria
            req.check({
                'blcriteria_type': {
                    in: 'body',
                    notEmpty: true,
                    isInt: true,
                },
                'blcriteria_value': {
                    in: 'body',
                    notEmpty: true,                    
                }
            });
            
            req.getValidationResult().then(function(result)
            {
                if (result.isEmpty())
                {                    
                    module.exports.onBlacklistCriteriaAdd(req.body.blcriteria_type,req.body.blcriteria_value)
                    .then(function(){
                        res.json('Blacklist criteria type '+req.body.blcriteria_type+' with value \''+req.body.blcriteria_value+'\' added');
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
            }); 
        })

        routerAdmin.route('/blacklist/criterias/:blc_id([0-9]+)')
        .delete(function(req,res){
                        
            module.exports.onBlacklistCriteriaDelete(req.params.blc_id)
            .then(function(){
                res.json('Deleted BLCID '+req.params.blc_id);
            })
            .catch(function(err){
                res.statusCode = 500;
                res.json(err);
            })         
        })
        .put(function(req,res){
            //Update BLC
            req.check({
                'blcriteria_type': {
                    in: 'body',
                    notEmpty: true,
                    isInt: true,
                },
                'blcriteria_value': {
                    in: 'body',
                    notEmpty: true,                    
                }
            });
            
            req.getValidationResult().then(function(result)
            {
                if (result.isEmpty())
                {                    
                    module.exports.onBlacklistCriteriaEdit(req.params.blc_id,req.body.blcriteria_type,req.body.blcriteria_value)
                    .then(function(){
                        res.json('Blacklist criteria '+req.params.blc_id+' type '+req.body.blcriteria_type+' with value \''+req.body.blcriteria_value+'\' edited');
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
            });
        })

        routerAdmin.route('/player')
        .put(function(req,res){
            // Update status of player (play/pause/stopNow/stopNext)
        })

        routerAdmin.route('/playlists/:pl_id([0-9]+)/portable')
        .get(function(req,res){
            // Returns the playlist and its contents in an exportable format (to save on disk)
        })
        .post(function(req,res){
            // Imports a playlist and its contents in an importable format (posted as a file)
        })

        routerAdmin.route('/playlists/:pl_id([0-9]+)/shuffle')
        .put(function(req,res){
            // Shuffles the playlist selected.
        })        

        // Public routes
        
        routerPublic.route('/settings')
        .get(function(req,res){
            //We don't want to return all settings.
            var settings = {};
            for (var key in module.exports.SETTINGS) {
                if (module.exports.SETTINGS.hasOwnProperty(key)) {
                    
                    if (!S(key).startsWith('Path') &&
                        !S(key).startsWith('Admin') &&
                        !S(key).startsWith('Bin')
                       ) {
                           settings[key] = module.exports.SETTINGS[key];
                       }
                }
            }
            res.json(settings);            
        })        
        routerPublic.route('/stats')
        .get(function(req,res){
            // Get stats from the database
        })

        routerPublic.route('/whitelist')
        .get(function(req,res){
            //Returns whitelist IF the settings allow public to see it
        })
        
        routerPublic.route('/blacklist')
        .get(function(req,res){
            //Get list of blacklisted karas IF the settings allow public to see it
        })
        
        routerPublic.route('/blacklist/criterias')
        .get(function(req,res){
            //Get list of blacklist criterias IF the settings allow public to see it
        })

        routerPublic.route('/player')
        .get(function(req,res){
            // Get player status
            // What's playing, time in seconds, duration of song
        })
        routerPublic.route('/karas')
        .get(function(req,res){
            // if the query has a &filter=xxx
            // then the playlist returned gets filtered with the text.
            var filter = req.query.filter;    
            var lang = req.query.lang;        
            module.exports.onKaras(filter,lang)
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
            var lang = req.query.lang;
            module.exports.onKaraSingle(id_kara,lang).then(function(kara){
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
            req.check({
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
            var lang = req.query.lang;
            module.exports.onPlaylistCurrentContents(lang)
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
            module.exports.onPlaylistPublicInfo()
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
            var lang = req.query.lang;
            module.exports.onPlaylistPublicContents(lang)
            .then(function(playlist){
                res.json(playlist);
            })            
            .catch(function(err){
                res.statusCode = 500;
                res.json(err);
            })
        })

        routerPublic.route('/playlists/')
        .get(function(req,res){
            // Get list of playlists, only return the visible ones            
        })
        routerPublic.route('/playlists/:pl_id')
        .get(function(req,res){
            // Get playlist, only if visible
        })
        routerPublic.route('/playlists/:pl_id/karas')
        .get(function(req,res){
            // Get playlist contents, only if visible
        })

        // Add headers
		app.use(function (req, res, next) {
		
			// Website you wish to allow to connect
			res.setHeader('Access-Control-Allow-Origin', '*');

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
    onPlaylistSingleDelete:function(){},
    onPlaylistSingleEdit:function(){},
    onPlaylistSingleContents:function(){},
    onPlaylistSingleKaraDelete:function(){},
    onPlaylistSingleKaraEdit:function(){},
    onWhitelistSingleKaraDelete:function(){},
    onWhitelistSingleKaraEdit:function(){},
    onPlaylistCurrentInfo:function(){},
    onPlaylistCurrentContents:function(){},
    onPlaylistPublicInfo:function(){},
    onPlaylistPublicContents:function(){},
    onKaraAddToModePlaylist:function(){},
    onKaraAddToPlaylist:function(){},
    onKaraAddToWhitelist:function(){},
    onSettingsUpdate:function(){},
    onWhitelist:function(){},
    onBlacklist:function(){},
    onBlacklistCriterias:function(){},
    onBlacklistCriteriaAdd:function(){},
    onBlacklistCriteriaDelete:function(){},
    onBlacklistCriteriaEdit:function(){},
}