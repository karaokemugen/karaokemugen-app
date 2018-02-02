import {uuidRegexp} from '../../_services/kara';
import {getStats} from '../../_dao/database';
import {ASSToLyrics} from '../../_common/utils/ass.js';
const blcDB = require('../../_dao/blacklist');
const tagDB = require('../../_dao/tag');
const wlDB = require('../../_dao/whitelist');
const karaDB = require('../../_dao/kara');
const plDB = require('../../_dao/playlist');

var path = require('path');
var timestamp = require('unix-timestamp');
timestamp.round = true;
const logger = require('winston');
const L = require('lodash');
const langs = require('langs');
const isoCountriesLanguages = require('iso-countries-languages');
const async = require('async');



module.exports = {
	SYSPATH:null,
	SETTINGS:null,
	/**
	* @function {Initialization}
	* Initializes our playlist controller
	*/
	init: function(){
		if(module.exports.SYSPATH === null) {
			logger.error('_engine/components/playlist_controller.js : SYSPATH is null');
			process.exit();
		}
		logger.info('[PLC] Playlist controller is READY');
	},
	playingPos:function(playlist) {
		// Function to run in array.some of a playlist to check if a kara is a flag_playing one, and get its position.
		var PLCIDPlayingPos;
		var indexPlaying;
		var isASongFlagPlaying = playlist.some((element,index) => {
			if (element.flag_playing == 1) {
				PLCIDPlayingPos = element.pos;
				indexPlaying = index;
				return true;
			} else {
				return false;
			}
		});
		if (isASongFlagPlaying) {
			return {
				plc_id_pos: PLCIDPlayingPos,
				index: indexPlaying
			};
		} else {
			return undefined;
		}
	},	
	isUserAllowedToAddKara:function(playlist_id,requester) {
		return new Promise((resolve,reject) => {
			const limit = module.exports.SETTINGS.EngineSongsPerUser;
			karaDB.getSongCountForUser(playlist_id,L.deburr(requester))
				.then((count) => {
					if (count >= limit) {
						logger.info('[PLC] User '+requester+' tried to add more songs than he/she was allowed ('+limit+')');
						reject('User quota reached');
					} else {
						resolve();
					}
				})
				.catch((err) => {
					logger.error('[PLC] DBI getSongCountForUser : '+err);
					reject(err);
				});
		});
	},
	isCurrentPlaylist:function(playlist_id) {
		return new Promise(function(resolve,reject){
			module.exports.isPlaylist(playlist_id)
				.then(function(){
					plDB.findCurrentPlaylist()
						.then(function(res){
							if (res.playlist_id == playlist_id) {
								resolve(true);
							} else {
								resolve(false);
							}
						})
						.catch(function(err){
							logger.error('[PLC] DBI isCurrentPlaylist : '+err);
							reject(err);
						});
				})
				.catch(function(err){
					logger.error('[PLC] PLC isPlaylist : '+err);
					reject(err);
				});
		});
	},
	isPublicPlaylist:function(playlist_id) {		
		return new Promise(function(resolve,reject){
			module.exports.isPlaylist(playlist_id)
				.then(function(){
					plDB.findPublicPlaylist()
						.then(function(res){
							if (res.playlist_id == playlist_id) {
								resolve(true);
							} else {
								resolve(false);
							}
						})
						.catch(function(err){
							logger.error('[PLC] DBI isPublicPlaylist : '+err);
							reject(err);
						});
				})
				.catch(function(err){
					logger.error('[PLC] PLC isPlaylist : '+err);
				});
		});
	},
	/**
	* @function {Is there a current playlist in the database?}
	* @return {number} {Playlist ID, or error message}
	*/
	isACurrentPlaylist:function() {		
		return new Promise(function(resolve,reject){
			plDB.findCurrentPlaylist()
				.then(function(res){
					if (res) {
						resolve(res.playlist_id);
					} else {
						reject('No current playlist found');
					}
				})
				.catch(function(err){					
					reject(err);
				});
		});
	},
	/**
	* @function {Sets the flag playing of a playlist}
	* @param {number} {Playlist ID}
	* @param {number} {PLCID}
	* @return {promise} {Promise}
	*/
	setPlaying:function(plc_id,playlist_id){
		return new Promise(function(resolve,reject) {
			if (plc_id) {
				plDB.unsetPlaying(playlist_id).then(() => {
					plDB.setPlaying(plc_id)
						.then(function(){
							module.exports.emitEvent('playingUpdated',{
								playlist_id: playlist_id,
								plc_id: plc_id,
							});
							module.exports.updatePlaylistDuration(playlist_id)	
								.then(() => {
									resolve();
								})
								.catch((err) => {
									logger.error('[PLC] updatePlaylistDuration : '+err);
									reject(err);
								});
						})
						.catch(function(err){
							logger.error('[PLC] DBI setPlaying : '+err);
							reject(err);
						});
				})
				
			} else {
				plDB.unsetPlaying(playlist_id)
					.then(function(){
						module.exports.emitEvent('playingUpdated',{
							playlist_id: playlist_id,
							plc_id: null,
						});						
						module.exports.updatePlaylistDuration(playlist_id)
							.then(() => {
								resolve();
							})
							.catch((err) => {
								logger.error('[PLC] updatePlaylistDuration : '+err);
								reject(err);
							});
					})
					.catch(function(err){
						logger.error('[PLC] DBI setPlaying : '+err);
						reject(err);
					});
			}			
		});
	},
	/**
	* @function {Returns the PLCID of the latest added kara, by date}
	* @param {number} {Playlist ID}
	* @param {number} {Date added in Unix Timestap}
	* @return {number} {PLC ID}
	*/
	getPLCIDByDate:function(playlist_id,date_added) {		
		return new Promise(function(resolve,reject){
			plDB.getPLCByDate(playlist_id,date_added)
				.then(function(plcid){
					resolve(plcid);
				})
				.catch(function(err){
					logger.error('[PLC] DBI getPLCIDByDate : '+err);
					reject(err);
				});
		});
	},
	/**
	* @function {(Re)generate blacklist}
	* @return {boolean} {Promise}
	*/
	generateBlacklist:function() {		
		return new Promise(function(resolve,reject){
			blcDB.generateBlacklist()
				.then(function(){
					resolve();
				})
				.catch(function(err){
					logger.error('[PLC] DBI generateBlacklist : '+err);
					reject(err);
				});
		});
	},
	/**
	* @function {Add a blacklist criteria}
	* @param  {number} blctype {Type of blacklist criteria}
	* @param  {string} blcvalue {Value of blacklist criteria}
	* @return {promise} Promise
	*/
	addBlacklistCriteria:function(blctype,blcvalues) {		
		return new Promise(function(resolve,reject){
			var blcList = [];
			blcvalues.forEach(function(blcvalue){
				blcList.push({
					blcvalue: blcvalue,
					blctype: parseInt(blctype)
				});				
			});			
			if (blctype >= 0 && blctype <= 1004) {				
				var pGetTagName = new Promise ((resolve,reject) => {
					if (blctype > 0 && blctype < 1000) {
						async.eachOf(blcList,function(blc,index,callback) {	
							tagDB.getTag(blc.blcvalue)
								.then(function (res){
									if (res) {
										blcList[index].blcuniquevalue = res.name;
										callback();
									} else { 
										callback('getTag returned empty result');
									}								
								})	
								.catch(function (err) {
									logger.error('[PLC] getTagName : '+err);
									callback(err);
								});	
						},function(err){
							if (err) {
								reject(err);
							} else {
								resolve();
							}
						});							
					} else {
						resolve();
					}
				});	
				var pGetKID = new Promise ((resolve,reject) => {
					if (blctype == 1001) {
						async.eachOf(blcList,function(blc,index,callback) {	
							karaDB.getKara(blc.blcvalue)
								.then(function (res){
									if (res) {
										blcList[index].blcuniquevalue = res.kid;
										callback();
									} else { 
										callback('getKara returned empty result');
									}								
								})	
								.catch(function (err) {
									logger.error('[PLC] getKara : '+err);
									callback(err);
								});	
						},function(err){
							if (err) {
								reject(err);
							} else {
								resolve();
							}
						});							
					} else {
						resolve();
					}
				});	
				Promise.all([pGetKID,pGetTagName])
					.then(() => {
						if (((blctype >= 1001 && blctype <= 1003) || (blctype > 0 && blctype < 999)) && blcvalues.some(isNaN)) {
							var err = 'Blacklist criteria type mismatch : type '+blctype+' must have a numeric value!';
							logger.error('[PLC] '+err);
							reject(err);
						} else {
							blcDB.addBlacklistCriteria(blcList)
								.then(function(){
									// Regenerate blacklist to take new kara into account.
									module.exports.generateBlacklist()
										.then(function(){
											resolve();
										})
										.catch(function(err){
											logger.error('[PLC] addBlacklistCriteria : generateBlacklist : '+err);
											reject(err);
										});							
								})
								.catch(function(err){
									logger.error('[PLC] DBI addBlacklistCriteria : '+err);
									reject(err);
								});
						}
					})
					.catch((err) => {
						logger.error('[PLC] addBlacklistCriteria : '+err);
						reject(err);
					});
			} else {
				var err = 'Blacklist criteria type error : '+blctype+' is incorrect';
				logger.error('[PLC] '+err);
				reject(err);
			}
		});
	},
	/**
	* @function {Add a kara to the whitelist}
	* @param  {number} karas {array of kara IDs to add}
	* @return {promise} Promise
	*/
	addKaraToWhitelist:function(karas) {
		return new Promise(function(resolve,reject){
			var karaList = karas;
			var pIsKara = new Promise((resolve,reject) => {
				// Need to do this for each karaoke.
				async.each(karas,function(kara_id,callback) {				
					module.exports.isKara(kara_id)
						.then(function() {
							callback();
						})
						.catch(function(err) {
							err = 'Karaoke song '+kara_id+' unknown';
							logger.error('[PLC] isKara : '+err);
							callback(err);
						});
				},function(err){
					if (err) {
						reject(err);
					} else {
						resolve();
					}
				});				
			});
			var pIsKaraInWhitelist = new Promise((resolve,reject) => {
				// Need to do this for each karaoke.
				async.each(karas,function(kara_id,callback) {				
					module.exports.isKaraInWhitelist(kara_id)
						.then(function(isKaraInWL) {
							if (isKaraInWL) {
								//Search kara_id in karaList and then delete that index from the array. 
								//Karaoke song won't be added since it already exists in destination playlist.								
								karaList = L.filter(karaList, element => element !== kara_id);
							}
							callback();
						})
						.catch(function(err) {
							logger.error('[PLC] isKaraInWhitelist : '+err);
							callback(err);
						});
				},function(err){
					if (err) {
						reject(err);
					} else {
						resolve();
					}
				});
			});
			Promise.all([pIsKara,pIsKaraInWhitelist])
				.then(function() {
					var date_added = timestamp.now();
					if (karaList.length === 0) {
						var err = 'No karaoke could be added, all are in whitelist already';
						logger.error('[PLC] addKaraToWhitelist : '+err);
						reject(err);
					} else {
						karaDB.addKaraToWhitelist(karaList,date_added)
							.then(function(){
								// Regenerate blacklist to take new karas into account.
								module.exports.generateBlacklist()
									.then(function(){
										resolve(karaList);
									})
									.catch(function(err){
										logger.error('[PLC] addKaraToWhitelist : generateBlacklist : '+err);
										reject(err);
									});
							})
							.catch(function(err){
								logger.error('[PLC] DBI addKaraToWhitelist : '+err);
								reject(err);
							});	
					}				
				})
				.catch(function(err) {
					logger.error('[PLC] addKaraToWhitelist : '+err);
					reject(err);
				});
		});
	},
	/**
	* @function {Get karaoke lyrics}
	* @param  {number} id_kara {Karaoke ID}
	* @return {string} {List of lyrics}
	*/
	getKaraLyrics:function(kara_id) {
		return new Promise(function(resolve,reject){
			var pIsKara = new Promise((resolve,reject) => {
				module.exports.isKara(kara_id)
					.then(function() {
						resolve(true);
					})
					.catch(function(err) {
						logger.error('[PLC] isKara : '+err);
						reject(err);
					});
			});
			Promise.all([pIsKara])
				.then(function(){									
					module.exports.getASS(kara_id)
						.then(function(ass) {							
							if (ass) { 
								var lyrics = ASSToLyrics(ass);
								resolve(lyrics);					
							} else {								
								resolve('Lyrics not available for this song');
							}
						})
						.catch(function(err){
							logger.error('[PLC] getKara : '+err);
							reject(err);
						});
				})
				.catch(function(err){
					logger.error('[PLC] getKaraLyrics : '+err);
					reject(err);
				});
		});
	},
	/**
	* @function {Get karaoke ASS data}
	* @param  {number} id_kara {Karaoke ID}
	* @return {string} {ASS}
	*/
	getASS:function(kara_id) {
		return new Promise(function(resolve,reject){
			var pIsKara = new Promise((resolve,reject) => {
				module.exports.isKara(kara_id)
					.then(function() {
						resolve(true);
					})
					.catch(function(err) {
						logger.error('[PLC] isKara : '+err);
						reject(err);
					});
			});
			Promise.all([pIsKara])
				.then(function(){									
					karaDB.getASS(kara_id)
						.then(function(ass) {							
							// ass can be empty if we're viewing a hardsub
							// or a kara without ass
							if (ass) {
								resolve(ass.ass);
							} else {
								resolve();
							}							
						})
						.catch(function(err){
							logger.error('[PLC] DBI getASS : '+err);
							reject(err);
						});
				})
				.catch(function(err){
					logger.error('[PLC] getASS : '+err);
					reject(err);
				});
		});
	},
	/**
	* @function {Delete a blacklist criteria}
	* @param  {number} blc_id {Blacklist Criteria ID}
	* @return {promise} Promise
	*/
	deleteBlacklistCriteria:function(blc_id) {
		return new Promise(function(resolve,reject){
			if (L.isEmpty(blc_id)) {
				var err = 'BLCID is empty';
				logger.error('[PLC] deleteBlacklistCriteria : '+err);
				reject(err);
			}
			var pIsBLC = new Promise((resolve,reject) => {
				module.exports.isBLCriteria(blc_id)
					.then(function() {
						resolve(true);
					})
					.catch(function(err) {
						err = 'BLCID '+blc_id+' unknown';
						logger.error('[PLC] deleteBlacklistCriteria : '+err);
						reject(err);						
					});
			});
			Promise.all([pIsBLC])
				.then(function(){
					blcDB.deleteBlacklistCriteria(blc_id)
						.then(function(){
							module.exports.generateBlacklist()
								.then(function(){
									resolve();
								})
								.catch(function(err){
									logger.error('[PLC] generateBlacklist : '+err);
									reject(err);
								});
						})
						.catch(function(err){
							logger.error('[PLC] DBI deleteBlacklistCriteria : '+err);
							reject(err);
						});
				})
				.catch((err) => {
					logger.error('[PLC] deleteBlacklistCriteria : '+err);
					reject(err);
				});
		});

	},
	/**
	* @function {Edit a blacklist criteria}
	* @param  {number} blc_id {Blacklist Criteria ID}
	* @param  {number} blctype {Blacklist Criteria type}
	* @param  {string} blcvalue {Blacklist Criteria value}
	* @return {promise} Promise
	*/
	editBlacklistCriteria:function(blc_id,blctype,blcvalue) {
		return new Promise(function(resolve,reject){
			var pIsBLC = new Promise((resolve,reject) => {
				module.exports.isBLCriteria(blc_id)
					.then(function() {
						resolve();
					})
					.catch(function(err) {
						err = 'BLCID '+blc_id+' unknown';
						logger.error('[PLC] deleteBlacklistCriteria : '+err);
						reject(err);						
					});
			});
			Promise.all([pIsBLC])
				.then(function(){
					if (blctype >= 0 && blctype <= 1004) {
						if (((blctype >= 1001 && blctype <= 1003) || (blctype > 0 && blctype < 999)) && (isNaN(blcvalue))) {
							reject('Blacklist criteria type mismatch : type '+blctype+' must have a numeric value!');
						} else {
							const blc = {
								id: blc_id,
								type: blctype,
								value: blcvalue
							};
							blcDB.editBlacklistCriteria(blc)
								.then(function(){
									module.exports.generateBlacklist()
										.then(function(){
											resolve();
										})
										.catch(function(err){
											logger.error('[PLC] generateBlacklist : '+err);
											reject(err);
										});
								})
								.catch(function(err){
									logger.error('[PLC] editBlacklistCriteria : '+err);
									reject(err);
								});
						}
					} else {
						var err = 'Blacklist criteria type error : '+blctype+' is incorrect';
						logger.error('[PLC] '+err);
						reject(err);
					}
				})
				.catch(function(err){
					logger.error('[PLC] isBLC rejected!');
					reject(err);
				});
		});
	},	
	/**
	* @function {Is there a public playlist in the database?}
	* @return {number} {Playlist ID or message}
	*/
	isAPublicPlaylist:function() {
		return new Promise(function(resolve,reject){
			plDB.findPublicPlaylist()
				.then(function(res){
					if (res) {
						resolve(res.playlist_id);
					} else {
						reject('No current playlist found');
					}
				})
				.catch(function (err) {					
					reject(err);
				});
		});
	},
	/**
	* @function {isPlaylist}
	* @param  {number} playlist_id {ID of playlist to check for existence}
	* @return {promise} Promise
	*/
	isPlaylist:function(playlist_id,seenFromUser) {
		return new Promise(function(resolve,reject){
			plDB.findPlaylist(playlist_id,seenFromUser)
				.then(function(res){
					if (res) {
						resolve(true);
					} else {
						reject(false);
					}
				})
				.catch(function(err){
					logger.error('[PLC] DBI isPlaylist : '+err);
					reject(err);
				});
		});
	},
	/**
	* @function {Does the playlist have a flag_playing set somewhere?}
	* @param  {number} playlist_id {ID of playlist to check}
	* @return {promise} Promise
	*/
	isPlaylistFlagPlaying:function(playlist_id) {
		return new Promise(function(resolve,reject){			
			plDB.findPlaylistFlagPlaying(playlist_id)
				.then(function(res){
					if (res) {
						resolve(true);
					} else {
						resolve(false);
					}
				})
				.catch(function(err){
					logger.error('[PLC] DBI isPlaylistFlagPlaying : '+err);
					reject(err);
				});
		});
	},
	/**
	* @function {isKara}
	* @param  {number} kara_id {Karaoke ID to check for existence}
	* @return {promise} Promise
	*/
	isKara:function(kara_id) {
		//Une requête toute bête pour voir si une Playlist existe
		return new Promise(function(resolve,reject){
			karaDB.isKara(kara_id)
				.then(function(res){
					if (res == true) {
						resolve(true);
					} else {
						reject(false);
					}
				})
				.catch(function(err){
					logger.error('[PLC] DBI isKara : '+err);
					reject(err);
				});
		});
	},
	/**
	* @function {is Karaoke blacklisted?}
	* @param  {number} kara_id {Karaoke ID to check in the blacklist}
	* @return {boolean} Promise with true or false)
	*/
	isKaraInBlacklist:function(kara_id) {
		return new Promise(function(resolve,reject){
			karaDB.isKaraInBlacklist(kara_id)
				.then(function(isKaraInBL) {
					resolve(isKaraInBL);
				})
				.catch(function(err) {
					logger.error('[PLC] DBI isKaraInBlacklist : '+err);
					reject(err);
				});
		});
	},
	/**
	* @function {Is it a blacklist criteria ?}
	* @param  {number} blc_id {Blacklist criteria ID}
	* @return {promise} Promise
	*/
	isBLCriteria:function(blc_id) {
		return new Promise(function(resolve,reject){
			blcDB.isBLCriteria(blc_id)
				.then(function(){
					resolve();
				})
				.catch(function(err){
					logger.error('[PLC] DBI isBLCriteria : '+err);
					reject(err);
				});
		});
	},
	/**
	* @function {Is it a whitelist item?}
	* @param  {type} wlc_id {ID of whitelist item}
	* @return {boolean} {Promise}
	*/
	isWLC:function(wlc_id) {
		return new Promise(function(resolve,reject){
			wlDB.isWLC(wlc_id)
				.then(function(){
					resolve();
				})
				.catch(function(err){
					logger.error('[PLC] DBI isWLC : '+err);
					reject(err);
				});
		});
	},
	/**
	* @function {Tests if a karaoke is already in a playlist or not}
	* @param  {number} kara_id     {ID of karaoke to search}
	* @param  {number} playlist_id {ID of playlist to search into}
	* @return {boolean} {Promise}
	*/
	isKaraInPlaylist:function(kara_id,playlist_id) {
		return new Promise(function(resolve,reject){
			karaDB.isKaraInPlaylist(kara_id,playlist_id)
				.then(function(isKaraInPL) {
					resolve(isKaraInPL);
				})
				.catch(function(err) {
					logger.error('[PLC] DBI isKaraInPlaylist : '+err);
					reject(err);
				});
		});
	},
	/**
	* @function {Tests if a karaoke is already in the whitelist}
	* @param  {number} kara_id     {ID of karaoke to search}
	* @return {boolean} {Promise}
	*/
	isKaraInWhitelist:function(kara_id) {
		return new Promise(function(resolve,reject){
			karaDB.isKaraInWhitelist(kara_id)
				.then(function(isKaraInWL) {
					resolve(isKaraInWL);
				})
				.catch(function(err) {
					logger.error('[PLC] DBI isKaraInWhitelist : '+err);
					reject(err);
				});
		});
	},
	setCurrentPlaylist:function(playlist_id) {
		return new Promise(function(resolve,reject){
			module.exports.getPlaylistInfo(playlist_id)
				.then(function(playlist){
					if (playlist.flag_public == 1) {
						var err = 'A current playlist cannot be set to public. Set another playlist to current first.';
						logger.error('[PLC] setCurrentPlaylist : '+err);
						reject(err);
					} else {
						module.exports.unsetCurrentAllPlaylists()
							.then(function(){
								plDB.setCurrentPlaylist(playlist_id)
									.then(function(){
										module.exports.updatePlaylistLastEditTime(playlist_id)
											.then(function(){
												resolve();
											})
											.catch(function(err){
												logger.error('[PLC] updatePlaylistLastEditTime : '+err);
												reject(err);
											});
									})
									.catch(function(err){
										logger.error('[PLC] DBI setCurrentPlaylist : '+err);					
										reject(err);
									});
							})
							.catch(function(err){
								logger.error('[PLC] unsetCurrentAllPlaylists : '+err);
								reject(err);
							});
						
					}					
				})
				.catch(function(err){
					logger.error('[PLC] DBI getPlaylistInfo : '+err);					
					reject(err);
				});
		});
	},
	/**
	* @function {setVisiblePlaylist}
	* @param  {number} playlist_id {ID of playlist to make visible}
	*/
	setVisiblePlaylist:function(playlist_id) {
		return new Promise(function(resolve,reject){
			plDB.setVisiblePlaylist(playlist_id)
				.then(function(){
					logger.info('[PLC] Setting playlist '+playlist_id+' visible flag to ON');
					module.exports.updatePlaylistLastEditTime(playlist_id)
						.then(function(){
							resolve();
						})
						.catch(function(err){
							logger.error('[PLC] updatePlaylistLastEditTime : '+err);
							reject(err);
						});
				})
				.catch(function(err){
					logger.error('[PLC] DBI setVisiblePlaylist : '+err);					
					reject(err);
				});
		});
	},
	unsetVisiblePlaylist:function(playlist_id) {
		return new Promise(function(resolve,reject){
			plDB.unsetVisiblePlaylist(playlist_id)
				.then(function(){
					module.exports.updatePlaylistLastEditTime(playlist_id)
						.then(function(){
							resolve();					
						})
						.catch(function(err){
							logger.error('[PLC] updatePlaylistLastEditTime : '+err);
							reject(err);
						});
				})
				.catch(function(err){
					logger.error('[PLC] DBI unsetVisiblePlaylist : '+err);
					reject(err);
				});
		});
	},
	setPublicPlaylist:function(playlist_id){
		return new Promise(function(resolve,reject){
			module.exports.getPlaylistInfo(playlist_id)
				.then(function(playlist){
					if (playlist.flag_current == 1) {
						var err = 'A public playlist cannot be set to current. Set another playlist to public first.';
						logger.error('[PLC] setPublicPlaylist : '+err);
						reject(err);
					} else {
						module.exports.unsetPublicAllPlaylists()
							.then(function(){
								plDB.setPublicPlaylist(playlist_id)
									.then(function(){
										module.exports.updatePlaylistLastEditTime(playlist_id)
											.then(function(){
												resolve();
											})
											.catch(function(err){
												logger.error('[PLC] updatePlaylistLastEditTime : '+err);
												reject(err);
											});
									})
									.catch(function(err){
										logger.error('[PLC] DBI setPublicPlaylist : '+err);					
										reject(err);
									});
							})
							.catch(function(err){
								logger.error('[PLC] unsetPublicAllPlaylists : '+err);
								reject(err);
							});
						
					}					
				})
				.catch(function(err){
					logger.error('[PLC] DBI getPlaylistInfo : '+err);					
					reject(err);
				});
		});
	},
	/**
	* @function {Delete a playlist}
	* @param  {number} playlist_id             {ID of playlist to delete}
	* @return {promise} {Promise}
	*/
	deletePlaylist:function(playlist_id) {
		// Suppression d'une playlist. Si la playlist a un flag_public ou flag_current, c'est refusé.
		return new Promise(function(resolve,reject){
			module.exports.isPlaylist(playlist_id)
				.then(function(){
					var pIsPublic = new Promise((resolve,reject) => {
						module.exports.isPublicPlaylist(playlist_id)
							.then(function(res) {
								if (res == true) {
									var err = 'Playlist to delete is public. Unable to delete it';
									logger.error('[PLC] deletePlaylist : '+err);
									reject(err);
								} else {
									resolve(true);
								}
							})
							.catch(function(err) {
								logger.error('[PLC] isPublicPlaylist : '+err);
								reject(err);
							});
					});
					var pIsCurrent = new Promise((resolve,reject) =>	{
						module.exports.isCurrentPlaylist(playlist_id)
							.then(function(res){
								if (res == true) {									
									var err = 'Playlist to delete is current. Unable to delete it';
									logger.error('[PLC] deletePlaylist : '+err);
									reject(err);								
								} else {
									resolve(true);
								}
							})
							.catch(function(err){
								logger.error('[PLC] isCurrentPlaylist : '+err);
								reject(err);
							});
					});
					Promise.all([pIsPublic,pIsCurrent])
						.then(function() {							
							plDB.deletePlaylist(playlist_id)
								.then(function() {
									resolve();
								})
								.catch(function(err){
									logger.error('[PLC] DBI deletePlaylist : '+err);
									reject(err);
								});
						})
						.catch(function(err) {
							logger.error('[PLC] deletePlaylist : '+err);
							reject(err);
						});
				})
				.catch(function(err){
					err = 'Playlist '+playlist_id+' unknown';
					logger.error('[PLC] deletePlaylist : '+err);
					reject(err);
				});
		});
	},
	/**
	* @function {Empty Playlist}
	* @param  {number} playlist_id {ID of playlist to empty}
	* @return {promise} {Promise}
	*/
	emptyPlaylist:function(playlist_id) {		
		return new Promise(function(resolve,reject){
			module.exports.isPlaylist(playlist_id)
				.then(function() {
					plDB.emptyPlaylist(playlist_id)
						.then(function(){
							module.exports.updatePlaylistLastEditTime(playlist_id)
								.then(function(){
									module.exports.updatePlaylistDuration(playlist_id)
										.then(() => {
											resolve();	
										})
										.catch((err) => {
											logger.error('[PLC] updatePlaylistDuration : '+err);
											reject(err);		
										});
								})
								.catch(function(err){
									logger.error('[PLC] updatePlaylistLastEditTime : '+err);
									reject(err);
								});
						})
						.catch(function(err){
							logger.error('[PLC] DBI emptyPlaylist : '+err);
							reject(err);
						});
				})
				.catch(function(err) {
					err = 'Playlist '+playlist_id+' unknown';
					logger.error('[PLC] isPlaylist : '+err);
					reject(err);
				});			
		});
	},
	/**
	* @function {Empty Whitelist}
	* @return {promise} {Promise}
	*/
	emptyWhitelist:function() {		
		return new Promise(function(resolve,reject){
			wlDB.emptyWhitelist()
				.then(function(){
					module.exports.generateBlacklist()
						.then(function(){
							resolve();
						})
						.catch(function(err){
							logger.error('[PLC] generateBlacklist : '+err);
							reject(err);							
						});		
				})
				.catch(function(err) {
					logger.error('[PLC] DBI emptyWhitelist : '+err);
					reject(err);
				});			
		});
	},
	/**
	* @function {Empty blacklist criterias}
	* @return {promise} {Promise}
	*/
	emptyBlacklistCriterias:function() {		
		return new Promise(function(resolve,reject){
			blcDB.emptyBlacklistCriterias()
				.then(function(){
					module.exports.generateBlacklist()
						.then(function(){
							resolve();
						})
						.catch(function(err){
							logger.error('[PLC] generateBlacklist : '+err);
							reject(err);							
						});		
				})
				.catch(function(err) {
					logger.error('[PLC] DBI emptyBlacklistCriterias : '+err);
					reject(err);
				});			
		});
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
	editPlaylist:function(playlist_id,name,flag_visible) {
		return new Promise(function(resolve,reject){
			var NORM_name = L.deburr(name);
			var lastedit_time = timestamp.now();
			var pIsPlaylist = new Promise((resolve,reject) => {
				module.exports.isPlaylist(playlist_id)
					.then(function() {
						resolve(true);
					})
					.catch(function(err) {
						err = 'Playlist '+playlist_id+' unknown';
						logger.error('[PLC] isPlaylist : '+err);
						reject(err);
					});
			});
			Promise.all([pIsPlaylist])
				.then(function() {
					const playlist = {
						id: playlist_id,
						name: name,
						NORM_name: NORM_name,
						modified_at: lastedit_time,
						flag_visible: flag_visible
					};
					plDB.editPlaylist(playlist)
						.then(function(){
							resolve();
						})
						.catch(function(err){
							logger.error('[PLC] DBI editPlaylist');
							reject(err);
						});
				})
				.catch(function(err) {
					logger.error('[PLC] editPlaylist : '+err);
					reject(err);
				});
		});
	},
	/**
	* @function {Create a new playlist}
	* @param  {string} name         {Playlist name}
	* @param  {number} flag_visible {Is the playlist visible?}
	* @param  {number} flag_current {Is the playlist current}
	* @param  {number} flag_public  {Is the playlist public}
	* @return {promise} {Promise}
	*/
	createPlaylist:function(name,flag_visible,flag_current,flag_public) {

		// Méthode de création playlist
		// Prend en entrée un nom, et des booléens
		// Si flag_public ou flag_current = true il faut désactiver le flag sur toutes les autres playlists

		// on retourne une promise
		
		return new Promise(function(resolve,reject){
			var NORM_name = L.deburr(name);
			var creation_time = timestamp.now();
			var lastedit_time = creation_time;

			if (flag_current == 1 && flag_public == 1) {
				var err = 'A playlist cannot be current and public at the same time!';
				logger.error('[PLC] editPlaylist : '+err);
				reject(err);
			} else {
				var pUnsetFlagPublic = new Promise((resolve,reject) => {
					if (flag_public == 1) {
						module.exports.unsetPublicAllPlaylists()
							.then(function(){
								resolve();
							})
							.catch(function(err){
								logger.error('[PLC] unsetFlagPublic : '+err);
								reject(err);
							});
					} else {
						resolve();
					}
				});

				var pUnsetFlagCurrent = new Promise((resolve,reject) => {
					if (flag_current == 1) {
						module.exports.unsetCurrentAllPlaylists()
							.then(function(){
								resolve();
							})
							.catch(function(err){
								logger.error('[PLC] unsetFlagCurrent : '+err);
								reject(err);
							});
					} else {
						resolve();
					}
				});

				Promise.all([pUnsetFlagCurrent,pUnsetFlagPublic])
					.then(function() {
						const playlist = {
							name: name,
							NORM_name: NORM_name,
							created_at: creation_time,
							modified_at: lastedit_time,
							flag_visible: flag_visible,
							flag_current: flag_current,
							flag_public: flag_public
						};
						plDB.createPlaylist(playlist)
							.then(function(res){
								resolve(res.lastID);
							})
							.catch(function(err){
								logger.error('[PLC] DBI createPlaylist : '+err);
								reject(err);
							});
					})
					.catch(function(err) {
						logger.error('[PLC] createPlaylist : '+err);
						reject(err);
					});
			}
		});
	},
	/**
	* @function {getPlaylistInfo}
	* @param  {number} playlist_id {Playlist ID to fetch}
	* @param  {boolean} seenFromUser {Is the playlist being seen from the user's perspective?}
	* @return {Object} {Playlist object}
	* Returns a playlist object with the following information :
	* - id_playlist
	* - name (name of playlist)
	* - num_karas (Number of karaoke songs in the playlist)
	* - length (duration in seconds of the whole playlist)
	* - creation_time (in UNIX timestamp format)
	* - lastedit_time (in UNIX timestamp format)
	* - flag_visible (is the playlist visible?)
	* - flag_current (is the playlist the current one?)
	* - flag_public (is the playlist the public one?)
	*/
	getPlaylistInfo:function(playlist_id,seenFromUser) {		
		return new Promise(function(resolve,reject){
			module.exports.isPlaylist(playlist_id)
				.then(function() {
					plDB.getPlaylistInfo(playlist_id,seenFromUser)
						.then(function(playlist){
							if (playlist) {
								resolve(playlist);
							} else {
								reject('No playlist found');
							}
						})
						.catch(function(err){
							logger.error('[PLC] DBI getPlaylistInfo : '+err);
							reject(err);
						});
				})
				.catch(function(err) {
					err = 'Playlist '+playlist_id+' unknown';
					logger.error('[PLC] isPlaylist : '+err);
					reject(err);
				});			
		});
	},
	/**
	* @function {getPlaylists}
	* @return {Object} {array of Playlist objects}
	* @param {boolean} seenFromUser {Is the playlist list seen from the user's perspective?}
	* Returns an array of playlist objects to get all playlists :
	* - playlist_id (ID of playlist)
	* - name (name of playlist)
	* - NORM_name (normalized name of playlist)
	* - num_karas (Number of karaoke songs in the playlist)
	* - length (duration in seconds of the whole playlist)
	* - created_at (in UNIX timestamp format)
	* - modified_at (in UNIX timestamp format)
	* - flag_visible (is the playlist visible?)
	* - flag_current (is the playlist the current one?)
	* - flag_public (is the playlist the public one?)
	*/
	getPlaylists:function(seenFromUser) {
		return new Promise(function(resolve){
			plDB.getPlaylists(seenFromUser)
				.then(function(playlists) {
					resolve(playlists);
				})
				.catch(function(err) {
					logger.error('[PLC] DBI getPlaylists : '+err);
					resolve(err);
				});
		});
	},
	unsetPublicAllPlaylists:function() {
		return new Promise(function(resolve,reject){
			// Désactive le flag Public sur toutes les playlists
			plDB.unsetPublicPlaylist()
				.then(function(){
					resolve();
				})
				.catch(function(err){
					logger.error('[PLC] DBI unsetPublicAllPlaylists : '+err);
					reject();
				});
		});

	},
	unsetCurrentAllPlaylists:function() {
		return new Promise(function(resolve,reject){
			// Désactive le flag Current sur toutes les playlists
			plDB.unsetCurrentPlaylist()
				.then(function(){
					resolve();
				})
				.catch(function(err){
					logger.error('[PLC] DBI unsetCurrentAllPlaylists : '+err);
					reject(err);
				});
		});
	},
	/**
	* @function {Update number of karaokes in playlist}
	* @param  {number} playlist_id {ID of playlist to update}
	* @return {number} {number of karaokes found}
	*/
	updatePlaylistNumOfKaras:function(playlist_id) {
		return new Promise(function(resolve,reject) {
			var pIsPlaylist = new Promise((resolve,reject) => {
				module.exports.isPlaylist(playlist_id)
					.then(function() {
						resolve(true);
					})
					.catch(function(err) {
						err = 'Playlist '+playlist_id+' unknown';
						logger.error('[PLC] isPlaylist : '+err);
						reject(err);
					});
			});
			Promise.all([pIsPlaylist])
				.then(function() {
					// Get playlist number of karaokes
					plDB.countKarasInPlaylist(playlist_id)
						.then(function(res){
							plDB.updatePlaylistKaraCount(playlist_id,res.karaCount)
								.then(function(num_karas){
									resolve(num_karas);
								})
								.catch(function(err){
									logger.error('[PLC] DBI updatePlaylistNumOfKaras : '+err);
									reject(err);
								});
						})
						.catch(function(err){
							logger.error('[PLC] DBI countKarasInPlaylist : '+err);
							reject(err);
						});
				});
		});
	},
	/**
	* @function {Update playlist's last edit time}
	* @param  {number} playlist_id {ID of playlist to update}
	* @return {boolean} {Promise}
	*/
	updatePlaylistLastEditTime:function(playlist_id) {
		return new Promise(function(resolve,reject) {
			var pIsPlaylist = new Promise((resolve,reject) => {
				module.exports.isPlaylist(playlist_id)
					.then(function() {
						resolve(true);
					})
					.catch(function(err) {
						err = 'Playlist '+playlist_id+' unknown';
						logger.error('[PLC] isPlaylist : '+err);
						reject(err);
					});
			});
			Promise.all([pIsPlaylist])
				.then(function() {
					var lastedit_date = timestamp.now();
					// Update PL's last edit time
					plDB.updatePlaylistLastEditTime(playlist_id,lastedit_date)
						.then(function(){
							resolve();
						})
						.catch(function(err){
							logger.error('[PLC] DBI updatePlaylistLastEditTime : '+err);
							reject(err);
						});
				})
				.catch(function(err){
					logger.error('[PLC] updatePlaylistLastEditTime : '+err);
					reject(err);
				});
		});
	},
	/**
	* @function {Update duration of a playlist}
	* @param  {number} playlist_id {ID of playlist to update}
	* @return {number} {duration in seconds}
	*/
	updatePlaylistDuration:function(playlist_id) {
		return new Promise(function(resolve,reject) {
			var pIsPlaylist = new Promise((resolve,reject) => {
				module.exports.isPlaylist(playlist_id)
					.then(function() {
						resolve();
					})
					.catch(function(err) {
						err = 'Playlist '+playlist_id+' unknown';
						logger.error('[PLC] isPlaylist : '+err);
						reject(err);
					});
			});
			Promise.all([pIsPlaylist])
				.then(function() {
					// Get playlist duration					
					plDB.updatePlaylistDuration(playlist_id)
						.then(function(){									
							resolve();
						})
						.catch(function(err){
							logger.error('[PLC] DBI updatePlaylistDuration : '+err);
							reject(err);
						});
				})
				.catch(function(err){
					logger.error('[PLC] updatePlaylistDuration : '+err);
					reject(err);
				});
		});
	},
	/**
	* @function {Get playlist contents}
	* @param  {number} playlist_id {ID of playlist to get contents from}
	* @param  {boolean} seenFromUser {is it viewed by the user or not?}
	* @param  {boolean} forPlayer {is it for the player or for display?}
	* @return {array} {Array of karaoke objects}
	*/
	getPlaylistContents:function(playlist_id,seenFromUser,forPlayer) {
		return new Promise(function(resolve,reject) {
			var pIsPlaylist = new Promise((resolve,reject) => {
				module.exports.isPlaylist(playlist_id,seenFromUser)
					.then(function() {
						resolve();
					})
					.catch(function(err) {
						err = 'Playlist '+playlist_id+' unknown';
						logger.error('[PLC] isPlaylist : '+err);
						reject(err);
					});
			});
			Promise.all([pIsPlaylist])
				.then(function() {
					// Get karaoke list
					plDB.getPlaylistContents(playlist_id,forPlayer)
						.then(function(playlist){
							resolve(playlist);
						})
						.catch(function(err){
							logger.error('[PLC] DBI getPlaylistContents : '+err);
							reject(err);
						});
					
				})
				.catch(function(err) {
					logger.error('[PLC] getPlaylistContents : '+err);
					reject(err);
				});
		});
	},
	getPlaylistPos:function(playlist_id) {
		return new Promise(function(resolve,reject) {
			plDB.getPlaylistPos(playlist_id)
				.then(function(playlist){
					resolve(playlist);
				})
				.catch(function(err){
					logger.error('[PLC] DBI getPlaylistPos : '+err);
					reject(err);
				});
		});
	},
	/**
	* @function {Get kara info from a playlist}
	* @param  {number} plc_id {ID of playlist content to get info from}
	* @return {array} {Array of karaoke objects}
	*/
	getKaraFromPlaylist:function(plc_id,seenFromUser) {
		return new Promise(function(resolve,reject) {
			plDB.getPLCInfo(plc_id,seenFromUser)
				.then(function(kara) {
					if (kara) {
						kara = [kara];
						resolve(kara);
					} else {
						var err = 'PLCID unknown!';
						logger.error('[PLC] getKaraFromPlaylist : '+err);
						reject(err);
					}						
				})
				.catch(function(err) {
					logger.error('[PLC] GetKaraFromPlaylist : '+err);
					reject(err);
				});
		});
	},
	/**
	* @function {Get whitelist contents}
	* @return {array} {Array of karaoke objects}
	*/
	getWhitelistContents:function() {
		return new Promise(function(resolve,reject) {
			// Get karaoke list
			wlDB.getWhitelistContents()
				.then(function(playlist){
					resolve(playlist);
				})
				.catch(function(err){
					logger.error('[PLC] DBI getWhitelistContents : '+err);
					reject(err);
				});
		});
	},
	/**
	* @function {Get blacklist contents}
	* @return {array} {Array of karaoke objects}
	*/
	getBlacklistContents:function() {
		return new Promise(function(resolve,reject) {
			// Get karaoke list
			blcDB.getBlacklistContents()
				.then(function(playlist){
					resolve(playlist);
				})
				.catch(function(err){
					logger.error('[PLC] DBI getBlacklistContents : '+err);
					reject(err);
				});
		});
	},
	/**
	* @function {Get blacklist contents}
	* @return {array} {Array of karaoke objects}
	*/
	getBlacklistCriterias:function() {
		return new Promise(function(resolve,reject) {
			// Get list of criterias
			blcDB.getBlacklistCriterias()
				.then(function(blc){					
					resolve(blc);
				})
				.catch(function(err){
					logger.error('[PLC] DBI getBlacklistCriterias : '+err);
					reject(err);
				});
		});
	},
	/**
	* @function {Get all karaokes}
	* @return {array} {Array of karaoke objects}
	*/
	getAllKaras:function() {
		return new Promise(function(resolve,reject) {
			// Get karaoke list
			karaDB.getAllKaras()
				.then(function(playlist){
					resolve(playlist);
				})
				.catch(function(err){
					logger.error('[PLC] DBI getAllKaras : '+err);
					reject(err);
				});
		});
	},
	/**
	* @function {Get a random kara_id}
	* @param {number} playlist_id {Playlist ID for current playlist, to check against (not adding karaokes from that list)}
	* @param {string} filter {text filter to get random numbers only from a set of karas.}
	* @return {number} {Random kara_id}
	*/
	getRandomKara:function(playlist_id,filter) {
		return new Promise(function(resolve,reject) {
			// Get karaoke list
			module.exports.getAllKaras()
				.then(function(allKaras){
					module.exports.filterPlaylist(allKaras,filter)
						.then(function(playlistFiltered){
							//Strip allKaras to just kara IDs
							playlistFiltered.forEach(function(elem,index){
								playlistFiltered[index] = elem.kara_id;
							});
							//Now, get current playlist's contents.
							module.exports.getPlaylistContents(playlist_id)
								.then(function(playlist){
									//Strip allKaras to just kara IDs
									playlist.forEach(function(elem,index){
										playlist[index] = elem.kara_id;
									});
									var allKarasNotInCurrentPlaylist = [];
									allKarasNotInCurrentPlaylist = playlistFiltered.filter(function(el){
										return playlist.indexOf(el) < 0;
									});
									var randomKara = L.sample(allKarasNotInCurrentPlaylist);
									resolve(randomKara);
								})
								.catch(function(err){
									logger.error('[PLC] getPlaylistContents : '+err);
									reject(err);
								});
						})
						.catch(function(err){
							logger.error('[PLC] filterPlaylist : '+err);
							reject(err);
						});
					
				})
				.catch(function(err){
					logger.error('[PLC] getAllKaras : '+err);
					reject(err);
				});
		});
	},
	/**
	* @function {Get karaoke by ID}
	* @param  {number} kara_id {ID of karaoke to fetch infos from}
	* @return {Object} {karaoke object}
	*/
	getKara:function(kara_id) {
		return new Promise(function(resolve,reject) {
			// Get karaoke list
			karaDB.getKara(kara_id)
				.then(function(kara){
					logger.debug('[PLC] GetKara : '+JSON.stringify(kara)+' from '+kara_id);
					resolve(kara);
				})
				.catch(function(err){
					logger.error('[PLC] DBI getKara : '+err);
					reject(err);
				});
		});
	},
	/**
	* @function {Get karaoke by KID}
	* @param  {string} kid {KID of karaoke to fetch infos from}
	* @return {Object} {karaoke object}
	*/
	getKaraByKID:function(kid) {
		return new Promise(function(resolve,reject) {
			// Get karaoke list
			karaDB.getKaraByKID(kid)
				.then(function(kara){
					resolve(kara);
				})
				.catch(function(err){
					logger.error('[PLC] DBI getKaraByKID : '+err);
					reject(err);
				});
		});
	},
	/**
	* @function {Get playlist content by KID}
	* @param  {string} kid {KID of karaoke to fetch infos from}
	* @return {Object} {karaoke object}
	*/
	getPLCByKID:function(kid,playlist_id) {
		return new Promise(function(resolve,reject) {
			// Get karaoke list
			plDB.getPLCByKID(kid,playlist_id)
				.then(function(kara){
					resolve(kara);
				})
				.catch(function(err){
					logger.error('[PLC] DBI getPLCByKID : '+err);
					reject(err);
				});
		});
	},
	/**
	* @function {Filter playlist with a text}
	* @param  {object} playlist   {playlist array of karaoke objects}
	* @param  {string} searchText {Words separated by a space}
	* @return {object} {playlist array filtered}
	*/
	filterPlaylist:function(playlist,searchText) {
		return new Promise(function(resolve) {
			function textSearch(kara){
				searchText = L.deburr(searchText);
				searchText = searchText.toLowerCase();

				var searchOK = [];
				var searchWords = searchText.split(' ');

				var searchWordID = 0;
				searchWords.forEach(function(searchWord) {
					searchOK[searchWordID] = false;					
					if (!L.isEmpty(kara.NORM_title)) {
						if (kara.NORM_title.toLowerCase().includes(searchWord)) searchOK[searchWordID] = true;
					}
					if (!L.isEmpty(kara.NORM_author)) {
						if (kara.NORM_author.toLowerCase().includes(searchWord)) searchOK[searchWordID] = true;
					}
					if (!L.isEmpty(kara.NORM_serie)) {
						if (kara.NORM_serie.toLowerCase().includes(searchWord)) searchOK[searchWordID] = true;
					}
					if (!L.isEmpty(kara.NORM_serie_altname)) {
						if (kara.NORM_serie_altname.toLowerCase().includes(searchWord)) searchOK[searchWordID] = true;
					}
					if (!L.isEmpty(kara.NORM_singer)) {
						if (kara.NORM_singer.toLowerCase().includes(searchWord)) searchOK[searchWordID] = true;
					}
					if (!L.isEmpty(kara.NORM_creator)) {
						if (kara.NORM_creator.toLowerCase().includes(searchWord)) searchOK[searchWordID] = true;
					}					
					if (!L.isEmpty(kara.songtype_i18n_short)) {
						if (kara.songtype_i18n_short.toLowerCase().includes(searchWord)) searchOK[searchWordID] = true;
						//Allows searches for "OP1", "OP2", and such to work.
						var songorder = kara.songorder;
						if (songorder === 0) songorder = '';
						if ((kara.songtype_i18n_short.toLowerCase()+songorder).includes(searchWord)) searchOK[searchWordID] = true;
					}
					
					if (!L.isEmpty(kara.misc_i18n)) {
						if (kara.misc_i18n.toLowerCase().includes(searchWord)) searchOK[searchWordID] = true;
					}
					if (!L.isEmpty(kara.language_i18n)) {						
						if (L.deburr(kara.language_i18n).toLowerCase().includes(searchWord)) searchOK[searchWordID] = true;						
					}

					searchWordID++;
				});
				if (searchOK.indexOf(false) > -1 ) {
					return false;
				} else {
					return true;
				}
			}

			var filteredPlaylist = playlist.filter(textSearch);
			resolve(filteredPlaylist);
		});
	},
	/**
	* @function {Add Karaoke to Playlist}
	* @param  {number} kara_id     {ID of karaoke to add}
	* @param  {string} requester   {Name of person submitting karaoke}
	* @param  {number} playlist_id {ID of playlist to add to}
	* @param  {number} pos         {OPTIONAL : Position in playlist}
	* @return {boolean} {Promise}
	* If no position is provided, it will be maximum position in playlist + 1
	*/
	addKaraToPlaylist:function(karas,requester,playlist_id,pos) {
	var userMaxPosition, numUsersInPlaylist, playlistMaxPos;

		// Karas is an array of kara_ids.
		return new Promise(function(resolve,reject){
			var NORM_requester = L.deburr(requester);
			var date_add = timestamp.now();
			// Let's build the complete array of kara objects
			var karaList = [];
			karas.forEach(function(kara_id){
				karaList.push({
					kara_id: kara_id,
					requester: requester,
					NORM_requester: NORM_requester,
					playlist_id: playlist_id,
					date_add: date_add,				
				});				
			});

			var pIsPlaylist = new Promise((resolve,reject) => {
				module.exports.isPlaylist(playlist_id)
					.then(function() {
						resolve(true);
					})
					.catch(function(err) {
						err = 'Playlist '+playlist_id+' unknown';
						logger.error('[PLC] isPlaylist : '+err);
						reject(err);
					});
			});
			var pMeasurePos = new Promise((resolve,reject) => {
                plDB.getMaxPosInPlaylistForPseudo(playlist_id, requester)
						  .then(function(maxpos){
                                userMaxPosition = maxpos;
						        resolve(true);
                           })
					.catch(function(err) {
						err = 'Playlist '+playlist_id+' unknown';
						logger.error('[PLC] getMaxPosInPlaylistForPseudo : '+err);
						reject(err);
					});

                plDB.countPlaylistUsers(playlist_id)
						  .then(function(numUsers){
                                numUsersInPlaylist = numUsers;
						        resolve(true);
                           })
					.catch(function(err) {
						err = 'Playlist '+playlist_id+' unknown';
						logger.error('[PLC] countPlaylistUsers : '+err);
						reject(err);
					});


				plDB.getMaxPosInPlaylist(playlist_id)
					.then(function(maxpos){
                                playlistMaxPos = maxpos;
						        resolve(true);
					})
					.catch(function(err){
						logger.error('[PLC] DBI getMaxPosInPlaylist : '+err);
						reject(err);
					});

			});
			var pIsKara = new Promise((resolve,reject) => {
				// Need to do this for each karaoke.
				async.each(karas,function(kara_id,callback) {				
					module.exports.isKara(kara_id)
						.then(function() {
							callback();
						})
						.catch(function(err) {
							err = 'Karaoke song '+kara_id+' unknown';
							logger.error('[PLC] isKara : '+err);
							callback(err);
						});
				},function(err){
					if (err) {
						reject(err);
					} else {
						resolve();
					}
				});				
			});
			var pIsKaraInPlaylist = new Promise((resolve,reject) => {
				// Need to do this for each karaoke.
				async.each(karas,function(kara_id,callback) {				
					module.exports.isKaraInPlaylist(kara_id,playlist_id)
						.then(function(isKaraInPL) {
							if (isKaraInPL) {
								//Search kara_id in karaList and then delete that index from the array. 
								//Karaoke song won't be added since it already exists in destination playlist.								
								karaList = L.filter(karaList, element => element.kara_id !== kara_id);
							}
							callback();
						})
						.catch(function(err) {
							logger.error('[PLC] isKaraInPlaylist : '+err);
							callback(err);
						});
				},function(err){
					if (err) {
						reject(err);
					} else {
						resolve();
					}
				});
				
			});
			Promise.all([pIsKara,pIsPlaylist,pIsKaraInPlaylist,pMeasurePos])
				.then(function(){
					
					if (karaList.length === 0) {
						var err = 'No karaoke could be added, all are in destination playlist already (PLID : '+playlist_id+')';
						logger.error('[PLC] addKaraToPlaylist : '+err);
						reject(err);
					} else { 
						var pManagePos = new Promise((resolve,reject) => {
							// If pos is provided, we need to update all karas above that and add 
							// karas.length to the position
							// If pos is not provided, we need to get the maximum position in the PL
							// And use that +1 to set our playlist position.
							// If pos is -1, we must add it after the currently flag_playing karaoke.
							module.exports.getPlaylistContents(playlist_id)
								.then((playlist) => {
									// Browse Playlist to find out flag_playing. 
									var playingObject = module.exports.playingPos(playlist);
                                    var playingPos = playingObject ? playingObject.plc_id_pos : 0;

                                    if (module.exports.SETTINGS.EngineSmartInsert == 1) {
                                        // No songs yet from that user, they go first.
                                        if(userMaxPosition == null){
                                            pos = -1;
                                        // No songs enqueued in the future, they go first.
                                        } else if(userMaxPosition < playingPos){
                                            pos = -1;
                                        // Everyone is in the queue, we will leave an empty spot for each user and place ourselves next.
                                        } else {
                                            pos = Math.min(playlistMaxPos +1, userMaxPosition + numUsersInPlaylist);
                                        }
                                    }
                                    
									if (pos == -1) {

										// Find out position of currently playing karaoke
										// If no flag_playing is found, we'll add songs at the end of playlist.
										pos = playingPos + 1;
										logger.debug('[PLC] PlayNext : flag_playing next found at position '+pos);	
									}
									if (pos) {
										logger.debug('[PLC] Shifting position in playlist from pos '+pos+' by '+karas.length+' positions');
										plDB.shiftPosInPlaylist(playlist_id,pos,karas.length)
											.then(function(){
												var startpos = pos;
												karaList.forEach(function(kara,index) {
													karaList[index].pos = startpos+index;
												});
												resolve();
											})
											.catch(function(err){
												logger.error('[PLC] DBI shiftPosInPlaylist : '+err);
												reject(err);
											});
									} else {								
										var startpos = playlistMaxPos + 1.0;
										karaList.forEach(function(kara,index){
											karaList[index].pos = startpos+index;
										});
									}

								})
								.catch((err) => {
									logger.error('[PLC] getPlaylistContents : '+err);
								});
							
						});													
						Promise.all([pManagePos])
							.then(function() {	
								logger.debug('[PLC] addKaraToPlaylist : Adding to database');
								karaDB.addKaraToPlaylist(karaList)
									.then(function(){										
										logger.debug('[PLC] addKaraToPlaylist : updating playlist info');
										var pUpdateLastEditTime = new Promise((resolve,reject) => {
											module.exports.updatePlaylistLastEditTime(playlist_id)
												.then(function(){
													resolve();
												})
												.catch(function(err){
													logger.error('[PLC] updatePlaylistLastEditTime : '+err);
													reject(err);
												});
										});
										var pUpdatedKarasCount = new Promise((resolve,reject) => {
											module.exports.updatePlaylistNumOfKaras(playlist_id)
												.then(function(){
													resolve();
												})
												.catch(function(err){
													logger.error('[PLC] updatePlaylistNumOfKaras : '+err);
													reject(err);
												});
										});
										var pSetPlaying = new Promise ((resolve,reject) => {
											// Checking if a flag_playing is present inside the playlist.
											// If not, we'll have to set the karaoke we just added as the currently playing one. 
											module.exports.isPlaylistFlagPlaying(playlist_id)
												.then(function(res){
													// Playlist has no song with flag_playing!
													// Now setting.
													if (!res) {														
														module.exports.getPLCIDByDate(playlist_id,date_add)
															.then(function(plcid){
																module.exports.setPlaying(plcid,playlist_id)
																	.then(function(){
																		resolve();
																	})
																	.catch(function(err){
																		logger.error('[PLC] DBI setPlaying : '+err);
																		reject(err);
																	});
															})
															.catch(function(err){
																logger.error('[PLC] getPLCIDByDate : '+err);
																reject(err);
															});																												
													} else {
														module.exports.updatePlaylistDuration(playlist_id)
															.then(function(){
																resolve();
															})
															.catch(function(err){
																logger.error('[PLC] updatePlaylistDuration : '+err);
																reject(err);
															});
													
													}
												})
												.catch(function(err){
													logger.error('[PLC] isPlaylistFlagPlaying : '+err);
													reject(err);
												});
										});
										Promise.all([pSetPlaying,pUpdateLastEditTime,pUpdatedKarasCount])
											.then(function() {								
												var karaAdded = [];
												karaList.forEach(function(kara) {
													karaAdded.push(kara.kara_id);
												});
												resolve(karaAdded);
											})
											.catch(function(err) {
												logger.error('[PLC] addKaraToPlaylist : '+err);
												reject(err);
											});
									})
									.catch(function(err) {
										logger.error('[PLC] addKaraToPlaylist : '+err);
										reject(err);
									});

							})
							.catch(function(err) {
								logger.error('[PLC] addKaraToPlaylist : '+err);
								reject(err);
							});
							

					}
				})
				.catch(function(err) {
					logger.error('[PLC] addKaraToPlaylist : '+err);
					reject(err);
				});

		});
	},
	/**
	* @function {copy playlist contents to Playlist}
	* @param  {number} plc_id     {ID of playlist contents to add}
	* @param  {number} playlist_id {ID of playlist to add to}
	* @param  {number} pos         {OPTIONAL : Position in playlist}
	* @return {boolean} {Promise}
	* If no position is provided, it will be maximum position in playlist + 1
	*/
	copyKaraToPlaylist:function(plcs,playlist_id,pos) {
		// plcs is an array of plc_ids.
		return new Promise(function(resolve,reject){
			var date_add = timestamp.now();
			// Let's build the complete array of kara objects
			var plcList = [];
			plcs.forEach(function(plc_id){
				plcList.push({
					plc_id: plc_id,
					playlist_id: playlist_id,
					date_add: date_add,				
				});				
			});

			var pIsPlaylist = new Promise((resolve,reject) => {
				module.exports.isPlaylist(playlist_id)
					.then(function() {
						resolve(true);
					})
					.catch(function(err) {
						err = 'Playlist '+playlist_id+' unknown';
						logger.error('[PLC] isPlaylist : '+err);
						reject(err);
					});
			});
			var pCheckPLCandKaraInPlaylist = new Promise((resolve,reject) => {
				// Need to do this for each karaoke.
				async.eachOf(plcList,function(playlistContent,index,callback) {				
					plDB.getPLCInfo(playlistContent.plc_id)
						.then(function(playlistContentData) {
							if (playlistContentData) {
								//We got a hit!
								// Let's check if the kara we're trying to add is 
								// already in the playlist we plan to copy it to.
								module.exports.isKaraInPlaylist(playlistContentData.kara_id,playlist_id)
									.then(function(isKaraInPL) {
										//Karaoke song is already in playlist, abort mission
										//since we don't want duplicates in playlists.
										if (isKaraInPL) {
											var err = 'Karaoke song '+playlistContentData.kara_id+' is already in playlist '+playlist_id;
											callback(err);
										} else {
											// All OK. We need some info though.
											plcList[index].kara_id = playlistContentData.kara_id;
											plcList[index].requester = playlistContentData.pseudo_add;
											plcList[index].NORM_requester = playlistContentData.NORM_pseudo_add;
											callback();
										}									
									})
									.catch(function(err) {
										logger.error('[PLC] isKaraInPlaylist : '+err);
										reject(err);
									});							
							} else {
								var err = 'PLC '+playlistContent.plc_id+' does not exist';
								callback(err);
							}							
						})
						.catch(function(err) {						
							logger.error('[PLC] GetPLContentInfo : '+err);
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
			Promise.all([pCheckPLCandKaraInPlaylist,pIsPlaylist])
				.then(function(){
					logger.debug('[PLC] addKaraToPlaylist : copying ASS and setting positions');									
					var pManagePos = new Promise((resolve,reject) => {
						// If pos is provided, we need to update all karas above that and add 
						// karas.length to the position
						// If pos is not provided, we need to get the maximum position in the PL
						// And use that +1 to set our playlist position.					
						if (pos) {
							plDB.shiftPosInPlaylist(playlist_id,pos,plcs.length)
								.then(function(){
									resolve();
								})
								.catch(function(err){
									logger.error('[PLC] DBI shiftPosInPlaylist : '+err);
									reject(err);
								});								
						} else {
							var startpos;								
							plDB.getMaxPosInPlaylist(playlist_id)
								.then(function(res){
									startpos = res.maxpos + 1.0;
									var index = 0;
									plcList.forEach(function(){
										plcList[index].pos = startpos+index;
										index++;
									});
									resolve();
								})
								.catch(function(err){
									logger.error('[PLC] DBI getMaxPosInPlaylist : '+err);
									reject(err);
								});
						}
					});													
					Promise.all([pManagePos])
						.then(function() {	
							logger.debug('[PLC] copyKaraToPlaylist : Copying PLCs in database wow wow');
							karaDB.addKaraToPlaylist(plcList)
								.then(function(){
									logger.debug('[PLC] copyKaraToPlaylist : updating playlist info');
									var pUpdateLastEditTime = new Promise((resolve,reject) => {
										module.exports.updatePlaylistLastEditTime(playlist_id)
											.then(function(){
												resolve();
											})
											.catch(function(err){
												logger.error('[PLC] updatePlaylistLastEditTime : '+err);
												reject(err);
											});
									});
									var pUpdatedDuration = new Promise((resolve,reject) => {
										module.exports.updatePlaylistDuration(playlist_id)
											.then(function(){
												resolve();
											})
											.catch(function(err){
												logger.error('[PLC] updatePlaylistDuration : '+err);
												reject(err);
											});
									});
									var pUpdatedKarasCount = new Promise((resolve,reject) => {
										module.exports.updatePlaylistNumOfKaras(playlist_id)
											.then(function(){
												resolve();
											})
											.catch(function(err){
												logger.error('[PLC] updatePlaylistNumOfKaras : '+err);
												reject(err);
											});
									});										
									Promise.all([pUpdateLastEditTime,pUpdatedDuration,pUpdatedKarasCount])
										.then(function() {
											resolve();
										})
										.catch(function(err) {
											logger.error('[PLC] copyKaraToPlaylist : '+err);
											reject(err);
										});
								})
								.catch(function(err) {
									logger.error('[PLC] copyKaraToPlaylist : '+err);
									reject(err);
								});

						})
						.catch(function(err) {
							logger.error('[PLC] copyKaraToPlaylist : '+err);
							reject(err);
						});					
				})
				.catch(function(err) {
					logger.error('[PLC] copyKaraToPlaylist : '+err);
					reject(err);
				});

		});



	},
	/**
	* @function {Remove karaoke from playlist}
	* @param  {number} playlistcontent_id     {IDs of karaoke to remove}
	* @param  {number} playlist_id {ID of playlist karas will be removed from}
	* @return {boolean} {Promise}
	*/
	deleteKaraFromPlaylist:function(playlistcontent_id,playlist_id) {
		return new Promise(function(resolve,reject){			
			var karaList = [];
			playlistcontent_id.forEach(function(plc_id){
				karaList.push({
					plc_id: plc_id					
				});				
			});
			var pIsPlaylist = new Promise((resolve,reject) => {
				module.exports.isPlaylist(playlist_id)
					.then(function() {
						resolve(true);
					})
					.catch(function(err) {
						err = 'Playlist '+playlist_id+' unknown';
						logger.error('[PLC] isPlaylist : '+err);
						reject(err);
					});
			});			
			Promise.all([pIsPlaylist])
				.then(function() {
					// Removing karaoke here.
					karaDB.removeKaraFromPlaylist(playlistcontent_id)
						.then(function(){
							var pUpdatedDuration = new Promise((resolve,reject) => {
								module.exports.updatePlaylistDuration(playlist_id)
									.then(function(){
										resolve();
									})
									.catch(function(err){
										logger.error('[PLC] updatePlaylistDuration : '+err);
										reject(err);
									});
							});
							var pUpdatedKarasCount = new Promise((resolve,reject) => {
								module.exports.updatePlaylistNumOfKaras(playlist_id)
									.then(function(){
										resolve();
									})
									.catch(function(err){
										logger.error('[PLC] updatePlaylistNumOfKaras : '+err);
										reject(err);
									});
							});
							var pUpdateLastEditTime = new Promise((resolve,reject) => {
								module.exports.updatePlaylistLastEditTime(playlist_id)
									.then(function(){
										resolve();
									})
									.catch(function(err){
										logger.error('[PLC] updatePlaylistLastEditTime : '+err);
										reject(err);
									});
							});
							var pReorderPlaylist = new Promise((resolve,reject) => {
								module.exports.reorderPlaylist(playlist_id)
									.then(function(){
										resolve();
									})
									.catch(function(err){
										logger.error('[PLC] reorderPlaylist : '+err);
										reject(err);
									});
							});
							Promise.all([pUpdateLastEditTime,pReorderPlaylist,pUpdatedDuration,pUpdatedKarasCount])
								.then(function() {									
									// We return the playlist id so we can send a message update
									resolve(playlist_id);
								})
								.catch(function(err) {
									logger.error('[PLC] deleteKaraFromPlaylist : '+err);
									reject(err);
								});
						})
						.catch(function(err){
							logger.error('[PLC] deleteKaraFromPlaylist : '+err);
							reject(err);
						});
					
				})
				.catch(function(err) {
					logger.error('[PLC] DeleteKaraFromPlaylist : '+err);
					reject(err);
				});
		});
	},	
	/**
	* @function {Update karaoke from playlist}
	* @param  {number} playlistcontent_id     {ID of karaoke to remove}
	* @param  {number} pos {New position of karaoke, optional}
	* @param  {boolean} flag_playing {Is the karaoke currently the playing one?}
	* @return {boolean} {Promise}
	*/
	editKaraFromPlaylist:function(playlistcontent_id,pos,flag_playing) {
		return new Promise(function(resolve,reject){			
			var playlist_id = undefined;
			
			var pIsPLCEmpty = new Promise((resolve,reject) => {
				if (L.isEmpty(playlistcontent_id)) {
					var err = 'PLCID empty';
					logger.error('[PLC] editKaraFromPlaylist : '+err);
					reject(err);
				} else {
					resolve();
				}
			});
			var pIsFlagPlayingUnset = new Promise((resolve,reject) => {
				if (flag_playing == 0) {
					var err = 'flag_playing cannot be unset! Set it to another karaoke to unset it on this one';
					logger.error('[PLC] editKaraFromPlaylist : '+err);
					reject(err);
				} else {
					resolve();
				}
			});
			var pGetPLContentInfo = new Promise((resolve,reject) => {
				plDB.getPLCInfo(playlistcontent_id)
					.then(function(kara) {
						if (kara) {
							playlist_id = kara.playlist_id;
							resolve();
						} else {
							var err = 'PLCID unknown!';
							logger.error('[PLC] editKaraFromPlaylist : '+err);
							reject(err);
						}						
					})
					.catch(function(err) {
						logger.error('[PLC] GetPLContentInfo : '+err);
						reject(err);
					});
			});
			Promise.all([pGetPLContentInfo,pIsPLCEmpty,pIsFlagPlayingUnset])
				.then(function() {
					// Updating karaoke here.
					var pUpdatePlaying = new Promise((resolve,reject) => {
						if (flag_playing) {
							module.exports.setPlaying(playlistcontent_id,playlist_id)
								.then(function(){
									module.exports.isCurrentPlaylist(playlist_id)
										.then(function(res){
											if (res == true) {
												module.exports.onPlayingUpdated()
													.then(function(){
														resolve();
													})
													.catch(function(err){
														logger.error('[PLC] onPlayingUpdated : '+err);
														reject(err);
													});
											} else {
												resolve();
											}											
										})
										.catch(function(err){
											logger.error('[PLC] isCurrentPlaylist : '+err);
											reject(err);
										});
								})
								.catch(function(err){
									logger.error('[PLC] DBI setPlaying : '+err);
									reject(err);
								});
						} else {
							resolve();
						}
					});
					var pUpdatePos = new Promise((resolve,reject) => {
						if (pos) {
							module.exports.raisePosInPlaylist(pos,playlist_id)
								.then(function(){									
									plDB.setPos(playlistcontent_id,pos)
										.then(function(){									
											resolve();
										})
										.catch(function(err){
											logger.error('[PLC] DBI pUpdatePos : '+err);
											reject(err);
										});
								})
								.catch(function(err){
									logger.error('[PLC] raisePosInPlaylist : '+err);
									reject(err);
								});
						} else {
							resolve();
						}
					});
					Promise.all([pUpdatePos,pUpdatePlaying])
						.then(function(){							
							var pReorderPlaylist = new Promise((resolve,reject) => {
								if (pos) {
									module.exports.reorderPlaylist(playlist_id)
										.then(function(){
											resolve();
										})
										.catch(function(err){
											logger.error('[PLC] reorderPlaylist : '+err);
											reject(err);
										});
								} else {
									resolve();
								}
							});
							var pUpdateLastEditTime = new Promise((resolve,reject) => {
								module.exports.updatePlaylistLastEditTime(playlist_id)
									.then(function(){
										resolve();
									})
									.catch(function(err){
										logger.error('[PLC] updatePlaylistLastEditTime : '+err);
										reject(err);
									});
							});
							Promise.all([pUpdateLastEditTime,pReorderPlaylist])
								.then(function() {
									// Return the playlist_id we modified so we can send a update message									
									resolve(playlist_id);
								})
								.catch(function(err) {
									logger.error('[PLC] editKaraFromPlaylist : '+err);
									reject(err);
								});
						})
						.catch(function(err) {
							logger.error('[PLC] editKaraFromPlaylist : '+err);
							reject(err);
						});
				})
				.catch(function(err) {
					logger.error('[PLC] editKaraFromPlaylist : '+err);
					reject(err);
				});
		});
	},
	/**
	* @function {Remove karaoke from whitelist}
	* @param  {number} wlc_id     {ID of karaoke to remove}
	* @return {boolean} {Promise}
	*/
	deleteKaraFromWhitelist:function(whitelistcontent_ids) {
		return new Promise(function(resolve,reject){
			var karaList = [];
			whitelistcontent_ids.forEach(function(wlc_id){
				karaList.push({
					wlc_id: wlc_id
				});				
			});
			// Removing karaoke here.
			karaDB.removeKaraFromWhitelist(karaList)
				.then(function(){
					module.exports.generateBlacklist()
						.then(() => {
							resolve();
						})
						.catch((err) => {
							logger.error('[PLC] generateBlacklist : '+err);
							reject(err);
						});
				})
				.catch(function(err){
					logger.error('[PLC] deleteKaraFromWhitelist : '+err);
					reject(err);
				});

		});
	},
	/**
	* @function {Raises position of kara in a playlist}
	* @param  {number} playlist_id     {ID of playlist to modify order of}
	* @param  {number} order           {Order to raise}
	* @return {boolean} {Promise}
	* This utility function raises the position of a song in a playlist by 0.1
	* This allows the reorderPlaylist function, called immediately after, to
	* reorder the new playlist correctly.
	*/
	raisePosInPlaylist:function(pos,playlist_id) {
		return new Promise(function(resolve,reject){
			plDB.raisePosInPlaylist(pos,playlist_id)
				.then(function() {
					resolve();
				})
				.catch(function(err) {
					logger.error('[PLC] DBI raisePosInPlaylist : '+err);
					reject(err);
				});
		});
	},
	/**
	* @function {reorders a playlist by updating karaoke positions}
	* @param  {number} playlist_id {ID of playlist to sort}
	* @return {array} {Playlist array of karaoke objects.}
	*/
	reorderPlaylist:function(playlist_id) {
		return new Promise(function(resolve,reject){
			var pIsPlaylist = new Promise((resolve,reject) => {
				module.exports.isPlaylist(playlist_id)
					.then(function() {
						module.exports.emitEvent('playlistContentsUpdated',playlist_id);
						resolve(true);
					})
					.catch(function(err) {
						err = 'Playlist '+playlist_id+' unknown';
						logger.error('[PLC] isPlaylist : '+err);
						reject(err);
					});
			});
			Promise.all([pIsPlaylist])
				.then(function() {
					module.exports.getPlaylistPos(playlist_id)
						.then(function(playlist){
							playlist.sort(function(a,b){
								return a.pos - b.pos;
							});
							var newpos = 0;
							var arraypos = 0;
							playlist.forEach(function(){
								newpos++;
								playlist[arraypos].pos = newpos;
								arraypos++;
							});
							plDB.reorderPlaylist(playlist)
								.then(function() {
									resolve(playlist);
								})
								.catch(function(err) {
									logger.error('[PLC] DBI reorderPlaylist : '+err);
									reject(err);
								});
						})
						.catch(function(err){
							logger.error('[PLC] getPlaylistContents : '+err);
							reject(err);
						});
				})
				.catch(function(err) {
					logger.error('[PLC] reorderPlaylist : '+err);
					reject(err);
				});
		});
	},
	/**
	* @function {export a playlist}
	* @param  {number} playlist_id {ID of playlist to sort}
	* @return {array} {Playlist array of karaoke objects.}
	*/
	exportPlaylist:function(playlist_id) {
		return new Promise(function(resolve,reject){
			var pIsPlaylist = new Promise((resolve,reject) => {
				module.exports.isPlaylist(playlist_id)
					.then(function() {
						resolve(true);
					})
					.catch(function(err) {
						err = 'Playlist '+playlist_id+' unknown';
						logger.error('[PLC] isPlaylist : '+err);
						reject(err);
					});
			});
			Promise.all([pIsPlaylist])
				.then(function() {
					var PLContents;
					var PLInfo;
					var pGetPLContents = new Promise((resolve,reject) => {
						module.exports.getPlaylistContents(playlist_id)
							.then(function(playlist){
								PLContents = playlist;
								resolve();
							})
							.catch(function(err){
								logger.error('[PLC] getPlaylistContents : '+err);
								reject(err);
							});
					});	
					var pGetPLInfo = new Promise((resolve,reject) => {
						module.exports.getPlaylistInfo(playlist_id)
							.then(function(playlist) {
								PLInfo = playlist;
								resolve();
							})
							.catch(function(err){
								logger.error('[PLC] DBI getPlaylistInfo : '+err);					
								reject(err);
							});
					});
					Promise.all([pGetPLContents,pGetPLInfo])
						.then(function(){
							var playlist = {};
							PLInfo.playlist_id = undefined;
							PLInfo.num_karas = undefined;
							PLInfo.flag_current = undefined;
							PLInfo.flag_public = undefined;
							PLInfo.length = undefined;							

							var PLCFiltered = [];
							PLContents.forEach(function(plc){
								var PLCObject = {};
								PLCObject.kid = plc.kid;
								if (plc.flag_playing === 1) {
									PLCObject.flag_playing = 1;
								}
								PLCFiltered.push(PLCObject);
							});

							playlist.Header = {
								version: 2,
								description: 'Karaoke Mugen Playlist File',
							};

							playlist.PlaylistInformation = PLInfo;
							playlist.PlaylistContents = PLCFiltered;						
							resolve(playlist);
						})
						.catch(function(err){
							logger.error('[PLC] exportPlaylist : '+err);					
							reject(err);
						});
				})
				.catch(function(err) {
					logger.error('[PLC] exportPlaylist : '+err);
					reject(err);
				});
		});
	},
	/**
	* @function {Import a playlist}
	* @param  {object} playlist {Playlist object}
	* @return {number} {Playlist ID newly created}
	*/
	importPlaylist:function(playlist) {
		return new Promise(function(resolve,reject){
			// Check if format is valid :
			// Header must contain :
			// description = Karaoke Mugen Playlist File
			// version <= 2
			// 
			// PlaylistContents array must contain at least one element.
			// That element needs to have at least kid. flag_playing is optionnal
			// kid must be uuid
			// Test each element for those.
			//
			// PlaylistInformation must contain :
			// - created_at : (number)
			// - flag_visible : (0 / 1)
			// - modified_at : (number)
			// - name : playlist name
			//
			// If all tests pass, then add playlist, then add karas
			// Playlist can end up empty if no karaokes are found in database			
			var err;
			var playingKara;
			if (playlist.Header === undefined) {
				err = 'No Header section';
			} else if (playlist.Header.description !== 'Karaoke Mugen Playlist File') {
				err = 'Not a .kmplaylist file';
			} else if (playlist.Header.version > 2) {
				err = 'Cannot import this version ('+playlist.Header.version+')'; 
			} else if (playlist.PlaylistContents === undefined) { 
				err = 'No PlaylistContents section';
			} else if (playlist.PlaylistInformation === undefined) {
				err = 'No PlaylistInformation section';
			} else if (isNaN(playlist.PlaylistInformation.created_at)) { 
				err = 'Creation time is not valid';
			} else if (isNaN(playlist.PlaylistInformation.modified_at)) { 
				err = 'Modification time is not valid';
			} else if (playlist.PlaylistInformation.flag_visible !== 0 && 
				playlist.PlaylistInformation.flag_visible !== 1) {
				err = 'Visible flag must be boolean';
			} else if (L.isEmpty(playlist.PlaylistInformation.name)) {
				err = 'Playlist name must not be empty';
			} else if (playlist.PlaylistContents !== undefined) {
				playlist.PlaylistContents.forEach(function(kara){
					if (!(new RegExp(uuidRegexp).test(kara.kid))) err = 'KID is not a valid UUID!';
					if (!isNaN(kara.flag_playing)) {
						if (kara.flag_playing === 1) {
							playingKara = kara.kid;						
						} else {
							err = 'flag_playing must be 1 or not present!';
						}
					}
				});
			}

			// Validations done. First creating playlist.
			if (err) {
				reject(err);
			} else {
				module.exports.createPlaylist(playlist.PlaylistInformation.name,playlist.PlaylistInformation.flag_visible,0,0)
					.then(function(playlist_id){
						var karasToImport = [];
						var karasUnknown = [];
						async.eachSeries(playlist.PlaylistContents,function(kara,callback){
							module.exports.getKaraByKID(kara.kid)
								.then(function(karaFromDB) {
									if (karaFromDB) {
										karasToImport.push(karaFromDB.kara_id);
										callback();
									} else {
										logger.warn('[PLC] importPlaylist : KID '+kara.kid+' unknown');
										karasUnknown.push(kara.kid);
										callback();
									}
								})
								.catch(function(err) {
									logger.error('[PLC] getKaraByKID : '+err);
									callback(err);
								});
						}, function(err) {
							if (err) {
								reject(err);
							} else {																
								module.exports.addKaraToPlaylist(karasToImport,'Administrateur',playlist_id)
									.then(function(){
										module.exports.getPLCByKID(playingKara,playlist_id)
											.then(function(PLCToPlay){
												module.exports.setPlaying(PLCToPlay.playlistcontent_id,playlist_id)
													.then(function(){
														var response = {
															playlist_id: playlist_id,
															karasUnknown: karasUnknown
														};																							resolve(response);
													})
													.catch(function(err){
														logger.error('[PLC] setPlaying : '+err);
														reject(err);
													});
											})
											.catch(function(err){
												logger.error('[PLC] getPLCByKID : '+err);
												reject(err);
											});										
									});
							}
						});
					})
					.catch(function(err){
						logger.error('[PLC] importPlaylist : '+err);
						reject(err);
					});

			}
			
		});
	},
	/**
	* @function {Translate Kara Information}
	* @param  {array} karalist {list of kara objects}
	* @param  {string} lang     {language in ISO639-1 to translate into}
	* @return {array} {Returns array of kara objects}
	*/
	translateKaraInfo:function(karalist,lang){
		return new Promise(function(resolve,reject) {

			// If lang is not provided, assume we're using node's system locale
			if (!lang) lang = module.exports.SETTINGS.EngineDefaultLocale;
			// Test if lang actually exists in ISO639-1 format
			if (!langs.has('1',lang)) {
				var err = 'Unknown language : '+lang;
				logger.error('[PLC] translateKaraInfo : '+err);
				reject(err);
			}
			// Instanciate a translation object for our needs with the correct language.
			const i18n = require('i18n'); // Needed for its own translation instance
			i18n.configure({
				directory: path.resolve(__dirname,'../../_common/locales'),
			});
			i18n.setLocale(lang);

			// We need to read the detected locale in ISO639-1
			var detectedLocale = langs.where('1',lang);

			// If the kara list provided is not an array (only a single karaoke)
			// Put it into an array first
			var karas;
			if (karalist.constructor != Array) {
				karas = [];
				karas[0] = karalist;
			} else {
				karas = karalist;
			}

			karas.forEach(function(kara,index) {
				karas[index].songtype_i18n = i18n.__(kara.songtype);
				karas[index].songtype_i18n_short = i18n.__(kara.songtype+'_SHORT');

				if (kara.language != null) {
					var karalangs = kara.language.split(',');
					var languages = [];
					karalangs.forEach(function(karalang){
						// Special case : und
						// Undefined language
						// In this case we return something different.
						if (karalang === 'und') {
							languages.push(i18n.__('UNDEFINED_LANGUAGE'));
						} else {
							// We need to convert ISO639-2B to ISO639-1 to get its language
							var langdata = langs.where('2B',karalang);
							if (langdata === undefined) {
								languages.push(__('UNKNOWN_LANGUAGE'));
							} else {
								languages.push(isoCountriesLanguages.getLanguage(detectedLocale[1],langdata[1]));
							}

						}
					});
					karas[index].language_i18n = languages.join();
				}
				// Let's do the same with tags, without language stuff
				if (kara.misc != null) {
					var tags = [];
					var karatags = kara.misc.split(',');
					karatags.forEach(function(karatag){
						tags.push(i18n.__(karatag));
					});
					karas[index].misc_i18n = tags.join();
				} else {
					karas[index].misc_i18n = null;
				}
			});
			resolve(karas);
		});
	},
	/**
	* @function {Translate Blacklist criterias information in human form}
	* @param  {array} blc {list of BLC objects}
	* @param  {string} lang     {language in ISO639-1 to translate into}
	* @return {array} {Returns array of BLC objects}
	*/
	translateBlacklistCriterias:function(blclist,lang){
		return new Promise(function(resolve,reject) {

			// If lang is not provided, assume we're using node's system locale
			if (!lang) lang = module.exports.SETTINGS.EngineDefaultLocale;
			// Test if lang actually exists in ISO639-1 format
			if (!langs.has('1',lang)) {
				var err = 'Unknown language : '+lang;
				logger.error('[PLC] translateKaraInfo : '+err);
				reject(err);
			}
			// Instanciate a translation object for our needs with the correct language.
			const i18n = require('i18n'); // Needed for its own translation instance
			i18n.configure({
				directory: path.resolve(__dirname,'../../_common/locales'),
			});
			i18n.setLocale(lang);

			// We need to read the detected locale in ISO639-1
			
			async.eachOf(blclist, function(blc, index, callback){
				var pTagName = new Promise((resolve) => {
					if (blc.type === 1){
						// We just need to translate the tag name if there is a translation
						if (typeof blc.value === 'string') {
							if (blc.value.startsWith('TAG_')) {
								blclist[index].value_i18n = i18n.__(blc.value);
							} else {
								blclist[index].value_i18n = blc.value;
							}
							resolve();
						} else {
							var err = 'blc.value is not a string : '+blc.value;
							reject(err);
						}
						
					} else {
						resolve();
					}
					
				});
				var pTagID = new Promise((resolve,reject) => {
					if (blc.type >= 2 && blc.type <= 999) {
						// We need to get the tag name and then translate it if needed
						
						tagDB.getTag(blc.value)
							.then(function (res){								
								if (typeof res.name === 'string') {
									if (res.name.startsWith('TAG_')) {
										blclist[index].value_i18n = i18n.__(res.name);
									} else {
										blclist[index].value_i18n = res.name;
									}							
									resolve();
								} else {
									var err = 'res.name is not a string : '+JSON.stringify(res);
									reject(err);
								}
							})	
							.catch(function (err) {
								logger.error('[PLC] translateBlacklistCriterias : '+err);
								reject(err);
							});					
					} else {
						resolve();
					}
				});
				var pTagKaraID = new Promise((resolve,reject) => {
					if (blc.type === 1001) {
						// We have a kara ID, let's get the kara itself and append it to the value
						karaDB.getKara(blc.value)
							.then(function(kara){
								module.exports.translateKaraInfo(kara,lang)
									.then(function (karaTranslated){
										blclist[index].value = karaTranslated;
										resolve();
									})
									.catch(function (err){
										logger.error('[PLC] translateBlacklistCriterias : translateKaraInfo : '+err);
										reject(err);
									});						
							})
							.catch(function(err){
								logger.error('[PLC] translateBlacklistCriterias : '+err);
								reject(err);
							});
					} else {
						resolve();
					}
				});
				Promise.all([pTagKaraID,pTagName,pTagID])
					.then(function(){
						// No need to do anything, values have been modified if necessary						
						callback();
					})
					.catch(function(err){
						logger.error('[PLC] translateBlacklistCriterias : '+err);
						callback(err);
					});
			},function(err){
				if (err) {
					reject(err);
				}				
				resolve(blclist);
			});			
		});
	},
	/**
	* @function {Translate tag list in human form}
	* @param  {array} blc {list of tags objects}
	* @param  {string} lang     {language in ISO639-1 to translate into}
	* @return {array} {Returns array of tags}
	*/
	translateTags:function(taglist,lang){
		return new Promise(function(resolve,reject) {

			// If lang is not provided, assume we're using node's system locale
			if (!lang) lang = module.exports.SETTINGS.EngineDefaultLocale;
			// Test if lang actually exists in ISO639-1 format
			if (!langs.has('1',lang)) {
				var err = 'Unknown language : '+lang;
				logger.error('[PLC] translateKaraInfo : '+err);
				reject(err);
			}
			// Instanciate a translation object for our needs with the correct language.
			const i18n = require('i18n'); // Needed for its own translation instance
			i18n.configure({
				directory: path.resolve(__dirname,'../../_common/locales'),
			});
			i18n.setLocale(lang);

			// We need to read the detected locale in ISO639-1
			var detectedLocale = langs.where('1',lang);

			taglist.forEach(function(tag, index){
				if (tag.type >= 2 && tag.type <= 999 && tag.type != 5) {
					if (tag.name.startsWith('TAG_') || tag.name.startsWith('TYPE_')) {
						taglist[index].name_i18n = i18n.__(tag.name);
					} else {
						taglist[index].name_i18n = tag.name;
					}							
				}
				// Special case for languages
				if (tag.type == 5) {
					if (tag.name === 'und') {
						taglist[index].name_i18n = i18n.__('UNDEFINED_LANGUAGE');
					} else {
						// We need to convert ISO639-2B to ISO639-1 to get its language
						var langdata = langs.where('2B',tag.name);
						if (langdata === undefined) {
							taglist[index].name_i18n = i18n.__('UNKNOWN_LANGUAGE');
						} else {
							taglist[index].name_i18n = (isoCountriesLanguages.getLanguage(detectedLocale[1],langdata[1]));
						}
					}					
				}	
			});
			resolve(taglist);			
		});
	},
	/**
	* @function {Shuffles playlist}
	* @param  {number} playlist_id {ID of playlist to shuffle}
	* @return {array} {Playlist array of karaoke objects.}
	*/
	shufflePlaylist:function(playlist_id) {
		return new Promise(function(resolve,reject){
			var pIsPlaylist = new Promise((resolve,reject) => {
				module.exports.isPlaylist(playlist_id)
					.then(function() {
						resolve(true);
					})
					.catch(function(err) {
						err = 'Playlist '+playlist_id+' unknown';
						logger.error('[PLC] isPlaylist : '+err);
						reject(err);
					});
			});
			// We check if the playlist to shuffle is the current one. If it is, we will only shuffle
			// the part after the song currently being played.
			var IsCurrent = undefined;
			var pIsCurrent = new Promise((resolve,reject) => {
				module.exports.isCurrentPlaylist(playlist_id)
					.then(function(res){
						if (res == true) {
							IsCurrent = true;
						} else {
							IsCurrent = false;
						}
						resolve();
					})
					.catch(function(err){
						logger.error('[PLC] isCurrentPlaylist : '+err);
						reject(err);
					});
			});
			Promise.all([pIsPlaylist,pIsCurrent])
				.then(function() {
					module.exports.getPlaylistContents(playlist_id)
						.then(function(playlist){
							if (IsCurrent === false) {
								playlist = L.shuffle(playlist);
							} else {
								// If it's current playlist, we'll make two arrays out of the playlist :
								// One before (and including) the current song being played (flag_playing = 1)
								// One after.
								// We'll shuffle the one after then concatenate the two arrays.
								var BeforePlaying = [];
								var AfterPlaying = [];
								var ReachedPlaying = false;
								playlist.forEach(function(kara){
									if (ReachedPlaying == false) {
										BeforePlaying.push(kara);
										if (kara.flag_playing == 1) {
											ReachedPlaying = true;
										}
									} else {
										AfterPlaying.push(kara);
									}
								});
								AfterPlaying = L.shuffle(AfterPlaying);
								playlist = BeforePlaying.concat(AfterPlaying);
								// If no flag_playing has been set, the current playlist won't be shuffled. To fix this, we shuffle the entire playlist if no flag_playing has been met
								if (ReachedPlaying == false) {
									playlist = L.shuffle(playlist);
								}
							}
							var newpos = 0;
							var arraypos = 0;
							playlist.forEach(function(){
								newpos++;
								playlist[arraypos].pos = newpos;
								arraypos++;
							});
							var pUpdateLastEditTime = new Promise((resolve,reject) => {
								module.exports.updatePlaylistLastEditTime(playlist_id)
									.then(function(){
										resolve();
									})
									.catch(function(err){
										logger.error('[PLC] updatePlaylistLastEditTime : '+err);
										reject(err);
									});
							});
							var pReorderPlaylist = new Promise((resolve,reject) => {
								plDB.reorderPlaylist(playlist)
									.then(function() {
										resolve();
									})
									.catch(function(err) {
										logger.error('[PLC] reorderPlaylist : '+err);
										reject(err);
									});
							});
							Promise.all([pReorderPlaylist,pUpdateLastEditTime])
								.then(function() {
									resolve();
								})
								.catch(function(err) {
									logger.error('[PLC] shufflePlaylist : '+err);
									reject(err);
								});
						})
						.catch(function(err){
							logger.error('[PLC] getPlaylistContents : '+err);
							reject(err);
						});
				})
				.catch(function(err) {
					logger.error('[PLC] shufflePlaylist : '+err);
					reject(err);
				});
		});
	},
	
	// ---------------------------------------------------------------------------
	// Methodes rapides de gestion de la playlist courante
	// prev / next / get_current
	// ---------------------------------------------------------------------------

	prev:function(){
		return new Promise(function(resolve,reject){
			module.exports.isACurrentPlaylist().then(function(playlist_id){
				module.exports.getPlaylistContents(playlist_id,false,true).then(function(pl_content){
					if(pl_content.length==0) {
						logger.warn('[PLC] prev : pl_content is empty!');
						reject('Playlist is empty!');
					} else {
						var readpos = 0;
						pl_content.forEach(function(element, index) {
							if(element.flag_playing) {
								readpos = index-1;
							}
						});
						// Beginning of playlist
						if(readpos<0) {
							logger.warn('[PLC] prev : current position is first song!');
							reject('Current position is first song!');
						}

						var kara = pl_content[readpos];
						if(kara) {
							// mise à jour du pointeur de lecture
							module.exports.setPlaying(kara.playlistcontent_id,playlist_id)
								.then(() => {
									resolve();
								})
								.catch(function(err){
									reject(err);
								});								
						} else {
							var err = 'Received an empty karaoke!';
							logger.error('[PLC] prev : '+err);
							reject(err);
						}						
					}
				});
			})
				.catch(function(err){
					logger.error('[PLC] isACurrentPlaylist');
					reject(err);
				});
		});
	},
	next:function(){
		return new Promise(function(resolve,reject){
			module.exports.isACurrentPlaylist().then(function(playlist_id){
				module.exports.getPlaylistContents(playlist_id,false,true).then(function(pl_content){
					if(pl_content.length==0) {
						logger.error('[PLC] next : pl_content is empty!');
						reject('Playlist is empty!');
					} else {
						var readpos = 0;
						pl_content.forEach(function(element, index) {
							if(element.flag_playing)
								readpos = index+1;
						});
						// on est la fin de la playlist
						if(readpos >= pl_content.length && module.exports.SETTINGS.EngineRepeatPlaylist == 0) {
							logger.info('[PLC] next : current position is last song');		// Unset flag_playing on all karas from the playlist
							module.exports.setPlaying(null,playlist_id)
								.then(function(){
									reject('Current position is last song!');						
								})
								.catch(function(err){
									reject(err);
								});
						} else {
							// If we're here, it means either we're beyond the length of the playlist
							// OR that EngineRepeatPlaylist is set to 1. 
							// We test again if we're at the end of the playlist. If so we go back to first song.
							if (readpos >= pl_content.length) {
								readpos = 0;
							} 
							var kara = pl_content[readpos];
							if(kara) {
								// Updating Playing flag.
								module.exports.setPlaying(kara.playlistcontent_id,playlist_id)
									.then(function(){
										resolve();
									})
									.catch(function(err){
										reject(err);
									});								
							} else {
								var err = 'Received an empty karaoke!';
								logger.error('[PLC] next : '+err);
								reject(err);
							}						
						}
					}
				});
			})
				.catch(function(err){
					logger.error('[PLC] isACurrentPlaylist');
					reject(err);
				});
		});
	},
	current_playlist:function(){
		return new Promise(function(resolve,reject){
			module.exports.isACurrentPlaylist()
				.then(function(playlist_id){
					module.exports.getPlaylistContents(playlist_id,false,true)
						.then(function(pl_content){												
							// Setting readpos to 0. If no flag_playing is found in current playlist
							// Then karaoke will begin at the first element of the playlist (0)
							var readpos = 0;
							pl_content.forEach(function(element, index) {
								if(element.flag_playing)
									readpos = index;
							});							
							resolve({'id':playlist_id,content:pl_content,index:readpos});
						})
						.catch(function(err){
							logger.error('[PLC] getPlaylistContents : '+err);
							reject(err);
						});
				})
				.catch(function(err){
					logger.error('[PLC] isACurrentPlaylist');
					reject(err);
				});
		});
	},
	current:function(){
		// TODO : renommer en get_current_kara
		return new Promise(function(resolve,reject){
			logger.profile('GetPlaylist');									
			module.exports.current_playlist()
				.then(function(playlist){
					logger.profile('GetPlaylist');					
					var readpos = false;
					playlist.content.forEach(function(element, index) {
						if(element.flag_playing)
							readpos = index;
					});

					var update_playing_kara = false;
					if(readpos===false) {
						readpos = 0;
						update_playing_kara = true;
					}

					var kara = playlist.content[readpos];
					if(kara) {						
						// si il n'y avait pas de morceau en lecture on marque le premier de la playlist
						if(update_playing_kara) {
							// mise à jour du pointeur de lecture
							module.exports.setPlaying(kara.playlistcontent_id,playlist.id)
								.catch((err) => {
									reject(err);
								});
						}

						// on enrichie l'objet pour fournir son contexte et les chemins système prêt à l'emploi
						kara.playlist_id = playlist.id;
						module.exports.getASS(kara.kara_id)
							.then(function(ass){
								var requester;								
								if (module.exports.SETTINGS.EngineDisplayNickname){
									if (kara.pseudo_add !== 'Administrateur') {
										// Escaping {} because it'll be interpreted as ASS tags below.
										kara.pseudo_add = kara.pseudo_add.replace(/[\{\}]/g,'');										
										requester = __('REQUESTED_BY')+' '+kara.pseudo_add;
									} else {
										requester = '';
									}									
								} else {									
									requester = '';
								}								
								if (!L.isEmpty(kara.title)) {
									kara.title = ' - '+kara.title;
								}
								var series = kara.serie;
								if (L.isEmpty(kara.serie)) {
									series = kara.singer; 
								}
								if (kara.songorder === 0) {
									kara.songorder = '';
								}
								kara.infos = '{\\bord0.7}{\\fscx70}{\\fscy70}{\\b1}'+series+'{\\b0}\\N{\\i1}'+__(kara.songtype+'_SHORT')+kara.songorder+kara.title+'{\\i0}\\N{\\fscx50}{\\fscy50}'+requester;		
													
								kara.path = {
									video: kara.videofile,
									subtitle: ass,									
								};													
								module.exports.isAPublicPlaylist()
									.then((playlist_id) => {
										module.exports.getPLCByKID(kara.kid,playlist_id)
											.then((plc_id) => {
												if (plc_id) {
													module.exports.deleteKaraFromPlaylist([plc_id.playlistcontent_id],playlist_id) 
														.catch((err) => {
															logger.warn('[PLC] Could not remove kara from public playlist upon play : '+err);
														});
												}
											})
											.catch((err) => {
												logger.warn('[PLC] Error fetching PLC ID from public playlist when removing kara upon play : '+err);
											});
									})
									.catch((err) => {
										logger.warn('[PLC] Error getting public playlist ID when removing kara upon play : '+err);
									});
								resolve(kara);
									
							})
							.catch(function(err){
								logger.error('[PLC] getASS : '+err);
								reject(err);
							});						
					} else { 	
						var err = 'No karaoke found in playlist object';
						logger.error('[PLC] current : '+err);						
						reject(err);
					}
				})
				.catch(function(err){
					logger.error('[PLC] current_playlist : '+err);
					reject(err);
				});
		});
	},

	build_dummy_current_playlist:function(playlist_id){
		logger.info('[PLC] Dummy Plug : Adding some karaokes to the current playlist...');
		return new Promise(function(resolve,reject){
			getStats()
				.then((stats) => {
					var karaCount = stats.totalcount;
					// Limiting to 5 sample karas to add if there's more. 
					if (karaCount > 5) karaCount = 5;
					if (karaCount > 0) {
						logger.info('[PLC] Dummy Plug : Adding '+karaCount+' karas into current playlist');			
						async.timesSeries(karaCount,function(n,next) {				
							module.exports.getRandomKara(playlist_id)
								.then(function(kara_id) {
									logger.debug('[PLC] Dummy Plug : random kara selected : '+kara_id);
									module.exports.addKaraToPlaylist(
										[kara_id],
										'Dummy Plug System',
										playlist_id
									)				
										.then(function() {
											logger.info('[PLC] Dummy Plug : Added karaoke '+kara_id+' to sample playlist');
											next();
										})		
										.catch(function(err){
											logger.error('[PLC] Dummy Plug : '+err);
											next(err);
										});
								})
								.catch(function(err) {
									logger.error('[PLC] Dummy Plug : failure to get random karaokes to add : '+err);
									next(err);
								});
						},function(err){
							if (err) {
								reject(err);
							} else {
								logger.info('[PLC] Dummy Plug : Activation complete. The current playlist has now '+karaCount+' sample songs in it.');
								resolve();
							}
						});
					} else {
						logger.warn('[PLC] Dummy Plug : your database has no songs! Maybe you should try to regenerate it?');
						resolve();
					}
					
				})
				.catch((err) => {
					logger.error('[PLC] Unable to get number of karaokes in database : '+err);
					reject(err);
				});	
			
		});
	},

	// ---------------------------------------------------------------------------
	// Evenements à référencer par le composant  parent
	// ---------------------------------------------------------------------------

	emitEvent:function(){},
	onPlaylistUpdated:function(){},
	onPlayingUpdated:function(){
		// event when the playing flag is changed in the current playlist
	}
};