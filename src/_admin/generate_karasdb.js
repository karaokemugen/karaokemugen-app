/*
Usage

var generator = require('generate_karasdb.js');
generator.SYSPATH = './'; // set the base path of toyunda app here
generator.run().then(function(response){
    // do whatever you want on script end
});
*/
const logger = require('../_common/utils/logger.js');
module.exports = {
    SYSPATH: null,
    SETTINGS: null,
    run: function() {
        module.exports.onLog('success', 'generate_karasdb :: Start');
        return new Promise(function(resolve, reject) {
            if (module.exports.SYSPATH == null) {
                module.exports.onLog('error', 'SYSPATH is not defined');
                process.exit();
            }
            var path = require('path');
            var sqlite3 = require('sqlite3').verbose();
            var fs = require("fs");
            var ini = require("ini");
            var timestamp = require("unix-timestamp");
            var probe = require('../_common/modules/node-ffprobe');
            var math = require('mathjs');
            var S = require('string');
            var moment = require('moment');
            const uuidV4 = require("uuid/v4");
            const async = require('async');            
            var csv = require('csv-string');
            const karasdir = path.join(module.exports.SYSPATH, module.exports.SETTINGS.Path.Karas);
            const videosdir = path.join(module.exports.SYSPATH, module.exports.SETTINGS.Path.Videos);
            const karas_dbfile = path.join(module.exports.SYSPATH, module.exports.SETTINGS.Path.DB, module.exports.SETTINGS.Path.DBKarasFile);
            const karas_userdbfile = path.join(module.exports.SYSPATH, module.exports.SETTINGS.Path.DB, module.exports.SETTINGS.Path.DBUserFile);
            const series_altnamesfile = path.join(module.exports.SYSPATH, module.exports.SETTINGS.Path.Altname);
            probe.FFPROBE_PATH = path.join(module.exports.SYSPATH, module.exports.SETTINGS.Binaries[module.exports.SETTINGS.os].BinProbe);
            const sqlCreateKarasDBfile = path.join(__dirname, '../_common/db/karas.sqlite3.sql');
            const sqlCreateKarasDBViewAllfile = path.join(__dirname, '../_common/db/view_all.view.sql');
            // Suppression de la bdd d'abord
            if (fs.existsSync(karas_dbfile)) {
                fs.unlinkSync(karas_dbfile);
            };

            var sqlInsertKaras = [];
            var sqlInsertSeries = [];
            var sqlInsertTags = [];
            var sqlInsertKarasTags = [];
            var sqlInsertKarasSeries = [];
            var sqlUpdateVideoLength = [];
            var sqlUpdateSeriesAltNames = [];
            var karas = [];
            var series = [];
            var tags = [];
            var karas_series = [];
            var karas_tags = [];
            var id_kara = 0;
            var date = new Date();
            moment.locale('fr');

            var db = new sqlite3.Database(karas_dbfile, function(err, rep) {
                if (err) {
                    module.exports.onLog('error', moment().format('LTS') + ' - Error opening karaoke database.');
                    process.exit();
                }
            });
            var userdb = new sqlite3.Database(karas_userdbfile, function(err, rep) {
                if (err) {
                    module.exports.onLog('error', moment().format('LTS') + ' - Error opening user database.');
                    process.exit();
                }
            });
            module.exports.onLog('success', moment().format('LTS') + ' - Karaoke database created.');

            // -------------------------------------------------------------------------------------------------------------
            // création des tables
            // -------------------------------------------------------------------------------------------------------------
            var sqlCreateKarasDB = fs.readFileSync(sqlCreateKarasDBfile, 'utf-8');
            db.exec(sqlCreateKarasDB, function(err, rep) {
                if (err) {
                    module.exports.onLog('error', 'Error create table');
                    module.exports.onLog('error', err);
                } else {
                    module.exports.onLog('success', moment().format('LTS') + ' - Tables created.');
                    // -------------------------------------------------------------------------------------------------------------
                    // Création des vues
                    // -------------------------------------------------------------------------------------------------------------
                    var sqlCreateKarasDBViewAll = fs.readFileSync(sqlCreateKarasDBViewAllfile, 'utf8');
                    db.exec(sqlCreateKarasDBViewAll, function(err, rep) {
                        if (err) {
                            module.exports.onLog('error', 'Error create view');
                            module.exports.onLog('error', err);
                            module.exports.onLog('error', sqlCreateKarasDBViewAll);
                        } else {
                            module.exports.onLog('success', moment().format('LTS') + ' - Views created.');
                            db.serialize(function() {

                                // -------------------------------------------------------------------------------------------------------------
                                // Et on s'occupe des données dans une transaction sérialisé (BULK mode)
                                // -------------------------------------------------------------------------------------------------------------

                                 db.run("begin transaction");

                                var karafiles = fs.readdirSync(karasdir);
                                module.exports.onLog('success', moment().format('LTS') + ' - Karaoke directory read.');

                                //D'abord analyser les .kara, ajouter l'UUID s'il n'y est pas, construire la table karas avec une seule transaction.
                                karafiles.forEach(function(kara) {
                                    addKara(kara);
                                });
                                module.exports.onLog('success', moment().format('LTS') + ' - We have ' + karas.length + ' karaoke songs');

                                //Un autre passage dans karas pour avoir la durée des vidéos, mais cette fois en série
                                var stmt_UpdateVideoLength = db.prepare("UPDATE kara SET videolength = $videolength WHERE PK_id_kara= $id ;");
                                id_kara = 0;
                                karas.forEach(function(kara) {
                                    id_kara++;
                                    getvideoduration(kara['videofile'], id_kara, function(err, videolength, id) {
                                        sqlUpdateVideoLength.push({
                                            $videolength:videolength,
                                            $id:id
                                        });
                                    });
                                });
                                module.exports.onLog('success', moment().format('LTS') + ' - Calculated videos duration.');

                                id_kara = 0;
                                karafiles.forEach(function(kara) {
                                    id_kara++;
                                    addTags(kara, id_kara);
                                });
                                module.exports.onLog('success', moment().format('LTS') + ' - We havre ' + tags.length + ' tags, ' + karas_tags.length + ' links');

                                id_kara = 0;
                                karafiles.forEach(function(kara) {
                                    id_kara++;
                                    addSeries(kara, id_kara);
                                });
                                module.exports.onLog('success', moment().format('LTS') + ' - We have ' + series.length + ' series, ' + karas_series.length + ' links');

                                // -------------------------------------------------------------------------------------------------------------
                                // Construction des requêtes SQL pour l'insertion des données
                                // -------------------------------------------------------------------------------------------------------------

                                var stmt_InsertKaras = db.prepare("INSERT INTO kara(PK_id_kara, kid, title, NORM_title, year, songorder, videofile, subfile, date_added, date_last_modified, rating, viewcount, gain ) VALUES(  $id_kara, $kara_KID, $kara_title, $titlenorm, $kara_year, $kara_songorder, $kara_videofile, $kara_subfile, $kara_dateadded, $kara_datemodif, $kara_rating, $kara_viewcount, $kara_gain);");
                                async.eachOf(karas, function(kara, id_kara, callback) {
                                    id_kara++;
                                    var titlenorm = S(kara['title']).latinise();
                                    sqlInsertKaras.push({
                                        $id_kara : id_kara,
                                        $kara_KID : kara['KID'],
                                        $kara_title : kara['title'],
                                        $titlenorm : titlenorm,
                                        $kara_year : kara['year'],
                                        $kara_songorder : kara['songorder'],
                                        $kara_videofile : kara['videofile'],
                                        $kara_subfile : kara['subfile'],
                                        $kara_dateadded : kara['dateadded'],
                                        $kara_datemodif : kara['datemodif'],
                                        $kara_rating : kara['rating'],
                                        $kara_viewcount : kara['viewcount'],
                                        $kara_gain : kara['gain'],
                                    });
                                    callback();
                                })

                                async.eachOf(series, function(serie, id_series, callback) {
                                    id_series++;
                                    var serienorm = S(serie).latinise();
                                    sqlInsertSeries += 'INSERT INTO series(PK_id_series,name,NORM_name) VALUES(' + id_series + ',"' + serie + '","' + serienorm + '");';
                                    callback();
                                })
                                async.eachOf(tags, function(tag, id_tag, callback) {
                                    id_tag++;
                                    tag = tag.split(',');
                                    var tagname = tag[0];
                                    var tagnamenorm = S(tagname).latinise();
                                    var tagtype = tag[1];
                                    sqlInsertTags += 'INSERT INTO tag(PK_id_tag,tagtype,name,NORM_name) VALUES(' + id_tag + ',' + tagtype + ',"' + tagname + '","' + tagnamenorm + '");';
                                    callback();
                                })
                                async.each(karas_tags, function(karatag, callback) {
                                    karatag = karatag.split(',');
                                    var id_tag = karatag[0];
                                    var id_kara = karatag[1];
                                    sqlInsertKarasTags += 'INSERT INTO kara_tag(FK_id_tag,FK_id_kara) VALUES(' + id_tag + ',' + id_kara + ');';
                                    callback();
                                })
                                async.each(karas_series, function(karaseries, callback) {
                                    karaseries = karaseries.split(',');
                                    var id_series = karaseries[0];
                                    var id_kara = karaseries[1];
                                    sqlInsertKarasSeries += 'INSERT INTO kara_series(FK_id_series,FK_id_kara) VALUES(' + id_series + ',' + id_kara + ');';
                                    callback();
                                })
                                //Traitement des altnames de séries
                                if (fs.existsSync(series_altnamesfile)) {
                                    var DoUpdateSeriesAltNames = true;
                                    series_altnamesfilecontent = fs.readFileSync(series_altnamesfile);
                                    csv.forEach(series_altnamesfilecontent.toString(), ':', function(serie, index) {
                                        var serie_name = serie[0];
                                        var serie_altnames = serie[1];
                                        if (!S(serie_altnames).isEmpty() || !S(serie_name).isEmpty()) {
                                            var serie_altnamesnorm = S(serie[1]).latinise();
                                            sqlUpdateSeriesAltNames += 'UPDATE series SET altname="' + serie_altnames + '",NORM_altname="' + serie_altnamesnorm + '" WHERE name="' + serie_name + '";';
                                        }
                                    })
                                    module.exports.onLog('success', moment().format('LTS') + ' - Found alternative series name file. Ready to populate series table.');
                                } else {
                                    var DoUpdateSeriesAltNames = false;
                                    module.exports.onLog('warning', moment().format('LTS') + ' - No alternative series name file found.');
                                }

                                // -------------------------------------------------------------------------------------------------------------
                                // Execution des requetes (RAW SQL ou STATEMENT selon le cas)
                                // -------------------------------------------------------------------------------------------------------------

                                sqlInsertKaras.forEach(function(kara){
                                    stmt_InsertKaras.run(kara);
                                });
                                module.exports.onLog('info', moment().format('LTS') + ' - Filled karaokes table.');
                                
                                sqlUpdateVideoLength.forEach(function(kara){
                                    stmt_UpdateVideoLength.run(kara);
                                });
                                module.exports.onLog('info', moment().format('LTS') + ' - Updated video durations.');
                                
                                db.exec(sqlInsertTags, function(err, rep) {
                                    if (err) {
                                        module.exports.onLog('error', 'Error filling tags');
                                        module.exports.onLog('error', err);
                                    } else {
                                        module.exports.onLog('success', moment().format('LTS') + ' - Filled tags table.');
                                    }
                                });
                                db.exec(sqlInsertKarasTags, function(err, rep) {
                                    if (err) {
                                        module.exports.onLog('error', 'Error filling kara_tag table');
                                        module.exports.onLog('error', err);
                                    } else {
                                        module.exports.onLog('success', moment().format('LTS') + ' - Linked karaokes to tags.');
                                    }
                                });
                                db.exec(sqlInsertSeries, function(err, rep) {
                                    if (err) {
                                        module.exports.onLog('error', 'Error filling series');
                                        module.exports.onLog('error', err);
                                    } else {
                                        module.exports.onLog('success', moment().format('LTS') + ' - Filled series table.');
                                    }
                                });
                                if (DoUpdateSeriesAltNames) {
                                    db.exec(sqlUpdateSeriesAltNames, function(err, rep) {
                                        if (err) {
                                            module.exports.onLog('error', 'Error updating alt names : '+err);                                          
                                        } else {
                                            module.exports.onLog('success', moment().format('LTS') + ' - Updated alternative names of series.');
                                        }
                                    });
                                }
                                db.exec(sqlInsertKarasSeries, function(err, rep) {
                                    if (err) {
                                        module.exports.onLog('error', 'Error filling kara_series');
                                        module.exports.onLog('error', err);
                                    } else {
                                        module.exports.onLog('success', moment().format('LTS') + ' - Linked karaokes to series.');                                        
                                        module.exports.onLog('success', moment().format('LTS') + ' - Successfully generated database.');
                                        module.exports.onLog('info', moment().format('LTS') + ' - Running integrity checks on user database with the newly generated data.');
                                        //
                                        // Running checks on user database
                                        // Now that we regenerated kara_ids 
                                        //
                                        
                                        run_userdb_integrity_checks()
                                        .then(function(){
                                            module.exports.onLog('success', moment().format('LTS') + ' - Completed integrity checks.');
                                        })
                                        .catch(function(err){
                                            module.exports.onLog('error', moment().format('LTS') + ' - Error during integrity checks : '+err);
                                        });

                                    }
                                });

                                db.run("commit");
                            });                            
                            db.close(function(){
                                userdb.close(function(){
                                    resolve();
                                })
                            });
                            

                        }
                    });
                }
            });

            /**
            * @function run_userdb_integrity_checks
            */
            function run_userdb_integrity_checks()
            {
                return new Promise(function(resolve,reject){
                // Get all karas from all_karas view
                // Get all karas in playlist_content, blacklist, rating, viewcount, whitelist
                // Parse karas in playlist_content, search for the KIDs in all_karas
                // If id_kara is different, write a UPDATE query.
                    var AllKaras = [];
                    var PlaylistKaras = [];
                    var WhitelistKaras = [];
                    var RatingKaras = [];
                    var ViewcountKaras = [];
                    var BlacklistKaras = [];

                    var sqlUpdateUserDB = "BEGIN TRANSACTION;"                    

                    var pGetAllKaras = new Promise((resolve,reject) => 
			        {
                        var sqlGetAllKaras = "SELECT PK_id_kara AS id_kara, kid FROM all_karas;";
			            db.all(sqlGetAllKaras,
				        function (err, playlist)
				        {
    					    if (err)
					        {
						        logger.error('Unable to get all karaokes : '+err);
						        reject(err);
					        } else {
                                AllKaras = playlist;
						        resolve();
                            }
					    })				    
                    });
                    var pGetPlaylistKaras = new Promise((resolve,reject) => 
			        {
                        var sqlGetPlaylistKaras = "SELECT fk_id_kara AS id_kara, kid FROM playlist_content;";
			            userdb.all(sqlGetPlaylistKaras,
				        function (err, playlist)
				        {
    					    if (err)
					        {
						        logger.error('Unable to get Playlist karaokes : '+err);
						        reject(err);
					        } else {
                                if (playlist) {
                                    PlaylistKaras = playlist;
						            resolve();    
                                } else {
                                    PlaylistKaras = [];
                                    resolve();
                                }
					        }
				        })  
                    });
                    var pGetWhitelistKaras = new Promise((resolve,reject) => 
			        {
                        var sqlGetWhitelistKaras = "SELECT fk_id_kara AS id_kara, kid FROM whitelist;";
			            userdb.all(sqlGetWhitelistKaras,
				        function (err, playlist)
				        {
    					    if (err)
					        {
						        logger.error('Unable to get whitelist karaokes : '+err);
						        reject(err);
					        } else {
                                if (playlist) {
                                    WhitelistKaras = playlist;
						            resolve();    
                                } else {
                                    WhitelistKaras = [];
                                    resolve();
                                }
					    }
				        })  
                    });
                    var pGetBlacklistKaras = new Promise((resolve,reject) => 
			        {
                        var sqlGetBlacklistKaras = "SELECT fk_id_kara AS id_kara, kid FROM blacklist;";
			            userdb.all(sqlGetBlacklistKaras,
				        function (err, playlist)
				        {
    					    if (err)
					        {
						        logger.error('Unable to get blacklist karaokes : '+err);
						        reject(err);
					        } else {
                                if (playlist) {
                                    BlacklistKaras = playlist;
						            resolve();    
                                } else {
                                    BlacklistKaras = [];
                                    resolve();
                                }
					        }
				        })  
                    });	
                    var pGetRatingKaras = new Promise((resolve,reject) => 
			        {
                        var sqlGetRatingKaras = "SELECT fk_id_kara AS id_kara, kid FROM rating;";
			            userdb.all(sqlGetRatingKaras,
				        function (err, playlist)
				        {
    					    if (err)
					        {
						        logger.error('Unable to get rated karaokes : '+err);
						        reject(err);
					        } else {
                                if (playlist) {
                                    RatingKaras = playlist;
						            resolve();    
                                } else {
                                    RatingKaras = [];
                                    resolve();
                                }
					        }
				        })  
                    });
                    var pGetViewcountKaras = new Promise((resolve,reject) => 
			        {
                        var sqlGetViewcountKaras = "SELECT fk_id_kara AS id_kara, kid FROM viewcount;";
			            userdb.all(sqlGetViewcountKaras,
				        function (err, playlist)
				        {
    					    if (err)
					        {
						        logger.error('Unable to get all karaokes : '+err);
						        reject(err);
					        } else {
                                if (playlist) {
                                    WhitelistKaras = playlist;
						            resolve();    
                                } else {
                                    WhitelistKaras = [];
                                    resolve();
                                }
					        }
				        })  
                    });

                    Promise.all([pGetViewcountKaras,pGetRatingKaras,pGetWhitelistKaras,pGetBlacklistKaras,pGetPlaylistKaras,pGetAllKaras])
			        .then(function()
			        {
				        // We've got all of our lists, let's compare !
                        var KaraFound = false;
                        var UpdateNeeded = false;
                        if (WhitelistKaras != []) {
                            WhitelistKaras.forEach(function(WLKara){
                                KaraFound = false;                            
                                AllKaras.forEach(function(Kara){
                                    if (Kara.kid == WLKara.kid){
                                        // Found a matching KID, checking if id_karas are the same
                                        if (Kara.id_kara != WLKara.id_kara){
                                            sqlUpdateUserDB += "UPDATE whitelist SET fk_id_kara = "+Kara.id_kara+" WHERE kid = '"+WLKara.kid+"';";
                                            UpdateNeeded = true;
                                        }
                                        KaraFound = true;
                                    }
                                })
                                //If No Karaoke with this KID was found in the AllKaras table, delete the KID
                                if (!KaraFound) {
                                    sqlUpdateUserDB += "DELETE FROM whitelist WHERE kid = '"+WLKara.kid+"';";
                                    module.exports.onLog('warn', "KID "+WLKara.kid+" doesn't exist anymore, removed from whitelists.");
                                    UpdateNeeded = true;
                                }
                            })
                        }
                        
                        if (BlacklistKaras != []) {
                            
                            BlacklistKaras.forEach(function(BLKara){
                                KaraFound = false;
                                AllKaras.forEach(function(Kara){
                                    if (Kara.kid == BLKara.kid){
                                        // Found a matching KID, checking if id_karas are the same
                                        if (Kara.id_kara != BLKara.id_kara){
                                            sqlUpdateUserDB += "UPDATE blacklist SET fk_id_kara = "+Kara.id_kara+" WHERE kid = '"+BLKara.kid+"';";
                                            UpdateNeeded = true;
                                        }
                                        KaraFound = true;
                                    }
                                })
                                //If No Karaoke with this KID was found in the AllKaras table, delete the KID
                                if (!KaraFound) {
                                    sqlUpdateUserDB += "DELETE FROM blacklist WHERE kid = '"+BLKara.kid+"';";
                                    module.exports.onLog('warn', "KID "+BLKara.kid+" doesn't exist anymore, removed from blacklists.");
                                    UpdateNeeded = true;
                                }
                            })
                        }
                        if (RatingKaras != []) {
                            
                            RatingKaras.forEach(function(RKara){
                                KaraFound = false;
                                AllKaras.forEach(function(Kara){
                                    if (Kara.kid == RKara.kid){
                                        // Found a matching KID, checking if id_karas are the same
                                        if (Kara.id_kara != RKara.id_kara){
                                            sqlUpdateUserDB += "UPDATE rating SET fk_id_kara = "+Kara.id_kara+" WHERE kid = '"+RKara.kid+"';";
                                            UpdateNeeded = true;
                                        }
                                        KaraFound = true;
                                    }
                                })
                                //If No Karaoke with this KID was found in the AllKaras table, delete the KID
                                if (!KaraFound) {
                                    sqlUpdateUserDB += "DELETE FROM rating WHERE kid = '"+RKara.kid+"';";
                                    module.exports.onLog('warn', "KID "+RKara.kid+" doesn't exist anymore, removed from ratings.");
                                    UpdateNeeded = true;
                                }
                            })
                        }
                        if (ViewcountKaras != []) {
                            
                            ViewcountKaras.forEach(function(VKara){
                                KaraFound = false;
                                AllKaras.forEach(function(Kara){
                                    if (Kara.kid == VKara.kid){
                                        // Found a matching KID, checking if id_karas are the same
                                        if (Kara.id_kara != VKara.id_kara){
                                            sqlUpdateUserDB += "UPDATE viewcount SET fk_id_kara = "+Kara.id_kara+" WHERE kid = '"+VKara.kid+"';";
                                            UpdateNeeded = true;
                                        }
                                        KaraFound = true;
                                    }
                                })
                                //If No Karaoke with this KID was found in the AllKaras table, delete the KID
                                if (!KaraFound) {
                                    sqlUpdateUserDB += "DELETE FROM viewcount WHERE kid = '"+VKara.kid+"';";
                                    module.exports.onLog('warn', "KID "+VKara.kid+" doesn't exist anymore, removed from viewcounts.");
                                    UpdateNeeded = true;
                                }
                            })
                        }
                        
                        if (PlaylistKaras != []) {
                        
                            
                            PlaylistKaras.forEach(function(PLKara){
                                KaraFound = false;
                                
                                AllKaras.forEach(function(Kara){                                    
                                    if (Kara.kid == PLKara.kid){
                                        
                                        // Found a matching KID, checking if id_karas are the same
                                        if (Kara.id_kara != PLKara.id_kara){
                                            console.log('Entered 5');
                                            sqlUpdateUserDB += "UPDATE playlist_content SET fk_id_kara = "+Kara.id_kara+" WHERE kid = '"+PLKara.kid+"';";
                                            UpdateNeeded = true;
                                        }
                                        KaraFound = true;
                                    }
                                })
                                //If No Karaoke with this KID was found in the AllKaras table, delete the KID
                                if (!KaraFound) {
                                    
                                    sqlUpdateUserDB += "DELETE FROM playlist_content WHERE kid = '"+PLKara.kid+"';";
                                    module.exports.onLog('warn', "KID "+PLKara.kid+" doesn't exist anymore, removed from playlists.");
                                    UpdateNeeded = true;
                                }
                            })                            
                        }
                        if (UpdateNeeded)
                        {
                            sqlUpdateUserDB += "COMMIT;"                        
                            userdb.exec(sqlUpdateUserDB, function(err, rep) {
                                if (err) {
                                    module.exports.onLog('error', 'Error updating user database after integrity checks : '+err)                                             
                                } else {
                                    module.exports.onLog('success', moment().format('LTS') + ' - Updated user database.');
                                    resolve();
                                }
                            });
                        } else {
                            module.exports.onLog('success', moment().format('LTS') + ' - No update needed to user database.');
                            resolve();
                        }
                        
                        
			        })
			        .catch(function(err)
			        {
				        reject(err);
        			})


                });
            }
            function getvideoduration(videofile, id_kara, callback) {
                var videolength = 0;
                if (fs.existsSync(videosdir + '/' + videofile)) {
                    probe(videosdir + '/' + videofile, function(err, videodata) {
                        if (err) {
                            module.exports.onLog('error', moment().format('LTS') + ' - [' + videofile + '] Unable to probe video file : ' + err);
                            callback(err, videolength, id_kara);
                        } else {
                            videolength = math.round(videodata.format.duration);
                            callback(null, videolength, id_kara);
                        }
                    });
                } else {
                    module.exports.onLog('warning', moment().format('LTS') + ' - Video file ' + videofile + ' not found, setting duration to 0.')
                }
            }

            function addSeries(karafile, id_kara) {
                var karadata = ini.parse(fs.readFileSync(karasdir + '/' + karafile, 'utf-8'));
                var karaWOExtension = S(karafile).chompRight('.kara');
                var karaInfos = karaWOExtension.split(' - ');
                var karaType = karaInfos[2];
                var serieslist = [];
                if (S(karadata.series).isEmpty()) {
                    if (karaType == 'LIVE' || karaType == 'MV') {
                        // Ne rien faire en fait
                    } else {
                        serieslist.push(karaInfos[1]);
                    }
                } else {
                    serieslist = karadata.series.split(',');
                }
                async.each(serieslist, function(serie, callback) {
                    serie = S(serie).trimLeft().s;
                    if (series.indexOf(serie) == -1) {
                        series.push(serie);
                    }
                    // On récupère le nouvel index
                    var seriesIDX = series.indexOf(serie);
                    seriesIDX++;
                    karas_series.push(seriesIDX + ',' + id_kara);
                    callback();
                });
            }

            function addTags(karafile, id_kara) {
                var karadata = ini.parse(fs.readFileSync(karasdir + '/' + karafile, 'utf-8'));
                var karaWOExtension = S(karafile).chompRight('.kara');
                var karaInfos = karaWOExtension.split(' - ');
                var karaSerie = karaInfos[1];
                var karaTitle = karaInfos[3];
                var karaType = karaInfos[2];
                var taglist = [];
                //On remplit la taglist, c'est parti.
                if (S(karaSerie).contains(' OAV') || S(karaSerie).contains(' OVA') || S(karaType).contains('OAV')) {
                    if (taglist.indexOf('TAG_OVA,7') == -1) {
                        taglist.push('TAG_OVA,2');
                    }
                }
                if (karaType == 'LIVE' || karaType == 'MV') {
                    //Ajouter les artistes à la place de la série
                    var singers = karaSerie.split(',');
                    singers.forEach(function(singer) {
                        var tag = S(singer).trimLeft().s;
                        if (taglist.indexOf(tag + ',2') == -1) {
                            taglist.push(tag + ',2');
                        }
                    });
                }
                if (!S(karadata.singer).isEmpty()) {
                    var singers = karadata.singer.split(',');
                    singers.forEach(function(singer) {
                        var tag = S(singer).trimLeft().s;
                        if (taglist.indexOf(tag + ',2') == -1) {
                            taglist.push(tag + ',2');
                        }
                    });
                }
                if (!S(karadata.author).isEmpty()) {
                    var authors = karadata.author.split(',');
                    authors.forEach(function(author) {
                        var tag = S(author).trimLeft().s;
                        if (taglist.indexOf(tag + ',6') == -1) {
                            taglist.push(tag + ',6');
                        }
                    });
                }
                if (!S(karadata.creator).isEmpty()) {
                    var creators = karadata.creator.split(',');
                    creators.forEach(function(creator) {
                        var tag = S(creator).trimLeft().s;
                        if (taglist.indexOf(tag + ',4') == -1) {
                            taglist.push(tag + ',4');
                        }
                    });
                }
                if (!S(karadata.songwriter).isEmpty()) {
                    var songwriters = karadata.songwriter.split(',');
                    songwriters.forEach(function(songwriter) {
                        var tag = S(songwriter).trimLeft().s;
                        if (taglist.indexOf(tag + ',8') == -1) {
                            taglist.push(tag + ',8');
                        }
                    });
                }
                if (!S(karadata.lang).isEmpty()) {
                    var langs = karadata.lang.split(',');
                    langs.forEach(function(lang) {
                        var tag = S(lang).trimLeft().s;
                        if (taglist.indexOf(tag + ',5') == -1) {
                            taglist.push(tag + ',5');
                        }
                    });
                }
                // Check du type de song
                if (S(karaType).contains('AMV')) {
                    if (taglist.indexOf('TYPE_AMV,3') == -1) {
                        taglist.push('TYPE_AMV,3');
                    }
                }
                if (S(karaType).contains('CM')) {
                    if (taglist.indexOf('TYPE_CM,3') == -1) {
                        taglist.push('TYPE_CM,3');
                    }
                }
                if (S(karaType).contains('ED')) {
                    if (taglist.indexOf('TYPE_ED,3') == -1) {
                        taglist.push('TYPE_ED,3');
                    }
                }
                if (S(karaType).contains('GAME')) {
                    if (taglist.indexOf('TAG_VIDEOGAME,7') == -1) {
                        taglist.push('TAG_VIDEOGAME,7');
                    }
                }
                if (S(karaType).contains('GC')) {
                    if (taglist.indexOf('TAG_GAMECUBE,7') == -1) {
                        taglist.push('TAG_GAMECUBE,7');
                    }
                }
                if (S(karaType).contains('IN')) {
                    if (taglist.indexOf('TYPE_INSERTSONG,3') == -1) {
                        taglist.push('TYPE_INSERTSONG,3');
                    }
                }
                if (S(karaType).contains('LIVE')) {
                    if (taglist.indexOf('TYPE_LIVE,3') == -1) {
                        taglist.push('TYPE_LIVE,3');
                    }
                }
                if (S(karaType).contains('MOVIE')) {
                    if (taglist.indexOf('TAG_MOVIE,7') == -1) {
                        taglist.push('TAG_MOVIE,7');
                    }
                }
                if (S(karaType).contains('OAV')) {
                    if (taglist.indexOf('TAG_OVA,7') == -1) {
                        taglist.push('TAG_OVA,7');
                    }
                }
                if (S(karaType).contains('OP')) {
                    if (taglist.indexOf('TYPE_OP,3') == -1) {
                        taglist.push('TYPE_OP,3');
                    }
                }
                if (S(karaType).contains('MV')) {
                    if (taglist.indexOf('TYPE_MUSIC,3') == -1) {
                        taglist.push('TYPE_MUSIC,3');
                    }
                }
                if (S(karaType).contains('OT')) {
                    if (taglist.indexOf('TYPE_OTHER,3') == -1) {
                        taglist.push('TYPE_OTHER,3');
                    }
                }
                if (S(karaType).contains('PS3')) {
                    if (taglist.indexOf('TAG_PS3,7') == -1) {
                        taglist.push('TAG_PS3,7');
                    }
                }
                if (S(karaType).contains('PS2')) {
                    if (taglist.indexOf('TAG_PS2,7') == -1) {
                        taglist.push('TAG_PS2,7');
                    }
                }
                if (S(karaType).contains('PSV')) {
                    if (taglist.indexOf('TAG_PSV,7') == -1) {
                        taglist.push('TAG_PSV,7');
                    }
                }
                if (S(karaType).contains('PSX')) {
                    if (taglist.indexOf('TAG_PSX,7') == -1) {
                        taglist.push('TAG_PSX,7');
                    }
                }
                if (S(karaType).contains('PV')) {
                    if (taglist.indexOf('TYPE_PV,3') == -1) {
                        taglist.push('TYPE_PV,3');
                    }
                }
                if (S(karaType).contains('R18')) {
                    if (taglist.indexOf('TAG_R18,7') == -1) {
                        taglist.push('TAG_R18,7');
                    }
                }
                if (S(karaType).contains('REMIX')) {
                    if (taglist.indexOf('TAG_REMIX,7') == -1) {
                        taglist.push('TAG_REMIX,7');
                    }
                }
                if (S(karaType).contains('SPECIAL')) {
                    if (taglist.indexOf('TAG_SPECIAL,7') == -1) {
                        taglist.push('TAG_SPECIAL,7');
                    }
                }
                if (S(karaType).contains('VOCA')) {
                    if (taglist.indexOf('TAG_VOCALOID,7') == -1) {
                        taglist.push('TAG_VOCALOID,7');
                    }
                }
                if (S(karaType).contains('XBOX360')) {
                    if (taglist.indexOf('TAG_XBOX360,7') == -1) {
                        taglist.push('TAG_XBOX360,7');
                    }
                }
                async.each(taglist, function(tag, callback) {
                    tag = S(tag).trimLeft().s;
                    if (tags.indexOf(tag) == -1) {
                        tags.push(tag);
                    }
                    // On récupère le nouvel index
                    var tagsIDX = tags.indexOf(tag);
                    tagsIDX++;
                    karas_tags.push(tagsIDX + ',' + id_kara);
                    callback();
                });
            }

            function addKara(karafile) {
                var karadata = ini.parse(fs.readFileSync(karasdir + '/' + karafile, 'utf-8'));
                var kara = [];
                if (karadata.KID) {
                    kara['KID'] = karadata.KID;
                } else {
                    var KID = uuidV4();
                    karadata.KID = KID;
                    kara['KID'] = karadata.KID;
                    fs.writeFile(karasdir + '/' + karafile, ini.stringify(karadata), function(err, rep) {
                        if (err) {
                            module.exports.onLog('error', "Impossible d'écrire le .kara !");
                            process.exit();
                        }
                        fs.appendFile(karasdir + '/' + karafile, ';DO NOT MODIFY - KARAOKE ID GENERATED AUTOMATICALLY', function(err) {
                            if (err) {
                                module.exports.onLog('error', "Impossible d'ajouter la ligne de commentaire au .kara!: " + err);
                                process.exit();
                            }
                        });
                    });
                }
                timestamp.round = true;
                kara['dateadded'] = timestamp.now();
                kara['datemodif'] = kara['dateadded'];
                // Récupérer le nom du .kara sans le .kara
                var karaWOExtension = S(karafile).chompRight('.kara');
                // Découper le nom du kara : langue, série, type, titre
                var karaInfos = karaWOExtension.split(' - ');
                if (karaInfos[3] == undefined) {
                    karaInfos[3] = '';
                }
                kara['title'] = karaInfos[3];
                kara['year'] = karadata.year;
                // Ordre : trouver le songorder à la suite du type
                var karaOrder = undefined;
                var karaType = karaInfos[2];
                if (S(S(karaType).right(2)).isNumeric()) {
                    karaOrder = S(karaType).right(2).s;
                    if (S(karaOrder).left(1) == "0") {
                        karaOrder = S(karaOrder).right(1).s;
                    }
                } else {
                    if (S(S(karaType).right(1)).isNumeric()) {
                        karaOrder = S(karaType).right(1).s;
                    } else {
                        karaOrder = 1;
                    }
                }
                kara['songorder'] = karaOrder;
                kara['videofile'] = karadata.videofile;
                kara['subfile'] = karadata.subfile;
                if (S(karadata.trackgain).isEmpty())
                {
                    kara['gain'] = 0;
                } else {
                    kara['gain'] = karadata.trackgain;                
                }
                kara['videolength'] = undefined;
                kara['rating'] = 0;
                kara['viewcount'] = 0;
                karas.push(kara);
            }
        })
    },
    onLog: function(type, message) {
        // événement émis pour remonter un message de log sur l'admin
        logger.warn('onLog not set');
    }
}