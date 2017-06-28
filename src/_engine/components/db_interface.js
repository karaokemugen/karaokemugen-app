var path = require('path');
var fs = require('fs');

module.exports = {
	SYSPATH:null,
	_db_handler:null,

	init: function(){
		if(module.exports.SYSPATH === null)
		{
			console.log('_engine/components/db_interface.js : SYSPATH is null');
			process.exit();
		}
		// démarre une instance de SQLITE
		var sqlite3 = require('sqlite3').verbose();
		module.exports._db_handler = new sqlite3.Database(path.join(module.exports.SYSPATH,'app/db/karas.sqlite3'), function(err){
			if (err)
			{
				console.log('Error loading main karaoke database : '+err)
				console.log('Please run generate_karasdb.js first!');
			}
		});
		// On vérifie si la base user existe. Si non on insère les tables.
		var NeedToCreateUserTables = false;
		// le fichier sqlite est externe (car l'appli ne peux écrire dans ses assets interne)
		if (!fs.existsSync(path.join(module.exports.SYSPATH,'app/db/userdata.sqlite3')))
		{
			console.log('Unable to find user database. Creating it...');
    		NeedToCreateUserTables = true;
		};
		// le fichier sqlite est externe (car l'appli ne peux écrire dans ses assets interne)
		module.exports._user_db_handler = new sqlite3.Database(path.join(module.exports.SYSPATH,'app/db/userdata.sqlite3'), function (err) {
			if (err)
			{
            	console.log('Error loading user database : '+err);
        	}

			if (NeedToCreateUserTables)
			{
				// ici on va lire un fichier SQL interne à l'appli on met donc un chemin relatif à __dirname
				var sqlCreateUserDB = fs.readFileSync(path.join(__dirname,'../../_common/db/userdata.sqlite3.sql'),'utf-8');
        		module.exports._user_db_handler.exec(sqlCreateUserDB, function (err){
	            	if (err)
					{
                		console.log('Error creating user base :');
	                	console.log(err);
						process.exit();
            		} else
					{
						console.log('User database created successfully.');
					}
				});
			}
		});
	},

	// fermeture des instances SQLITE (unlock les fichiers)
	close:function()
	{
		module.exports._db_handler.close();
		module.exports._user_db_handler.close();
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
                    console.log('ERROR : Unable to select playlist '+playlist_id+'\'s public flag :');
                    console.log(err);
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
						console.log(err);
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
                    console.log('ERROR : Unable to select playlist '+playlist_id+'\'s current flag :');
                    console.log(err);
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
						console.log(err);
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
                    console.log('ERROR : Unable to select playlist '+playlist_id+' :');
                    console.log(err);
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
				console.log('ERROR : Unable to set current flag on playlist '+playlist_id+' :');
                console.log(err);                
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
				console.log('ERROR : Unable to set public flag on playlist '+playlist_id+' :');
                console.log(err);                
			}
			callback(rep,err);
		});
	},
	unsetPublicAllPlaylists:function(callback)
	{
		var sqlUpdatePlaylistsUnsetPublic = fs.readFileSync(path.join(__dirname,'../../_common/db/update_playlist_unset_public.sql'),'utf-8');
		this._user_db_handler.exec(sqlUpdatePlaylistsUnsetPublic, function (err, rep)
		{
			if (err)
			{
				console.log('ERROR : Unable to unset public flag on playlists :');
                console.log(err);
                console.log(sqlUpdatePlaylistsUnsetPublic);
			}
			callback();
		});
	},
	unsetCurrentAllPlaylists:function(callback)
	{
		var sqlUpdatePlaylistsUnsetCurrent = fs.readFileSync(path.join(__dirname,'../../_common/db/update_playlist_unset_current.sql'),'utf-8');
		this._user_db_handler.exec(sqlUpdatePlaylistsUnsetCurrent, function (err, rep)
		{
			if (err)
			{
				console.log('ERROR : Unable to unset current flag on playlists :');
                console.log(err);
                console.log(sqlUpdatePlaylistsUnsetCurrent);
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
				console.log('ERROR : Unable to empty playlist :');
                console.log(err);                
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
				console.log('ERROR : Unable to delete playlist :');
                console.log(err);                
			}
			callback(true);
		})
	},
	createPlaylist:function(name,NORM_name,creation_time,lastedit_time,flag_visible,flag_current,flag_public,callback)
	{
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
                    console.log('ERROR : Unable to create playlist '+name+' :');
                    console.log(err);
                    console.log(sqlCreatePlaylist);
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