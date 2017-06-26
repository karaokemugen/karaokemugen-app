var path = require('path');
const { diacritics, normalize } = require('normalize-diacritics');
var timestamp = require("unix-timestamp");
timestamp.round = true;
    	
module.exports = {
	SYSPATH:null,
	DB_INTERFACE:null,

	samplePlaylist:[],

	init: function(){
		if(this.SYSPATH === null)
		{
			console.log('_engine/components/playlist_controler.js : SYSPATH is null');
			process.exit();
		}
		if(this.DB_INTERFACE === null)
		{
			console.log('_engine/components/playlist_controler.js : DB_INTERFACE is null');
			process.exit();
		}
	},

	createPlaylist:function(name,flag_visible,flag_current,flag_public)
	{
		// Méthode de création playlist
		// Prend en entrée un nom, et des booléens
		// Si flag_public ou flag_current = true il faut désactiver le flag sur toutes les autres playlists

		var NORM_name = normalize(name);
		var creation_time = timestamp.now();
		var lastedit_time = creation_time;

		if (flag_current == 1 && flag_public == 1)
		{
			var err = 'ERROR: Current and Public flags are mutually exclusive on a playlist.';
			return (err,0);
		}
		if (flag_public == 1)
		{
			this.unsetPublicAllPlaylists();
		}
		if (flag_current == 1)
		{
			this.unsetCurrentAllPlaylists();
		}
		
		var new_playlist = DB_INTERFACE.createPlaylist(name,NORM_name,creation_time,lastedit_time,flag_visible,flag_current,flag_public);
		return new_playlist;

	},
	unsetPublicAllPlaylists:function()
	{
		// Désactive le flag Public sur toutes les playlists
		this.DB_INTERFACE.unsetPublicAllPlaylists();
	},
	unsetCurrentAllPlaylists:function()
	{
		// Désactive le flag Current sur toutes les playlists
		this.DB_INTERFACE.unsetCurrentAllPlaylists();
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
			path.resolve(module.exports.SYSPATH,'samples/lyrics',kara.subfile),
			path.resolve(module.exports.SYSPATH,'samples/videos',kara.videofile),
			path.resolve(module.exports.SYSPATH,'app/tmp'),
			kara.title,
			kara.requester
		)
		.then(function(processed_ass){
			// on met à jour l'object kara
			kara.videofile = path.resolve(module.exports.SYSPATH,'samples/videos',kara.videofile);
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