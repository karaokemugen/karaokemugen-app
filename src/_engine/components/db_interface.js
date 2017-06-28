var path = require('path');
var fs = require('fs');
const logger = require('../../_common/utils/logger.js');
logger.SOURCE = '_engine/components/db_interface.js';

module.exports = {
	SYSPATH:null,
	_ready: false,
	_db_handler: null,

	init: function(){
		if(module.exports.SYSPATH === null)
		{
			logger.error('_engine/components/db_interface.js : SYSPATH is null');
			process.exit();
		}
		// démarre une instance de SQLITE
		var sqlite3 = require('sqlite3').verbose();
		module.exports._db_handler = new sqlite3.Database(path.join(module.exports.SYSPATH,'app/db/karas.sqlite3'), function(err){
			if (err)
			{
				logger.error('Error loading main karaoke database : '+err)
				logger.error('Please run generate_karasdb.js first!');
			}
		});
		// On vérifie si la base user existe. Si non on insère les tables.
		var NeedToCreateUserTables = false;
		// le fichier sqlite est externe (car l'appli ne peux écrire dans ses assets interne)
		if (!fs.existsSync(path.join(module.exports.SYSPATH,'app/db/userdata.sqlite3')))
		{
			logger.error('Unable to find user database. Creating it...');
    		NeedToCreateUserTables = true;
		};
		// le fichier sqlite est externe (car l'appli ne peux écrire dans ses assets interne)
		module.exports._user_db_handler = new sqlite3.Database(path.join(module.exports.SYSPATH,'app/db/userdata.sqlite3'), function (err) {
			if (err)
			{
            	logger.error('Error loading user database : '+err);
        	}

			if (NeedToCreateUserTables)
			{
				// ici on va lire un fichier SQL interne à l'appli on met donc un chemin relatif à __dirname
				var sqlCreateUserDB = fs.readFileSync(path.join(__dirname,'../../_common/db/userdata.sqlite3.sql'),'utf-8');
        		module.exports._user_db_handler.exec(sqlCreateUserDB, function (err){
	            	if (err)
					{
                		logger.error('Error creating user base :');
	                	logger.error(err);
						process.exit();
            		} else
					{
						logger.notice('User database created successfully.');
					}
				});
			}
		});
		module.exports._ready = true;
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

	isPublicPlaylist:function(playlist_id,callback)
	{
		var sqlIsPlaylistPublic = fs.readFileSync(path.join(__dirname,'../../_common/db/select_playlist_public_flag.sql'),'utf-8');
		this._user_db_handler.get(sqlIsPlaylistPublic,
		{
			$playlist_id: playlist_id
		}, function (err, row)
		{
                if (err)
				{
                    logger.error('Unable to select playlist '+playlist_id+'\'s public flag :');
                    logger.error(err);
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
		var sqlIsPlaylistCurrent = fs.readFileSync(path.join(__dirname,'../../_common/db/select_playlist_current_flag.sql'),'utf-8');
		this._user_db_handler.get(sqlIsPlaylistCurrent,
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
	isPlaylist:function(playlist_id,callback)
	{
		var sqlIsPlaylist = fs.readFileSync(path.join(__dirname,'../../_common/db/test_playlist.sql'),'utf-8');
		this._user_db_handler.get(sqlIsPlaylist,
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
		var sqlSetCurrentPlaylist = fs.readFileSync(path.join(__dirname,'../../_common/db/update_playlist_set_current.sql'),'utf-8');
		this._user_db_handler.run(sqlSetCurrentPlaylist, 
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
	setPublicPlaylist:function(playlist_id,callback)
	{
		var sqlSetPublicPlaylist = fs.readFileSync(path.join(__dirname,'../../_common/db/update_playlist_set_public.sql'),'utf-8');
		this._user_db_handler.run(sqlSetPublicPlaylist, 
		{
			$playlist_id: playlist_id	
		}, function (err, rep) 
		{
			if (err)
			{
				logger.error('Unable to set public flag on playlist '+playlist_id+' :');
                logger.error(err);                
			}
			callback(rep,err);
		});
	},
	unsetPublicAllPlaylists:function(callback)
	{
		if(!module.exports.isReady())
		{
			logger.error('DB_INTERFACE is not ready to work');
			return false;
		}

		var sqlUpdatePlaylistsUnsetPublic = fs.readFileSync(path.join(__dirname,'../../_common/db/update_playlist_unset_public.sql'),'utf-8');
		this._user_db_handler.exec(sqlUpdatePlaylistsUnsetPublic, function (err, rep)
		{
			if (err)
			{
				logger.error('Unable to unset public flag on playlists :');
                logger.error(err);                
			}
			callback();
		});
	},
	unsetCurrentAllPlaylists:function(callback)
	{
		if(!module.exports.isReady())
		{
			logger.error('DB_INTERFACE is not ready to work');
			return false;
		}

		var sqlUpdatePlaylistsUnsetCurrent = fs.readFileSync(path.join(__dirname,'../../_common/db/update_playlist_unset_current.sql'),'utf-8');
		this._user_db_handler.exec(sqlUpdatePlaylistsUnsetCurrent, function (err, rep)
		{
			if (err)
			{
				logger.error('Unable to unset current flag on playlists :');
                logger.error(err);                
			}
			callback();
		});
		
	},
	emptyPlaylist:function(playlist_id)
	{
		// Vidage de playlist. Sert aussi à nettoyer la table playlist_content en cas de suppression de PL
		var sqlEmptyPlaylist = fs.readFileSync(path.join(__dirname,'../../_common/db/empty_playlist.sql'),'utf-8');
		this._user_db_handler.run(sqlEmptyPlaylist,
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
		var sqlDeletePlaylist = fs.readFileSync(path.join(__dirname,'../../_common/db/delete_playlist.sql'),'utf-8');
		this._user_db_handler.run(sqlDeletePlaylist,
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
	createPlaylist:function(name,NORM_name,creation_time,lastedit_time,flag_visible,flag_current,flag_public,callback)
	{
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
		this._user_db_handler.run(sqlCreatePlaylist,
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
                    logger.error('Unable to create playlist '+name+' :');
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