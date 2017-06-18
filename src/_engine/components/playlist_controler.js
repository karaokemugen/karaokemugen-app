var path = require('path');

module.exports = {
	SYSPATH:null,
	DB_INTERFACE:null,

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
	get_next_kara:function(){
		var kara = this.DB_INTERFACE.get_next_kara();
	}
}