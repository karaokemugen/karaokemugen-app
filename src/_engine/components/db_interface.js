var path = require('path');

module.exports = {
	SYSPATH:null,
	_db_handler:null,

	init: function(){
		if(this.SYSPATH === null)
		{
			console.log('_engine/components/db_interface.js : SYSPATH is null');
			process.exit();
		}
		// démarre une instance de SQLITE
		var sqlite3 = require('sqlite3').verbose();
		this._db_handler = new sqlite3.Database(path.join(this.SYSPATH,'app/db/karas.sqlite3'));
	},

	// implémenter ici toutes les méthodes de lecture écritures qui seront utilisé par l'ensemble de l'applicatif
	// aucun autre composant ne doit manipuler la base SQLITE par un autre moyen

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