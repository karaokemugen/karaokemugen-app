var path = require('path');
var fs = require('fs-extra');
const logger = require('winston');
const async = require('async');
import {getUserDb} from '../../_dao/database';


module.exports = {
	_ready: true,
	
	isReady: function() {
		return module.exports._ready;
	},

	// Below are all methods used by other components to access and manipulate data in the database.
	/**
	* @function {Calculate number of a karaoke songs in a whole playlist}
	* @param  {number} playlist_id {ID of playlist to recalculate number of songs}
	* @return {number} {Number of karaoke songs found}
	*/
	calculatePlaylistNumOfKaras:function(playlist_id) {
		return new Promise(function(resolve,reject){
			if(!module.exports.isReady()) {
				reject('Database interface is not ready yet');
			}
			var sqlCalculatePlaylistNumOfKaras = fs.readFileSync(path.join(__dirname,'../../_common/db/calculate_playlist_numofkaras.sql'),'utf-8');
			getUserDb().get(sqlCalculatePlaylistNumOfKaras,
				{
					$playlist_id: playlist_id
				})
				.then((num_karas) => {
					resolve(num_karas.NumberOfKaras);
				})
				.catch((err) => {
					reject('Failed to calculate playlist karaoke count : '+err);
				});
		});
	},
	/*
	* @function {getSongCountForUser}
	* @param {number} {ID of Playlist to count songs in}
	* @param {string} {name of person to check for requested songs}
	* @return {boolean} {promise}
	*/
	getSongCountForUser:function(playlist_id,requester) {
		return new Promise((resolve,reject) => {
			if(!module.exports.isReady()) {
				reject('Database interface is not ready yet');
			}
			var sqlGetSongCountForUser = fs.readFileSync(path.join(__dirname,'../../_common/db/select_song_count_for_user_in_playlist.sql'),'utf-8');
			getUserDb().get(sqlGetSongCountForUser,
				{
					$playlist_id: playlist_id,
					$requester: requester
				})
				.then((data) => {
					resolve(data.count);
				})
				.catch((err) => {
					reject('Failed to get number of songs for user '+requester+' in playlist '+playlist_id+' : '+err);
				});						
		});
	},	
	updatePlaylistNumOfKaras:function(playlist_id,num_karas) {
		return new Promise(function(resolve,reject){
			if(!module.exports.isReady()) {
				reject('Database interface is not ready yet');
			}
			var sqlUpdatePlaylistNumOfKaras = fs.readFileSync(path.join(__dirname,'../../_common/db/update_playlist_numofkaras.sql'),'utf-8');
			getUserDb().run(sqlUpdatePlaylistNumOfKaras,
				{
					$playlist_id: playlist_id,
					$num_karas: num_karas
				})
				.then(() => {
					resolve(num_karas);
				})
				.catch((err) => {
					reject('Failed to update song count in playlist '+playlist_id+' : '+err);
				});		
		});
	},
	/**
	* @function {Reorders playlist item positions}
	* @param  {number} playlist_id {ID of playlist to reorder}
	* @param  {array} playlist   {Playlist array of kara objects}
	* @return {boolean} {Promise}
	*/
	reorderPlaylist:function(playlist_id,playlist) {
		return new Promise(function(resolve,reject){
			if(!module.exports.isReady()) {
				reject('Database interface is not ready yet');
			}
			var sqlUpdateKaraPosition = fs.readFileSync(path.join(__dirname,'../../_common/db/update_plc_set_pos.sql'),'utf-8');

			var newpos = 0;			
			var karaList = [];
			playlist.forEach(function(kara) {				
				newpos++;
				karaList.push({
					$pos: newpos,	
					$playlistcontent_id: kara.playlistcontent_id
				});
			});
			
			async.retry(
				{ 
					times: 5,
					interval: 100,
				},
				function(callback){
					getUserDb().run('begin transaction')
						.then(() => {
							async.each(karaList,function(data,callback){
								getUserDb().prepare(sqlUpdateKaraPosition)
									.then((stmt) => {
										stmt.run(data)
											.then(() => {
												callback();
											})
											.catch((err) => {
												logger.error('Failed to reorder karaoke in playlist : '+err);
												callback(err);					
											});
									});
							}, function(err){
								if (err) {
									callback('Failed to reorder one karaoke to playlist : '+err);
								} else {
									getUserDb().run('commit')
										.then(() => {	
											callback();
										})
										.catch((err) => {
											callback(err);
										});								
								}
							});		
						})
						.catch((err) => {
							logger.error('[DBI] Failed to begin transaction : '+err);
							logger.error('[DBI] Transaction will be retried');
							callback(err);
						}); 					
				},function(err){
					if (err){
						reject(err);
					} else {
						resolve();
					}
				});
			
		});
	},
	/**
	* @function {Update playlist's duration field}
	* @param  {number} playlist_id {ID of playlist to update}
	* @param  {number} duration    {Duration in seconds}
	* @return {boolean} {Promise}
	*/
	updatePlaylistDuration:function(playlist_id) {
		return new Promise(function(resolve,reject){
			if(!module.exports.isReady()) {
				reject('Database interface is not ready yet');
			}
			var sqlUpdatePlaylistDuration = fs.readFileSync(path.join(__dirname,'../../_common/db/update_playlist_duration.sql'),'utf-8');
			getUserDb().run(sqlUpdatePlaylistDuration,
				{
					$playlist_id: playlist_id
				})
				.then(() => {
					resolve();
				})
				.catch((err) => {
					reject('Failed to update duration of playlist '+playlist_id+' : '+err);
				});						 
		});
	},
	/**
	* @function {Update playlist's time left}
	* @param  {number} playlist_id {ID of playlist to update}
	* @param  {number} timeLeft    {time left i nseconds}
	* @return {boolean} {Promise}
	*/
	updatePlaylistTimeLeft:function(playlist_id,timeLeft) {
		return new Promise(function(resolve,reject){
			if(!module.exports.isReady()) {
				reject('Database interface is not ready yet');
			}
			var sqlUpdatePlaylistTimeLeft = fs.readFileSync(path.join(__dirname,'../../_common/db/update_playlist_time_left.sql'),'utf-8');
			getUserDb().run(sqlUpdatePlaylistTimeLeft,
				{
					$playlist_id: playlist_id,
					$time_left: timeLeft
				})
				.then(() => {
					resolve();
				})
				.catch((err) => {
					reject('Failed to update duration of playlist '+playlist_id+' : '+err);
				});						 
		});
	},
	/**
	* @function {Get contents of playlist}
	* @param  {number} playlist_id {ID of playlist to get a list of songs from}
	* @param  {number} forPlayer (if it's for the player, we get a smaller set of data)
	* @return {Object} {Playlist object}
	*/
	getPlaylistContents:function(playlist_id,forPlayer){
		return new Promise(function(resolve,reject){
			if(!module.exports.isReady()) {
				reject('Database interface is not ready yet');
			}
			var sqlGetPlaylistContents;
			if (forPlayer) {
				sqlGetPlaylistContents = fs.readFileSync(path.join(__dirname,'../../_common/db/select_playlist_contents_for_player.sql'),'utf-8');
			} else {
				sqlGetPlaylistContents = fs.readFileSync(path.join(__dirname,'../../_common/db/select_playlist_contents.sql'),'utf-8');
			}
			
			getUserDb().all(sqlGetPlaylistContents,
				{
					$playlist_id: playlist_id
				})
				.then((playlist) => {
					resolve(playlist);
				})
				.catch((err) => {
					reject('Failed to get contents of playlist '+playlist_id+' : '+err);
				});
			
		});
	},	
	/**
	* @function {Get pos of all items in a playlist}
	* @param  {number} playlist_id {ID of playlist to get a list of songs from}
	* @return {Object} {Playlist object}
	*/
	getPlaylistPos:function(playlist_id){
		return new Promise(function(resolve,reject){
			if(!module.exports.isReady()) {
				reject('Database interface is not ready yet');
			}
			var sqlGetPlaylistPos = fs.readFileSync(path.join(__dirname,'../../_common/db/select_playlist_pos.sql'),'utf-8');
			
			
			getUserDb().all(sqlGetPlaylistPos,
				{
					$playlist_id: playlist_id
				})
				.then((playlist) => {
					resolve(playlist);
				})
				.catch((err) => {
					reject('Failed to get list of playlist pos '+playlist_id+' : '+err);
				});	
		});
	},	
	/**
	* @function {Get PLC of kara by date added}
	* @param  {number} playlist_id {ID of playlist to get a list of songs from}
	* @param  {number} date_added {Date in unix timestamp}
	* @return {Object} {Playlist object}
	*/
	getPLCIDByDate:function(playlist_id,date_added){
		return new Promise(function(resolve,reject){
			if(!module.exports.isReady()) {
				reject('Database interface is not ready yet');
			}
			var sqlGetPLCIDByDate = fs.readFileSync(path.join(__dirname,'../../_common/db/select_plcid_by_date.sql'),'utf-8');
			getUserDb().all(sqlGetPLCIDByDate,
				{
					$playlist_id: playlist_id,
					$date_added: date_added
				})
				.then((plcid) => {
					resolve(plcid[0].playlistcontent_id);
				})
				.catch((err) => {
					reject('Failed to get PLCID from '+playlist_id+' with date '+date_added+' : '+err);
				});						
		});
	},	
	/**
	* @function {Get all playlist contents no matter the playlist}
	* @return {Object} {Playlist object}
	*/
	getAllPlaylistContents:function(){
		return new Promise(function(resolve,reject){
			if(!module.exports.isReady()) {
				reject('Database interface is not ready yet');
			}			
			var sqlGetAllPlaylistContents = fs.readFileSync(path.join(__dirname,'../../_common/db/select_all_playlist_contents.sql'),'utf-8');
			getUserDb().all(sqlGetAllPlaylistContents)
				.then((playlist) => {
					resolve(playlist);
				})
				.catch((err) => {
					reject('Failed to get all playlists contents : '+err);
				});						
		});
	},
	/**
	* @function {Get all karaokes}
	* @return {array} {array of karaoke objects}
	*/
	getAllKaras:function(){
		return new Promise(function(resolve,reject){
			if(!module.exports.isReady()) {
				reject('Database interface is not ready yet');
			}
			var sqlGetAllKaras = fs.readFileSync(path.join(__dirname,'../../_common/db/select_all_karas.sql'),'utf-8');
			getUserDb().all(sqlGetAllKaras)
				.then((playlist) => {
					resolve(playlist);
				})
				.catch((err) => {
					reject('Failed to fetch all karaokes : '+err);
				});												
		});
	},
	/**
	* @function {Get karaoke info from a playlistcontent_id}
	* @return {object} {Karaoke object}
	*/
	getPLContentInfo:function(playlistcontent_id,seenFromUser){
		return new Promise(function(resolve,reject){
			if(!module.exports.isReady()) {
				reject('Database interface is not ready yet');
			}
			var sqlGetPLContentInfo = fs.readFileSync(path.join(__dirname,'../../_common/db/select_plcontent_info.sql'),'utf-8');
			if (seenFromUser) {
				sqlGetPLContentInfo += ' AND p.flag_visible = 1';
			}
			getUserDb().get(sqlGetPLContentInfo,
				{
					$playlistcontent_id: playlistcontent_id
				})
				.then((kara) => {
					resolve(kara);
				})
				.catch((err) => {
					reject('Failed to get playlist item '+playlistcontent_id+'\'s information : '+err);
				});						
		});
	},
	/**
	* @function {Get one karaoke}
	* @param  {number} kara_id {Karaoke ID}
	* @return {Object} {karaoke object}
	*/
	getKara:function(kara_id){
		return new Promise(function(resolve,reject){
			if(!module.exports.isReady()) {
				reject('Database interface is not ready yet');
			}

			var sqlGetKara = fs.readFileSync(path.join(__dirname,'../../_common/db/select_kara.sql'),'utf-8');
			getUserDb().get(sqlGetKara,
				{
					$kara_id: kara_id
				})
				.then((kara) => {
					resolve(kara);
				})
				.catch((err) => {
					reject('Failed to get karaoke song '+kara_id+' information : '+err);
				});										
		});
	},
	/**
	* @function {Get one karaoke's ASS data}
	* @param  {number} kara_id {Karaoke ID}
	* @return {Object} {ASS Object}
	*/
	getASS:function(kara_id){
		return new Promise(function(resolve,reject){
			if(!module.exports.isReady()) {
				reject('Database interface is not ready yet');
			}

			var sqlGetASS = fs.readFileSync(path.join(__dirname,'../../_common/db/select_ass.sql'),'utf-8');
			getUserDb().get(sqlGetASS,
				{
					$kara_id: kara_id
				})
				.then((ass) => {
					resolve(ass);
				})
				.catch((err) => {
					reject('Failed to get karaoke song '+kara_id+' ASS : '+err);
				});														
		});
	},
	/**
	* @function {Get one karaoke by KID}
	* @param  {string} kid {KID}
	* @return {Object} {karaoke object}
	*/
	getKaraByKID:function(kid){
		return new Promise(function(resolve,reject){
			if(!module.exports.isReady()) {
				reject('Database interface is not ready yet');
			}

			var sqlGetKaraByKID = fs.readFileSync(path.join(__dirname,'../../_common/db/select_kara_by_kid.sql'),'utf-8');
			getUserDb().get(sqlGetKaraByKID,
				{
					$kid: kid
				})
				.then((kara) => {
					resolve(kara);
				})
				.catch((err) => {
					reject('Failed to get karaoke song '+kid+' information : '+err);
				});														
		});
	},
	/**
	* @function {Get one PLC by KID}
	* @param  {string} kid {KID}
	* @param  {string} playlist_id {playlist ID}
	* @return {Object} {karaoke object}
	*/
	getPLCByKID:function(kid,playlist_id){
		return new Promise(function(resolve,reject){
			if(!module.exports.isReady()) {
				reject('Database interface is not ready yet');
			}			
			var sqlGetPLCByKID = fs.readFileSync(path.join(__dirname,'../../_common/db/select_plcontent_by_kid.sql'),'utf-8');
			getUserDb().get(sqlGetPLCByKID,
				{
					$kid: kid,
					$playlist_id: playlist_id
				})
				.then((kara) => {
					resolve(kara);
				})
				.catch((err) => {
					reject('Failed to get PLC song '+kid+' information : '+err);
				});														
		});
	},
	/**
	* @function {getPlaylistInfo}
	* @param  {number} playlist_id {Playlist ID}
	* @return {Object} {Playlist object}
	* Selects playlist info from playlist table. Returns the info in a promise.
	*/
	getPlaylistInfo:function(playlist_id,seenFromUser) {
		return new Promise(function(resolve,reject){
			var sqlGetPlaylistInfo = fs.readFileSync(path.join(__dirname,'../../_common/db/select_playlist_info.sql'),'utf-8');
			if (seenFromUser) {
				sqlGetPlaylistInfo += ' AND flag_visible = 1';
			}
			getUserDb().get(sqlGetPlaylistInfo,
				{
					$playlist_id: playlist_id
				})
				.then((playlist_info) => {
					if (playlist_info) {
						resolve(playlist_info);
					} else {
						reject('Playlist '+playlist_id+' not found');
					}
				})
				.catch((err) => {
					reject('Failed to fetch playlist '+playlist_id+' information : '+err);
				});						
		});
	},
	/**
	* @function {getPlaylists}
	* @return {Object} {Array of Playlist objects}
	* Selects playlist info from playlist table. Returns the info in a promise
	*/
	getPlaylists:function(seenFromUser) {
		return new Promise(function(resolve,reject){
			var sqlGetPlaylists = fs.readFileSync(path.join(__dirname,'../../_common/db/select_all_playlists_info.sql'),'utf-8');
			// If seen from the user/public view, we're only showing playlists with
			// visible flag
			if (seenFromUser) {
				sqlGetPlaylists += ' WHERE flag_visible = 1 ORDER BY flag_current DESC, flag_public DESC, name';
			} else {
				sqlGetPlaylists += ' ORDER BY flag_current DESC, flag_public DESC, name';
			}
			getUserDb().all(sqlGetPlaylists)
				.then((playlists) => {
					resolve(playlists);
				})
				.catch((err) => {
					logger.error('[DBI] Failed to fetch list of playlists : '+err);
					reject(err);
				});						
		});
	},
	/**
	* @function {Checks for a current playlist}
	* @return {boolean} {Promise}
	*/
	isACurrentPlaylist:function() {
		return new Promise(function(resolve,reject){
			if(!module.exports.isReady()) {
				reject('Database interface is not ready yet');
			}
			var sqlTestCurrentPlaylistExists = fs.readFileSync(path.join(__dirname,'../../_common/db/test_current_playlist_exists.sql'),'utf-8');
			getUserDb().get(sqlTestCurrentPlaylistExists)
				.then((playlist) => {
					if (playlist) {
						resolve(playlist.pk_id_playlist);
					} else {
						reject('No current playlist found');
					}
				})
				.catch((err) => {
					logger.error('[DBI] Failed to find out if there is a current playlist : '+err);
					reject(err);
				});						
		});
	},
	/**
	* @function {Checks for a public playlist}
	* @return {number} {Playlist ID or rejection}
	*/
	isAPublicPlaylist:function() {
		return new Promise(function(resolve,reject){
			if(!module.exports.isReady()) {
				reject('Database interface is not ready yet');
			}
			var sqlTestPublicPlaylistExists = fs.readFileSync(path.join(__dirname,'../../_common/db/test_public_playlist_exists.sql'),'utf-8');
			getUserDb().get(sqlTestPublicPlaylistExists)
				.then((playlist) => {
					if (playlist) {
						resolve(playlist.pk_id_playlist);
					} else {
						reject('No public playlist found');
					}
				})
				.catch((err) => {
					logger.error('[DBI] Failed to find out if there is a public playlist : '+err);
					reject(err);
				});						
		});
	},
	isPublicPlaylist:function(playlist_id) {
		return new Promise(function(resolve,reject){
			var sqlIsPlaylistPublic = fs.readFileSync(path.join(__dirname,'../../_common/db/select_playlist_public_flag.sql'),'utf-8');
			getUserDb().get(sqlIsPlaylistPublic,
				{
					$playlist_id: playlist_id
				})
				.then((playlist) => {
					if (playlist) {
						if (playlist.flag_public == 1) {
							resolve(true);
						} else {
							resolve(false);
						}
					} else {
						reject('Playlist '+playlist_id+' unknown');
					}
				})
				.catch((err) => {
					reject('Failed to test if playlist '+playlist_id+' is public or not : '+err);
				});						 
		});
	},
	isCurrentPlaylist:function(playlist_id) {
		return new Promise(function(resolve,reject){
			var sqlIsPlaylistCurrent = fs.readFileSync(path.join(__dirname,'../../_common/db/select_playlist_current_flag.sql'),'utf-8');
			getUserDb().get(sqlIsPlaylistCurrent,
				{
					$playlist_id: playlist_id
				})
				.then((playlist) => {
					if (playlist) {
						if (playlist.flag_current == 1) {
							resolve(true);
						} else {
							resolve(false);
						}
					} else {
						reject('Playlist '+playlist_id+' unknown');
					}
				})
				.catch((err) => {
					reject('Failed to test if playlist '+playlist_id+' is current or not : '+err);
				});				
		});
	},
	/**
	* @function {is it a kara?}
	* @param  {number} kara_id {Karaoke ID to check for existence}
	* @return {type} {Returns true or false}
	*/
	isKara:function(kara_id) {
		return new Promise(function(resolve,reject){
			var sqlIsKara = fs.readFileSync(path.join(__dirname,'../../_common/db/test_kara.sql'),'utf-8');
			getUserDb().get(sqlIsKara,
				{
					$kara_id: kara_id
				})
				.then((kara) => {
					if (kara) {
						resolve(true);						
					} else {
						resolve(false);
					}
				})
				.catch((err) => {
					reject('Failed to test if karaoke '+kara_id+' exists : '+err);
				});								
		});
	},	
	/**
	* @function {Raises position of a song in playlist}
	* @param  {number} playlist_id        {ID of playlist to modify}
	* @param  {number} pos        {Position to modify}
	* @return {promise} {Promise}
	*/
	raisePosInPlaylist:function(pos,playlist_id) {
		return new Promise(function(resolve,reject){
			if(!module.exports.isReady()) {
				reject('Database interface is not ready yet');
			}

			var newpos = pos + 0.1;
			var sqlRaisePosInPlaylist = fs.readFileSync(path.join(__dirname,'../../_common/db/update_raise_pos_in_playlist.sql'),'utf-8');
			getUserDb().run(sqlRaisePosInPlaylist,
				{
					$newpos: newpos,
					$playlist_id: playlist_id,
					$pos: pos
				})
				.then(() => {
					resolve();
				})
				.catch((err) => {
					reject('Failed to update position in playlist '+playlist_id+' : '+err);
				});						
		});
	},	
	/**
	* @function {Is the kara in the playlist?}
	* @param  {number} kara_id {ID of karaoke to search for}
	* @param  {number} playlist_id {ID of playlist to search in}
	* @return {boolean} {Promise}
	*/
	isKaraInPlaylist:function(kara_id,playlist_id) {
		return new Promise(function(resolve,reject){
			var sqlIsKaraInPlaylist = fs.readFileSync(path.join(__dirname,'../../_common/db/test_kara_in_playlist.sql'),'utf-8');
			getUserDb().get(sqlIsKaraInPlaylist,
				{
					$kara_id: kara_id,
					$playlist_id: playlist_id
				})
				.then((kara) => {
					if (kara) {
						resolve(true);						
					} else {
						resolve(false);
					}
				})
				.catch((err) => {
					reject('Failed to find if karaoke song '+kara_id+' is in playlist '+playlist_id+' or not : '+err);
				});						
		});
	},
	/**
	* @function {Is the kara in the blacklist?}
	* @param  {number} kara_id {ID of karaoke to search for}
	* @return {boolean} {Promise}
	*/
	isKaraInBlacklist:function(kara_id) {
		return new Promise(function(resolve,reject){
			var sqlIsKaraInBlacklist = fs.readFileSync(path.join(__dirname,'../../_common/db/test_kara_in_blacklist.sql'),'utf-8');
			getUserDb().get(sqlIsKaraInBlacklist,
				{
					$kara_id: kara_id,
				})
				.then((kara) => {
					if (kara) {
						resolve(true);						
					} else {
						resolve(false);
					}
				})
				.catch((err) => {
					reject('Failed to search for karaoke '+kara_id+' in blacklist : '+err);
				});						
		});
	},
	/**
	* @function {Is the kara in the whitelist?}
	* @param  {number} kara_id {ID of karaoke to search for}
	* @return {boolean} {Promise}
	*/
	isKaraInWhitelist:function(kara_id) {
		return new Promise(function(resolve,reject){
			var sqlIsKaraInWhitelist = fs.readFileSync(path.join(__dirname,'../../_common/db/test_kara_in_whitelist.sql'),'utf-8');
			getUserDb().get(sqlIsKaraInWhitelist,
				{
					$kara_id: kara_id
				})
				.then((kara) => {
					if (kara) {
						resolve(true);						
					} else {
						resolve(false);
					}
				})
				.catch((err) => {
					reject('Failed to search for karaoke '+kara_id+' in whitelist : '+err);
				});						
		});
	},
	/**
	* @function {is it a playlist?}
	* @param  {number} playlist_id {Playlist ID to check for existence}
	* @return {type} {Returns true or false}
	*/
	isPlaylist:function(playlist_id,seenFromUser) {
		return new Promise(function(resolve,reject){
			var sqlIsPlaylist = fs.readFileSync(path.join(__dirname,'../../_common/db/test_playlist.sql'),'utf-8');
			if (seenFromUser) {
				sqlIsPlaylist += ' AND flag_visible = 1';
			}
			getUserDb().get(sqlIsPlaylist,
				{
					$playlist_id: playlist_id
				})
				.then((playlist) => {
					if (playlist) {
						resolve(true);						
					} else {
						resolve(false);
					}
				})
				.catch((err) => {
					reject('Failed to test if playlist '+playlist_id+' exists : '+err);
				});										
		});
	},
	/**
	* @function {Does the playlist have a flag_playing set inside it?}
	* @param  {number} playlist_id {Playlist ID to check}
	* @return {type} {Returns true or false}
	*/
	isPlaylistFlagPlaying:function(playlist_id) {
		return new Promise(function(resolve,reject){
			var sqlIsPlaylistFlagPlaying = fs.readFileSync(path.join(__dirname,'../../_common/db/test_playlist_flag_playing.sql'),'utf-8');
			getUserDb().get(sqlIsPlaylistFlagPlaying,
				{
					$playlist_id: playlist_id
				})
				.then((playlist) => {
					if (playlist) {
						resolve(true);						
					} else {
						resolve(false);
					}
				})
				.catch((err) => {
					reject('Failed to test if playlist '+playlist_id+' has a flag_playing song : '+err);
				});
		});
	},
	setCurrentPlaylist:function(playlist_id) {
		return new Promise(function(resolve,reject){
			var sqlSetCurrentPlaylist = fs.readFileSync(path.join(__dirname,'../../_common/db/update_playlist_set_current.sql'),'utf-8');
			getUserDb().run(sqlSetCurrentPlaylist,
				{
					$playlist_id: playlist_id
				})
				.then(() => {
					resolve();
				})
				.catch((err) => {
					reject('Failed to set current flag on playlist '+playlist_id+' : '+err);
				});						
		});
	},
	/**
	* @function {setVisiblePlaylist}
	* @param  {number} playlist_id {ID of playlist to make visible}
	* @return {string} {error}
	*/
	setVisiblePlaylist:function(playlist_id) {
		return new Promise(function(resolve,reject){
			var sqlSetVisiblePlaylist = fs.readFileSync(path.join(__dirname,'../../_common/db/update_playlist_set_visible.sql'),'utf-8');
			getUserDb().run(sqlSetVisiblePlaylist,
				{
					$playlist_id: playlist_id
				})
				.then(() => {
					resolve();
				})
				.catch((err) => {
					reject('Failed to set visible flag on playlist '+playlist_id+' : '+err);
				});										
		});
	},
	/**
	* @function {unsets Flag Playing on a playlist}
	* @param  {number} playlist_id {ID of playlist where to unset the flag}
	* @return {string} {error}
	*/
	unsetPlaying:function(playlist_id) {
		return new Promise(function(resolve,reject){

			//Unset playing flag everywhere on this playlist
			var sqlUnsetPlaying = fs.readFileSync(path.join(__dirname,'../../_common/db/update_plc_unset_playing.sql'),'utf-8');
			getUserDb().run(sqlUnsetPlaying,
				{
					$playlist_id: playlist_id
				})
				.then(() => {
					resolve();
				})
				.catch((err) => {
					reject('Failed to unset playing flag on playlist '+playlist_id+' : '+err);
				});										
		});
	},
	/**
	* @function {Sets Flag Playing on a PL content}
	* @param  {number} playlistcontent_id {ID of playlist content to set to playing}
	* @return {string} {error}
	*/
	setPlaying:function(playlistcontent_id,playlist_id) {
		return new Promise(function(resolve,reject){

			//Unset playing flag everywhere on this playlist
			module.exports.unsetPlaying(playlist_id)
				.then(function() {
					var sqlSetPlaying = fs.readFileSync(path.join(__dirname,'../../_common/db/update_plc_set_playing.sql'),'utf-8');
					getUserDb().run(sqlSetPlaying,
						{
							$playlistcontent_id: playlistcontent_id
						})
						.then(() => {
							resolve();
						})
						.catch((err) => {
							reject('Failed to set playing flag on PLC '+playlistcontent_id+' : '+err);
						});									
				})
				.catch(function(err){
					reject(err);
				});
		});
	},
	/**
	* @function {Sets Flag Playing on a PL content}
	* @param  {number} playlistcontent_id {ID of playlist content to set to playing}
	* @return {string} {error}
	*/
	setPos:function(playlistcontent_id,pos) {
		return new Promise(function(resolve,reject){

			//Unset playing flag everywhere on this playlist
			var sqlSetPos = fs.readFileSync(path.join(__dirname,'../../_common/db/update_plc_set_pos.sql'),'utf-8');
			getUserDb().run(sqlSetPos,
				{
					$playlistcontent_id: playlistcontent_id,
					$pos: pos
				})
				.then(() => {
					resolve();
				})
				.catch((err) => {
					reject('Failed to set position on PLC '+playlistcontent_id+' : '+err);
				});									
		});
	},
	/**
	* @function {unsetVisiblePlaylist}
	* @param  {number} playlist_id {ID of playlist to make invisible}
	* @return {string} {error}
	*/
	unsetVisiblePlaylist:function(playlist_id) {
		return new Promise(function(resolve,reject){
			var sqlUnsetVisiblePlaylist = fs.readFileSync(path.join(__dirname,'../../_common/db/update_playlist_unset_visible.sql'),'utf-8');
			getUserDb().run(sqlUnsetVisiblePlaylist,
				{
					$playlist_id: playlist_id
				})
				.then(() => {
					resolve();
				})
				.catch((err) => {
					reject('Failed to unset visible flag on playlist '+playlist_id+' : '+err);
				});													
		});
	},
	setPublicPlaylist:function(playlist_id) {
		return new Promise(function(resolve,reject){
			var sqlSetPublicPlaylist = fs.readFileSync(path.join(__dirname,'../../_common/db/update_playlist_set_public.sql'),'utf-8');
			getUserDb().run(sqlSetPublicPlaylist,
				{
					$playlist_id: playlist_id
				})
				.then(() => {
					resolve();
				})
				.catch((err) => {
					reject('Failed to set public flag on playlist '+playlist_id+' : '+err);
				});					
		});
	},
	unsetPublicAllPlaylists:function() {
		return new Promise(function(resolve,reject){
			if(!module.exports.isReady()) {
				reject('Database interface is not ready yet');
			}

			var sqlUpdatePlaylistsUnsetPublic = fs.readFileSync(path.join(__dirname,'../../_common/db/update_playlist_unset_public.sql'),'utf-8');
			getUserDb().run(sqlUpdatePlaylistsUnsetPublic)
				.then(() => {
					resolve();
				})
				.catch((err) => {
					reject('Failed to unset public flag on all playlists : '+err);
				});									
		});
	},
	updatePlaylistLastEditTime:function(playlist_id,lastEditTime) {
		return new Promise(function(resolve,reject){
			if(!module.exports.isReady()) {
				reject('Database interface is not ready yet');
			}

			var sqlUpdatePlaylistLastEditTime = fs.readFileSync(path.join(__dirname,'../../_common/db/update_playlist_last_edit_time.sql'),'utf-8');
			getUserDb().run(sqlUpdatePlaylistLastEditTime,
				{
					$playlist_id: playlist_id,
					$modified_at: lastEditTime
				})
				.then(() => {
					resolve();
				})
				.catch((err) => {
					reject('Failed to set last edit time on playlist '+playlist_id+' : '+err);
				});
		});
	},
	unsetCurrentAllPlaylists:function() {
		return new Promise(function(resolve,reject){
			if(!module.exports.isReady()) {
				reject('Database interface is not ready yet');
			}

			var sqlUpdatePlaylistsUnsetCurrent = fs.readFileSync(path.join(__dirname,'../../_common/db/update_playlist_unset_current.sql'),'utf-8');
			getUserDb().run(sqlUpdatePlaylistsUnsetCurrent)
				.then(() => {
					resolve();
				})
				.catch((err) => {
					reject('Failed to unset current flag on all playlists : '+err);
				});
		});
	},
	/**
	* @function {Empties a playlist}
	* @param  {number} playlist_id {ID of playlist}
	* @return {Promise} {yakusoku da yo}
	*/
	emptyPlaylist:function(playlist_id) {
		return new Promise(function(resolve,reject){
			// Empties playlist
			var sqlEmptyPlaylist = fs.readFileSync(path.join(__dirname,'../../_common/db/empty_playlist.sql'),'utf-8');
			getUserDb().run(sqlEmptyPlaylist,
				{
					$playlist_id: playlist_id
				})
				.then(() => {
					resolve();
				})
				.catch((err) => {
					logger.error('[DBI] Failed to empty playlist '+playlist_id+' : '+err);
					reject(err);					
				});				
		});
	},
	/**
	* @function {Deletes a playlist}
	* @param  {number} playlist_id {ID of playlist}
	* @return {Promise} {yakusoku da yo}
	*/
	deletePlaylist:function(playlist_id) {
		return new Promise(function(resolve,reject){
			var sqlDeletePlaylist = fs.readFileSync(path.join(__dirname,'../../_common/db/delete_playlist.sql'),'utf-8');
			getUserDb().run(sqlDeletePlaylist,
				{
					$playlist_id: playlist_id
				})
				.then(() => {
					resolve();
				})
				.catch((err) => {
					logger.error('[DBI] Failed to delete playlist '+playlist_id+' : '+err);
					reject(err);					
				});
		});
	},
	/**
	* @function {Adds one viewcount entry to table}
	* @param  {number} kara_id  {Database ID of Kara to add a VC to}
	* @param  {string} kid      {KID provided}
	* @param  {number} datetime {date and time in unix timestamp}
	* @return {promise} {promise}
	*/
	addViewcount:function(kara_id,kid,datetime) {
		return new Promise(function(resolve,reject){
			if(!module.exports.isReady()) {
				logger.error('[DBI] Database interface is not ready yet!');
				reject();
			}
			var sqlAddViewcount = fs.readFileSync(path.join(__dirname,'../../_common/db/add_viewcount.sql'),'utf-8');
			getUserDb().run(sqlAddViewcount,
				{
					$kara_id: kara_id,
					$kid: kid,
					$modified_at: datetime
				})
				.then(() => {
					resolve();
				})
				.catch((err) => {
					logger.error('[DBI] Failed to add viewcount for karaoke '+kara_id+' : '+err);
					reject(err);					
				});				
		});
	},
	updateTotalViewcounts:function(kid) {
		return new Promise(function(resolve,reject){
			if(!module.exports.isReady()) {
				logger.error('[DBI] Database interface is not ready yet!');
				reject();
			}
			var sqlCalculateViewcount = fs.readFileSync(path.join(__dirname,'../../_common/db/calculate_viewcount.sql'),'utf-8');
			getUserDb().run(sqlCalculateViewcount,
				{
					$kid: kid
				})
				.then(() => {
					resolve();
				})
				.catch((err) => {
					logger.error('[DBI] Failed to calculate viewcount for karaoke ID '+kid+' : '+err);
					reject(err);					
				});								
		});
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
	editPlaylist:function(playlist_id,name,NORM_name,lastedit_time,flag_visible,flag_current,flag_public) {
		logger.debug('[DBI] editPlaylist : args : '+JSON.stringify(arguments));
		return new Promise(function(resolve,reject){
			if(!module.exports.isReady()) {
				logger.error('[DBI] Database interface is not ready yet!');
				reject();
			}

			// Edition de la playlist
			// Prend en entrée name, NORM_name, modified_at, flag_visible, flag_current, flag_public
			// Retourne l'ID de la playlist nouvellement crée.

			var sqlEditPlaylist = fs.readFileSync(path.join(__dirname,'../../_common/db/edit_playlist.sql'),'utf-8');
			getUserDb().run(sqlEditPlaylist,
				{
					$playlist_id: playlist_id,
					$name: name,
					$NORM_name: NORM_name,
					$modified_at: lastedit_time,
					$flag_visible: flag_visible,
					$flag_current: flag_current,
					$flag_public: flag_public
				})
				.then(() => {
					resolve();
				})
				.catch((err) => {
					logger.error('[DBI] Failed to edit playlist '+playlist_id+' : '+err);
					reject(err);					
				});												
		});
	},
	createPlaylist:function(name,NORM_name,creation_time,lastedit_time,flag_visible,flag_current,flag_public) {
		return new Promise(function(resolve,reject){
			if(!module.exports.isReady()) {
				logger.error('[DBI] Database interface is not ready yet!');
				reject('Database not ready');
			}

			// Creating playlist
			var sqlCreatePlaylist = fs.readFileSync(path.join(__dirname,'../../_common/db/create_playlist.sql'),'utf-8');
			getUserDb().run(sqlCreatePlaylist,
				{
					$name: name,
					$NORM_name: NORM_name,
					$created_at: creation_time,
					$modified_at: lastedit_time,
					$flag_visible: flag_visible,
					$flag_current: flag_current,
					$flag_public: flag_public
				})
				.then((res) => {
					resolve(res.lastID);
				})
				.catch((err) => {
					logger.error('[DBI] Failed to create playlist '+name+' : '+err);		
					reject(err);					
				});
		});
	},
	/**
	* @function {Add Kara To Playlist}
	* @param  {number} kara_id        {ID of karaoke song to add to playlist}
	* @param  {string} requester      {Name of person requesting the song}
	* @param  {string} NORM_requester {Normalized name (without accents)}
	* @param  {number} playlist_id    {ID of playlist to add the song to}
	* @param  {number} pos            {Position in the playlist}
	* @param  {number} date_add       {UNIX timestap of the date and time the song was added to the list}
	* @return {promise} {Promise}
	*/
	addKaraToPlaylist:function(karas) {
		return new Promise(function(resolve,reject){
			if(!module.exports.isReady()) {
				reject('Database interface is not ready yet');
			}
			
			//We receive an array of kara requests, we need to add them to a statement.
			//Even for one kara.				
			var sqlAddKaraToPlaylist = fs.readFileSync(path.join(__dirname,'../../_common/db/add_kara_to_playlist.sql'),'utf-8');
			var karaList = [];
			karas.forEach(function(kara) {				
				karaList.push({
					$playlist_id: kara.playlist_id,
					$pseudo_add: kara.requester,
					$NORM_pseudo_add: kara.NORM_requester,
					$kara_id: kara.kara_id,
					$created_at: kara.date_add,
					$pos: kara.pos,					
				});
			});	
			//We retry the transaction several times because when two transactions overlap there can be an error.
			async.retry(
				{ 
					times: 5,
					interval: 100,
				},
				function(callback){
					getUserDb().run('begin transaction')
						.then(() => {
							async.each(karaList,function(data,callback){
								getUserDb().prepare(sqlAddKaraToPlaylist)
									.then((stmt) => {
										stmt.run(data)
											.then(() => {
												callback();
											})
											.catch((err) => {
												logger.error('Failed to add karaoke to playlist : '+err);				
												callback(err);
											});										
									});
								
							}, function(err){
								if (err) {
									logger.error('Failed to add one karaoke to playlist : '+err);
									callback(err);
								} else {
									getUserDb().run('commit')
										.then(() => {
											callback();	
										})
										.catch((err) => {
											callback(err);
										});
								}
							});
						})
						.catch((err) => {
							logger.error('[DBI] Failed to begin transaction : '+err);
							logger.error('[DBI] Transaction will be retried');
							callback(err);
						});
				},function(err){
					if (err){
						reject(err);
					} else {
						resolve();
					}
				});									
		});
	},
	/**
	* @function {Add Kara To whitelist}
	* @param  {number} karas        {array of ID of karaoke song to add to playlist}
	* @param  {number} date_add       {UNIX timestap of the date and time the song was added to the list}
	* @return {promise} {Promise}
	*/
	addKaraToWhitelist:function(karas,date_added) {
		return new Promise(function(resolve,reject){
			if(!module.exports.isReady()) {
				reject('Database interface is not ready yet');
			}
			//We need to get the KID of the karaoke we're adding.

			var sqlAddKaraToWhitelist = fs.readFileSync(path.join(__dirname,'../../_common/db/add_kara_to_whitelist.sql'),'utf-8');
			var karaList = [];
			karas.forEach(function(kara) {				
				karaList.push({
					$kara_id: kara,
					$created_at: date_added,
				});
			});	
			//We retry the transaction several times because when two transactions overlap there can be an error.
			async.retry(
				{ 
					times: 5,
					interval: 100,
				},
				function(callback){
					getUserDb().run('begin transaction')
						.then(() => {
							async.each(karaList,function(data,callback){
								getUserDb().prepare(sqlAddKaraToWhitelist)
									.then((stmt) => {
										stmt.run(data)
											.then(() => {
												callback();
											})
											.catch((err) => {
												logger.error('Failed to add karaoke to whitelist : '+err);				
												callback(err);
											});										
									});
								
							}, function(err){
								if (err) {
									logger.error('Failed to add one karaoke to playlist : '+err);
									callback(err);
								} else {
									getUserDb().run('commit')
										.then(() => {
											callback();	
										})
										.catch((err) => {
											callback(err);
										});
								}
							});
						})
						.catch((err) => {
							logger.error('[DBI] Failed to begin transaction : '+err);
							logger.error('[DBI] Transaction will be retried');
							callback(err);
						});
				},function(err){
					if (err){
						reject(err);
					} else {
						resolve();
					}
				});					
			
		});
	},
	/**
	* @function {Remove kara from playlist}
	* @param  {number} playlistcontent_id        {ID of karaoke song to remove from playlist}
	* @return {promise} {Promise}
	*/
	removeKaraFromPlaylist:function(karas) {
		return new Promise(function(resolve,reject){
			if(!module.exports.isReady()) {
				reject('Database interface is not ready yet');
			}

			var sqlRemoveKaraFromPlaylist = fs.readFileSync(path.join(__dirname,'../../_common/db/delete_kara_from_playlist.sql'),'utf-8');
			var karaList = karas.join(',');
			// We're not using SQLite parameterization due to a limitation 
			// keeping us from feeding a simple array/list to the statement.			
			sqlRemoveKaraFromPlaylist = sqlRemoveKaraFromPlaylist.replace(/\$playlistcontent_id/,karaList);
			getUserDb().run(sqlRemoveKaraFromPlaylist)
				.then(() => {
					resolve();
				})
				.catch((err) => {
					reject(err);
				});
		});
	},
	/**
	* @function {Remove kara from whitelist}
	* @param  {number} whitelistcontent_id        {ID of karaoke song to remove from playlist}
	* @return {promise} {Promise}
	*/
	removeKaraFromWhitelist:function(wlcs) {
		return new Promise(function(resolve,reject){
			if(!module.exports.isReady()) {
				reject('Database interface is not ready yet');
			}

			var sqlRemoveKaraFromWhitelist = fs.readFileSync(path.join(__dirname,'../../_common/db/delete_kara_from_whitelist.sql'),'utf-8');
			var karaList = [];
			wlcs.forEach(function(kara) {
				karaList.push({
					$wlc_id: kara.wlc_id
				});
			});
			//We retry the transaction several times because when two transactions overlap there can be an error.
			//Example two delete or add kara at the very same time.
			async.retry(
				{
					times: 5,
					interval: 100
				},
				function(callback){
					getUserDb().run('begin transaction')
						.then(() => {
							async.each(karaList,function(data,callback){
								getUserDb().prepare(sqlRemoveKaraFromWhitelist)
									.then((stmt) => {
										stmt.run(data)
											.then(() => {
												callback();
											})
											.catch((err) => {
												logger.error('Failed to delete karaoke from whitelist : '+err);
												callback(err);					
											});
									});
							}, function(err){
								if (err) {
									logger.error('Failed to delete one karaoke from whitelist : '+err);
									callback(err);
								} else {
									getUserDb().run('commit')
										.then(() => {
											// Close all statements just to be sure.
											callback();
										})
										.catch((err) => {
											callback(err);
										});
								}
							});														
						})
						.catch((err) => {
							logger.error('[DBI] Failed to begin transaction : '+err);
							logger.error('[DBI] Transaction will be retried');
							callback(err);
						});														
				}, function(err){
					if (err) {
						reject(err);
					} else {
						resolve();
					}
				});								

		});
	},	
	/**
	* @function {Shifts positions in playlist}
	* @param  {number} playlist_id        {ID of playlist to modify}
	* @param  {number} pos                {Position to start from}
	* @param  {number} shift              {number of positions to shift to}
	* @return {promise} {Promise}
	*/
	shiftPosInPlaylist:function(playlist_id,pos,shift) {
		return new Promise(function(resolve,reject){
			if(!module.exports.isReady()) {
				reject('Database interface is not ready yet');
			}

			var sqlShiftPosInPlaylist = fs.readFileSync(path.join(__dirname,'../../_common/db/update_shift_pos_in_playlist.sql'),'utf-8');
			getUserDb().run(sqlShiftPosInPlaylist,
				{
					$shift: shift,
					$playlist_id: playlist_id,
					$pos: pos
				})
				.then(() => {
					resolve();
				})
				.catch((err) => {
					reject('Failed to shift position in playlist '+playlist_id+' : '+err);
				});				
		});
	},
	/**
	* @function {Get biggest position in playlist}
	* @param  {number} playlist_id        {ID of playlist to modify}
	* @return {promise} {Promise}
	*/
	getMaxPosInPlaylist:function(playlist_id) {
		return new Promise(function(resolve,reject){
			if(!module.exports.isReady()) {
				reject('Database interface is not ready yet');
			}

			var sqlGetMaxPosInPlaylist = fs.readFileSync(path.join(__dirname,'../../_common/db/select_max_pos_in_playlist.sql'),'utf-8');
			getUserDb().get(sqlGetMaxPosInPlaylist,
				{
					$playlist_id: playlist_id
				})
				.then((playlist) => {
					resolve(playlist.maxpos);
				})
				.catch((err) => {
					reject('Failed to get max position in playlist '+playlist_id+' : '+err);
				});				
		});
	},	
};