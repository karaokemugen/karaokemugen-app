var sqlite3 = require('sqlite3').verbose();
var path = require('path');
var fs = require('fs');
const logger = require('../../_common/utils/logger.js');
const moment = require('moment');
require('moment-duration-format');
moment.locale('fr');
const async = require('async');

module.exports = {
	SYSPATH:null,
	SETTINGS:null,
	_ready: false,
	_db_handler: null,	

	init: function(){
		return new Promise(function(resolve){
			// démarre une instance de SQLITE

			if(module.exports.SYSPATH === null) {
				logger.error('[DBI] _engine/components/db_interface.js : SYSPATH is null');
				process.exit();
			}

			var userDB_Test = new Promise(function(resolve,reject){
				if(!fs.existsSync(path.join(module.exports.SYSPATH,'app/db/userdata.sqlite3'))) {
					logger.warn('[DBI] User database not found');
					var db = new sqlite3.Database(path.join(module.exports.SYSPATH,'app/db/userdata.sqlite3'));
					var sqlCreateUserDB = fs.readFileSync(path.join(__dirname,'../../_common/db/userdata.sqlite3.sql'),'utf-8');
					db.exec(sqlCreateUserDB, function (err){
						if (err) {
							logger.error('[DBI] Failed creating user database : '+err);
							db.close();
							reject(err);
						} else {
							db.close();
							logger.info('[DBI] User database created');
							resolve();
						}
					});
				} else {
					resolve();
				}
			});

			var karasDB_Test = new Promise(function(resolve,reject){
				if(!fs.existsSync(path.join(module.exports.SYSPATH,'app/db/karas.sqlite3'))) {
					logger.warn('[DBI] Karaoke database not found');
					var generator = require('../../_admin/generate_karasdb.js');
					generator.SYSPATH = module.exports.SYSPATH;
					generator.SETTINGS = module.exports.SETTINGS;
					generator.onLog = function(type,message) {
						logger.info('[DBI] Generating database',message);
					};
					generator.run().then(function(){
						resolve();
					}).catch(function(error){
						// erreur ?						
						reject(error);
					});
				} else {
					resolve();
				}
			});

			Promise.all([ userDB_Test, karasDB_Test ])
				.then(function() {
					module.exports._db_handler = new sqlite3.Database(path.join(module.exports.SYSPATH,'app/db/userdata.sqlite3'), function (err) {
						if (err) {
							logger.error('[DBI] Loading user database failed : '+err);
							process.exit();
						} else {
							module.exports._db_handler.serialize(function() {
								module.exports._db_handler.run('PRAGMA foreign_keys = ON;', function(err) {
									if (err) {
										logger.error('[DBI] Setting PRAGMA foreign_keys ON for karaoke database failed : ' + err);
										process.exit();
									}
								});

								module.exports._db_handler.run('ATTACH DATABASE "' + path.join(module.exports.SYSPATH, 'app/db/karas.sqlite3') + '" as karasdb;',
									function(err) {
										if (err) {
											logger.error(err);
										} else {
											module.exports._ready = true;
											module.exports.getStats()
												.then(function(stats) {
													logger.info('[DBI] Karaoke count   : ' + stats.totalcount);
													logger.info('[DBI] Total duration  : ' + moment.duration(stats.totalduration, 'seconds').format(
														'D [day(s)], H [hour(s)], m [minute(s)], s [second(s)]'));
													logger.info('[DBI] Total series    : ' + stats.totalseries);
													logger.info('[DBI] Total languages : ' + stats.totallanguages);
													logger.info('[DBI] Total artists   : ' + stats.totalartists);
													logger.info('[DBI] Total playlists : ' + stats.totalplaylists);
												})
												.catch(function(err) {
													logger.warn('[DBI] Failed to fetch statistics : ' + err);
												});
											logger.info('[DBI] Database interface is READY');
											// Trace event. DO NOT UNCOMMENT
											// unless you want to flood your console.
											/*module.exports._db_handler.on('trace',function(sql){
												console.log(sql);
												
											});*/
											resolve();
										}
									});
							}
							);
						}
					});
				});
		});
	},
	// fermeture des instances SQLITE (unlock les fichiers)
	close:function() {
		module.exports._ready = false;
		return new Promise(function(resolve,reject){
			module.exports._db_handler.close(function(err){
				if(err) {
					console.log(err);
					reject(err);
				} else {
					resolve();
				}
			});
		});
	},

	isReady: function() {
		return module.exports._ready;
	},

	// implémenter ici toutes les méthodes de lecture écritures qui seront utilisé par l'ensemble de l'applicatif
	// aucun autre composant ne doit manipuler la base SQLITE par un autre moyen

	/**
	* @function {Calculate various stats}
	* @return {number} {Object with stats}
	*/
	getStats:function() {
		return new Promise(function(resolve,reject){
			var stats = {};
			if(!module.exports.isReady()) {
				reject('Database interface is not ready yet');
			}

			var pGetSeriesCount = new Promise((resolve) => {
				var sqlCalculateSeriesCount = fs.readFileSync(path.join(__dirname,'../../_common/db/calculate_series_count.sql'),'utf-8');
				module.exports._db_handler.get(sqlCalculateSeriesCount,
					function (err, res) {
						if (err) {
							logger.warn('[DBI] Failed to fetch series count : '+err);
							stats.totalseries = 0;
							resolve();
						} else {
							stats.totalseries = res.seriescount;
							resolve();
						}
					});
			});

			var pGetPlaylistCount = new Promise((resolve) => {
				var sqlCalculatePlaylistCount = fs.readFileSync(path.join(__dirname,'../../_common/db/calculate_playlist_count.sql'),'utf-8');
				module.exports._db_handler.get(sqlCalculatePlaylistCount,
					function (err, res) {
						if (err) {
							logger.warn('[DBI] Failed to fetch playlists count : '+err);
							stats.totalplaylists = 0;
							resolve();
						} else {
							stats.totalplaylists = res.plcount;
							resolve();
						}
					});
			});
			var pGetArtistCount = new Promise((resolve) => {
				var sqlCalculateArtistCount = fs.readFileSync(path.join(__dirname,'../../_common/db/calculate_artist_count.sql'),'utf-8');
				module.exports._db_handler.get(sqlCalculateArtistCount,
					function (err, res) {
						if (err) {
							logger.warn('[DBI] Failed to fetch artists count : '+err);
							stats.totalartists = 0;
							resolve();
						} else {
							stats.totalartists = res.artistcount;
							resolve();
						}
					});
			});
			var pGetKaraCount = new Promise((resolve) => {
				var sqlCalculateKaraCount = fs.readFileSync(path.join(__dirname,'../../_common/db/calculate_kara_count.sql'),'utf-8');
				module.exports._db_handler.get(sqlCalculateKaraCount,
					function (err, res) {
						if (err) {
							logger.error('[DBI] Failed to fetch karaoke count : '+err);
							stats.totalcount = 0;
							resolve();
						} else {
							stats.totalcount = res.karacount;
							resolve();
						}
					});
			});
			var pGetLanguageCount = new Promise((resolve) => {
				var sqlCalculateLanguageCount = fs.readFileSync(path.join(__dirname,'../../_common/db/calculate_lang_count.sql'),'utf-8');
				module.exports._db_handler.get(sqlCalculateLanguageCount,
					function (err, res) {
						if (err) {
							logger.error('[DBI] Failed to fetch language count : '+err);
							stats.totallanguages = 0;
							resolve();
						} else {
							stats.totallanguages = res.langcount;
							resolve();
						}
					});
			});
			var pGetDuration = new Promise((resolve) => {
				var sqlCalculateTotalDuration = fs.readFileSync(path.join(__dirname,'../../_common/db/calculate_total_duration.sql'),'utf-8');
				module.exports._db_handler.get(sqlCalculateTotalDuration,
					function (err, res) {
						if (err) {
							logger.error('[DBI] Failed to fetch duration data : '+err);
							stats.totalduration = 'Unknown';
							resolve();
						} else {
							stats.totalduration = res.totalduration;							
							resolve();
						}
					});
			});

			Promise.all([
				pGetKaraCount,
				pGetDuration,
				pGetSeriesCount,
				pGetLanguageCount,
				pGetArtistCount,
				pGetPlaylistCount
			]).then(function(){
				resolve(stats);
			}).catch(function(){
				reject('Stats general error');
			});
		});
	},
	/**
	* @function {Calculate number of a karaoke songs in a whole playlist}
	* @param  {number} playlist_id {ID of playlist to recalculate number of songs}
	* @return {number} {Number of karaoke songs found}
	*/
	calculatePlaylistNumOfKaras:function(playlist_id) {
		return new Promise(function(resolve,reject){
			if(!module.exports.isReady()) {
				reject('Database interface is not ready yet');
			}
			var sqlCalculatePlaylistNumOfKaras = fs.readFileSync(path.join(__dirname,'../../_common/db/calculate_playlist_numofkaras.sql'),'utf-8');
			module.exports._db_handler.get(sqlCalculatePlaylistNumOfKaras,
				{
					$playlist_id: playlist_id
				}, function (err, num_karas) {
					if (err) {
						reject(__('DB_KARACOUNT_ERROR',JSON.stringify(err)));
					} else {
						resolve(num_karas.NumberOfKaras);
					}
				});
		});
	},
	/**
	* @function {Calculate duration of a whole playlist}
	* @param  {number} playlist_id {ID of playlist to recalculate duration for}
	* @return {object} {duration object (duration.duration = number)}
	*/
	calculatePlaylistDuration:function(playlist_id) {
		return new Promise(function(resolve,reject){
			if(!module.exports.isReady()) {
				reject('Database interface is not ready yet');
			}
			var sqlCalculatePlaylistDuration = fs.readFileSync(path.join(__dirname,'../../_common/db/calculate_playlist_duration.sql'),'utf-8');
			module.exports._db_handler.get(sqlCalculatePlaylistDuration,
				{
					$playlist_id: playlist_id
				}, function (err, duration) {
					if (err) {
						reject('Failed to calculate playlist duration : '+err);
					} else {
						resolve(duration);
					}
				});
			
		});
	},
	/**
	* @function {Generate new blacklist}
	* @return {boolean} {Promise}
	*/
	generateBlacklist:function() {
		return new Promise(function(resolve,reject){
			if(!module.exports.isReady()) {
				reject('Database interface is not ready yet');
			}
			var sqlGenerateBlacklist = fs.readFileSync(path.join(__dirname,'../../_common/db/generate_blacklist.sql'),'utf-8');

			module.exports._db_handler.exec(sqlGenerateBlacklist,
				function (err) {
					if (err) {
						reject('Failed to generate blacklist : '+err);
					} else {
						resolve();
					}
				});
		});
	},
	/**
	* @function {Get list of criterias for blacklist}
	* @return {object} {List of criterias}
	*/
	getBlacklistCriterias:function() {
		return new Promise(function(resolve,reject){
			if(!module.exports.isReady()) {
				reject('Database interface is not ready yet');
			}
			var sqlGetBlacklistCriterias = fs.readFileSync(path.join(__dirname,'../../_common/db/select_blacklist_criterias.sql'),'utf-8');

			module.exports._db_handler.all(sqlGetBlacklistCriterias,
				function (err, blcriterias) {
					if (err) {
						reject('Failed to fetch blacklist criterias :'+err);
					} else {
						resolve(blcriterias);
					}
				});
		});
	},
	/**
	* @function {Add criteria to blacklist}
	* @param {number} {type of criteria}
	* @param {string} {value of criteria}
	* @return {boolean} {promise}
	*/
	addBlacklistCriteria:function(blctype,blcvalue) {
		return new Promise(function(resolve,reject){
			if(!module.exports.isReady()) {
				reject('Database interface is not ready yet');
			}
			var sqlAddBlacklistCriterias = fs.readFileSync(path.join(__dirname,'../../_common/db/insert_blacklist_criteria.sql'),'utf-8');

			module.exports._db_handler.run(sqlAddBlacklistCriterias,
				{
					$blctype: blctype,
					$blcvalue: blcvalue
				},
				function (err) {
					if (err) {
						reject('Failed to add blacklist criteria : '+err);
					} else {
						resolve();
					}
				});
		});
	},
	/**
	* @function {Delete criteria from blacklist}
	* @param {number} {blacklist criteria ID}
	* @return {boolean} {promise}
	*/
	deleteBlacklistCriteria:function(blc_id) {
		return new Promise(function(resolve,reject){
			if(!module.exports.isReady()) {
				logger.error('[DBI] DB_INTERFACE is not ready to work');
				reject('Database interface is not ready yet');
			}
			var sqlDeleteBlacklistCriterias = fs.readFileSync(path.join(__dirname,'../../_common/db/delete_blacklist_criteria.sql'),'utf-8');

			module.exports._db_handler.run(sqlDeleteBlacklistCriterias,
				{
					$blc_id: blc_id
				},
				function (err) {
					if (err) {
						reject('Failed to delete blacklist criteria : '+err);
					} else {
						resolve();
					}
				});
		});
	},
	/**
	* @function {Edit criteria from blacklist}
	* @param {number} {blacklist criteria ID}
	* @param {number} {blacklist criteria type}
	* @param {string} {blacklist criteria value}
	* @return {boolean} {promise}
	*/
	editBlacklistCriteria:function(blc_id,blctype,blcvalue) {
		return new Promise(function(resolve,reject){
			if(!module.exports.isReady()) {
				reject('Database interface is not ready yet');
			}
			var sqlEditBlacklistCriteria = fs.readFileSync(path.join(__dirname,'../../_common/db/edit_blacklist_criteria.sql'),'utf-8');

			module.exports._db_handler.run(sqlEditBlacklistCriteria,
				{
					$blc_id: blc_id,
					$blctype: blctype,
					$blcvalue: blcvalue
				},
				function (err) {
					if (err) {
						reject('Failed to edit blacklist criteria '+err);
					} else {
						resolve();
					}
				});
		});
	},
	updatePlaylistNumOfKaras:function(playlist_id,num_karas) {
		return new Promise(function(resolve,reject){
			if(!module.exports.isReady()) {
				reject('Database interface is not ready yet');
			}
			var sqlUpdatePlaylistNumOfKaras = fs.readFileSync(path.join(__dirname,'../../_common/db/update_playlist_numofkaras.sql'),'utf-8');
			module.exports._db_handler.run(sqlUpdatePlaylistNumOfKaras,
				{
					$playlist_id: playlist_id,
					$num_karas: num_karas
				}, function (err) {
					if (err) {
						reject('Failed to update song count in playlist '+playlist_id+' : '+err);
					} else {
						resolve(num_karas);
					}
				});
		});
	},
	/**
	* @function {Reorders playlist item positions}
	* @param  {number} playlist_id {ID of playlist to reorder}
	* @param  {array} playlist   {Playlist array of kara objects}
	* @return {boolean} {Promise}
	*/
	reorderPlaylist:function(playlist_id,playlist) {
		return new Promise(function(resolve,reject){
			if(!module.exports.isReady()) {
				reject('Database interface is not ready yet');
			}
			var sqlUpdateKaraPosition = fs.readFileSync(path.join(__dirname,'../../_common/db/update_plc_set_pos.sql'),'utf-8');

			var newpos = 0;
			var stmt_updateKaraPosition = module.exports._db_handler.prepare(sqlUpdateKaraPosition);
			var karaList = [];
			playlist.forEach(function(kara) {				
				newpos++;
				karaList.push({
					$pos: newpos,	
					$playlistcontent_id: kara.playlistcontent_id
				});
			});
			module.exports._db_handler.serialize(function() {		
				async.retry(
					{ 
						times: 5,
						interval: 100,
					},
					function(callback){
						module.exports._db_handler.run('begin transaction', function(err) {
							if (err) {
								logger.error('[DBI] Failed to begin transaction : '+err);
								logger.error('[DBI] Transaction will be retried');
								callback(err);
							} else {
								async.each(karaList,function(data,callback){
									stmt_updateKaraPosition.run(data,function(err){
										if (err) {
											logger.error('Failed to reorder karaoke in playlist : '+err);
											callback(err);					
										} else {
											callback();
										}						
									});
								}, function(err){
									if (err) {
										callback('Failed to reorder one karaoke to playlist : '+err);
									} else {
										module.exports._db_handler.run('commit', function(err) {
											if (err) {
												callback(err);
											} else {
												// Close all statements just to be sure.
												stmt_updateKaraPosition.finalize();
												callback();
											}				
										});											
									}
								});						
							}
						});
					},function(err){
						if (err){
							reject(err);
						} else {
							resolve();
						}
					});
			});						
		});
	},
	/**
	* @function {Update playlist's duration field}
	* @param  {number} playlist_id {ID of playlist to update}
	* @param  {number} duration    {Duration in seconds}
	* @return {boolean} {Promise}
	*/
	updatePlaylistDuration:function(playlist_id,duration) {
		return new Promise(function(resolve,reject){
			if(!module.exports.isReady()) {
				reject('Database interface is not ready yet');
			}
			var sqlUpdatePlaylistDuration = fs.readFileSync(path.join(__dirname,'../../_common/db/update_playlist_duration.sql'),'utf-8');
			module.exports._db_handler.run(sqlUpdatePlaylistDuration,
				{
					$playlist_id: playlist_id,
					$duration: duration
				}, function (err) {
					if (err) {
						reject('Failed to update duration of playlist '+playlist_id+' : '+err);
					} else {
						resolve(duration);
					}
				});
		});
	},
	/**
	* @function {Get contents of playlist}
	* @param  {number} playlist_id {ID of playlist to get a list of songs from}
	* @param  {number} forPlayer (if it's for the player, we get a smaller set of data)
	* @return {Object} {Playlist object}
	*/
	getPlaylistContents:function(playlist_id,forPlayer){
		return new Promise(function(resolve,reject){
			if(!module.exports.isReady()) {
				reject('Database interface is not ready yet');
			}
			var sqlGetPlaylistContents;
			if (forPlayer) {
				sqlGetPlaylistContents = fs.readFileSync(path.join(__dirname,'../../_common/db/select_playlist_contents_for_player.sql'),'utf-8');
			} else {
				sqlGetPlaylistContents = fs.readFileSync(path.join(__dirname,'../../_common/db/select_playlist_contents.sql'),'utf-8');
			}
			
			module.exports._db_handler.serialize(function(){
				module.exports._db_handler.all(sqlGetPlaylistContents,
					{
						$playlist_id: playlist_id
					}, function (err, playlist) {
						if (err) {
							reject('Failed to get contents of playlist '+playlist_id+' : '+err);
						} else {
							resolve(playlist);
						}
					});
			});
		});
	},	
	/**
	* @function {Get PLC of kara by date added}
	* @param  {number} playlist_id {ID of playlist to get a list of songs from}
	* @param  {number} date_added {Date in unix timestamp}
	* @return {Object} {Playlist object}
	*/
	getPLCIDByDate:function(playlist_id,date_added){
		return new Promise(function(resolve,reject){
			if(!module.exports.isReady()) {
				reject('Database interface is not ready yet');
			}
			var sqlGetPLCIDByDate = fs.readFileSync(path.join(__dirname,'../../_common/db/select_plcid_by_date.sql'),'utf-8');
			module.exports._db_handler.all(sqlGetPLCIDByDate,
				{
					$playlist_id: playlist_id,
					$date_added: date_added
				}, function (err, plcid) {
					if (err) {
						reject('Failed to get PLCID from '+playlist_id+' with date '+date_added+' : '+err);
					} else {												
						resolve(plcid[0].playlistcontent_id);
					}
				});			
		});
	},	
	/**
	* @function {Get all playlist contents no matter the playlist}
	* @return {Object} {Playlist object}
	*/
	getAllPlaylistContents:function(){
		return new Promise(function(resolve,reject){
			if(!module.exports.isReady()) {
				reject('Database interface is not ready yet');
			}			
			var sqlGetAllPlaylistContents = fs.readFileSync(path.join(__dirname,'../../_common/db/select_all_playlist_contents.sql'),'utf-8');
			module.exports._db_handler.all(sqlGetAllPlaylistContents,
				function (err, playlist) {
					if (err) {
						reject('Failed to get all playlists contents : '+err);
					} else {
						resolve(playlist);
					}
				});
		});
	},
	/**
	* @function {Get contents of whitelist}
	* @return {Object} {Playlist object}
	*/
	getWhitelistContents:function(){
		return new Promise(function(resolve,reject){
			if(!module.exports.isReady()) {
				reject('Database interface is not ready yet');
			}
			var sqlGetWhitelistContents = fs.readFileSync(path.join(__dirname,'../../_common/db/select_whitelist_contents.sql'),'utf-8');
			module.exports._db_handler.all(sqlGetWhitelistContents,
				function (err, playlist) {
					if (err) {
						reject('Failed to get whitelist contents :'+err);
					} else {
						resolve(playlist);
					}
				});
		});
	},
	/**
	* @function {Get contents of blacklist}
	* @return {Object} {Playlist object}
	*/
	getBlacklistContents:function(){
		return new Promise(function(resolve,reject){
			if(!module.exports.isReady()) {
				reject('Database interface is not ready yet');
			}
			var sqlGetBlacklistContents = fs.readFileSync(path.join(__dirname,'../../_common/db/select_blacklist_contents.sql'),'utf-8');
			module.exports._db_handler.all(sqlGetBlacklistContents,
				function (err, playlist) {
					if (err) {
						reject('Failed to get blacklist contents :'+err);
					} else {
						resolve(playlist);
					}
				});
		});
	},
	/**
	* @function {Get all karaokes}
	* @return {array} {array of karaoke objects}
	*/
	getAllKaras:function(){
		return new Promise(function(resolve,reject){
			if(!module.exports.isReady()) {
				reject('Database interface is not ready yet');
			}
			var sqlGetAllKaras = fs.readFileSync(path.join(__dirname,'../../_common/db/select_all_karas.sql'),'utf-8');
			module.exports._db_handler.all(sqlGetAllKaras,
				function (err, playlist) {
					if (err) {
						reject('Failed to fetch all karaokes : '+err);
					} else {
						resolve(playlist);
					}
				});
		});
	},
	/**
	* @function {Get karaoke info from a playlistcontent_id}
	* @return {object} {Karaoke object}
	*/
	getPLContentInfo:function(playlistcontent_id,seenFromUser){
		return new Promise(function(resolve,reject){
			if(!module.exports.isReady()) {
				reject('Database interface is not ready yet');
			}
			var sqlGetPLContentInfo = fs.readFileSync(path.join(__dirname,'../../_common/db/select_plcontent_info.sql'),'utf-8');
			if (seenFromUser) {
				sqlGetPLContentInfo += ' AND p.flag_visible = 1';
			}
			module.exports._db_handler.get(sqlGetPLContentInfo,
				{
					$playlistcontent_id: playlistcontent_id
				},
				function (err, kara) {
					if (err) {
						reject('Failed to get playlist item '+playlistcontent_id+'\'s information : '+err);
					} else {
						resolve(kara);
					}
				});
		});
	},
	/**
	* @function {Get one karaoke}
	* @param  {number} kara_id {Karaoke ID}
	* @return {Object} {karaoke object}
	*/
	getKara:function(kara_id){
		return new Promise(function(resolve,reject){
			if(!module.exports.isReady()) {
				reject('Database interface is not ready yet');
			}

			var sqlGetKara = fs.readFileSync(path.join(__dirname,'../../_common/db/select_kara.sql'),'utf-8');
			module.exports._db_handler.get(sqlGetKara,
				{
					$kara_id: kara_id
				},
				function (err, kara) {
					if (err) {
						reject('Failed to get karaoke song '+kara_id+' information : '+err);
					} else {
						resolve(kara);
					}
				});
		});
	},
	/**
	* @function {Get one karaoke's ASS data}
	* @param  {number} kara_id {Karaoke ID}
	* @return {Object} {ASS Object}
	*/
	getASS:function(kara_id){
		return new Promise(function(resolve,reject){
			if(!module.exports.isReady()) {
				reject('Database interface is not ready yet');
			}

			var sqlGetASS = fs.readFileSync(path.join(__dirname,'../../_common/db/select_ass.sql'),'utf-8');
			module.exports._db_handler.get(sqlGetASS,
				{
					$kara_id: kara_id
				},
				function (err, ass) {
					if (err) {
						reject('Failed to get karaoke song '+kara_id+' ASS : '+err);
					} else {
						resolve(ass);
					}
				});
		});
	},
	/**
	* @function {Get one karaoke by KID}
	* @param  {string} kid {KID}
	* @return {Object} {karaoke object}
	*/
	getKaraByKID:function(kid){
		return new Promise(function(resolve,reject){
			if(!module.exports.isReady()) {
				reject('Database interface is not ready yet');
			}

			var sqlGetKaraByKID = fs.readFileSync(path.join(__dirname,'../../_common/db/select_kara_by_kid.sql'),'utf-8');
			module.exports._db_handler.get(sqlGetKaraByKID,
				{
					$kid: kid
				},
				function (err, kara) {
					if (err) {
						reject('Failed to get karaoke song '+kid+' information : '+err);
					} else {
						resolve(kara);
					}
				});
		});
	},
	/**
	* @function {Get one PLC by KID}
	* @param  {string} kid {KID}
	* @param  {string} playlist_id {playlist ID}
	* @return {Object} {karaoke object}
	*/
	getPLCByKID:function(kid,playlist_id){
		return new Promise(function(resolve,reject){
			if(!module.exports.isReady()) {
				reject('Database interface is not ready yet');
			}			
			var sqlGetPLCByKID = fs.readFileSync(path.join(__dirname,'../../_common/db/select_plcontent_by_kid.sql'),'utf-8');
			module.exports._db_handler.get(sqlGetPLCByKID,
				{
					$kid: kid,
					$playlist_id: playlist_id
				},
				function (err, kara) {					
					if (err) {
						reject('Failed to get PLC song '+kid+' information : '+err);
					} else {
						resolve(kara);
					}
				});
		});
	},
	/**
	* @function {Get one tag}
	* @param  {number} tag_id {tag ID}
	* @return {string} {name of tag}
	*/
	getTag:function(tag_id){
		return new Promise(function(resolve,reject){
			if(!module.exports.isReady()) {
				reject('Database interface is not ready yet');
			}

			var sqlGetTag = fs.readFileSync(path.join(__dirname,'../../_common/db/select_tag.sql'),'utf-8');
			module.exports._db_handler.get(sqlGetTag,
				{
					$tag_id: tag_id
				},
				function (err, tag) {
					if (err) {
						reject('Failed to get tag '+tag_id+' information : '+err);
					} else {	
						if (!tag) {
							reject('Tag '+tag_id+' unknown');
						} else {
							resolve(tag.name);
						}											
					}
				});
		});
	},
	/**
	* @function {Get all tags}	
	* @return {string} {array of tags}
	*/
	getAllTags:function(){
		return new Promise(function(resolve,reject){			
			if(!module.exports.isReady()) {
				reject('Database interface is not ready yet');
			}

			var sqlGetTags = fs.readFileSync(path.join(__dirname,'../../_common/db/select_all_tags.sql'),'utf-8');
			module.exports._db_handler.all(sqlGetTags,
				function (err, tags) {
					if (err) {
						reject('Failed to get tags information : '+err);
					} else {	
						resolve(tags);
					}
				});
		});
	},
	/**
	* @function {getPlaylistInfo}
	* @param  {number} playlist_id {Playlist ID}
	* @return {Object} {Playlist object}
	* Selects playlist info from playlist table. Returns the info in a promise.
	*/
	getPlaylistInfo:function(playlist_id,seenFromUser) {
		return new Promise(function(resolve,reject){
			var sqlGetPlaylistInfo = fs.readFileSync(path.join(__dirname,'../../_common/db/select_playlist_info.sql'),'utf-8');
			if (seenFromUser) {
				sqlGetPlaylistInfo += ' AND flag_visible = 1';
			}
			module.exports._db_handler.get(sqlGetPlaylistInfo,
				{
					$playlist_id: playlist_id
				}, function (err, row) {
					if (err) {
						reject('Failed to fetch playlist '+playlist_id+' information : '+err);
					} else {
						if (row) {
							resolve(row);
						} else {
							reject('Playlist '+playlist_id+' not found');
						}
					}
				});
		});
	},
	/**
	* @function {getPlaylists}
	* @return {Object} {Array of Playlist objects}
	* Selects playlist info from playlist table. Returns the info in a promise
	*/
	getPlaylists:function(seenFromUser) {
		return new Promise(function(resolve,reject){
			var sqlGetPlaylists = fs.readFileSync(path.join(__dirname,'../../_common/db/select_all_playlists_info.sql'),'utf-8');
			// If seen from the user/public view, we're only showing playlists with
			// visible flag
			if (seenFromUser) {
				sqlGetPlaylists += ' WHERE flag_visible = 1 ORDER BY flag_current DESC, flag_public DESC, name';
			} else {
				sqlGetPlaylists += ' ORDER BY flag_current DESC, flag_public DESC, name';
			}
			module.exports._db_handler.all(sqlGetPlaylists,
				function (err, playlists) {
					if (err) {
						logger.error('[DBI] Failed to fetch list of playlists : '+err);
						reject(err);
					} else {
						resolve(playlists);
					}
				});
		});
	},
	/**
	* @function {Checks for a current playlist}
	* @return {boolean} {Promise}
	*/
	isACurrentPlaylist:function() {
		return new Promise(function(resolve,reject){
			if(!module.exports.isReady()) {
				reject('Database interface is not ready yet');
			}
			var sqlTestCurrentPlaylistExists = fs.readFileSync(path.join(__dirname,'../../_common/db/test_current_playlist_exists.sql'),'utf-8');
			module.exports._db_handler.get(sqlTestCurrentPlaylistExists,
				function (err, row) {
					if (err) {
						logger.error('[DBI] Failed to find out if there is a current playlist : '+err);
						reject();
					} else {
						if (row) {
							resolve(row.pk_id_playlist);
						} else {
							reject();
						}
					}
				});
		});
	},
	/**
	* @function {Checks for a public playlist}
	* @return {number} {Playlist ID or rejection}
	*/
	isAPublicPlaylist:function() {
		return new Promise(function(resolve,reject){
			if(!module.exports.isReady()) {
				reject('Database interface is not ready yet');
			}
			var sqlTestPublicPlaylistExists = fs.readFileSync(path.join(__dirname,'../../_common/db/test_public_playlist_exists.sql'),'utf-8');
			module.exports._db_handler.get(sqlTestPublicPlaylistExists,
				function (err, row) {
					if (err) {
						logger.error('[DBI] Failed to find out if there is a public playlist : '+err);
						reject();
					} else {
						if (row) {
							resolve(row.pk_id_playlist);
						} else {
							reject();
						}
					}
				});
		});
	},
	isPublicPlaylist:function(playlist_id) {
		return new Promise(function(resolve,reject){
			var sqlIsPlaylistPublic = fs.readFileSync(path.join(__dirname,'../../_common/db/select_playlist_public_flag.sql'),'utf-8');
			module.exports._db_handler.get(sqlIsPlaylistPublic,
				{
					$playlist_id: playlist_id
				}, function (err, row) {
					if (err) {
						reject('Failed to test if playlist '+playlist_id+' is public or not : '+err);
					} else {
						if (row) {
							if (row.flag_public == 1) {
								resolve(true);
							} else {
								resolve(false);
							}
						} else {
							reject(__('DB_PLAYLIST_UNKNOWN',playlist_id));
						}
					}
				});
		});
	},
	isCurrentPlaylist:function(playlist_id) {
		return new Promise(function(resolve,reject){
			var sqlIsPlaylistCurrent = fs.readFileSync(path.join(__dirname,'../../_common/db/select_playlist_current_flag.sql'),'utf-8');
			module.exports._db_handler.get(sqlIsPlaylistCurrent,
				{
					$playlist_id: playlist_id
				}, function (err, row) {
					if (err) {
						reject('Failed to test if playlist '+playlist_id+' is current or not : '+err);
					} else {
						if (row) {
							if (row.flag_current == 1) {
								resolve(true);
							} else {
								resolve(false);
							}
						} else {
							reject();
						}
					}
				});
		});
	},
	/**
	* @function {is it a kara?}
	* @param  {number} kara_id {Karaoke ID to check for existence}
	* @return {type} {Returns true or false}
	*/
	isKara:function(kara_id) {
		return new Promise(function(resolve,reject){
			var sqlIsKara = fs.readFileSync(path.join(__dirname,'../../_common/db/test_kara.sql'),'utf-8');
			module.exports._db_handler.get(sqlIsKara,
				{
					$kara_id: kara_id
				}, function (err, row) {
					if (err) {
						reject('Failed to test if karaoke '+kara_id+' exists : '+err);
					} else {
						if (row) {
							resolve(true);
						} else {
							resolve(false);
						}
					}
				});
		});
	},
	/**
	* @function {is blacklist criteria?}
	* @param  {number} blc_id {BL criteria ID to check}
	* @return {type} {Returns true or false}
	*/
	isBLCriteria:function(blc_id) {
		return new Promise(function(resolve,reject){
			var sqlIsBLC = fs.readFileSync(path.join(__dirname,'../../_common/db/test_blacklist_criteria.sql'),'utf-8');
			module.exports._db_handler.get(sqlIsBLC,
				{
					$blc_id: blc_id
				}, function (err, row) {
					if (err) {
						reject('Failed to test if blacklist criteria '+blc_id+' exists : '+err);
					} else {
						if (row) {
							resolve();
						} else {
							reject();
						}
					}
				});
		});
	},
	/**
	* @function {is whitelist?}
	* @param  {number} wlc_id {WLC ID to check}
	* @return {promise} {Promise}
	*/
	isWLC:function(wlc_id) {
		return new Promise(function(resolve,reject){
			var sqlIsWLC = fs.readFileSync(path.join(__dirname,'../../_common/db/test_whitelist.sql'),'utf-8');
			module.exports._db_handler.get(sqlIsWLC,
				{
					$wlc_id: wlc_id
				}, function (err, row) {
					if (err) {
						reject('Failed to test if whitelist item '+wlc_id+' exists : '+err);
					} else {
						if (row) {
							resolve();
						} else {
							reject();
						}
					}
				});
		});
	},
	/**
	* @function {Raises position of a song in playlist}
	* @param  {number} playlist_id        {ID of playlist to modify}
	* @param  {number} pos        {Position to modify}
	* @return {promise} {Promise}
	*/
	raisePosInPlaylist:function(pos,playlist_id) {
		return new Promise(function(resolve,reject){
			if(!module.exports.isReady()) {
				reject('Database interface is not ready yet');
			}

			var newpos = pos + 0.1;
			var sqlRaisePosInPlaylist = fs.readFileSync(path.join(__dirname,'../../_common/db/update_raise_pos_in_playlist.sql'),'utf-8');
			module.exports._db_handler.run(sqlRaisePosInPlaylist,
				{
					$newpos: newpos,
					$playlist_id: playlist_id,
					$pos: pos
				}, function (err) {
					if (err) {
						reject('Failed to update position in playlist '+playlist_id+' : '+err);
					} else {
						resolve();
					}
				});
		});
	},	
	/**
	* @function {Is the kara in the playlist?}
	* @param  {number} kara_id {ID of karaoke to search for}
	* @param  {number} playlist_id {ID of playlist to search in}
	* @return {boolean} {Promise}
	*/
	isKaraInPlaylist:function(kara_id,playlist_id) {
		return new Promise(function(resolve,reject){
			var sqlIsKaraInPlaylist = fs.readFileSync(path.join(__dirname,'../../_common/db/test_kara_in_playlist.sql'),'utf-8');
			module.exports._db_handler.get(sqlIsKaraInPlaylist,
				{
					$kara_id: kara_id,
					$playlist_id: playlist_id
				}, function (err, row) {
					if (err) {
						reject('Failed to find if karaoke song '+kara_id+' is in playlist '+playlist_id+' or not : '+err);
					} else {
						if (row) {							
							resolve(true);
						} else {
							resolve(false);
						}
					}
				});
		});
	},
	/**
	* @function {Is the kara in the blacklist?}
	* @param  {number} kara_id {ID of karaoke to search for}
	* @return {boolean} {Promise}
	*/
	isKaraInBlacklist:function(kara_id) {
		return new Promise(function(resolve,reject){
			var sqlIsKaraInBlacklist = fs.readFileSync(path.join(__dirname,'../../_common/db/test_kara_in_blacklist.sql'),'utf-8');
			module.exports._db_handler.get(sqlIsKaraInBlacklist,
				{
					$kara_id: kara_id,
				}, function (err, row) {
					if (err) {
						reject('Failed to search for karaoke '+kara_id+' in blacklist : '+err);
					} else {
						if (row) {
							resolve(true);
						} else {
							resolve(false);
						}
					}
				});
		});
	},
	/**
	* @function {Is the kara in the whitelist?}
	* @param  {number} kara_id {ID of karaoke to search for}
	* @return {boolean} {Promise}
	*/
	isKaraInWhitelist:function(kara_id) {
		return new Promise(function(resolve,reject){
			var sqlIsKaraInWhitelist = fs.readFileSync(path.join(__dirname,'../../_common/db/test_kara_in_whitelist.sql'),'utf-8');
			module.exports._db_handler.get(sqlIsKaraInWhitelist,
				{
					$kara_id: kara_id
				}, function (err, row) {
					if (err) {
						reject('Failed to search for karaoke '+kara_id+' in whitelist : '+err);
					} else {
						if (row) {
							resolve(true);
						} else {
							resolve(false);
						}
					}
				});
		});
	},
	/**
	* @function {is it a playlist?}
	* @param  {number} playlist_id {Playlist ID to check for existence}
	* @return {type} {Returns true or false}
	*/
	isPlaylist:function(playlist_id,seenFromUser) {
		return new Promise(function(resolve,reject){
			var sqlIsPlaylist = fs.readFileSync(path.join(__dirname,'../../_common/db/test_playlist.sql'),'utf-8');
			if (seenFromUser) {
				sqlIsPlaylist += ' AND flag_visible = 1';
			}
			module.exports._db_handler.get(sqlIsPlaylist,
				{
					$playlist_id: playlist_id
				}, function (err, row) {
					if (err) {
						reject('Failed to test if playlist '+playlist_id+' exists : '+err);
					} else {
						if (row) {
							resolve(true);
						} else {
							resolve(false);
						}
					}
				});
		});
	},
	/**
	* @function {Does the playlist have a flag_playing set inside it?}
	* @param  {number} playlist_id {Playlist ID to check}
	* @return {type} {Returns true or false}
	*/
	isPlaylistFlagPlaying:function(playlist_id) {
		return new Promise(function(resolve,reject){
			var sqlIsPlaylistFlagPlaying = fs.readFileSync(path.join(__dirname,'../../_common/db/test_playlist_flag_playing.sql'),'utf-8');
			module.exports._db_handler.get(sqlIsPlaylistFlagPlaying,
				{
					$playlist_id: playlist_id
				}, function (err, row) {
					if (err) {
						reject('Failed to test if playlist '+playlist_id+' has a flag_playing song : '+err);
					} else {
						if (row) {
							resolve(true);
						} else {
							resolve(false);
						}
					}
				});
		});
	},
	setCurrentPlaylist:function(playlist_id) {
		return new Promise(function(resolve,reject){
			var sqlSetCurrentPlaylist = fs.readFileSync(path.join(__dirname,'../../_common/db/update_playlist_set_current.sql'),'utf-8');
			module.exports._db_handler.run(sqlSetCurrentPlaylist,
				{
					$playlist_id: playlist_id
				}, function (err, rep) {
					if (err) {
						reject('Failed to set current flag on playlist '+playlist_id+' : '+err);
					} else {
						resolve(rep);
					}
				});
		});
	},
	/**
	* @function {setVisiblePlaylist}
	* @param  {number} playlist_id {ID of playlist to make visible}
	* @return {string} {error}
	*/
	setVisiblePlaylist:function(playlist_id) {
		return new Promise(function(resolve,reject){
			var sqlSetVisiblePlaylist = fs.readFileSync(path.join(__dirname,'../../_common/db/update_playlist_set_visible.sql'),'utf-8');
			module.exports._db_handler.run(sqlSetVisiblePlaylist,
				{
					$playlist_id: playlist_id
				}, function (err, rep) {
					if (err) {
						reject('Failed to set visible flag on playlist '+playlist_id+' : '+err);
					} else {
						resolve(rep);
					}
				});
		});
	},
	/**
	* @function {unsets Flag Playing on a playlist}
	* @param  {number} playlist_id {ID of playlist where to unset the flag}
	* @return {string} {error}
	*/
	unsetPlaying:function(playlist_id) {
		return new Promise(function(resolve,reject){

			//Unset playing flag everywhere on this playlist
			var sqlUnsetPlaying = fs.readFileSync(path.join(__dirname,'../../_common/db/update_plc_unset_playing.sql'),'utf-8');
			module.exports._db_handler.run(sqlUnsetPlaying,
				{
					$playlist_id: playlist_id
				}, function (err) {
					if (err) {
						reject(err);
					} else {
						resolve();
					}
				});
		});
	},
	/**
	* @function {Sets Flag Playing on a PL content}
	* @param  {number} playlistcontent_id {ID of playlist content to set to playing}
	* @return {string} {error}
	*/
	setPlaying:function(playlistcontent_id,playlist_id) {
		return new Promise(function(resolve,reject){

			//Unset playing flag everywhere on this playlist
			module.exports.unsetPlaying(playlist_id)
				.then(function() {
					var sqlSetPlaying = fs.readFileSync(path.join(__dirname,'../../_common/db/update_plc_set_playing.sql'),'utf-8');
					module.exports._db_handler.run(sqlSetPlaying,
						{
							$playlistcontent_id: playlistcontent_id
						}, function (err) {
							if (err) {
								reject(err);
							} else {
								resolve();
							}
						});
				})
				.catch(function(err){
					reject(err);
				});
		});
	},
	/**
	* @function {Sets Flag Playing on a PL content}
	* @param  {number} playlistcontent_id {ID of playlist content to set to playing}
	* @return {string} {error}
	*/
	setPos:function(playlistcontent_id,pos) {
		return new Promise(function(resolve,reject){

			//Unset playing flag everywhere on this playlist
			var sqlSetPos = fs.readFileSync(path.join(__dirname,'../../_common/db/update_plc_set_pos.sql'),'utf-8');
			module.exports._db_handler.run(sqlSetPos,
				{
					$playlistcontent_id: playlistcontent_id,
					$pos: pos
				}, function (err) {
					if (err) {
						reject(err);
					} else {
						resolve();
					}
				});
		});
	},
	/**
	* @function {unsetVisiblePlaylist}
	* @param  {number} playlist_id {ID of playlist to make invisible}
	* @return {string} {error}
	*/
	unsetVisiblePlaylist:function(playlist_id) {
		return new Promise(function(resolve,reject){
			var sqlUnsetVisiblePlaylist = fs.readFileSync(path.join(__dirname,'../../_common/db/update_playlist_unset_visible.sql'),'utf-8');
			module.exports._db_handler.run(sqlUnsetVisiblePlaylist,
				{
					$playlist_id: playlist_id
				}, function (err, rep) {
					if (err) {
						reject('Failed to unset visible flag on playlist '+playlist_id+' : '+err);
					} else {
						resolve(rep);
					}
				});
		});
	},
	setPublicPlaylist:function(playlist_id) {
		return new Promise(function(resolve,reject){
			var sqlSetPublicPlaylist = fs.readFileSync(path.join(__dirname,'../../_common/db/update_playlist_set_public.sql'),'utf-8');
			module.exports._db_handler.run(sqlSetPublicPlaylist,
				{
					$playlist_id: playlist_id
				}, function (err, rep) {
					if (err) {
						reject('Failed to set public flag on playlist '+playlist_id+' : '+err);
					} else {
						resolve(rep);
					}
				});
		});
	},
	unsetPublicAllPlaylists:function() {
		return new Promise(function(resolve,reject){
			if(!module.exports.isReady()) {
				reject('Database interface is not ready yet');
			}

			var sqlUpdatePlaylistsUnsetPublic = fs.readFileSync(path.join(__dirname,'../../_common/db/update_playlist_unset_public.sql'),'utf-8');
			module.exports._db_handler.exec(sqlUpdatePlaylistsUnsetPublic, function (err) {
				if (err) {
					reject('Failed to unset public flag on all playlists : '+err);
				} else {
					resolve();
				}
			});
		});
	},
	updatePlaylistLastEditTime:function(playlist_id,lastEditTime) {
		return new Promise(function(resolve,reject){
			if(!module.exports.isReady()) {
				reject('Database interface is not ready yet');
			}

			var sqlUpdatePlaylistLastEditTime = fs.readFileSync(path.join(__dirname,'../../_common/db/update_playlist_last_edit_time.sql'),'utf-8');
			module.exports._db_handler.run(sqlUpdatePlaylistLastEditTime,
				{
					$playlist_id: playlist_id,
					$modified_at: lastEditTime
				}, function (err) {
					if (err) {
						reject('Failed to set last edit time on playlist '+playlist_id+' : '+err);
					} else {
						resolve();
					}
				});
		});
	},
	unsetCurrentAllPlaylists:function() {
		return new Promise(function(resolve,reject){
			if(!module.exports.isReady()) {
				reject('Database interface is not ready yet');
			}

			var sqlUpdatePlaylistsUnsetCurrent = fs.readFileSync(path.join(__dirname,'../../_common/db/update_playlist_unset_current.sql'),'utf-8');
			module.exports._db_handler.exec(sqlUpdatePlaylistsUnsetCurrent, function (err) {
				if (err) {
					reject('Failed to unset current flag on all playlists : '+err);
				} else {
					resolve();
				}
			});
		});
	},
	/**
	* @function {Empties a playlist}
	* @param  {number} playlist_id {ID of playlist}
	* @return {Promise} {yakusoku da yo}
	*/
	emptyPlaylist:function(playlist_id) {
		return new Promise(function(resolve,reject){
			// Empties playlist
			var sqlEmptyPlaylist = fs.readFileSync(path.join(__dirname,'../../_common/db/empty_playlist.sql'),'utf-8');
			module.exports._db_handler.run(sqlEmptyPlaylist,
				{
					$playlist_id: playlist_id
				}, function(err) {
					if (err) {
						logger.error('[DBI] Failed to empty playlist '+playlist_id+' : '+err);
						reject(err);
					} else {
						resolve();
					}
				});
		});
	},
	/**
	* @function {Empties whitelist}
	* @return {Promise} {yakusoku da yo}
	*/
	emptyWhitelist:function() {
		return new Promise(function(resolve,reject){
			var sqlEmptyWhitelist = fs.readFileSync(path.join(__dirname,'../../_common/db/empty_whitelist.sql'),'utf-8');
			module.exports._db_handler.run(sqlEmptyWhitelist,function(err) {
				if (err) {
					logger.error('[DBI] Failed to empty whitelist : '+err);
					reject(err);
				} else {
					resolve();
				}
			});
		});
	},
	/**
	* @function {Empties blacklist Criterias}
	* @return {Promise} {yakusoku da yo}
	*/
	emptyBlacklistCriterias:function() {
		return new Promise(function(resolve,reject){
			var sqlEmptyBlacklistCriterias = fs.readFileSync(path.join(__dirname,'../../_common/db/empty_blacklist_criterias.sql'),'utf-8');
			module.exports._db_handler.run(sqlEmptyBlacklistCriterias,function(err) {
				if (err) {
					logger.error('[DBI] Failed to empty blacklist criterias : '+err);
					reject(err);
				} else {
					resolve();
				}
			});
		});
	},
	/**
	* @function {Deletes a playlist}
	* @param  {number} playlist_id {ID of playlist}
	* @return {Promise} {yakusoku da yo}
	*/
	deletePlaylist:function(playlist_id) {
		return new Promise(function(resolve,reject){
			var sqlDeletePlaylist = fs.readFileSync(path.join(__dirname,'../../_common/db/delete_playlist.sql'),'utf-8');
			module.exports._db_handler.run(sqlDeletePlaylist,
				{
					$playlist_id: playlist_id
				}, function(err) {
					if (err) {
						logger.error('[DBI] Failed to delete playlist '+playlist_id+' : '+err);
						reject();
					}
					resolve();
				});
		});
	},
	/**
	* @function {Adds one viewcount entry to table}
	* @param  {number} kara_id  {Database ID of Kara to add a VC to}
	* @param  {string} kid      {KID provided}
	* @param  {number} datetime {date and time in unix timestamp}
	* @return {promise} {promise}
	*/
	addViewcount:function(kara_id,kid,datetime) {
		return new Promise(function(resolve,reject){
			if(!module.exports.isReady()) {
				logger.error('[DBI] Database interface is not ready yet!');
				reject();
			}
			var sqlAddViewcount = fs.readFileSync(path.join(__dirname,'../../_common/db/add_viewcount.sql'),'utf-8');
			module.exports._db_handler.run(sqlAddViewcount,
				{
					$kara_id: kara_id,
					$kid: kid,
					$modified_at: datetime
				}, function (err) {
					if (err) {
						logger.error('[DBI] Failed to add viewcount for karaoke '+kara_id+' : '+err);
						reject(err);					
					} else {
						resolve();
					}
				});
		});
	},
	updateTotalViewcounts:function(kid) {
		return new Promise(function(resolve,reject){
			if(!module.exports.isReady()) {
				logger.error('[DBI] Database interface is not ready yet!');
				reject();
			}
			var sqlCalculateViewcount = fs.readFileSync(path.join(__dirname,'../../_common/db/calculate_viewcount.sql'),'utf-8');
			module.exports._db_handler.run(sqlCalculateViewcount,
				{
					$kid: kid
				}, function (err) {
					if (err) {
						logger.error('[DBI] Failed to calculate viewcount for karaoke ID '+kid+' : '+err);
						reject(err);					
					} else {
						resolve();
					}
				});
		});
	},
	/**
	* @function {Edit Playlist query function}
	* @param  {number} playlist_id   {Playlist ID}
	* @param  {string} name          {Name of playlist}
	* @param  {string} NORM_name     {Normalized name of playlist (without accents)}
	* @param  {number} lastedit_time {Last modification date in Unix timestamp}
	* @param  {number} flag_visible  {Is the playlist visible?}
	* @param  {number} flag_current  {Is the playlist the current one?}
	* @param  {number} flag_public   {Is the playlist the public one?}
	* @return {boolean} {true if created succesfully, false otherwise}
	*/
	editPlaylist:function(playlist_id,name,NORM_name,lastedit_time,flag_visible,flag_current,flag_public) {
		logger.debug('[DBI] editPlaylist : args : '+JSON.stringify(arguments));
		return new Promise(function(resolve,reject){
			if(!module.exports.isReady()) {
				logger.error('[DBI] Database interface is not ready yet!');
				reject();
			}

			// Edition de la playlist
			// Prend en entrée name, NORM_name, modified_at, flag_visible, flag_current, flag_public
			// Retourne l'ID de la playlist nouvellement crée.

			var sqlEditPlaylist = fs.readFileSync(path.join(__dirname,'../../_common/db/edit_playlist.sql'),'utf-8');
			module.exports._db_handler.run(sqlEditPlaylist,
				{
					$playlist_id: playlist_id,
					$name: name,
					$NORM_name: NORM_name,
					$modified_at: lastedit_time,
					$flag_visible: flag_visible,
					$flag_current: flag_current,
					$flag_public: flag_public
				}, function (err) {
					if (err) {
						logger.error('[DBI] Failed to edit playlist '+playlist_id+' : '+err);
						reject(err);					
					} else {
						resolve();
					}
				});
		});
	},
	createPlaylist:function(name,NORM_name,creation_time,lastedit_time,flag_visible,flag_current,flag_public) {
		return new Promise(function(resolve,reject){
			if(!module.exports.isReady()) {
				logger.error('[DBI] Database interface is not ready yet!');
				reject('Database not ready');
			}

			// Creating playlist
			var sqlCreatePlaylist = fs.readFileSync(path.join(__dirname,'../../_common/db/create_playlist.sql'),'utf-8');
			module.exports._db_handler.run(sqlCreatePlaylist,
				{
					$name: name,
					$NORM_name: NORM_name,
					$created_at: creation_time,
					$modified_at: lastedit_time,
					$flag_visible: flag_visible,
					$flag_current: flag_current,
					$flag_public: flag_public
				}, function (err) {
					if (err) {
						logger.error('[DBI] Failed to create playlist '+name+' : '+err);
						reject(err);
					} else {					
						resolve(this.lastID);
					}
				});
		});
	},
	editWhitelistKara:function(wlc_id,reason) {
		return new Promise(function(resolve,reject){
			if(!module.exports.isReady()) {
				logger.error('[DBI] Database interface is not ready yet!');
				reject('Database not ready');
			}

			var sqlEditWhitelistKara = fs.readFileSync(path.join(__dirname,'../../_common/db/edit_whitelist_kara.sql'),'utf-8');
			module.exports._db_handler.run(sqlEditWhitelistKara,
				{
					$wlc_id: wlc_id,
					$reason: reason
				}, function (err) {
					if (err) {
						reject(err);
					} else {
						resolve();
					}
				});
		});
	},
	/**
	* @function {Add Kara To Playlist}
	* @param  {number} kara_id        {ID of karaoke song to add to playlist}
	* @param  {string} requester      {Name of person requesting the song}
	* @param  {string} NORM_requester {Normalized name (without accents)}
	* @param  {number} playlist_id    {ID of playlist to add the song to}
	* @param  {number} pos            {Position in the playlist}
	* @param  {number} date_add       {UNIX timestap of the date and time the song was added to the list}
	* @return {promise} {Promise}
	*/
	addKaraToPlaylist:function(karas) {
		return new Promise(function(resolve,reject){
			if(!module.exports.isReady()) {
				reject('Database interface is not ready yet');
			}
			
			//We receive an array of kara requests, we need to add them to a statement.
			//Even for one kara.				
			var sqlAddKaraToPlaylist = fs.readFileSync(path.join(__dirname,'../../_common/db/add_kara_to_playlist.sql'),'utf-8');
			var stmt_addKara = module.exports._db_handler.prepare(sqlAddKaraToPlaylist);
			var karaList = [];
			karas.forEach(function(kara) {				
				karaList.push({
					$playlist_id: kara.playlist_id,
					$pseudo_add: kara.requester,
					$NORM_pseudo_add: kara.NORM_requester,
					$kara_id: kara.kara_id,
					$created_at: kara.date_add,
					$pos: kara.pos,					
				});
			});	
			module.exports._db_handler.serialize(function() {
				//We retry the transaction several times because when two transactions overlap there can be an error.
				async.retry(
					{ 
						times: 5,
						interval: 100,
					},
					function(callback){
						module.exports._db_handler.run('begin transaction', function(err) {
							if (err) {
								logger.error('[DBI] Failed to begin transaction : '+err);
								logger.error('[DBI] Transaction will be retried');
								callback(err);
							} else {
								async.each(karaList,function(data,callback){
									stmt_addKara.run(data,function(err){
										if (err) {
											logger.error('Failed to add karaoke to playlist : '+err);				
											callback(err);					
										} else {
											callback();
										}						
									});
								}, function(err){
									if (err) {
										logger.error('Failed to add one karaoke to playlist : '+err);
										callback(err);
									} else {
										module.exports._db_handler.run('commit', function(err) {
											if (err) {
												callback(err);
											} else {
											// Close all statements just to be sure.
												stmt_addKara.finalize();
												callback();
											}				
										});											
									}
								});
							}
						});														
					},function(err){
						if (err){
							reject(err);
						} else {
							resolve();
						}
					}
				);					
			});			
		});
	},
	/**
	* @function {Add Kara To whitelist}
	* @param  {number} kara_id        {ID of karaoke song to add to playlist}
	* @param  {string} reason      {Reason for adding the karaoke}
	* @param  {number} date_add       {UNIX timestap of the date and time the song was added to the list}
	* @return {promise} {Promise}
	*/
	addKaraToWhitelist:function(kara_id,reason,date_added) {
		return new Promise(function(resolve,reject){
			if(!module.exports.isReady()) {
				reject('Database interface is not ready yet');
			}

			//We need to get the KID of the karaoke we're adding.

			var sqlGetKID = fs.readFileSync(path.join(__dirname,'../../_common/db/select_kid.sql'),'utf-8');
			module.exports._db_handler.get(sqlGetKID,
				{
					$kara_id: kara_id
				}, function (err, row) {
					if (err) {
						reject('Failed to get KID from karaoke song '+kara_id+' : '+err);
					} else {
						if (row) {
							var kid = row.kid;
							var sqlAddKaraToWhitelist = fs.readFileSync(path.join(__dirname,'../../_common/db/add_kara_to_whitelist.sql'),'utf-8');
							module.exports._db_handler.run(sqlAddKaraToWhitelist, {
								$reason: reason,
								$kara_id: kara_id,
								$kid: kid,
								$created_at: date_added,
							}, function (err) {
								if (err) {
									reject('Failed to add karaoke '+kara_id+' to whitelist : '+err);
								} else {
									//We return the whitelist_content ID of the kara we just added.
									resolve(this.lastID);
								}
							});
						} else {
							reject('No KID found for karaoke song '+kara_id);
						}
					}
				});
		});
	},
	/**
	* @function {Remove kara from playlist}
	* @param  {number} playlistcontent_id        {ID of karaoke song to remove from playlist}
	* @return {promise} {Promise}
	*/
	removeKaraFromPlaylist:function(karas) {
		return new Promise(function(resolve,reject){
			if(!module.exports.isReady()) {
				reject('Database interface is not ready yet');
			}

			var sqlRemoveKaraFromPlaylist = fs.readFileSync(path.join(__dirname,'../../_common/db/delete_kara_from_playlist.sql'),'utf-8');
			var stmt_delKara = module.exports._db_handler.prepare(sqlRemoveKaraFromPlaylist);var karaList = [];
			karas.forEach(function(kara) {
				karaList.push({
					$playlistcontent_id: kara
				});
			});		
			module.exports._db_handler.serialize(function() {		
				//We retry the transaction several times because when two transactions overlap there can be an error.
				//Example two delete or add kara at the very same time.
				async.retry(
					{
						times: 5,
						interval: 100
					},
					function(callback){
						module.exports._db_handler.run('begin transaction', function(err) {
							if (err) {
								logger.error('[DBI] Failed to begin transaction : '+err);
								logger.error('[DBI] Transaction will be retried');
								callback(err);
							} else {
								async.each(karaList,function(data,callback){
									stmt_delKara.run(data,function(err){
										if (err) {
											logger.err('Failed to delete karaoke to playlist : '+err);			
											callback(err);					
										} else {
											callback();
										}						
									});
								}, function(err){
									if (err) {
										logger.err('Failed to add one karaoke to playlist : '+err);
										callback(err);
									} else {
										module.exports._db_handler.run('commit', function(err) {
											if (err) {
												callback(err);
											} else {
											// Close all statements just to be sure.
												stmt_delKara.finalize();
												callback();											
											}				
										});											
									}
								});						
							}
						});					
					}, function(err){
						if (err) {
							reject(err);
						} else {
							resolve();
						}
					});								
			});							
		});
	},
	/**
	* @function {Remove kara from whitelist}
	* @param  {number} whitelistcontent_id        {ID of karaoke song to remove from playlist}
	* @return {promise} {Promise}
	*/
	removeKaraFromWhitelist:function(wlc_id) {
		return new Promise(function(resolve,reject){
			if(!module.exports.isReady()) {
				reject('Database interface is not ready yet');
			}

			var sqlRemoveKaraFromWhitelist = fs.readFileSync(path.join(__dirname,'../../_common/db/delete_kara_from_whitelist.sql'),'utf-8');
			module.exports._db_handler.run(sqlRemoveKaraFromWhitelist,
				{
					$wlc_id: wlc_id
				}, function (err) {
					if (err) {
						reject('Failed to remove whitelist item '+wlc_id+' : '+err);
						reject(err);
					} else {
						resolve(true);
					}
				});
		});
	},	
	/**
	* @function {Shifts positions in playlist}
	* @param  {number} playlist_id        {ID of playlist to modify}
	* @param  {number} pos                {Position to start from}
	* @param  {number} shift              {number of positions to shift to}
	* @return {promise} {Promise}
	*/
	shiftPosInPlaylist:function(pos,playlist_id,shift) {
		return new Promise(function(resolve,reject){
			if(!module.exports.isReady()) {
				reject('Database interface is not ready yet');
			}

			var sqlShiftPosInPlaylist = fs.readFileSync(path.join(__dirname,'../../_common/db/update_shift_pos_in_playlist.sql'),'utf-8');
			module.exports._db_handler.run(sqlShiftPosInPlaylist,
				{
					$shift: shift,
					$playlist_id: playlist_id,
					$pos: pos
				}, function (err) {
					if (err) {
						reject('Failed to shift position in playlist '+playlist_id+' : '+err);
					} else {
						resolve();
					}
				});
		});
	},
	/**
	* @function {Get biggest position in playlist}
	* @param  {number} playlist_id        {ID of playlist to modify}
	* @return {promise} {Promise}
	*/
	getMaxPosInPlaylist:function(playlist_id) {
		return new Promise(function(resolve,reject){
			if(!module.exports.isReady()) {
				reject('Database interface is not ready yet');
			}

			var sqlGetMaxPosInPlaylist = fs.readFileSync(path.join(__dirname,'../../_common/db/select_max_pos_in_playlist.sql'),'utf-8');
			module.exports._db_handler.get(sqlGetMaxPosInPlaylist,
				{
					$playlist_id: playlist_id
				}, function (err, row) {
					if (err) {
						reject('Failed to get max position in playlist '+playlist_id+' : '+err);
					} else {
						resolve(row.maxpos);
					}
				});
		});
	},	
};