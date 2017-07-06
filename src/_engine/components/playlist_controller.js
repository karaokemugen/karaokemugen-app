var path = require('path');
const { diacritics, normalize } = require('normalize-diacritics');
var timestamp = require("unix-timestamp");
timestamp.round = true;
const logger = require('../../_common/utils/logger.js');


module.exports = {
	SYSPATH:null,
	DB_INTERFACE:null,

	samplePlaylist:[],

	init: function(){
		if(module.exports.SYSPATH === null)
		{
			logger.error('_engine/components/playlist_controller.js : SYSPATH is null');
			process.exit();
		}
		if(module.exports.DB_INTERFACE === null)
		{
			logger.error('_engine/components/playlist_controller.js : DB_INTERFACE is null');
			process.exit();
		}
	},

	isCurrentPlaylist:function(playlist_id,callback)
	{
		//TODO : Transformer en promesse
		//TODO : Check si la playlist existe
		module.exports.DB_INTERFACE.isCurrentPlaylist(playlist_id,function(res){							
			logger.log('debug','Current = '+res);
			callback(res);
		});		
	},
	isPublicPlaylist:function(playlist_id,callback)
	{
		//TODO : Transformer en promesse
		//TODO : Check si la playlist existe
		module.exports.DB_INTERFACE.isPublicPlaylist(playlist_id,function(res){							
			logger.log('debug','Public = '+res);
			callback(res);
		});		
	},
	/**
	* @function {isPlaylist}
	* @param  {number} playlist_id {ID of playlist to check for existence}
	* @return {promise} Promise
	*/	
	isPlaylist:function(playlist_id)
	{
		//Une requête toute bête pour voir si une Playlist existe
		return new Promise(function(resolve,reject){
			module.exports.DB_INTERFACE.isPlaylist(playlist_id,function(res){
				if (res == true) {
					resolve(true);
				} else {
					reject(false);
				}					
			})
		})		
	},
	/**
	* @function {isKara}
	* @param  {number} kara_id {Karaoke ID to check for existence}	
	* @return {promise} Promise
	*/
	isKara:function(kara_id)
	{
		//Une requête toute bête pour voir si une Playlist existe
		return new Promise(function(resolve,reject){
			module.exports.DB_INTERFACE.isKara(kara_id,function(res){
				if (res == true) {
					resolve(true);
				} else {
					reject(false);
				}					
			})

		})		
	},
	setCurrentPlaylist:function(playlist_id,callback)
	{
		//TODO : Tester si la playlist existe
		//TODO : Transformer en promesse
		module.exports.unsetCurrentAllPlaylists(function(){
			module.exports.DB_INTERFACE.setCurrentPlaylist(playlist_id,function(res){
				logger.info('Setting playlist '+playlist_id+' current flag to ON');							
				callback();
			});		
		});	
	},
	/**
	* @function {setVisiblePlaylist}
	* @param  {number} playlist_id {ID of playlist to make visible}
	*/	
	setVisiblePlaylist:function(playlist_id)
	{
		//TODO : Tester si la playlist existe
		return new Promise(function(resolve,reject){
			module.exports.DB_INTERFACE.setVisiblePlaylist(playlist_id,function(res){
				logger.info('Setting playlist '+playlist_id+' visible flag to ON');							
				resolve();
			});				
		});
	},
	unsetVisiblePlaylist:function(playlist_id,callback)
	{
		//TODO : Tester si la playlist existe
		return new Promise(function(resolve,reject){
			module.exports.DB_INTERFACE.unsetVisiblePlaylist(playlist_id,function(res){
				logger.info('Setting playlist '+playlist_id+' visible flag to OFF');							
				callback();
			});				
		});
	},
	setPublicPlaylist:function(playlist_id,callback)
	{
		//TODO : Tester si la playlist existe
		//TODO : Transformer en promesse
		module.exports.unsetPublicAllPlaylists(function(){
			module.exports.DB_INTERFACE.setPublicPlaylist(playlist_id, function(res){
				logger.info('Setting playlist '+playlist_id+' public flag to ON');							
				callback();
			});		
		});		
	},
    deletePlaylist:function(playlist_id,new_curorpubplaylist_id)
	{		
		//TODO : Vérifier si la playlist existe
		// Suppression d'une playlist. Si la playlist a un flag_public ou flag_current, il faut
		// set l'un de ces flags sur l'autre ID de playlist (optionnel) fourni
		logger.notice('Deleting playlist '+playlist_id+', transferring flags to '+new_curorpubplaylist_id);
		return new Promise(function(resolve,reject){
			module.exports.isPlaylist(playlist_id)
		     .then(function(){
				var pIsPublic = new Promise((resolve,reject) => 
				{
					module.exports.isPublicPlaylist(playlist_id,function(res) 
					{
						if (res == true) 
						{
							module.exports.setPublicPlaylist(new_curorpubplaylist_id,function()
							{
								resolve(true);
							})
						} else {
							resolve(true);
						}							
					})
				});
				var pIsCurrent = new Promise((resolve,reject) =>
				{
					module.exports.isCurrentPlaylist(playlist_id,function(res) 
					{
						if (res == true) 
						{
							module.exports.setCurrentPlaylist(new_curorpubplaylist_id,function()
							{
								resolve(true);
							})
						} else {
							resolve(true);
						}							
					})
				});
				Promise.all([pIsPublic,pIsCurrent]).then(function()
				{
					module.exports.emptyPlaylist(playlist_id);
					module.exports.DB_INTERFACE.deletePlaylist(playlist_id,function(res)
					{
						var values = 
						{
							playlist_id: playlist_id,
							new_curorpubplaylist_id: new_curorpubplaylist_id
						};
						resolve(values);				
					});
				})																
			})
			.catch(function(){
				reject('Playlist does not exist!');
			})										
		});
	},
	emptyPlaylist:function(playlist_id)
	{
		//TODO : Tester si la playlist existe
		//TODO : Transformer en promesse.
		module.exports.DB_INTERFACE.emptyPlaylist(playlist_id);				
	},
	/**
	* @function {editPlaylist}
	* Edits properties of a playlist
	* @param  {number} playlist_id  {Playlist ID to edit}
	* @param  {string} name         {New name of playlist}
	* @param  {number} flag_visible {Is the playlist visible?}
	* @param  {number} flag_current {Is the playlist the current one?}
	* @param  {number} flag_public  {Is the playlist the public one?}
	*/
	editPlaylist:function(playlist_id,name,flag_visible,flag_current,flag_public)
	{
		//TODO : Tester si la playlist existe
		return new Promise(function(resolve,reject){
			var NORM_name = normalize(name);
			var lastedit_time = timestamp.now();
			
			if (flag_current == 1 && flag_public == 1)
			{
				var err = 'ERROR: Current and Public flags are mutually exclusive on a playlist.';
				// on renvoi un reject sur la promise
				reject(err);
			}

			if (flag_public == 1)
			{
				module.exports.unsetPublicAllPlaylists();
			}
			if (flag_current == 1)
			{
				module.exports.unsetCurrentAllPlaylists();
			}

			module.exports.DB_INTERFACE.editPlaylist(playlist_id,name,NORM_name,lastedit_time,flag_visible,flag_current,flag_public,function(callback){				
				resolve(callback);
			});
		});
	},
	createPlaylist:function(name,flag_visible,flag_current,flag_public)
	{
		
		// Méthode de création playlist
		// Prend en entrée un nom, et des booléens
		// Si flag_public ou flag_current = true il faut désactiver le flag sur toutes les autres playlists

		// on retourne une promise
		// cela implique qu'on ne gère plus le callback ici mais que tout se fait du coté de l'appelant
		return new Promise(function(resolve,reject){
			var NORM_name = normalize(name);
			var creation_time = timestamp.now();
			var lastedit_time = creation_time;

			if (flag_current == 1 && flag_public == 1)
			{
				var err = 'ERROR: Current and Public flags are mutually exclusive on a playlist.';
				// on renvoi un reject sur la promise
				reject(err);
			}

			if (flag_public == 1)
			{
				module.exports.unsetPublicAllPlaylists();
			}
			if (flag_current == 1)
			{
				module.exports.unsetCurrentAllPlaylists();
			}

			//on préfèrera les module.exports.XXX pluttôt que this pour éviter tout problème de scope javascript
			module.exports.DB_INTERFACE.createPlaylist(name,NORM_name,creation_time,lastedit_time,flag_visible,flag_current,flag_public,function(new_id_playlist){
				//on résoud la promesse (ici dans un callback qui pourrait donc aussi être revu en promise)
				resolve(new_id_playlist)
			});
		});
	},
	/**
	* @function {getPlaylistInfo}
	* @param  {number} playlist_id {Playlist ID to fetch}
	* @return {Object} {Playlist object}
	* Returns a playlist object with the following information :
	* - name (name of playlist)
	* - num_karas (Number of karaoke songs in the playlist)
	* - length (duration in seconds of the whole playlist)
	* - creation_time (creation time in UNIX timestamp format)
	* - lastedit_time (last modification time in UNIX timestamp format)
	* - flag_visible (is the playlist visible?)
	* - flag_current (is the playlist the current one?)
	* - flag_public (is the playlist the public one?)
	*/
	getPlaylistInfo:function(playlist_id)
	{
		// TODO : Tester si la playlist existe
		return new Promise(function(resolve,reject){			
			module.exports.DB_INTERFACE.getPlaylistInfo(playlist_id,function(playlist, err){				
				if (err) {
					logger.error(err);
					reject(err);
				} else {
					resolve(playlist);
				}				
			});
		});
	},
	unsetPublicAllPlaylists:function(callback)
	{
		// TODO : Transformer en promesse
		// Désactive le flag Public sur toutes les playlists
		module.exports.DB_INTERFACE.unsetPublicAllPlaylists(function(callback){
			logger.info("All playlists now have public flag set to 0");
			callback();
		});
		
	},
	unsetCurrentAllPlaylists:function(callback)
	{
		// TODO : Transformer en promesse
		// Désactive le flag Current sur toutes les playlists
		module.exports.DB_INTERFACE.unsetCurrentAllPlaylists(function(callback){
			logger.info("All playlists now have current flag set to 0");
			callback();
		});		
	},
	updatePlaylistDuration:function(playlist_id)
	{
		return new Promise(function(resolve,reject)
		{
			var pIsPlaylist = new Promise((resolve,reject) => 
			{
				module.exports.isPlaylist(playlist_id)
					.then(function()
					{						
						resolve(true);
					})
					.catch(function()
					{						
						reject('Playlist '+playlist_id+' does not exist');
					})		
			});
			Promise.all([pIsPlaylist])
			.then(function()
			{
				// Get playlist duration								
				module.exports.DB_INTERFACE.calculatePlaylistDuration(playlist_id)
				.then(function(duration){
					module.exports.DB_INTERFACE.updatePlaylistDuration(playlist_id,duration.duration)
					.then(function(duration){
						resolve(duration);
					})
					.catch(function(err){
						reject(err);
					})			
				})
				.catch(function(err){
					reject(err);
				})			
			})
		})
	},
	/**
	* @function {Get playlist contents}
	* @param  {number} playlist_id {ID of playlist to get contents from}
	* @return {array} {Array of playlist objects}
	*/
	getPlaylistContents:function(playlist_id)
	{
		return new Promise(function(resolve,reject)
		{
			var pIsPlaylist = new Promise((resolve,reject) => 
			{
				module.exports.isPlaylist(playlist_id)
					.then(function()
					{						
						resolve(true);
					})
					.catch(function()
					{						
						reject('Playlist '+playlist_id+' does not exist');
					})		
			});
			Promise.all([pIsPlaylist])
			.then(function()
			{
				// Get karaoke list								
				module.exports.DB_INTERFACE.getPlaylistContents(playlist_id)
				.then(function(playlist){
					resolve(playlist);
				})
				.catch(function(err){
					reject(err);
				})			
			})

		})
	},
	addKaraToPlaylist:function(kara_id,requester,playlist_id,pos)
	{
		return new Promise(function(resolve,reject){
			var NORM_requester = normalize(requester);
			var date_add = timestamp.now();
			var flag_playing = 0;

			var pIsPlaylist = new Promise((resolve,reject) => 
			{
				module.exports.isPlaylist(playlist_id)
					.then(function()
					{						
						resolve(true);
					})
					.catch(function()
					{						
						reject('Playlist '+playlist_id+' does not exist');
					})		
			});			
			var pIsKara = new Promise((resolve,reject) =>
			{
				module.exports.isKara(kara_id)
					.then(function()
					{						
						resolve(true);
					})
					.catch(function()
					{						
						reject('Kara '+kara_id+' does not exist');
					})		
			});
			Promise.all([pIsKara,pIsPlaylist])
			.then(function()
			{
				// Adding karaoke song here								
				module.exports.DB_INTERFACE.addKaraToPlaylist(kara_id,requester,NORM_requester,playlist_id,pos,date_add,flag_playing)
				.then(function(){
					module.exports.calculatePlaylistDuration(playlist_id);
					resolve(true);
				})
				.catch(function(err){
					reject(err);
				})			
			})

		});
		

		/* Ancienne fonction

		//var kara = this.DB_INTERFACE.get_kara(kara_id);
		// on récupère un object kara contenant tout ce que la bdd propose
		// la structure au 21/06/2017 étant
		/*
		`PK_id_kara` INTEGER PRIMARY KEY AUTOINCREMENT UNIQUE,
		`kid`	TEXT UNIQUE,
		`title`	TEXT COLLATE NOCASE,
		`year`	TEXT,
		`songorder`	INTEGER,
		`videofile`	TEXT,
		`subfile`	TEXT,
		`videolength`	INTEGER,
		`date_added`	INTEGER,
		`date_last_modified`	INTEGER,
		`rating`	REAL,
		`viewcount`	INTEGER
		
		var kara = {
			'kara_id':kara_id,//PK_id_kara
			'title':'Dragon Ball - OP - Maka fushigi Adventure',
			'videofile':'Dragon Ball - OP - Maka fushigi Adventure.avi',
			'subfile':'Dragon Ball - OP - Maka fushigi Adventure.ass',
			//...
		}
		// on enrichi l'objet
		kara.requested = requester;

		// puis on préparer l'ass qui lui sera associé pour la lecture
		require('./ass_builder.js')(
			path.resolve(module.exports.SYSPATH,'src/samples/lyrics',kara.subfile),
			path.resolve(module.exports.SYSPATH,'src/samples/videos',kara.videofile),
			path.resolve(module.exports.SYSPATH,'app/tmp'),
			kara.title,
			kara.requester
		)
		.then(function(processed_ass){
			// on met à jour l'object kara
			kara.videofile = path.resolve(module.exports.SYSPATH,'src/samples/videos',kara.videofile);
			kara.subfile = processed_ass;

			// Todo injection de l'entré dans la playlist BDD
			// pour le moment juste un objet local
			module.exports.samplePlaylist.push(kara);

			//appel
			module.exports.onPlaylistUpdated();
		})
		.catch(function(err){
			logger.error('addKara Fail : '+err.message);			
		});
		*/
	},

	get_next_kara:function(){
		// TODO implémenter la lecture dans la BDD via this.DB_INTERFACE
		return module.exports.samplePlaylist.shift()
	},

	// ---------------------------------------------------------------------------
	// Evenements à référencer par le composant  parent
	// ---------------------------------------------------------------------------

	onPlaylistUpdated:function(){
		// événement émis pour quitter l'application
		logger.error('_engine/components/playlist_controller.js :: onPlaylistUpdated not set')
	},
}