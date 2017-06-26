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
		if (!fs.existsSync(path.join(module.exports.SYSPATH,'app/db/userdata.sqlite3'))) 
		{
			console.log('Unable to find user database. Creating it...');
    		NeedToCreateUserTables = true;
		};
		module.exports._user_db_handler = new sqlite3.Database(path.join(module.exports.SYSPATH,'app/db/userdata.sqlite3'), function (err) {
			if (err) 
			{
            	console.log('Error loading user database : '+err);            	
        	}
			
			if (NeedToCreateUserTables)
			{
				var sqlCreateUserDB = fs.readFileSync(path.join(module.exports.SYSPATH,'_common/db/userdata.sqlite3.sql'),'utf-8');
        		module.exports._user_db_handler.exec(sqlCreateUserDB, function (err){
	            	if (err) 
					{
                		console.log('Error creating user base :');
	                	console.log(err);                
            		} else 
					{
						console.log('User Base created successfully.');
					}
				});
			}
		});
		
	},

	// implémenter ici toutes les méthodes de lecture écritures qui seront utilisé par l'ensemble de l'applicatif
	// aucun autre composant ne doit manipuler la base SQLITE par un autre moyen
    
	unsetPublicAllPlaylists:function() 
	{
		var sqlUpdatePlaylistsUnsetPublic = fs.readFileSync(path.join(module.exports.SYSPATH,'_common/db/update_playlist_unset_public.sql'),'utf-8');
		this._user_db_handler.exec(sqlUpdatePlaylistsUnsetPublic, function (err, rep) 
		{
			if (err)
			{
				console.log('ERROR : Unable to unset public flag on playlists :');
                console.log(err);
                console.log(sqlUpdatePlaylistsUnsetPublic);
			}
		});
	},
	unsetCurrentAllPlaylists:function()
	{
		var sqlUpdatePlaylistsUnsetCurrent = fs.readFileSync(path.join(module.exports.SYSPATH,'_common/db/update_playlist_unset_current.sql'),'utf-8');
		this._user_db_handler.exec(sqlUpdatePlaylistsUnsetCurrent, function (err, rep) 
		{
			if (err)
			{
				console.log('ERROR : Unable to unset current flag on playlists :');
                console.log(err);
                console.log(sqlUpdatePlaylistsUnsetCurrent);
			}
		});
	},
	createPlaylist:function(name,NORM_name,creation_time,lastedit_time,flag_visible,flag_current,flag_public)
	{
		// Création de la playlist
		// Prend en entrée name, NORM_name, creation_time, lastedit_time, flag_visible, flag_current, flag_public
		// Retourne l'ID de la playlist nouvellement crée.

		var new_playlist_id = 0;
		var sqlCreatePlaylist = fs.readFileSync(path.join(module.exports.SYSPATH,'_common/db/create_playlist.sql'),'utf-8');
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
					return {
						id:0,
						error:true,
						error_msg:err
					}
				} else {
					return {
						id:this.lastID,
						error:false,
					}
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