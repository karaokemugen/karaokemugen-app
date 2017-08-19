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
	db:null,
	userdb:null,
	SYSPATH: null,
	SETTINGS: null,
	run: function() {
		module.exports.onLog('success', 'Starting database generation');
		return new Promise(function(resolve, reject) {
			if (module.exports.SYSPATH == null) {
				module.exports.onLog('error', 'SYSPATH is not defined');
				reject();
			}
			var path = require('path');
			var sqlite3 = require('sqlite3').verbose();
			var fs = require('fs');
			var ini = require('ini');
			var timestamp = require('unix-timestamp');
			var probe = require('../_common/modules/node-ffprobe');
			var S = require('../_common/utils/string');
			var async = require('async');
			const uuidV4 = require('uuid/v4');
			var csv = require('csv-string');
			var iniread = require('node-ini');
			const exec = require('child_process');
			const ffmpegPath = require('ffmpeg-downloader').path;
			const langsModule = require('langs');
			const karasdir = path.join(module.exports.SYSPATH, module.exports.SETTINGS.PathKaras);
			const videosdir = path.join(module.exports.SYSPATH, module.exports.SETTINGS.PathVideos);
			const karas_dbfile = path.join(module.exports.SYSPATH, module.exports.SETTINGS.PathDB, module.exports.SETTINGS.PathDBKarasFile);
			const karas_userdbfile = path.join(module.exports.SYSPATH, module.exports.SETTINGS.PathDB, module.exports.SETTINGS.PathDBUserFile);
			const series_altnamesfile = path.join(module.exports.SYSPATH, module.exports.SETTINGS.PathAltname);
			const sqlCreateKarasDBfile = path.join(__dirname, '../_common/db/karas.sqlite3.sql');
			const sqlCreateKarasDBViewAllfile = path.join(__dirname, '../_common/db/view_all.view.sql');

			// Deleting karasdb first to start over.
			if (fs.existsSync(karas_dbfile)) {
				fs.unlinkSync(karas_dbfile);
			}

			var sqlInsertKaras = [];
			var sqlInsertSeries = [];
			var sqlInsertTags = [];
			var sqlInsertKarasTags = [];
			var sqlInsertKarasSeries = [];
			var sqlUpdateSeriesAltNames = [];
			var karas = [];
			var series = [];
			var tags = [];
			var karas_series = [];
			var karas_tags = [];
			var karafiles = [];
			var doUpdateSeriesAltNames = false;

			module.exports.db = new sqlite3.Database(karas_dbfile, function(err, rep) {
				if (err) {
					module.exports.onLog('error', 'Failed opening karaoke database');
					reject(err);
				}
			});
			module.exports.userdb = new sqlite3.Database(karas_userdbfile, function(err, rep) {
				if (err) {
					module.exports.onLog('error', 'Error opening user database : '+err);
					reject(err);
				}
			});
			module.exports.onLog('success', 'Karaoke database created');

			/**
			 * Creating tables and views
			 */
			var pCreateTableAndView = new Promise((resolve,reject) => {
				/**
				 * Creating tables
				 */
				var pCreateKarasDB = new Promise((resolve,reject) => {
					var sqlCreateKarasDB = fs.readFileSync(sqlCreateKarasDBfile, 'utf-8');
					module.exports.db.exec(sqlCreateKarasDB, function(err, rep) {
						if (err) {
							module.exports.onLog('error', 'Error creating database tables : '+err);						
							reject(err);
						} else {
							module.exports.onLog('success', 'Database tables created');
							resolve();
						}
					});
				});
				Promise.all([pCreateKarasDB])
					.then(function(){
						/**
						 * Creating views
						 */
						var pCreateKarasDBViewAll = new Promise((resolve,reject) => {
							var sqlCreateKarasDBViewAll = fs.readFileSync(sqlCreateKarasDBViewAllfile, 'utf8');
							module.exports.db.exec(sqlCreateKarasDBViewAll, function(err, rep) {
								if (err) {
									module.exports.onLog('error', 'Error creating views : '+err);								
									reject(err);
								} else {
									module.exports.onLog('success', 'Views created');
									resolve();
								}
							});
						});


						Promise.all([pCreateKarasDBViewAll])
							.then(function(){
								resolve();
							})
							.catch(function(err){
								reject(err);
							});
					})
					.catch(function(err){
						reject(err);
					});
			});

			/**
			 * Creating arrays for use in sql statements
			 */
			var pCreateKaraArrays = new Promise((resolve,reject) => {
				/**
				 * Get data from .kara files
				 */
				var pCreateKaraFiles = new Promise((resolve,reject) => {
					karafiles = fs.readdirSync(karasdir);
					for(var indexToRemove = karafiles.length - 1; indexToRemove >= 0; indexToRemove--) {
						if(!S(karafiles[indexToRemove]).endsWith('.kara')) {
							karafiles.splice(indexToRemove, 1);
						}
					}
					module.exports.onLog('success', 'Karaoke data folder read');
					resolve();
				});
				Promise.all([pCreateKaraFiles])
					.then(function(){
						/**
						 * First analyze .kara
						 * Then add UUID for each karaoke inside if it isn't there already
						 * Then build karas table in one transaction.
						 */
						var pAddToKaras = new Promise((resolve,reject) => {
								
							logger.profile('AddKara')
							async.eachLimit(karafiles, 5, function(kara, callback){
								addKara(kara)
									.then(function(){
										callback();
									})
									.catch(function(err){
										callback(err);
									});
							},function(err){
								if (err) {
									reject(err);
								}
								logger.profile('AddKara')
								module.exports.onLog('success', 'Karaoke count : '+karas.length);
								resolve();
							});
						});
						Promise.all([pAddToKaras])
							.then(function(){								
								/**
								 * Push to array sqlInsertKaras for sql statements from karas.
								 */
								var pPushSqlInsertKaras = new Promise((resolve,reject) => {
									karas.forEach(function(kara, index) {
										index++;
										var titlenorm = S(kara['title']).latinise().s;
										sqlInsertKaras.push({
											$id_kara : index,
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
											$kara_videolength : kara['videolength'],
										});
									});
									resolve();
								});
								/**
								 * Create arrays for series
								 */
								var pCreateSeries = new Promise((resolve,reject) => {
									/**
									 * Extracting series.
									 */
									var pAddToSeries = new Promise((resolve,reject) => {
										async.eachOf(karas, function(kara, index, callback){
											index++;
											addSeries(kara, index)
												.then(function(){
													callback();
												})
												.catch(function(err){
													callback(err);
												});
										},function(err){
											if (err) {
												reject(err);
											}
											module.exports.onLog('success', 'Series count : '+series.length+' ('+karas_series.length+' links)');
											resolve();
										});
									});
									Promise.all([pAddToSeries])
										.then(function(){
											/**
											 * Push to array sqlInsertSeries for sql statements from series.
											 */
											var pPushSqlInsertSeries = new Promise((resolve,reject) => {
												series.forEach(function(serie, index) {
													index++;
													var serienorm = S(serie).latinise().s;
													sqlInsertSeries.push({
														$id_serie : index,
														$serie : serie,
														$serienorm : serienorm,
													});
												});
												resolve();
											});
											/**
											 * Push to array sqlInsertKarasSeries for sql statements from karas_series.
											 */
											var pPushSqlInsertKarasSeries= new Promise((resolve,reject) => {
												karas_series.forEach(function(karaserie) {
													karaserie = karaserie.split(',');
													var id_serie = karaserie[0];
													var id_kara = karaserie[1];
													sqlInsertKarasSeries.push({
														$id_serie : id_serie,
														$id_kara : id_kara,
													});
												});
												resolve();
											});

											/**
											 * Working on altnerative names of series.
											 */
											var pCreateSeriesAltNames= new Promise((resolve,reject) => {
												if (fs.existsSync(series_altnamesfile)) {
													doUpdateSeriesAltNames = true;
													var series_altnamesfilecontent = fs.readFileSync(series_altnamesfile);
													// !!! non native forEach (here "csv" is a csv-string handler)
													csv.forEach(series_altnamesfilecontent.toString(), ':', function(serie) {
														var serie_name = serie[0];
														var serie_altnames = serie[1];
														if (!S(serie_altnames).isEmpty() || !S(serie_name).isEmpty()) {
															var serie_altnamesnorm = S(serie[1]).latinise().s;
															sqlUpdateSeriesAltNames.push({
																$serie_altnames : serie_altnames,
																$serie_altnamesnorm : serie_altnamesnorm,
																$serie_name : serie_name,
															});
														}
													});
													module.exports.onLog('success', 'Alternative series name file found');
												} else {
													doUpdateSeriesAltNames = false;
													module.exports.onLog('warning', 'No alternative series name file found, ignoring');
												}
												resolve();
											});


											Promise.all([pPushSqlInsertSeries, pPushSqlInsertKarasSeries, pCreateSeriesAltNames])
												.then(function(){
													resolve();
												})
												.catch(function(err){
													reject(err);
												});
										})
										.catch(function(err){
											reject(err);
										});
								});
								/**
								 * Create arrays for series
								 */
								var pCreateTags = new Promise((resolve,reject) => {
									/**
									 * Extracting tags.
									 */
									var pAddToTags = new Promise((resolve,reject) => {
										async.eachOf(karas, function(kara, index, callback){
											index++;
											addTags(kara, index)
												.then(function(){
													callback();
												})
												.catch(function(err){
													callback(err);
												});
										},function(err){
											if (err) {
												reject(err);
											}
											module.exports.onLog('success', 'Tags count : '+tags.length+' ('+karas_tags.length+' links)');
											resolve();
										});
									});

									Promise.all([pAddToTags])
										.then(function(){
											/**
											 * Push to array sqlInsertTags for sql statements from tags.
											 */
											var pPushSqlInsertTags = new Promise((resolve,reject) => {
												tags.forEach(function(tag, index) {
													index++;
													tag = tag.split(',');
													var tagname = tag[0];
													var tagnamenorm = S(tagname).latinise().s;
													var tagtype = tag[1];
													sqlInsertTags.push({
														$id_tag : index,
														$tagtype : tagtype,
														$tagname : tagname,
														$tagnamenorm : tagnamenorm,
													});
												});
												resolve();
											});

											/**
											 * Push to array sqlInsertKarasTags for sql statements from karas_tags.
											 */
											var pPushSqlInsertKarasTags = new Promise((resolve,reject) => {
												karas_tags.forEach(function(karatag) {
													karatag = karatag.split(',');
													var id_tag = karatag[0];
													var id_kara = karatag[1];
													sqlInsertKarasTags.push({
														$id_tag : id_tag,
														$id_kara : id_kara,
													});
												});
												resolve();
											});

											Promise.all([pPushSqlInsertTags, pPushSqlInsertKarasTags])
												.then(function(){
													resolve();
												})
												.catch(function(err){
													reject(err);
												});
										})
										.catch(function(err){
											reject(err);
										});
								});

								Promise.all([pPushSqlInsertKaras, pCreateSeries, pCreateTags])
									.then(function(){
										resolve();
									})
									.catch(function(err){
										reject(err);
									});
							})
							.catch(function(err){
								reject(err);
							});
					})
					.catch(function(err){
						reject(err);
					});
			});

			Promise.all([pCreateTableAndView, pCreateKaraArrays])
				.then(function(){
					insertIntoDatabaseWowWow()
						.then(function(){
							run_userdb_integrity_checks()
								.then(function(){
									closeDatabaseConnection()
										.then(function(){
											resolve();
										})
										.catch(function(err){
											reject(err);
										});
								})
								.catch(function(err){
									module.exports.onLog('error', err);
									closeDatabaseConnection()
										.then(function(){
											reject(err);
										})
										.catch(function(err){
											reject(err);
										});
								});
						})
						.catch(function(err){
							module.exports.onLog('error', err);
							closeDatabaseConnection()
								.then(function(){
									reject(err);
								})
								.catch(function(err){
									reject(err);
								});
						});
				})
				.catch(function(err){
					module.exports.onLog('error', err);
					closeDatabaseConnection()
						.then(function(){
							reject(err);
						})
						.catch(function(err){
							reject(err);
						});
				});

			/**
			 * Insert into database
			 */
			function insertIntoDatabaseWowWow() {
				return new Promise((resolve,reject) => {
					module.exports.db.serialize(function() {
						/*
						* Now working with a transaction to bulk-add data.
						*/
						module.exports.db.run('begin transaction');

						/*
						* Building SQL queries for insertion
						*/
						var stmt_InsertKaras = module.exports.db.prepare('INSERT INTO kara(pk_id_kara, kid, title, NORM_title, year, songorder, videofile, subfile, created_at, modified_at, rating, viewcount, gain, videolength ) VALUES(  $id_kara, $kara_KID, $kara_title, $titlenorm, $kara_year, $kara_songorder, $kara_videofile, $kara_subfile, $kara_dateadded, $kara_datemodif, $kara_rating, $kara_viewcount, $kara_gain, $kara_videolength);');
						var stmt_InsertSeries = module.exports.db.prepare('INSERT INTO serie(pk_id_serie,name,NORM_name) VALUES( $id_serie, $serie, $serienorm );');
						var stmt_InsertTags = module.exports.db.prepare('INSERT INTO tag(pk_id_tag,tagtype,name,NORM_name) VALUES( $id_tag, $tagtype, $tagname, $tagnamenorm );');
						var stmt_InsertKarasTags = module.exports.db.prepare('INSERT INTO kara_tag(fk_id_tag,fk_id_kara) VALUES( $id_tag, $id_kara );');
						var stmt_InsertKarasSeries = module.exports.db.prepare('INSERT INTO kara_serie(fk_id_serie,fk_id_kara) VALUES( $id_serie, $id_kara);');
						var stmt_UpdateSeriesAltNames = module.exports.db.prepare('UPDATE serie SET altname = $serie_altnames , NORM_altname = $serie_altnamesnorm WHERE name= $serie_name ;');

						/*
						* Running queries (Statements or RAW depending on the case)
						*/
						sqlInsertKaras.forEach(function(data){
							stmt_InsertKaras.run(data, function (err) {
								if(err) {
									reject(err);
								}
							});
						});
						module.exports.onLog('info', 'Karaokes table filled');

						sqlInsertTags.forEach(function(data){
							stmt_InsertTags.run(data, function (err) {
								if(err) {
									reject(err);
								}
							});
						});
						module.exports.onLog('success', 'Tags table filled');

						sqlInsertKarasTags.forEach(function(data){
							stmt_InsertKarasTags.run(data, function (err) {
								if(err) {
									reject(err);
								}
							});
						});
						module.exports.onLog('success', 'Karaokes linked to tags');

						sqlInsertSeries.forEach(function(data){
							stmt_InsertSeries.run(data, function (err) {
								if(err) {
									reject(err);
								}
							});
						});
						module.exports.onLog('success', 'Series table filled');

						if (doUpdateSeriesAltNames) {
							sqlUpdateSeriesAltNames.forEach(function(data){
								stmt_UpdateSeriesAltNames.run(data, function (err) {
									if(err) {
										reject(err);
									}
								});
							});
							module.exports.onLog('success', 'Alternative series names updated');
						}

						sqlInsertKarasSeries.forEach(function(data){
							stmt_InsertKarasSeries.run(data, function (err) {
								if(err) {
									reject(err);
								}
							});
						});
						module.exports.onLog('success', 'Karaokes linked to series');
						module.exports.onLog('success', 'Database generation successful!');
						module.exports.db.run('commit', function(err) {
							if (err) {
								reject(err);
							} else {
								// Close all statements just to be sure.
								stmt_InsertKarasSeries.finalize();
								stmt_InsertSeries.finalize();
								stmt_UpdateSeriesAltNames.finalize();
								stmt_InsertKarasTags.finalize();
								stmt_InsertTags.finalize();
								stmt_InsertKaras.finalize();
								resolve();
							}
						});
					});
				});
			}

			/**
			 * close database connection
			 */
			function closeDatabaseConnection() {
				return new Promise((resolve,reject) => {
					module.exports.db.close(function(err){
						if (err) {
							module.exports.onLog('error', err);
							reject();
						}
					});
					module.exports.userdb.close(function(err){
						if (err) {
							module.exports.onLog('error', err);
							reject();
						}
					});
					resolve();
				});
			}

			/**
			* @function run_userdb_integrity_checks
			* Get all karas from all_karas view
			* Get all karas in playlist_content, blacklist, rating, viewcount, whitelist
			* Parse karas in playlist_content, search for the KIDs in all_karas
			* If id_kara is different, write a UPDATE query.
			*/
			function run_userdb_integrity_checks() {
				return new Promise(function(resolve,reject){
					module.exports.onLog('info', 'Running user database integrity checks');
					var AllKaras = [];
					var PlaylistKaras = [];
					var WhitelistKaras = [];
					var RatingKaras = [];
					var ViewcountKaras = [];
					var BlacklistKaras = [];

					var sqlUpdateUserDB = '';

					var pGetAllKaras = new Promise((resolve,reject) => {
						var sqlGetAllKaras = 'SELECT pk_id_kara AS id_kara, kid FROM all_karas;';
						module.exports.db.all(sqlGetAllKaras,
							function (err, playlist) {
								if (err) {
									reject('Error getting all karaokes : '+err);
								} else {
									AllKaras = playlist;
									resolve();
								}
							});
					});
					var pGetPlaylistKaras = new Promise((resolve,reject) => {
						var sqlGetPlaylistKaras = 'SELECT fk_id_kara AS id_kara, kid FROM playlist_content;';
						module.exports.userdb.all(sqlGetPlaylistKaras,
							function (err, playlist) {
								if (err) {
									reject('Error getting all karaokes from playlists : '+err);
								} else {
									if (playlist) {
										PlaylistKaras = playlist;
										resolve();
									} else {
										PlaylistKaras = [];
										resolve();
									}
								}
							});
					});
					var pGetWhitelistKaras = new Promise((resolve,reject) => {
						var sqlGetWhitelistKaras = 'SELECT fk_id_kara AS id_kara, kid FROM whitelist;';
						module.exports.userdb.all(sqlGetWhitelistKaras,
							function (err, playlist) {
								if (err) {
									reject('Error reading whitelist : '+err);
								} else {
									if (playlist) {
										WhitelistKaras = playlist;
										resolve();
									} else {
										WhitelistKaras = [];
										resolve();
									}
								}
							});
					});
					var pGetBlacklistKaras = new Promise((resolve,reject) => {
						var sqlGetBlacklistKaras = 'SELECT fk_id_kara AS id_kara, kid FROM blacklist;';
						module.exports.userdb.all(sqlGetBlacklistKaras,
							function (err, playlist) {
								if (err) {
									reject('Error reading blacklist : '+err);
								} else {
									if (playlist) {
										BlacklistKaras = playlist;
										resolve();
									} else {
										BlacklistKaras = [];
										resolve();
									}
								}
							});
					});
					var pGetRatingKaras = new Promise((resolve,reject) => {
						var sqlGetRatingKaras = 'SELECT fk_id_kara AS id_kara, kid FROM rating;';
						module.exports.userdb.all(sqlGetRatingKaras,
							function (err, playlist) {
								if (err) {
									reject('Error reading ratings : '+err);
								} else {
									if (playlist) {
										RatingKaras = playlist;
										resolve();
									} else {
										RatingKaras = [];
										resolve();
									}
								}
							});
					});
					var pGetViewcountKaras = new Promise((resolve,reject) => {
						var sqlGetViewcountKaras = 'SELECT fk_id_kara AS id_kara, kid FROM viewcount;';
						module.exports.userdb.all(sqlGetViewcountKaras,
							function (err, playlist) {
								if (err) {
									reject('Error reading viewcounts : '+err);
								} else {
									if (playlist) {
										WhitelistKaras = playlist;
										resolve();
									} else {
										WhitelistKaras = [];
										resolve();
									}
								}
							});
					});

					Promise.all([pGetViewcountKaras,pGetRatingKaras,pGetWhitelistKaras,pGetBlacklistKaras,pGetPlaylistKaras,pGetAllKaras])
						.then(function() {
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
												sqlUpdateUserDB += 'UPDATE whitelist SET fk_id_kara = ' + Kara.id_kara
													+ ' WHERE kid = \'' + WLKara.kid + '\';';
												UpdateNeeded = true;
											}
											KaraFound = true;
										}
									});
									//If No Karaoke with this KID was found in the AllKaras table, delete the KID
									if (!KaraFound) {
										sqlUpdateUserDB += 'DELETE FROM whitelist WHERE kid = \'' + WLKara.kid + '\';';
										module.exports.onLog('warn', 'Deleted Karaoke ID '+WLKara.kid+' from whitelist');
										UpdateNeeded = true;
									}
								});
							}

							if (BlacklistKaras != []) {
								BlacklistKaras.forEach(function(BLKara){
									KaraFound = false;
									AllKaras.forEach(function(Kara){
										if (Kara.kid == BLKara.kid){
											// Found a matching KID, checking if id_karas are the same
											if (Kara.id_kara != BLKara.id_kara){
												sqlUpdateUserDB += 'UPDATE blacklist SET fk_id_kara = ' + Kara.id_kara
													+ ' WHERE kid = \'' + BLKara.kid+'\';';
												UpdateNeeded = true;
											}
											KaraFound = true;
										}
									});
									// If No Karaoke with this KID was found in the AllKaras table, delete the KID
									if (!KaraFound) {
										sqlUpdateUserDB += 'DELETE FROM blacklist WHERE kid = \'' + BLKara.kid + '\';';
										module.exports.onLog('warn', 'Deleted Karaoke ID '+WLKara.kid+' from blacklist');
										UpdateNeeded = true;
									}
								});
							}
							if (RatingKaras != []) {
								RatingKaras.forEach(function(RKara){
									KaraFound = false;
									AllKaras.forEach(function(Kara){
										if (Kara.kid == RKara.kid){
											// Found a matching KID, checking if id_karas are the same
											if (Kara.id_kara != RKara.id_kara){
												sqlUpdateUserDB += 'UPDATE rating SET fk_id_kara = ' + Kara.id_kara
													+ ' WHERE kid = \'' + RKara.kid+'\';';
												UpdateNeeded = true;
											}
											KaraFound = true;
										}
									});
									// If No Karaoke with this KID was found in the AllKaras table, delete the KID
									if (!KaraFound) {
										sqlUpdateUserDB += 'DELETE FROM rating WHERE kid = \'' + RKara.kid + '\';';
										module.exports.onLog('warn', 'Deleted Karaoke ID '+WLKara.kid+' from ratings');
										UpdateNeeded = true;
									}
								});
							}
							if (ViewcountKaras != []) {
								ViewcountKaras.forEach(function(VKara){
									KaraFound = false;
									AllKaras.forEach(function(Kara){
										if (Kara.kid == VKara.kid){
											// Found a matching KID, checking if id_karas are the same
											if (Kara.id_kara != VKara.id_kara){
												sqlUpdateUserDB += 'UPDATE viewcount SET fk_id_kara = ' + Kara.id_kara
													+ ' WHERE kid = \'' + VKara.kid + '\';';
												UpdateNeeded = true;
											}
											KaraFound = true;
										}
									});
									// If No Karaoke with this KID was found in the AllKaras table, delete the KID
									if (!KaraFound) {
										sqlUpdateUserDB += 'DELETE FROM viewcount WHERE kid = \'' + VKara.kid + '\';';
										module.exports.onLog('warn', 'Deleted Karaoke ID '+WLKara.kid+' from viewcounts');
										UpdateNeeded = true;
									}
								});
							}

							if (PlaylistKaras != []) {
								PlaylistKaras.forEach(function(PLKara){
									KaraFound = false;

									AllKaras.forEach(function(Kara){
										if (Kara.kid == PLKara.kid){

											// Found a matching KID, checking if id_karas are the same
											if (Kara.id_kara != PLKara.id_kara){
												sqlUpdateUserDB += 'UPDATE playlist_content SET fk_id_kara = ' + Kara.id_kara
													+ ' WHERE kid = \'' + PLKara.kid + '\';';
												UpdateNeeded = true;
											}
											KaraFound = true;
										}
									});
									//If No Karaoke with this KID was found in the AllKaras table, delete the KID
									if (!KaraFound) {

										sqlUpdateUserDB += 'DELETE FROM playlist_content WHERE kid = \'' + PLKara.kid + '\';';
										module.exports.onLog('warn', 'Deleted Karaoke ID '+PLKara.kid+' from playlists');
										UpdateNeeded = true;
									}
								});
							}
							if (UpdateNeeded) {
								module.exports.userdb.exec(sqlUpdateUserDB, function(err, rep) {
									if (err) {
										module.exports.onLog('error', 'Error updating database : '+err);										
										reject();
									} else {
										module.exports.onLog('success', 'Database updated due to integrity checks');										
										resolve();
									}
								});
							} else {
								module.exports.onLog('success', 'No update needed to user database');
								module.exports.onLog('success', 'Integrity checks complete!');
								resolve();
							}
						})
						.catch(function(err) {
							module.exports.onLog('error', 'Error during integrity checks : '+err);
							reject(err);
						});
				});
			}
			function getvideogain(videofile){
				return new Promise((resolve,reject) => {
					var videogain = 0;
					var proc = exec.spawn(ffmpegPath, ['-i', videosdir + '/' + videofile, '-af', 'replaygain', '-f','null', '-'], { encoding : 'utf8' });

					var audioGain = undefined;
					var output = '';

					proc.stderr.on('data',(data) => {
						output += data.toString();
					})

					proc.on('close', (code) => {
						if (code !== 0) {
							module.exports.onLog('error', 'Video '+videofile+' gain calculation error : '+code);
							resolve(0);
						} else {
							var outputArray = output.split(' ');
							var index = outputArray.indexOf('track_gain');
							if ( index != -1) {
								audioGain = S(outputArray[index+2]).toFloat();
							}	
							if (typeof audioGain === 'number') {
								resolve(audioGain.toString())
							} else {
								resolve(0);
							}
						}						
					})

				})
			}
			function getvideoduration(videofile) {
				return new Promise((resolve,reject) => {
					var videolength = 0;
					probe(videosdir + '/' + videofile, function(err, videodata) {
						if (err) {
							module.exports.onLog('error', 'Video '+videofile+' probe error : '+err);
							reject(err);
						} else {
							videolength = Math.floor(videodata.format.duration);
							resolve(videolength);
						}
					});
				});
			}

			function addSeries(karadata, id_kara) {
				return new Promise((resolve,reject) => {
					var karaWOExtension = S(karadata.karafile).chompRight('.kara');
					var karaInfos = karaWOExtension.split(' - ');
					var karaType = karaInfos[2];
					var serieslist = [];
					if (S(karadata.series).isEmpty()) {
						if (karaType == 'LIVE' || karaType == 'MV') {
							// Don't do anything.
						} else {
							if (S(karaInfos[1]).isEmpty()) {
								reject('Karaoke series cannot be detected!')
							} else {
								serieslist.push(karaInfos[1]);
							}									
						}
					} else {
						serieslist = karadata.series.split(',');
						if (serieslist === [])  {
							reject('Karaoke series cannot be detected!')
						}
					}
					serieslist.forEach(function(serie) {
						serie = S(serie).trimLeft().s;
						if (series.indexOf(serie) == -1) {
							series.push(serie);
						}
						// Let's get our new index.
						var seriesIDX = series.indexOf(serie);
						seriesIDX++;
						karas_series.push(seriesIDX + ',' + id_kara);
					});
					resolve();						
				});
			}

			function addTags(karadata, id_kara) {
				return new Promise((resolve,reject) => {
					var karaWOExtension = S(karadata.karafile).chompRight('.kara');
					var karaInfos = karaWOExtension.split(' - ');
					var karaSerie = karaInfos[1];
					var karaType = karaInfos[2];
					var taglist = [];
					var singers;
					//Filling taglist, and let's go.
					if (S(karaSerie).contains(' OAV') || S(karaSerie).contains(' OVA') || S(karaType).contains('OAV')) {
						if (taglist.indexOf('TAG_OVA,7') == -1) {
							taglist.push('TAG_OVA,2');
						}
					}
					if (karaType == 'LIVE' || karaType == 'MV') {
						//If LIVE or MV, we add the series as artist.
						singers = karaSerie.split(',');
						singers.forEach(function(singer) {
							var tag = S(singer).trimLeft().s;
							if (taglist.indexOf(tag + ',2') == -1) {
								taglist.push(tag + ',2');
							}
						});
					}
					if (!S(karadata.singer).isEmpty()) {
						singers = karadata.singer.split(',');
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
					karadata.lang = S(karadata.lang).strip('"');							
					if (!S(karadata.lang).isEmpty()) {
						var langs = karadata.lang.split(',');
						langs.forEach(function(lang) {
							var tag = S(lang).trimLeft().s;
							if (!langsModule.has('2B',tag) && tag !== 'und') {					reject('Unknown language : '+tag);
							} else {
								if (taglist.indexOf(tag + ',5') == -1) {
									taglist.push(tag + ',5');
								}
							}									
						});
					}
					// Check du type de song
					var typeDetected = false;
					if (S(karaType).contains('AMV') && taglist.indexOf('TYPE_AMV,3') == -1) {
						typeDetected = true;
						taglist.push('TYPE_AMV,3');
					}
					if (S(karaType).contains('CM') && taglist.indexOf('TYPE_CM,3') == -1) {
						typeDetected = true;
						taglist.push('TYPE_CM,3');
					}
					if (S(karaType).contains('ED') && taglist.indexOf('TYPE_ED,3') == -1) {
						typeDetected = true;
						taglist.push('TYPE_ED,3');
					}
					if (S(karaType).contains('GAME') && taglist.indexOf('TAG_VIDEOGAME,7') == -1) {
						typeDetected = true;
						taglist.push('TAG_VIDEOGAME,7');
					}
					if (S(karaType).contains('GC') && taglist.indexOf('TAG_GAMECUBE,7') == -1) {
						typeDetected = true;
						taglist.push('TAG_GAMECUBE,7');
					}
					if (S(karaType).contains('IN') && taglist.indexOf('TYPE_INSERTSONG,3') == -1) {
						typeDetected = true;
						taglist.push('TYPE_INSERTSONG,3');
					}
					if (S(karaType).contains('LIVE') && taglist.indexOf('TYPE_LIVE,3') == -1) {
						typeDetected = true;
						taglist.push('TYPE_LIVE,3');
					}
					if (S(karaType).contains('MOVIE') && taglist.indexOf('TAG_MOVIE,7') == -1) {
						taglist.push('TAG_MOVIE,7');
					}
					if (S(karaType).contains('OAV') && taglist.indexOf('TAG_OVA,7') == -1) {
						taglist.push('TAG_OVA,7');
					}
					if (S(karaType).contains('OP') && taglist.indexOf('TYPE_OP,3') == -1) {
						typeDetected = true;
						taglist.push('TYPE_OP,3');
					}
					if (S(karaType).startsWith('MV') && taglist.indexOf('TYPE_MUSIC,3') == -1) {
						typeDetected = true;
						taglist.push('TYPE_MUSIC,3');
					}
					if (S(karaType).contains('OT') && taglist.indexOf('TYPE_OTHER,3') == -1) {
						typeDetected = true;
						taglist.push('TYPE_OTHER,3');
					}
					if (S(karaType).contains('PS3') && taglist.indexOf('TAG_PS3,7') == -1) {
						taglist.push('TAG_PS3,7');
					}
					if (S(karaType).contains('PS2') && taglist.indexOf('TAG_PS2,7') == -1) {
						taglist.push('TAG_PS2,7');
					}
					if (S(karaType).contains('PSV') && taglist.indexOf('TAG_PSV,7') == -1) {
						taglist.push('TAG_PSV,7');
					}
					if (S(karaType).contains('PSX') && taglist.indexOf('TAG_PSX,7') == -1) {
						taglist.push('TAG_PSX,7');
					}
					if (S(karaType).contains('PV') && taglist.indexOf('TYPE_PV,3') == -1) {
						typeDetected = true;
						taglist.push('TYPE_PV,3');
					}
					if (S(karaType).contains('R18') && taglist.indexOf('TAG_R18,7') == -1) {
						taglist.push('TAG_R18,7');
					}
					if (S(karaType).contains('REMIX') && taglist.indexOf('TAG_REMIX,7') == -1) {
						taglist.push('TAG_REMIX,7');
					}
					if (S(karaType).contains('SPECIAL') && taglist.indexOf('TAG_SPECIAL,7') == -1) {
						taglist.push('TAG_SPECIAL,7');
					}
					if (S(karaType).contains('VOCA') && taglist.indexOf('TAG_VOCALOID,7') == -1) {
						taglist.push('TAG_VOCALOID,7');
					}
					if (S(karaType).contains('XBOX360') && taglist.indexOf('TAG_XBOX360,7') == -1) {
						taglist.push('TAG_XBOX360,7');
					}
					if (!typeDetected) {
						reject('Karaoke type cannot be detected! Got : '+karaType)
					}
					taglist.forEach(function(tag) {
						tag = S(tag).trimLeft().s;
						if (tags.indexOf(tag) == -1) {
							tags.push(tag);
						}
						// Let's get our new index.
						var tagsIDX = tags.indexOf(tag);
						tagsIDX++;
						karas_tags.push(tagsIDX + ',' + id_kara);
					});
					resolve();					
				});
			}

			function addKara(karafile) {
				return new Promise(function(resolve, reject) {
					fs.readFile(karasdir + '/' + karafile, 'utf-8', function(err,data){
						if (err) {
							reject(err);
						} else {
							
							var karadata = ini.parse(data);
							//New way without "" in data
							//var karadata = iniread.parseSync(karasdir + '/' + karafile);
							var kara = [];
							if (karadata.KID) {
								kara['KID'] = karadata.KID;
							} else {
								var KID = uuidV4();
								karadata.KID = KID;
								kara['KID'] = karadata.KID;
							}
							timestamp.round = true;
							kara['dateadded'] = timestamp.now();
							kara['datemodif'] = kara['dateadded'];
							// Take out .kara from the filename
							var karaWOExtension = S(karafile).chompRight('.kara');
							// Cut name into different fields.
							var karaInfos = karaWOExtension.split(' - ');
							if (karaInfos[3] == undefined) {
								karaInfos[3] = '';
							}
							kara['title'] = karaInfos[3];
							kara['year'] = karadata.year;
							// Songorder : find it after the songtype
							var karaOrder = undefined;
							var karaType = karaInfos[2];
							if (S(karaType).isEmpty()) {
								reject('Karaoke type is empty! Karaoke : '+karafile)
							}
							if (S(S(karaType).right(2)).isNumeric()) {
								karaOrder = S(karaType).right(2).s;
								if (S(karaOrder).left(1) == '0') {
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
							if (S(karadata.videofile).isEmpty()) {
								reject('Karaoke video file empty! Karaoke '+karafile+' / data : '+karadata);
							} else {
								kara['videofile'] = karadata.videofile;	
							}
							
							if (S(karadata.subfile).isEmpty()){
								reject('Karaoke sub file empty! Karaoke '+karafile+' / data : '+karadata)
							} else {
								kara['subfile'] = karadata.subfile;
							}
							

							//Calculate size.
							
							if (fs.existsSync(videosdir + '/' + kara['videofile'])) {
								var videostats = fs.statSync(videosdir + '/' + kara['videofile'])								
								if (videostats.size != karadata.videosize) {
									//Probe file for duration
									//Calculate gain
									// write duration and gain to .kara
									
									var pGetVideoGain = new Promise ((resolve,reject) => {
										getvideogain(karadata.videofile)
											.then(function(gain){												
												kara['gain'] = gain;
												karadata.videogain = gain;
												resolve();
											})
											.catch(function(err){
												kara['gain'] = 0;
												reject(err);
											})
									});

									var pGetVideoDuration = new Promise ((resolve,reject) => {
										getvideoduration(karadata.videofile)
											.then(function(videolength){
												kara['videolength'] = videolength;
												karadata.videoduration = videolength;
												resolve();
											})
											.catch(function(err){
												kara['videolength'] = 0;
												reject(err);
											});
									});

									karadata.videosize = videostats.size;
								} else {
									kara['gain'] = karadata.videogain;
									kara['videolength'] = karadata.videoduration;
								}
							} else {
								module.exports.onLog('warning', 'Video file not found : '+kara['videofile']);
								kara['gain'] = 0;
								kara['size'] = 0;
								kara['videolength'] = 0;
							}

							kara['rating'] = 0;
							kara['viewcount'] = 0;
							kara['karafile'] = karafile;
							kara['tags'] = karadata.tags;
							kara['lang'] = karadata.lang;
							kara['singer'] = karadata.singer;
							kara['songwriter'] = karadata.songwriter;
							kara['creator'] = karadata.creator;
							kara['author'] = karadata.author;
							kara['serie'] = karadata.series;
							Promise.all([pGetVideoDuration,pGetVideoGain])
								.then(function(){
									karas.push(kara);
									fs.writeFile(karasdir + '/' + karafile, ini.stringify(karadata), function(err, rep) {
										if (err) {
											module.exports.onLog('error', 'Error writing .kara file '+karafile+' : '+err);
											reject(err);
										}
										resolve();
									});
								})
								.catch(function(err){
									reject(err);
								});
						}
					});
				});
			}
		});
	},
	onLog: function(type, message) {
		// Event to bring up messages into dashboard.
		logger.warn('onLog not set');
	}
};