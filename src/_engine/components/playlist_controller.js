var path = require('path');
const { diacritics, normalize } = require('normalize-diacritics');
var timestamp = require("unix-timestamp");
timestamp.round = true;
    	
module.exports = {
	SYSPATH:null,
	DB_INTERFACE:null,

	samplePlaylist:[],

	init: function(){
		if(module.exports.SYSPATH === null)
		{
			console.log('_engine/components/playlist_controler.js : SYSPATH is null');
			process.exit();
		}
		if(module.exports.DB_INTERFACE === null)
		{
			console.log('_engine/components/playlist_controler.js : DB_INTERFACE is null');
			process.exit();
		}
	},

	isCurrentPlaylist:function(playlist_id,callback)
	{
		module.exports.DB_INTERFACE.isCurrentPlaylist(playlist_id,function(res){							
			console.log('Current = '+res);
			callback(res);
		});		
	},
	isPublicPlaylist:function(playlist_id,callback)
	{
		module.exports.DB_INTERFACE.isPublicPlaylist(playlist_id,function(res){							
			console.log('Public = '+res);
			callback(res);
		});		
	},
	isPlaylist:function(playlist_id,callback)
	{
		//Une requête toute bête pour voir si une Playlist existe
		module.exports.DB_INTERFACE.isPlaylist(playlist_id,function(res){							
			callback(res);
		});		
	},
	
	setCurrentPlaylist(playlist_id,callback)
	{
		module.exports.unsetCurrentAllPlaylists(function(){
			module.exports.DB_INTERFACE.setCurrentPlaylist(playlist_id,function(res){
				console.log('Setting playlist '+playlist_id+' current flag to ON');							
				callback();
			});		
		});	
	},
	setPublicPlaylist(playlist_id,callback)
	{
		module.exports.unsetPublicAllPlaylists(function(){
			module.exports.DB_INTERFACE.setPublicPlaylist(playlist_id, function(res){
				console.log('Setting playlist '+playlist_id+' public flag to ON');							
				callback();
			});		
		});		
	},
    deletePlaylist:function(playlist_id,new_curorpubplaylist_id)
	{
		// Suppression d'une playlist. Si la playlist a un flag_public ou flag_current, il faut
		// set l'un de ces flags sur l'autre ID de playlist (optionnel) fourni
		console.log('Deleting playlist '+playlist_id+', transferring flags to '+new_curorpubplaylist_id);
		return new Promise(function(resolve,reject){
			module.exports.isPlaylist(playlist_id,function(res) 
			{
				if (res == true) {
					var pIsPublic = new Promise((resolve,reject) => 
					{
						module.exports.isPublicPlaylist(playlist_id,function(res) {
							if (res == true) {
								module.exports.setPublicPlaylist(new_curorpubplaylist_id,function(){
									resolve(true);
								})
							} else {
								resolve(true);
							}							
						})
					});
					var pIsCurrent = new Promise((resolve,reject) =>
					{
						module.exports.isCurrentPlaylist(playlist_id,function(res) {
							if (res == true) {
								module.exports.setCurrentPlaylist(new_curorpubplaylist_id,function(){
									resolve(true);
								})
							} else {
								resolve(true);
							}							
						})
					});
					Promise.all([pIsPublic,pIsCurrent]).then(function(){
						module.exports.emptyPlaylist(playlist_id);
						//module.exports.DB_INTERFACE.deletePlaylist(playlist_id,function(res){
							resolve(playlist_id,new_curorpubplaylist_id);				
						//});
					})																
				} else {
					reject('Playlist does not exist!');
				}				
			});
		});
	},
	emptyPlaylist:function(playlist_id)
	{
		module.exports.DB_INTERFACE.emptyPlaylist(playlist_id);				
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
	unsetPublicAllPlaylists:function(callback)
	{
		// Désactive le flag Public sur toutes les playlists
		module.exports.DB_INTERFACE.unsetPublicAllPlaylists(function(){
			console.log("All playlists now have public flag set to 0");
			callback();
		});
		
	},
	unsetCurrentAllPlaylists:function(callback)
	{
		// Désactive le flag Current sur toutes les playlists
		module.exports.DB_INTERFACE.unsetCurrentAllPlaylists(function(){
			console.log("All playlists now have current flag set to 0");
			callback();
		});		
	},
	addKara:function(kara_id,requester)
	{
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
		*/
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
			console.log('addKara Fail');
			console.log(err.message);
		});
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
		console.log('_engine/components/playlist_controler.js :: onPlaylistUpdated not set')
	},
}