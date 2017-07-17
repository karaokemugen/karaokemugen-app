var sqlite3 = require('sqlite3').verbose();
var path = require('path');
var fs = require('fs');
const logger = require('../../_common/utils/logger.js');
const moment = require('moment');
require("moment-duration-format");
moment.locale('fr');

module.exports = {
	SYSPATH:null,
	SETTINGS:null,
	_ready: false,
	_db_handler: null,

	init: function(){
		return new Promise(function(resolve,error){
			// démarre une instance de SQLITE

			if(module.exports.SYSPATH === null)
			{
				logger.error('_engine/components/db_interface.js : SYSPATH is null');
				process.exit();
			}

			var userDB_Test = new Promise(function(resolve,reject){
				if(!fs.existsSync(path.join(module.exports.SYSPATH,'app/db/userdata.sqlite3')))
				{
					logger.warn('Unable to find user database. Creating it...');
					NeedToCreateUserTables = true;
					var db = new sqlite3.Database(path.join(module.exports.SYSPATH,'app/db/userdata.sqlite3'));
					var sqlCreateUserDB = fs.readFileSync(path.join(__dirname,'../../_common/db/userdata.sqlite3.sql'),'utf-8');
					db.exec(sqlCreateUserDB, function (err){
						if (err)
						{
							logger.error('Error creating user base : '+err);
							process.exit();
						} else
						{
							logger.info('User database created successfully.');
							resolve();
						}
					});
				} else {
					resolve();
				}
			});

			var karasDB_Test = new Promise(function(resolve,reject){
				if(!fs.existsSync(path.join(module.exports.SYSPATH,'app/db/karas.sqlite3')))
				{
					logger.warn('Unable to find karaoke database. Creating it...');
					var generator = require('../../_admin/generate_karasdb.js');
					generator.SYSPATH = module.exports.SYSPATH;
					generator.SETTINGS = module.exports.SETTINGS;
					generator.onLog = function(type,message) {
						logger.info('generate_karasdb.js > '+message);
					}
					generator.run().then(function(response){
						resolve();
					}).catch(function(response,error){
						// erreur ?
						console.log(response);
						process.exit();
					});
				} else {
					resolve();
				}
			});

			Promise.all([ userDB_Test, karasDB_Test ]).then(function() {
				module.exports.init_on_db_ready();
				resolve();
			});
		});
	},

	init_on_db_ready:function(){

		// les fichiers sqlites sont externe (car l'appli ne peux écrire dans ses assets interne)

		module.exports._db_handler = new sqlite3.Database(path.join(module.exports.SYSPATH,'app/db/karas.sqlite3'), function(err){
			if (err)
			{
				logger.error('Error loading main karaoke database : '+err)
				process.exit();
			}
		});

		module.exports._user_db_handler = new sqlite3.Database(path.join(module.exports.SYSPATH,'app/db/userdata.sqlite3'), function (err) {
			if (err)
			{
				logger.error('Error loading user database : '+err);
				process.exit();
			}
		});

		module.exports._ready = true;
		module.exports.getStats().then(function(stats){
			logger.info('Number of karaokes in database : '+stats.totalcount);
			logger.info('Duration of all karaokes       : '+stats.totalduration);
			logger.info('Number of series               : '+stats.totalseries);
			logger.info('Number of languages            : '+stats.totallanguages);
			logger.info('Number of artists              : '+stats.totalartists);
			logger.info('Number of playlists            : '+stats.totalplaylists);
		}).catch(function(err){
			logger.warn('Unable to calculate stats : '+err);
		})
		logger.info('Database is READY.')

	},

	// fermeture des instances SQLITE (unlock les fichiers)
	close:function()
	{
		module.exports._ready = false;
		module.exports._db_handler.close();
		module.exports._user_db_handler.close();
	},

	isReady: function()
	{
		return module.exports._ready;
	},

	// implémenter ici toutes les méthodes de lecture écritures qui seront utilisé par l'ensemble de l'applicatif
	// aucun autre composant ne doit manipuler la base SQLITE par un autre moyen

	/**
	* @function {Calculate various stats}
	* @return {number} {Object with stats}
	*/
	getStats:function()
	{
		return new Promise(function(resolve,reject){
			var stats = {};
			if(!module.exports.isReady())
			{
				logger.error('getStats :: DB_INTERFACE is not ready to work');
				reject('Database is not ready!');
			}

			var pGetSeriesCount = new Promise((resolve,reject) =>
			{
				var sqlCalculateSeriesCount = fs.readFileSync(path.join(__dirname,'../../_common/db/calculate_series_count.sql'),'utf-8');
				module.exports._db_handler.get(sqlCalculateSeriesCount,
					function (err, res)
					{
						if (err)
						{
							logger.error('Unable to get number of series : '+err);
							stats.totalseries = 0;
							resolve();
						} else {
							stats.totalseries = res.seriescount;
							resolve();
						}
					})
			});

			var pGetPlaylistCount = new Promise((resolve,reject) =>
			{
				var sqlCalculatePlaylistCount = fs.readFileSync(path.join(__dirname,'../../_common/db/calculate_playlist_count.sql'),'utf-8');
				module.exports._user_db_handler.get(sqlCalculatePlaylistCount,
					function (err, res)
					{
						if (err)
						{
							logger.error('Unable to get number of playlists : '+err);
							stats.totalplaylists = 0;
							resolve();
						} else {
							stats.totalplaylists = res.plcount;
							resolve();
						}
					})
			});
			var pGetArtistCount = new Promise((resolve,reject) =>
			{
				var sqlCalculateArtistCount = fs.readFileSync(path.join(__dirname,'../../_common/db/calculate_artist_count.sql'),'utf-8');
				module.exports._db_handler.get(sqlCalculateArtistCount,
					function (err, res)
					{
						if (err)
						{
							logger.error('Unable to get number of artists : '+err);
							stats.totalartists = 0;
							resolve();
						} else {
							stats.totalartists = res.artistcount;
							resolve();
						}
					})
			});
			var pGetKaraCount = new Promise((resolve,reject) =>
			{
				var sqlCalculateKaraCount = fs.readFileSync(path.join(__dirname,'../../_common/db/calculate_kara_count.sql'),'utf-8');
				module.exports._db_handler.get(sqlCalculateKaraCount,
					function (err, res)
					{
						if (err)
						{
							logger.error('Unable to get number of karaoke songs : '+err);
							stats.totalcount = 0;
							resolve();
						} else {
							stats.totalcount = res.karacount;
							resolve();
						}
					})
			});
			var pGetLanguageCount = new Promise((resolve,reject) =>
			{
				var sqlCalculateLanguageCount = fs.readFileSync(path.join(__dirname,'../../_common/db/calculate_lang_count.sql'),'utf-8');
				module.exports._db_handler.get(sqlCalculateLanguageCount,
					function (err, res)
					{
						if (err)
						{
							logger.error('Unable to get number of languages : '+err);
							stats.totallanguages = 0;
							resolve();
						} else {
							stats.totallanguages = res.langcount;
							resolve();
						}
					})
			});
			var pGetDuration = new Promise((resolve,reject) =>
			{
				var sqlCalculateTotalDuration = fs.readFileSync(path.join(__dirname,'../../_common/db/calculate_total_duration.sql'),'utf-8');
				module.exports._db_handler.get(sqlCalculateTotalDuration,
					function (err, res)
					{
						if (err)
						{
							logger.error('Unable to get total duration : '+err);
							stats.totalduration = 'Unknown';
							resolve();
						} else {
							stats.totalduration = moment.duration(res.totalduration,'seconds').format('D [days], H [hours], m [minutes], s [seconds]');
							resolve();
						}
					})
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
				reject('One promise failed getting stats.');
			})
		})
	},
	/**
	* @function {Calculate number of a karaoke songs in a whole playlist}
	* @param  {number} playlist_id {ID of playlist to recalculate number of songs}
	* @return {number} {Number of karaoke songs found}
	*/
	calculatePlaylistNumOfKaras:function(playlist_id)
	{
		return new Promise(function(resolve,reject){
			if(!module.exports.isReady())
			{
				logger.error('DB_INTERFACE is not ready to work');
				reject('Database is not ready!');
			}
			var sqlCalculatePlaylistNumOfKaras = fs.readFileSync(path.join(__dirname,'../../_common/db/calculate_playlist_numofkaras.sql'),'utf-8');
			module.exports._user_db_handler.get(sqlCalculatePlaylistNumOfKaras,
			{
				$playlist_id: playlist_id
			}, function (err, num_karas)
			{
				if (err)
				{
					logger.error('Unable to get playlist '+playlist_id+' number of karas : '+err);
					reject(err);
				} else {
					resolve(num_karas.NumberOfKaras);
				}
			})
		})
	},
	/**
	* @function {Calculate duration of a whole playlist}
	* @param  {number} playlist_id {ID of playlist to recalculate duration for}
	* @return {object} {duration object (duration.duration = number)}
	*/
	calculatePlaylistDuration:function(playlist_id)
	{
		return new Promise(function(resolve,reject){
			if(!module.exports.isReady())
			{
				logger.error('DB_INTERFACE is not ready to work');
				reject('Database is not ready!');
			}
			var sqlCalculatePlaylistDuration = fs.readFileSync(path.join(__dirname,'../../_common/db/calculate_playlist_duration.sql'),'utf-8');
			module.exports._user_db_handler.serialize(function(){
				module.exports._user_db_handler.run('ATTACH DATABASE "'+path.join(module.exports.SYSPATH,'app/db/karas.sqlite3')+'" as karasdb;')

						module.exports._user_db_handler.get(sqlCalculatePlaylistDuration,
						{
							$playlist_id: playlist_id
						}, function (err, duration)
						{
								if (err)
								{
									logger.error('Unable to get playlist '+playlist_id+' duration : '+err);
									reject(err);
								} else {
									resolve(duration);
								}
						})
			})
		})
	},
	updatePlaylistNumOfKaras:function(playlist_id,num_karas)
	{
		return new Promise(function(resolve,reject){
			if(!module.exports.isReady())
			{
				logger.error('DB_INTERFACE is not ready to work');
				reject('Database is not ready!');
			}
			var sqlUpdatePlaylistNumOfKaras = fs.readFileSync(path.join(__dirname,'../../_common/db/update_playlist_numofkaras.sql'),'utf-8');
			module.exports._user_db_handler.run(sqlUpdatePlaylistNumOfKaras,
				{
					$playlist_id: playlist_id,
					$num_karas: num_karas
				}, function (err)
				{
					if (err)
					{
						logger.error('Unable to update playlist '+playlist_id+' number of karas : '+err);
						reject(err);
					} else {
						resolve(num_karas);
					}
				})
		})
	},
	/**
	* @function {Update playlist's duration field}
	* @param  {number} playlist_id {ID of playlist to update}
	* @param  {number} duration    {Duration in seconds}
	* @return {boolean} {Promise}
	*/
	updatePlaylistDuration:function(playlist_id,duration)
	{
		return new Promise(function(resolve,reject){
			if(!module.exports.isReady())
			{
				logger.error('DB_INTERFACE is not ready to work');
				reject('Database is not ready!');
			}
			var sqlUpdatePlaylistDuration = fs.readFileSync(path.join(__dirname,'../../_common/db/update_playlist_duration.sql'),'utf-8');
			module.exports._user_db_handler.run(sqlUpdatePlaylistDuration,
				{
					$playlist_id: playlist_id,
					$duration: duration
				}, function (err)
				{
					if (err)
					{
						logger.error('Unable to update playlist '+playlist_id+' duration : '+err);
						reject(err);
					} else {
						resolve(duration);
					}
				})
		})
	},
	/**
	* @function {Get contents of playlist}
	* @param  {number} playlist_id {ID of playlist to get a list of songs from}
	* @return {Object} {Playlist object}
	*/
	getPlaylistContents:function(playlist_id){
		return new Promise(function(resolve,reject){
			if(!module.exports.isReady())
			{
				logger.error('DB_INTERFACE is not ready to work');
				reject('Database is not ready!');
			}
			var sqlGetPlaylistContents = fs.readFileSync(path.join(__dirname,'../../_common/db/select_playlist_contents.sql'),'utf-8');
			module.exports._user_db_handler.serialize(function(){
				module.exports._user_db_handler.run('ATTACH DATABASE "'+path.join(module.exports.SYSPATH,'app/db/karas.sqlite3')+'" as karasdb;')

						module.exports._user_db_handler.all(sqlGetPlaylistContents,
						{
							$playlist_id: playlist_id
						}, function (err, playlist)
						{
								if (err)
								{
									logger.error('Unable to get playlist '+playlist_id+' contents : '+err);
									reject(err);
								} else {
									resolve(playlist);
								}
						})


			})

		})
	},
	/**
	* @function {Get all karaokes}
	* @return {array} {array of karaoke objects}
	*/
	getAllKaras:function(){
		return new Promise(function(resolve,reject){
			if(!module.exports.isReady())
			{
				logger.error('DB_INTERFACE is not ready to work');
				reject('Database is not ready!');
			}
			var sqlGetAllKaras = fs.readFileSync(path.join(__dirname,'../../_common/db/select_all_karas.sql'),'utf-8');
			module.exports._db_handler.all(sqlGetAllKaras,
				function (err, playlist)
				{
					if (err)
					{
						logger.error('Unable to get all karaokes : '+err);
						reject(err);
					} else {
						resolve(playlist);
					}
				})


		})
	},
	/**
	* @function {getPlaylistInfo}
	* @param  {number} playlist_id {Playlist ID}
	* @return {Object} {Playlist object}
	* Selects playlist info from playlist table. Returns the info in a callback.
	*/
	getPlaylistInfo:function(playlist_id,callback)
	{
		//TODO : transformer en promesse
		var sqlGetPlaylistInfo = fs.readFileSync(path.join(__dirname,'../../_common/db/select_playlist_info.sql'),'utf-8');
		module.exports._user_db_handler.get(sqlGetPlaylistInfo,
		{
			$playlist_id: playlist_id
		}, function (err, row)
		{
			if (err)
			{
				logger.error('Unable to select playlist '+playlist_id+' information : '+err);
				callback(null,err);
			} else {
				if (row) {
					callback(row);
				} else {
					callback(null, 'Playlist '+playlist_id+' unknown.');
				}
			}
		})
	},
	/**
	* @function {Checks for a current playlist}
	* @return {boolean} {Promise}
	*/
	isACurrentPlaylist:function()
	{
		return new Promise(function(resolve,reject){
			if(!module.exports.isReady())
			{
				logger.error('DB_INTERFACE is not ready to work');
				reject('Database is not ready!');
			}
			var sqlTestCurrentPlaylistExists = fs.readFileSync(path.join(__dirname,'../../_common/db/test_current_playlist_exists.sql'),'utf-8');
				module.exports._user_db_handler.get(sqlTestCurrentPlaylistExists,
					function (err, row)
					{
						if (err)
						{
							logger.error('Unable to search for playlist with current flag : '+err);
							reject(err);
						} else {
							if (row) {
								resolve(row.pk_id_playlist);
							} else {
								reject();
							}

						}
					})


		})
	},
	/**
	* @function {Checks for a public playlist}
	* @return {number} {Playlist ID or rejection}
	*/
	isAPublicPlaylist:function()
	{
		return new Promise(function(resolve,reject){
			if(!module.exports.isReady())
			{
				logger.error('DB_INTERFACE is not ready to work');
				reject('Database is not ready!');
			}
			var sqlTestPublicPlaylistExists = fs.readFileSync(path.join(__dirname,'../../_common/db/test_public_playlist_exists.sql'),'utf-8');
				module.exports._user_db_handler.get(sqlTestPublicPlaylistExists,
					function (err, row)
					{
						if (err)
						{
							logger.error('Unable to search for playlist with current flag : '+err);
							reject(err);
						} else {
							if (row) {
								resolve(row.pk_id_playlist);
							} else {
								reject();
							}

						}
					})


		})
	},
	isPublicPlaylist:function(playlist_id,callback)
	{
		//TODO : transformer en promesse
		var sqlIsPlaylistPublic = fs.readFileSync(path.join(__dirname,'../../_common/db/select_playlist_public_flag.sql'),'utf-8');
		module.exports._user_db_handler.get(sqlIsPlaylistPublic,
		{
			$playlist_id: playlist_id
		}, function (err, row)
		{
				if (err)
				{
					logger.error('Unable to select playlist '+playlist_id+'\'s public flag : '+err);
					callback(null,err);
				} else {
					if (row) {
						if (row.flag_public == 1) {
							callback(true);
						} else {
							callback(false);
						}
					} else {
						var err = 'Playlist unknown.'
						logger.error(err);
						callback(null,err);
					}
				}
		})
	},
	isCurrentPlaylist:function(playlist_id,callback)
	{
		//TODO : transformer en promesse
		var sqlIsPlaylistCurrent = fs.readFileSync(path.join(__dirname,'../../_common/db/select_playlist_current_flag.sql'),'utf-8');
		module.exports._user_db_handler.get(sqlIsPlaylistCurrent,
		{
			$playlist_id: playlist_id
		}, function (err, row)
		{
				if (err)
				{
					logger.error('Unable to select playlist '+playlist_id+'\'s current flag :');
					logger.error(err);
					callback(null,err);
				} else {
					if (row) {
						if (row.flag_current == 1) {
							callback(true);
						} else {
							callback(false);
						}
					} else {
						var err = 'Playlist unknown.'
						logger.error(err);
						callback(null,err);
					}
				}
		})
	},
	/**
	* @function {is it a kara?}
	* @param  {number} kara_id {Karaoke ID to check for existence}
	* @return {type} {Returns true or false}
	*/
	isKara:function(kara_id,callback)
	{
		//TODO : transformer en promesse
		var sqlIsKara = fs.readFileSync(path.join(__dirname,'../../_common/db/test_kara.sql'),'utf-8');
		module.exports._db_handler.get(sqlIsKara,
		{
			$kara_id: kara_id
		}, function (err, row)
		{
				if (err)
				{
					logger.error('Unable to select karaoke song '+kara_id+' : '+err);
					callback(null,err);
				} else {
					if (row) {
						callback(true);
					} else {
						callback(false);
					}
				}
		})
	},
	/**
	* @function {Is the kara in the playlist?}
	* @param  {number} kara_id {ID of karaoke to search for}
	* @param  {number} playlist_id {ID of playlist to search in}
	* @return {boolean} {Promise}
	*/
	isKaraInPlaylist:function(kara_id,playlist_id)
	{
		return new Promise(function(resolve,reject){
			var sqlIsKaraInPlaylist = fs.readFileSync(path.join(__dirname,'../../_common/db/test_kara_in_playlist.sql'),'utf-8');
			module.exports._user_db_handler.get(sqlIsKaraInPlaylist,
			{
				$kara_id: kara_id,
				$playlist_id: playlist_id
			}, function (err, row)
			{
					if (err)
					{
						logger.error('Unable to search for karaoke song '+kara_id+' in playlist '+playlist_id+' : '+err);   reject(err);
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
	isPlaylist:function(playlist_id,callback)
	{
		//TODO : transformer en promesse
		var sqlIsPlaylist = fs.readFileSync(path.join(__dirname,'../../_common/db/test_playlist.sql'),'utf-8');
		module.exports._user_db_handler.get(sqlIsPlaylist,
		{
			$playlist_id: playlist_id
		}, function (err, row)
		{
				if (err)
				{
					logger.error('Unable to select playlist '+playlist_id+' :');
					logger.error(err);
					callback(null,err);
				} else {
					if (row) {
						callback(true);
					} else {
						callback(false);
					}
				}
		})
	},
	setCurrentPlaylist:function(playlist_id,callback)
	{
		//TODO : transformer en promesse
		var sqlSetCurrentPlaylist = fs.readFileSync(path.join(__dirname,'../../_common/db/update_playlist_set_current.sql'),'utf-8');
		module.exports._user_db_handler.run(sqlSetCurrentPlaylist,
		{
			$playlist_id: playlist_id
		}, function (err, rep)
		{
			if (err)
			{
				logger.error('Unable to set current flag on playlist '+playlist_id+' :');
				logger.error(err);
			}
			callback(rep,err);
		});
	},
	/**
	* @function {setVisiblePlaylist}
	* @param  {number} playlist_id {ID of playlist to make visible}
	* @return {string} {error}
	*/
	setVisiblePlaylist:function(playlist_id,callback)
	{
		//TODO : transformer en promesse
		var sqlSetVisiblePlaylist = fs.readFileSync(path.join(__dirname,'../../_common/db/update_playlist_set_visible.sql'),'utf-8');
		module.exports._user_db_handler.run(sqlSetVisiblePlaylist,
		{
			$playlist_id: playlist_id
		}, function (err, rep)
		{
			if (err)
			{
				logger.error('Unable to set visible flag on playlist '+playlist_id+' : '+err);
			}
			callback(rep,err);
		});
	},
	/**
	* @function {unsetVisiblePlaylist}
	* @param  {number} playlist_id {ID of playlist to make invisible}
	* @return {string} {error}
	*/
	unsetVisiblePlaylist:function(playlist_id,callback)
	{
		//TODO : transformer en promesse
		var sqlUnsetVisiblePlaylist = fs.readFileSync(path.join(__dirname,'../../_common/db/update_playlist_unset_visible.sql'),'utf-8');
		module.exports._user_db_handler.run(sqlSetCurrentPlaylist,
		{
			$playlist_id: playlist_id
		}, function (err, rep)
		{
			if (err)
			{
				logger.error('Unable to unset visible flag on playlist '+playlist_id+' : '+err);
			}
			callback(rep,err);
		});
	},
	setPublicPlaylist:function(playlist_id,callback)
	{
		//TODO : transformer en promesse
		var sqlSetPublicPlaylist = fs.readFileSync(path.join(__dirname,'../../_common/db/update_playlist_set_public.sql'),'utf-8');
		module.exports._user_db_handler.run(sqlSetPublicPlaylist,
		{
			$playlist_id: playlist_id
		}, function (err, rep)
		{
			if (err)
			{
				logger.error('Unable to set public flag on playlist '+playlist_id+' : '+err);
			}
			callback(rep,err);
		});
	},
	unsetPublicAllPlaylists:function(callback)
	{
		return new Promise(function(resolve,reject){
			if(!module.exports.isReady())
			{
				logger.error('DB_INTERFACE is not ready to work');
				reject();
			}

			var sqlUpdatePlaylistsUnsetPublic = fs.readFileSync(path.join(__dirname,'../../_common/db/update_playlist_unset_public.sql'),'utf-8');
			module.exports._user_db_handler.exec(sqlUpdatePlaylistsUnsetPublic, function (err, rep)
			{
				if (err)
				{
					logger.error('Unable to unset public flag on playlists : '+err);
					reject();
				} else {
					resolve();
				}
			});
		});
	},
	unsetCurrentAllPlaylists:function()
	{
		return new Promise(function(resolve,reject){
			if(!module.exports.isReady())
			{
				logger.error('DB_INTERFACE is not ready to work');
				reject();
			}

			var sqlUpdatePlaylistsUnsetCurrent = fs.readFileSync(path.join(__dirname,'../../_common/db/update_playlist_unset_current.sql'),'utf-8');
			module.exports._user_db_handler.exec(sqlUpdatePlaylistsUnsetCurrent, function (err, rep)
			{
				if (err)
				{
					logger.error('Unable to unset current flag on playlists : '+err);
					reject();
				} else {
					resolve();
				}
			});
		});
	},
	emptyPlaylist:function(playlist_id)
	{
		//TODO : transformer en promesse
		// Vidage de playlist. Sert aussi à nettoyer la table playlist_content en cas de suppression de PL
		var sqlEmptyPlaylist = fs.readFileSync(path.join(__dirname,'../../_common/db/empty_playlist.sql'),'utf-8');
		module.exports._user_db_handler.run(sqlEmptyPlaylist,
		{
			$playlist_id: playlist_id
		}, function(err) {
			if (err)
			{
				logger.error('Unable to empty playlist :');
				logger.error(err);
			}
		})
	},
	deletePlaylist:function(playlist_id,callback)
	{
		//TODO : transformer en promesse
		var sqlDeletePlaylist = fs.readFileSync(path.join(__dirname,'../../_common/db/delete_playlist.sql'),'utf-8');
		module.exports._user_db_handler.run(sqlDeletePlaylist,
		{
			$playlist_id: playlist_id
		}, function(err) {
			if (err)
			{
				logger.error('Unable to delete playlist :');
				logger.error(err);
			}
			callback(true);
		})
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
	editPlaylist:function(playlist_id,name,NORM_name,lastedit_time,flag_visible,flag_current,flag_public,callback)
	{
		//TODO : transformer en promesse
		if(!module.exports.isReady())
		{
			logger.error('DB_INTERFACE is not ready to work');
			return false;
		}

		// Création de la playlist
		// Prend en entrée name, NORM_name, creation_time, lastedit_time, flag_visible, flag_current, flag_public
		// Retourne l'ID de la playlist nouvellement crée.

		var sqlEditPlaylist = fs.readFileSync(path.join(__dirname,'../../_common/db/edit_playlist.sql'),'utf-8');
		module.exports._user_db_handler.run(sqlEditPlaylist,
		{
			$playlist_id: playlist_id,
			$name: name,
			$NORM_name: NORM_name,
			$lastedit_time: lastedit_time,
			$flag_visible: flag_visible,
			$flag_current: flag_current,
			$flag_public: flag_public
		}, function (err, rep)
		{
				if (err)
				{
					logger.error('Unable to edit playlist '+name+' : '+err);
					callback({
						error:true,
						error_msg:err
					});
				} else {
					callback({
						error:false
					});
				}
		})
	},
	createPlaylist:function(name,NORM_name,creation_time,lastedit_time,flag_visible,flag_current,flag_public,callback)
	{
		//TODO : transformer en promesse
		if(!module.exports.isReady())
		{
			logger.error('DB_INTERFACE is not ready to work');
			return false;
		}

		// Création de la playlist
		// Prend en entrée name, NORM_name, creation_time, lastedit_time, flag_visible, flag_current, flag_public
		// Retourne l'ID de la playlist nouvellement crée.

		var new_playlist_id = 0;
		var sqlCreatePlaylist = fs.readFileSync(path.join(__dirname,'../../_common/db/create_playlist.sql'),'utf-8');
		module.exports._user_db_handler.run(sqlCreatePlaylist,
		{
			$name: name,
			$NORM_name: NORM_name,
			$creation_time: creation_time,
			$lastedit_time: lastedit_time,
			$flag_visible: flag_visible,
			$flag_current: flag_current,
			$flag_public: flag_public
		}, function (err, rep)
		{
				if (err)
				{
					logger.error('Unable to create playlist '+name+' : '+err);
					logger.error(err);
					callback({
						id:0,
						error:true,
						error_msg:err
					});
				} else {
					callback({
						id:this.lastID,
						error:false
					});
				}
		})
	},

	/**
	* @function {Add Kara To Playlist}
	* @param  {number} kara_id        {ID of karaoke song to add to playlist}
	* @param  {string} requester      {Name of person requesting the song}
	* @param  {string} NORM_requester {Normalized name (without accents)}
	* @param  {number} playlist_id    {ID of playlist to add the song to}
	* @param  {number} pos            {Position in the playlist}
	* @param  {number} date_add       {UNIX timestap of the date and time the song was added to the list}
	* @param  {number} flag_playing   {Is the song playing?}
	* @return {promise} {Promise}
	*/
	addKaraToPlaylist:function(kara_id,requester,NORM_requester,playlist_id,pos,date_added,flag_playing)
	{
		return new Promise(function(resolve,reject){
			if(!module.exports.isReady())
			{
				logger.error('DB_INTERFACE is not ready to work');
				reject('Database is not ready!');
			}

			//We need to get the KID of the karaoke we're adding.

			var sqlGetKID = fs.readFileSync(path.join(__dirname,'../../_common/db/select_kid.sql'),'utf-8');
			module.exports._db_handler.get(sqlGetKID,
			{
				$kara_id: kara_id
			}, function (err, row)
			{
					if (err)
					{
						logger.error('Unable to get KID for '+kara_id+' : '+err);
						reject(err);
					} else {
						if (row) {
							var kid = row.kid
							var sqlAddKaraToPlaylist = fs.readFileSync(path.join(__dirname,'../../_common/db/add_kara_to_playlist.sql'),'utf-8');
							module.exports._user_db_handler.run(sqlAddKaraToPlaylist,
							{
								$playlist_id: playlist_id,
								$pseudo_add: requester,
								$NORM_pseudo_add: NORM_requester,
								$kara_id: kara_id,
								$kid: kid,
								$date_added: date_added,
								$pos: pos,
								$flag_playing: flag_playing
							}, function (err, rep)
							{
									if (err)
									{
										logger.error('Unable to add kara '+kara_id+' to playlist '+playlist_id+' : '+err);
										reject(err);
									} else {
										resolve(true);
									}
							})
						} else {
							logger.error('No KID found for this '+kara_id+' !');
							reject('No KID found for this '+kara_id+' !');
						}

					}
			})
		})
	},
	get_next_kara:function()
	{
		if(!module.exports.isReady())
		{
			logger.error('DB_INTERFACE is not ready to work');
			return false;
		}

		return {
			uuid:'0000-0000-0000-0000',
			kara_id:1,
			title:'Nom du Kara',
			video:'chemin vers la vidéo',
			subtitle:'chemin vers la vidéo',
			requester:'pseudonyme',
		}
	}
}