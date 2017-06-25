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